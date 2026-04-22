const rateLimit = require('express-rate-limit');

const createLimiter = (windowMinutes, max, message) => rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max,
  message: { success: false, message, code: 'RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test', // Skip in tests
});

// ── Route-specific Limiters ────────────────────────────────────────────────────

/** General API limiter — 1000 req / 15 min */
const generalLimiter = createLimiter(15, 1000, 'Too many requests, please slow down.');

/** Submission creation — 10 per user per day (enforced per-user in controller too) */
const submissionLimiter = createLimiter(1440, 10, 'You can only submit 10 proofs per day.');

/** Voting — 200 per hour */
const voteLimiter = createLimiter(60, 200, 'Voting too fast. Please slow down.');

/** Comment posting — 60 per hour */
const commentLimiter = createLimiter(60, 60, 'Too many comments. Please wait before posting again.');

/** Auth sync — 100 per 15 min */
const authLimiter = createLimiter(15, 100, 'Too many auth requests.');

/** Community quest submission — 5 per day */
const communityQuestLimiter = createLimiter(1440, 5, 'You can submit up to 5 community quests per day.');

/** Admin routes — higher limit */
const adminLimiter = createLimiter(15, 500, 'Admin rate limit exceeded.');

module.exports = {
  generalLimiter,
  submissionLimiter,
  voteLimiter,
  commentLimiter,
  authLimiter,
  communityQuestLimiter,
  adminLimiter,
};
