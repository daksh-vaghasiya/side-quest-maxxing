/**
 * logger — Request logging middleware for debugging.
 * Logs method, URL, body, params, and selective headers.
 */
const logger = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') return next();

  const timestamp = new Date().toISOString();
  const { method, url, body, params, query, headers } = req;

  console.log(`\n[${timestamp}] 📡 ${method} ${url} ${req.auth?.userId ? `| Clerk: ${req.auth.userId}` : ''}`);

  if (Object.keys(params).length > 0) {
    console.log('   Params:', JSON.stringify(params, null, 2));
  }

  if (Object.keys(query).length > 0) {
    console.log('   Query: ', JSON.stringify(query, null, 2));
  }

  if (method !== 'GET' && Object.keys(body).length > 0) {
    // Sanitize sensitive fields if necessary (e.g., password)
    const sanitizedBody = { ...body };
    ['password', 'token', 'secret'].forEach(f => { if (sanitizedBody[f]) sanitizedBody[f] = '********'; });
    console.log('   Body:  ', JSON.stringify(sanitizedBody, null, 2));
  }

  // Log specific headers that are useful for debugging
  const debugHeaders = {
    'content-type': headers['content-type'],
    'authorization': headers['authorization'] ? 'Bearer ********' : undefined,
    'x-clerk-user-id': headers['x-clerk-user-id'],
  };
  
  const activeHeaders = Object.fromEntries(Object.entries(debugHeaders).filter(([_, v]) => v !== undefined));
  if (Object.keys(activeHeaders).length > 0) {
    console.log('   Headers:', JSON.stringify(activeHeaders, null, 2));
  }

  next();
};

module.exports = logger;
