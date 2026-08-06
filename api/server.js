import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, setupDatabase } from './config/database.js';
import logger from './utils/logger.js';
import { errorHandler, NotFoundError } from './utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const app = express();

// Port resolution: PORT (injected by the hosting platform) wins,
// then API_PORT from .env, then the local default.
const PORT = parseInt(process.env.PORT) || parseInt(process.env.API_PORT) || 3001;

const isProduction = process.env.NODE_ENV === 'production';

// When true, this process also serves the frontend and the admin panel.
// Enabled by default in production so a single process is enough to deploy.
const serveStatic = process.env.SERVE_STATIC
  ? process.env.SERVE_STATIC === 'true'
  : isProduction;

// Security headers are scoped to /api only. The static pages load fonts and
// icons from external CDNs, which the API content security policy forbids.
app.use('/api', helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));

// Rate limiting (configurable via environment)
// More permissive in development, stricter in production
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (isProduction ? 100 : 1000),
  standardHeaders: true,
  legacyHeaders: false,
  // Mounted on /api, so req.path is already stripped of the /api prefix.
  skip: (req) => req.path === '/health'
});
app.use('/api/', limiter);

// Body parsing middleware (configurable limit)
const bodyLimit = process.env.BODY_PARSER_LIMIT || '10mb';
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'SQLite'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    logger.info('Initializing SQLite database...');
    await initializeDatabase();
    await setupDatabase();

    // Import and setup routes after database is ready
    const { default: questionsRouter } = await import('./routes/questions.js');
    const { default: tagsRouter } = await import('./routes/tags.js');

    app.use('/api/questions', questionsRouter);
    app.use('/api/tags', tagsRouter);

    // 404 handler for unknown API endpoints - must be before the error handler
    app.use('/api/*', (req, res, next) => {
      next(new NotFoundError('API endpoint'));
    });

    // Single-process deployment: serve the frontend and the admin panel
    if (serveStatic) {
      app.use('/admin', express.static(path.join(rootDir, 'admin')));
      app.use(express.static(path.join(rootDir, 'public')));

      app.get('/admin/*', (req, res) => {
        res.sendFile(path.join(rootDir, 'admin', 'index.html'));
      });
      app.get('*', (req, res) => {
        res.sendFile(path.join(rootDir, 'public', 'index.html'));
      });

      logger.info('Static assets served from public/ and admin/');
    }

    // Centralized error handling with custom error classes
    app.use(errorHandler(logger));

    app.listen(PORT, () => {
      logger.info(`SQLite API server running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    logger.error('Failed to start server:', { message: error.message, stack: error.stack });
    process.exit(1);
  }
}

startServer();
