/**
 * Send a standardized success response
 */
const sendSuccess = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data,
  });
};

/**
 * Send a standardized created response (201)
 */
const sendCreated = (res, data = {}, message = 'Created successfully') => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Send a standardized error response
 */
const sendError = (res, message = 'An error occurred', statusCode = 400, code = 'ERROR', extra = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    ...extra,
  });
};

/**
 * Send a 404 Not Found response
 */
const sendNotFound = (res, entity = 'Resource') => {
  return sendError(res, `${entity} not found`, 404, 'NOT_FOUND');
};

/**
 * Send a 403 Forbidden response
 */
const sendForbidden = (res, message = 'You do not have permission to perform this action') => {
  return sendError(res, message, 403, 'FORBIDDEN');
};

/**
 * Build a consistent paginated response
 */
const sendPaginated = (res, { data, total, page, limit, message = 'Success' }) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  });
};

module.exports = { sendSuccess, sendCreated, sendError, sendNotFound, sendForbidden, sendPaginated };
