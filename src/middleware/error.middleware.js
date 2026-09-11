/**
 * Custom Operational Error Class
 * Used to distinguish known business/operational errors from unknown bugs
 */
class AppError extends Error {
    constructor(message, statusCode = 500, errors = null) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        this.errors = errors;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 404 Not Found Middleware
 * Handles requests to undefined API endpoints
 */
function notFoundHandler(req, res, next) {
    const error = new AppError(`Cannot ${req.method} ${req.originalUrl} - Route not found`, 404);
    next(error);
}

/**
 * Centralized Error Handling Middleware
 * Catches all errors passed via next(err) or thrown in async handlers (Express 5)
 */
function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    let error = { ...err };
    error.message = err.message || 'Internal Server Error';
    error.statusCode = err.statusCode || 500;

    // Log error for debugging (omit noisy 404s in production)
    if (process.env.NODE_ENV !== 'test') {
        if (error.statusCode >= 500) {
            console.error(`[ERROR 500] ${req.method} ${req.originalUrl}:`, err.stack || err);
        } else {
            console.warn(`[WARN ${error.statusCode}] ${req.method} ${req.originalUrl}: ${error.message}`);
        }
    }

    // 1. Mongoose Invalid ObjectId (CastError)
    if (err.name === 'CastError') {
        const message = `Invalid ${err.path}: ${err.value}`;
        error = new AppError(message, 400);
    }

    // 2. Mongoose Duplicate Key Error (E11000)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        const value = err.keyValue ? err.keyValue[field] : '';
        const message = `Duplicate value for '${field}': '${value}'. Please use another value.`;
        error = new AppError(message, 409);
    }

    // 3. Mongoose Schema Validation Error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors || {}).map(el => ({
            field: el.path,
            message: el.message
        }));
        const message = 'Validation failed';
        error = new AppError(message, 400, errors);
    }

    // 4. JWT Verification Errors
    if (err.name === 'JsonWebTokenError') {
        error = new AppError('Invalid token. Please authenticate again.', 401);
    }

    if (err.name === 'TokenExpiredError') {
        error = new AppError('Token expired. Please refresh your token or log in again.', 401);
    }

    // 5. Zod Validation Error (if passed to next)
    if (err.name === 'ZodError') {
        const errors = (err.issues || []).map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
        }));
        error = new AppError('Validation failed', 400, errors);
    }

    // Format final response
    const response = {
        success: false,
        message: error.message,
        ...(error.errors && { errors: error.errors }),
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            error: err
        })
    };

    return res.status(error.statusCode || 500).json(response);
}

module.exports = {
    AppError,
    notFoundHandler,
    errorHandler
};
