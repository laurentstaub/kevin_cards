import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initializeDatabase, setupDatabase } from './config/database.js';
import logger from './utils/logger.js';
import { errorHandler, NotFoundError } from './utils/errors.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
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
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 // Default: 100 requests per window
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

    // 404 handler - must be before error handler
    app.use('*', (req, res, next) => {
      next(new NotFoundError('API endpoint'));
    });

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