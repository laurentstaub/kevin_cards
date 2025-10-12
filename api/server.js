import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import questionsRouter from './routes/questions.js';
import tagsRouter from './routes/tags.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8084;

// Security middleware
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

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS ? 
    process.env.CORS_ORIGINS.split(',') : 
    ['http://localhost:8080', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting - more generous for development
const isDevelopment = process.env.NODE_ENV !== 'production';
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || (isDevelopment ? 5 * 60 * 1000 : 15 * 60 * 1000), // 5 min dev, 15 min prod
  max: process.env.RATE_LIMIT_MAX_REQUESTS || (isDevelopment ? 1000 : 100), // 1000 dev, 100 prod
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((process.env.RATE_LIMIT_WINDOW_MS || 900000) / 1000)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Skip rate limiting for localhost in development
if (isDevelopment) {
  app.use('/api/', (req, res, next) => {
    if (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1') {
      return next();
    }
    limiter(req, res, next);
  });
} else {
  app.use('/api/', limiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for bulk operations
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📡 ${req.method} ${req.path}`, {
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      body: req.method !== 'GET' && Object.keys(req.body).length > 0 ? 
        { ...req.body, password: req.body.password ? '[HIDDEN]' : undefined } : undefined
    });
  }
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const { query } = await import('./config/database.js');
    await query('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// Serve static files (for Railway single-service deployment)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve admin files
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// Admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

// API routes
app.use('/api/questions', questionsRouter);
app.use('/api/tags', tagsRouter);

// API documentation endpoint - moved to modular architecture
// See api/routes/documentation.js for the new implementation

// Global error handling middleware
app.use((error, req, res) => {
  console.error('❌ Unhandled error:', {
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    url: req.url,
    method: req.method
  });

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' ? 
    'Internal server error' : error.message;

  res.status(error.status || 500).json({
    error: 'Internal server error',
    message,
    timestamp: new Date().toISOString()
  });
});

// Catch-all handler for frontend client-side routing (must be after API routes)
app.get('*', (req, res) => {
  // Don't handle API routes here
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'API endpoint not found',
      message: `${req.method} ${req.path} is not a valid API endpoint`,
      availableEndpoints: '/api'
    });
  }
  
  // Serve index.html for all non-API routes (client-side routing)
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log('FlashPharma Questions Management API');
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API documentation: http://localhost:${PORT}/api (modular architecture)`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Development mode - detailed logging enabled');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Used for tests
export default app;