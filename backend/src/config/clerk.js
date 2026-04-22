const { createClerkClient } = require('@clerk/express');

/**
 * Clerk server-side client for admin operations (fetch users, etc.)
 * JWT verification is handled automatically by clerkMiddleware() in server.js
 */
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

module.exports = clerk;
