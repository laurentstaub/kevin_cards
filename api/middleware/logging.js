import config from '../config/index.js';

export const requestLogger = (req, res, next) => {
  if (config.get('app.isDevelopment')) {
    const logData = {
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      body: req.method !== 'GET' && Object.keys(req.body).length > 0 ?
        sanitizeBody(req.body) : undefined
    };

    console.log(`${req.method} ${req.path}`, logData);
  }
  next();
};

function sanitizeBody(body) {
  const sanitized = { ...body };

  // Hide sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[HIDDEN]';
    }
  });

  return sanitized;
}