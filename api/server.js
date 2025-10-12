import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initializeDatabase, setupDatabase } from './config/database.js';

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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    console.log('Initializing SQLite database...');
    await initializeDatabase();
    await setupDatabase();

    // Import and setup routes after database is ready
    const { default: questionsRouter } = await import('./routes/questions.js');
    const { default: tagsRouter } = await import('./routes/tags.js');

    app.use('/api/questions', questionsRouter);
    app.use('/api/tags', tagsRouter);

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('API Error:', err);

      if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
          error: 'Invalid JSON in request body'
        });
      }

      res.status(500).json({
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'API endpoint not found' });
    });

    app.listen(PORT, () => {
      console.log(`SQLite API server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log('Environment:', process.env.NODE_ENV || 'development');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();