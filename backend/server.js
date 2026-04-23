require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { clerkMiddleware } = require('@clerk/express');
const cron = require('node-cron');

const connectDB = require('./src/config/db');
const router = require('./src/routes');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const { generalLimiter } = require('./src/middleware/rateLimiter');
const logger = require('./src/middleware/logger');
const { refreshLeaderboards } = require('./src/services/leaderboard.service');
const http = require('http');
const { initSocket } = require('./src/services/socket.service');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

// ─── Security Headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = new Set([
  process.env.FRONTEND_URL || 'http://localhost:4200',
  'http://localhost:4200',  // Angular dev server default
  'http://localhost:3000',
]);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, mobile apps, server-to-server)
    if (!origin) return callback(null, true);

    // Exact match against configured allowed origins
    if (allowedOrigins.has(origin)) return callback(null, true);

    // During development, allow any localhost origin (different ports used by dev servers)
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
      return callback(null, true);
    }

    console.warn(`[CORS] ❌ Blocked origin: ${origin}`);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Clerk Middleware (validates JWT on all requests, non-blocking) ────────────
app.use(clerkMiddleware({ 
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
  authorizedParties: [
    'http://localhost:4200',  // Angular dev server
    'http://localhost:3000',  // Alternative
    'http://localhost:3001',  // Backend (for health checks)
    process.env.FRONTEND_URL, // Production frontend
  ].filter(Boolean),
  debug: process.env.NODE_ENV === 'development'
}));

// Auth debug logger as requested
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    const { getAuth } = require('@clerk/express');
    const auth = getAuth(req);
    console.log(`[API] ${req.method} ${req.url} | getAuth(req).userId: ${auth?.userId || 'NONE'}`);
  }
  next();
});

// ─── Body Parsing & Compression ───────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Request Logging ──────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Request Debugging ────────────────────────────────────────────────────────
app.use(logger);

// ─── General Rate Limiting ────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', router);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Side Quest Maxxing API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Cron Jobs ────────────────────────────────────────────────────────────────
// Refresh leaderboard rankings every hour
cron.schedule('0 * * * *', async () => {
  try {
    await refreshLeaderboards();
    console.log('[Cron] ✅ Leaderboards refreshed');
  } catch (err) {
    console.error('[Cron] ❌ Leaderboard refresh failed:', err.message);
  }
});

// Reset weekly XP every Monday at midnight
cron.schedule('0 0 * * 1', async () => {
  try {
    const Leaderboard = require('./src/models/Leaderboard');
    await Leaderboard.updateMany({}, { $set: { weeklyXp: 0 } });
    console.log('[Cron] ✅ Weekly XP reset');
  } catch (err) {
    console.error('[Cron] ❌ Weekly XP reset failed:', err.message);
  }
});

// Reset monthly XP on the 1st of each month
cron.schedule('0 0 1 * *', async () => {
  try {
    const Leaderboard = require('./src/models/Leaderboard');
    await Leaderboard.updateMany({}, { $set: { monthlyXp: 0 } });
    console.log('[Cron] ✅ Monthly XP reset');
  } catch (err) {
    console.error('[Cron] ❌ Monthly XP reset failed:', err.message);
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  const server = http.createServer(app);
  
  // Initialize Socket.io
  const io = initSocket(server);
  app.set('io', io); // Make io accessible in controllers

  server.listen(PORT, () => {
    console.log(`\n🚀 Side Quest Maxxing API (with WebSockets)`);
    console.log(`   ➜ Local:   http://localhost:${PORT}`);
    console.log(`   ➜ Env:     ${process.env.NODE_ENV}`);
    console.log(`   ➜ Health:  http://localhost:${PORT}/health\n`);
  });
}

module.exports = app;
