/**
 * Custom Error Classes for FlashPharma API
 * Provides structured error handling with proper status codes
 */

// Base API Error
export class ApiError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 - Bad Request
export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

// 401 - Unauthorized
export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

// 403 - Forbidden
export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

// 404 - Not Found
export class NotFoundError extends ApiError {
  constructor(resource = 'Resource', id = '') {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 404);
  }
}

// 409 - Conflict
export class ConflictError extends ApiError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

// 422 - Unprocessable Entity (Validation Error)
export class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details = []) {
    super(message, 422);
    this.details = details;
  }
}

// 500 - Internal Server Error
export class InternalServerError extends ApiError {
  constructor(message = 'Internal Server Error') {
    super(message, 500);
  }
}

// 503 - Service Unavailable
export class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503);
  }
}

// Error response formatter
export const formatErrorResponse = (error, includeStack = false) => {
  const response = {
    error: {
      message: error.message,
      type: error.name,
    }
  };

  // Add validation details if present
  if (error.details) {
    response.error.details = error.details;
  }

  // Include stack trace in development
  if (includeStack && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
};

// Error handler middleware factory
export const errorHandler = (logger) => {
  return (err, req, res, next) => {
    // Default to 500 if no status code
    const statusCode = err.statusCode || 500;
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Log error with appropriate level
    if (statusCode >= 500) {
      logger.error('Server Error:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
      });
    } else if (statusCode >= 400) {
      logger.warn('Client Error:', {
        message: err.message,
        url: req.originalUrl,
        method: req.method,
        statusCode
      });
    }

    // Send error response
    res.status(statusCode).json(
      formatErrorResponse(err, isDevelopment)
    );
  };
};

// Async handler wrapper to catch promise rejections
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
