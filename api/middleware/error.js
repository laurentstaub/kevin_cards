import config from '../config/index.js';

export const notFoundHandler = (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'API endpoint not found',
      message: `${req.method} ${req.path} is not a valid API endpoint`,
      availableEndpoints: '/api'
    });
  } else {
    res.status(404).json({
      error: 'Not found',
      message: `${req.method} ${req.path} not found`
    });
  }
};

export const errorHandler = (error, req, res, next) => {
  console.error('Unhandled error:', {
    error: error.message,
    stack: config.get('app.isDevelopment') ? error.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Don't leak error details in production
  const message = config.get('app.isDevelopment') ?
    error.message : 'Internal server error';

  res.status(error.status || 500).json({
    error: 'Internal server error',
    message,
    timestamp: new Date().toISOString()
  });
};