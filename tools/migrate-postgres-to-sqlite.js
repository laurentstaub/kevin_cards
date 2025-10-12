#!/usr/bin/env node

import { query as pgQuery } from '../api/config/database.js';
import { query as sqliteQuery, initializeDatabase, setupDatabase } from '../api/config/database-sqlite.js';

// ANSI color codes for better terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function migrateUsers() {
  log('\n📋 Migrating users...', colors.blue);

  try {
    // Get users from PostgreSQL
    const pgUsers = await pgQuery('SELECT * FROM users ORDER BY id');
    log(`Found ${pgUsers.rows.length} users in PostgreSQL`, colors.cyan);

    for (const user of pgUsers.rows) {
      try {
        await sqliteQuery(`
          INSERT INTO users (email, name, role, specialties, is_active, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          user.email,
          user.name,
          user.role,
          JSON.stringify(user.specialties || []),
          user.is_active ? 1 : 0,
          user.created_at
        ]);
        log(`✓ Migrated user: ${user.email}`, colors.green);
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          log(`⚠ User ${user.email} already exists, skipping`, colors.yellow);
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    log(`❌ Error migrating users: ${error.message}`, colors.red);
    throw error;
  }
}

async function migrateTags() {
  log('\n🏷️  Migrating tags...', colors.blue);

  try {
    // Get tags from PostgreSQL
    const pgTags = await pgQuery('SELECT * FROM tags ORDER BY id');
    log(`Found ${pgTags.rows.length} tags in PostgreSQL`, colors.cyan);

    for (const tag of pgTags.rows) {
      try {
        // Check if created_by user exists in SQLite, otherwise set to 1 (admin)
        let createdBy = tag.created_by;
        if (createdBy) {
          const userExists = await sqliteQuery('SELECT id FROM users WHERE id = ?', [createdBy]);
          if (userExists.rows.length === 0) {
            createdBy = 1; // Default to admin user
          }
        } else {
          createdBy = 1;
        }

        await sqliteQuery(`
          INSERT INTO tags (name, category, color, description, is_active, created_at, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          tag.name,
          tag.category,
          tag.color,
          tag.description,
          tag.is_active ? 1 : 0,
          tag.created_at,
          createdBy
        ]);
        log(`✓ Migrated tag: ${tag.name}`, colors.green);
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          log(`⚠ Tag ${tag.name} already exists, skipping`, colors.yellow);
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    log(`❌ Error migrating tags: ${error.message}`, colors.red);
    throw error;
  }
}

async function migrateQuestions() {
  log('\n❓ Migrating questions...', colors.blue);

  try {
    // Get questions from PostgreSQL
    const pgQuestions = await pgQuery(`
      SELECT q.*,
             COALESCE(
               JSON_AGG(
                 JSON_BUILD_OBJECT(
                   'id', t.id,
                   'name', t.name,
                   'category', t.category,
                   'color', t.color
                 )
               ) FILTER (WHERE t.id IS NOT NULL),
               '[]'::json
             ) as tags
      FROM questions q
      LEFT JOIN question_tags qt ON q.id = qt.question_id
      LEFT JOIN tags t ON qt.tag_id = t.id
      GROUP BY q.id
      ORDER BY q.id
    `);

    log(`Found ${pgQuestions.rows.length} questions in PostgreSQL`, colors.cyan);

    for (const question of pgQuestions.rows) {
      try {
        // Check if created_by user exists in SQLite, otherwise set to 1 (admin)
        let createdBy = question.created_by;
        if (createdBy) {
          const userExists = await sqliteQuery('SELECT id FROM users WHERE id = ?', [createdBy]);
          if (userExists.rows.length === 0) {
            createdBy = 1; // Default to admin user
          }
        } else {
          createdBy = 1;
        }

        // Check if validated_by user exists in SQLite
        let validatedBy = question.validated_by;
        if (validatedBy) {
          const userExists = await sqliteQuery('SELECT id FROM users WHERE id = ?', [validatedBy]);
          if (userExists.rows.length === 0) {
            validatedBy = null; // Clear if user doesn't exist
          }
        }

        // Insert question into SQLite
        const result = await sqliteQuery(`
          INSERT INTO questions (
            question_text, answer_text, question_html, answer_html,
            status, is_active, admin_notes, deleted_at,
            created_at, updated_at, created_by, validated_by, validated_at,
            sources, metadata, review_history
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          question.question_text,
          question.answer_text,
          question.question_html,
          question.answer_html,
          question.status || 'draft',
          question.is_active ? 1 : 0,
          question.admin_notes,
          question.deleted_at,
          question.created_at,
          question.updated_at,
          createdBy,
          validatedBy,
          question.validated_at,
          JSON.stringify(question.sources || []),
          JSON.stringify(question.metadata || {}),
          JSON.stringify(question.review_history || [])
        ]);

        const newQuestionId = result.insertId;

        // Migrate question tags
        if (question.tags && Array.isArray(question.tags) && question.tags.length > 0) {
          for (const tag of question.tags) {
            try {
              // Find the tag ID in SQLite by name
              const sqliteTag = await sqliteQuery('SELECT id FROM tags WHERE name = ?', [tag.name]);
              if (sqliteTag.rows.length > 0) {
                await sqliteQuery(`
                  INSERT INTO question_tags (question_id, tag_id, assigned_at)
                  VALUES (?, ?, ?)
                `, [newQuestionId, sqliteTag.rows[0].id, new Date().toISOString()]);
              }
            } catch (tagError) {
              log(`⚠ Error linking tag ${tag.name} to question ${newQuestionId}: ${tagError.message}`, colors.yellow);
            }
          }
        }

        log(`✓ Migrated question ID ${question.id} -> ${newQuestionId}`, colors.green);
      } catch (error) {
        log(`❌ Error migrating question ID ${question.id}: ${error.message}`, colors.red);
      }
    }
  } catch (error) {
    log(`❌ Error migrating questions: ${error.message}`, colors.red);
    throw error;
  }
}

async function verifyMigration() {
  log('\n🔍 Verifying migration...', colors.blue);

  try {
    const sqliteUsers = await sqliteQuery('SELECT COUNT(*) as count FROM users');
    const sqliteTags = await sqliteQuery('SELECT COUNT(*) as count FROM tags');
    const sqliteQuestions = await sqliteQuery('SELECT COUNT(*) as count FROM questions');
    const sqliteQuestionTags = await sqliteQuery('SELECT COUNT(*) as count FROM question_tags');

    log(`📊 Migration Summary:`, colors.bright);
    log(`   Users: ${sqliteUsers.rows[0].count}`, colors.cyan);
    log(`   Tags: ${sqliteTags.rows[0].count}`, colors.cyan);
    log(`   Questions: ${sqliteQuestions.rows[0].count}`, colors.cyan);
    log(`   Question-Tag links: ${sqliteQuestionTags.rows[0].count}`, colors.cyan);

    // Test a sample query
    const sampleQuestions = await sqliteQuery(`
      SELECT q.id, q.question_text, COUNT(qt.tag_id) as tag_count
      FROM questions q
      LEFT JOIN question_tags qt ON q.id = qt.question_id
      GROUP BY q.id, q.question_text
      LIMIT 3
    `);

    log(`\n📝 Sample questions:`, colors.bright);
    for (const q of sampleQuestions.rows) {
      log(`   ID ${q.id}: "${q.question_text.substring(0, 50)}..." (${q.tag_count} tags)`, colors.cyan);
    }

  } catch (error) {
    log(`❌ Error verifying migration: ${error.message}`, colors.red);
    throw error;
  }
}

async function main() {
  try {
    log('🚀 Starting PostgreSQL to SQLite migration...', colors.bright);

    // Initialize SQLite database
    log('\n🔧 Setting up SQLite database...', colors.blue);
    await initializeDatabase();
    await setupDatabase();

    // Run migrations
    await migrateUsers();
    await migrateTags();
    await migrateQuestions();

    // Verify migration
    await verifyMigration();

    log('\n✅ Migration completed successfully!', colors.green);
    log('You can now use the SQLite database with all your existing data.', colors.bright);

  } catch (error) {
    log(`\n💥 Migration failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}