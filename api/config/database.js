import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SQLite database path - defaults to a local file in the project root
const dbPath = process.env.SQLITE_DB_PATH || join(__dirname, '../../database/flashpharma.db');

let db = null;

// Initialize database connection
export const initializeDatabase = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON');

    console.log('Connected to SQLite database at:', dbPath);
    return db;
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(-1);
  }
};

// Helper function to execute queries
export const query = async (text, params = []) => {
  if (!db) {
    await initializeDatabase();
  }

  const start = Date.now();
  try {
    let result;

    // Handle different query types
    if (text.trim().toUpperCase().startsWith('SELECT')) {
      result = await db.all(text, params);
      result = { rows: result, rowCount: result.length };
    } else if (text.trim().toUpperCase().startsWith('INSERT')) {
      const res = await db.run(text, params);
      result = {
        rows: [{ id: res.lastID }],
        rowCount: res.changes,
        insertId: res.lastID
      };
    } else {
      const res = await db.run(text, params);
      result = { rows: [], rowCount: res.changes };
    }

    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('SQL Query executed:', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
    }

    return result;
  } catch (error) {
    console.error('Database query error:', {
      query: text,
      params,
      error: error.message
    });
    throw error;
  }
};

// Helper function to get database instance for transactions
export const getClient = async () => {
  if (!db) {
    await initializeDatabase();
  }

  // SQLite doesn't use connection pools like PostgreSQL
  // Return a transaction-like interface
  return {
    query: async (text, params) => {
      return await query(text, params);
    },
    release: () => {
      // No-op for SQLite
    },
    async begin() {
      await db.exec('BEGIN TRANSACTION');
    },
    async commit() {
      await db.exec('COMMIT');
    },
    async rollback() {
      await db.exec('ROLLBACK');
    }
  };
};

// Initialize database with schema
export const setupDatabase = async () => {
  try {
    if (!db) {
      await initializeDatabase();
    }

    // Check if tables exist
    const tables = await db.all(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);

    if (tables.length === 0) {
      console.log('Setting up database schema...');
      const fs = await import('fs');

      try {
        const schemaPath = join(__dirname, '../../database/schema-sqlite.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await db.exec(schema);
        console.log('Database schema created successfully');
      } catch (error) {
        console.error('Error reading schema file:', error);
        throw error;
      }
    }

    // Run migrations if they exist
    await runMigrations();

    return db;
  } catch (error) {
    console.error('Database setup error:', error);
    throw error;
  }
};

// Run database migrations
const runMigrations = async () => {
  try {
    const fs = await import('fs');
    const { readdirSync, existsSync } = fs;

    const migrationsDir = join(__dirname, '../../database/migrations');

    if (!existsSync(migrationsDir)) {
      console.log('No migrations directory found, skipping migrations');
      return;
    }

    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('No migrations to run');
      return;
    }

    console.log(`Running ${migrationFiles.length} migration(s)...`);

    for (const file of migrationFiles) {
      const migrationPath = join(migrationsDir, file);
      const migration = fs.readFileSync(migrationPath, 'utf8');

      try {
        await db.exec(migration);
        console.log(`✓ Applied migration: ${file}`);
      } catch (error) {
        // Ignore errors for CREATE INDEX IF NOT EXISTS (index might already exist)
        if (!error.message.includes('already exists')) {
          console.error(`✗ Error in migration ${file}:`, error.message);
        } else {
          console.log(`  Index already exists in ${file}, skipping`);
        }
      }
    }

    console.log('Migrations completed');
  } catch (error) {
    console.error('Migration error:', error);
    // Don't throw - migrations are non-critical
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database connection...');
  if (db) {
    await db.close();
  }
  process.exit(0);
});

// Export database instance
export default db;