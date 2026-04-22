/**
 * Centralized error handler — must be registered LAST in Express middleware chain
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';

  // ── Mongoose Validation Error ──────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    const fields = Object.keys(err.errors).map((key) => ({
      field: key,
      message: err.errors[key].message,
    }));
    return res.status(statusCode).json({ success: false, message: 'Validation failed', code, errors: fields });
  }

  // ── Mongoose Duplicate Key ─────────────────────────────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
    return res.status(statusCode).json({ success: false, message, code });
  }

  // ── Mongoose Cast Error (bad ObjectId) ────────────────────────────────────
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // ── JWT / Auth Errors from Clerk ──────────────────────────────────────────
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid or expired authentication token';
  }

  // ── Production: hide internal errors ─────────────────────────────────────
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Something went wrong on our end. Please try again later.';
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Error] ${statusCode} ${code}: ${err.message}`);
    if (err.stack) console.error(err.stack);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 handler for unmatched routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
  });
};

module.exports = { errorHandler, notFoundHandler };
