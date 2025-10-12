import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

class Config {
  constructor() {
    this.config = {};
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;

    // Load environment variables
    dotenv.config();

    // Load package.json for version info
    const packagePath = join(__dirname, '../../package.json');
    const packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'));

    this.config = {
      app: {
        name: 'FlashPharma API',
        version: packageInfo.version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        isDevelopment: process.env.NODE_ENV !== 'production'
      },

      server: {
        port: parseInt(process.env.API_PORT || '8084', 10),
        host: process.env.API_HOST || 'localhost'
      },

      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        name: process.env.DB_NAME || 'flashpharma',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true'
      },

      security: {
        corsOrigins: process.env.CORS_ORIGINS ?
          process.env.CORS_ORIGINS.split(',') :
          ['http://localhost:8080', 'http://localhost:3000'],

        rateLimit: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
          maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
        }
      },

      logging: {
        level: process.env.LOG_LEVEL || (this.isDevelopment ? 'debug' : 'info'),
        enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false'
      }
    };

    this.loaded = true;
  }

  get(path) {
    const keys = path.split('.');
    let value = this.config;

    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }

    return value;
  }

  set(path, newValue) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let obj = this.config;

    for (const key of keys) {
      obj[key] = obj[key] || {};
      obj = obj[key];
    }

    obj[lastKey] = newValue;
  }
}

export default new Config();