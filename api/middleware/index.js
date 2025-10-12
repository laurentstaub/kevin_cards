import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import { requestLogger } from './logging.js';
import { healthCheck } from './health.js';

class Middleware {
  apply(app) {
    // Security middleware
    this.applySecurity(app);

    // Request parsing
    this.applyParsing(app);

    // Logging
    this.applyLogging(app);

    // Health check
    this.applyHealthCheck(app);
  }

  applySecurity(app) {
    // Helmet for security headers
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          connectSrc: ["'self'"]
        }
      }
    }));

    // CORS
    const corsOptions = {
      origin: config.get('security.corsOrigins'),
      credentials: true,
      optionsSuccessStatus: 200
    };
    app.use(cors(corsOptions));

    // Rate limiting
    this.applyRateLimit(app);
  }

  applyRateLimit(app) {
    const isDevelopment = config.get('app.isDevelopment');
    const windowMs = config.get('security.rateLimit.windowMs');
    const maxRequests = config.get('security.rateLimit.maxRequests');

    const limiter = rateLimit({
      windowMs: isDevelopment ? 5 * 60 * 1000 : windowMs,
      max: isDevelopment ? 1000 : maxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    if (isDevelopment) {
      // Skip rate limiting for localhost in development
      app.use('/api/', (req, res, next) => {
        const isLocalhost = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip);
        return isLocalhost ? next() : limiter(req, res, next);
      });
    } else {
      app.use('/api/', limiter);
    }
  }

  applyParsing(app) {
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  applyLogging(app) {
    if (config.get('logging.enableRequestLogging')) {
      app.use(requestLogger);
    }
  }

  applyHealthCheck(app) {
    app.get('/health', healthCheck);
  }
}

export default new Middleware();