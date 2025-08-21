import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import questionsRouter from './routes/questions.js';
import tagsRouter from './routes/tags.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((process.env.RATE_LIMIT_WINDOW_MS || 900000) / 1000)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter);

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
    // Test database connection
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

// API routes
app.use('/api/questions', questionsRouter);
app.use('/api/tags', tagsRouter);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'FlashPharma Questions Management API',
    version: '1.0.0',
    description: 'API for managing pharmacy flashcard questions with markdown support',
    endpoints: {
      questions: {
        'GET /api/questions': 'List questions with filters and pagination',
        'GET /api/questions/pending': 'Get questions pending review',
        'GET /api/questions/published': 'Get published questions for flashcard app',
        'GET /api/questions/:id': 'Get single question',
        'GET /api/questions/:id/preview': 'Get rendered HTML preview',
        'GET /api/questions/:id/history': 'Get question version history',
        'POST /api/questions': 'Create new question',
        'POST /api/questions/preview': 'Preview markdown rendering',
        'PUT /api/questions/:id': 'Update question',
        'PATCH /api/questions/:id/status': 'Update question status',
        'DELETE /api/questions/:id': 'Archive question'
      },
      tags: {
        'GET /api/tags': 'List all tags',
        'GET /api/tags/categories': 'Get tags grouped by category',
        'GET /api/tags/popular': 'Get most used tags',
        'GET /api/tags/stats': 'Get tag statistics',
        'GET /api/tags/:id': 'Get single tag',
        'GET /api/tags/:id/questions': 'Get questions using this tag',
        'POST /api/tags': 'Create new tag',
        'PUT /api/tags/:id': 'Update tag',
        'PATCH /api/tags/:id/deactivate': 'Deactivate tag',
        'DELETE /api/tags/:id': 'Delete tag permanently',
        'POST /api/tags/:id/merge': 'Merge tag with another tag',
        'POST /api/tags/bulk-create': 'Create multiple tags'
      }
    },
    documentation: 'See questions_management_plan.md for full API documentation'
  });
});

// Global error handling middleware
app.use((error, req, res, next) => {
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

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    message: `${req.method} ${req.path} is not a valid API endpoint`,
    availableEndpoints: '/api'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('🚀 FlashPharma Questions Management API');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API documentation: http://localhost:${PORT}/api`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Development mode - detailed logging enabled');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;