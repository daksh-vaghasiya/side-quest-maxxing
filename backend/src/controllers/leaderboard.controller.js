const { getGlobalLeaderboard, getWeeklyLeaderboard, getMonthlyLeaderboard, getUserRank } = require('../services/leaderboard.service');
const { sendSuccess, sendNotFound, sendPaginated } = require('../helpers/response.helper');
const { parsePagination } = require('../helpers/pagination.helper');
const User = require('../models/User');

/**
 * GET /api/leaderboard
 * Global leaderboard by total XP
 */
const globalLeaderboard = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
    const { entries, total } = await getGlobalLeaderboard({ page, limit });
    return sendPaginated(res, { data: entries, total, page, limit, message: 'Global leaderboard' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/leaderboard/weekly
 */
const weeklyLeaderboard = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query, { defaultLimit: 50 });
    const { entries, total } = await getWeeklyLeaderboard({ page, limit });
    return sendPaginated(res, { data: entries, total, page, limit, message: 'Weekly leaderboard' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/leaderboard/monthly
 */
const monthlyLeaderboard = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query, { defaultLimit: 50 });
    const { entries, total } = await getMonthlyLeaderboard({ page, limit });
    return sendPaginated(res, { data: entries, total, page, limit, message: 'Monthly leaderboard' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/leaderboard/me
 * Current user's rank across all boards
 */
const myRank = async (req, res, next) => {
  try {
    const rank = await getUserRank(req.user._id);
    if (!rank) return sendNotFound(res, 'Leaderboard entry');
    return sendSuccess(res, { rank }, 'Your rank');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/leaderboard/user/:username
 * Public rank lookup by username
 */
const userRankByUsername = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) return sendNotFound(res, 'User');
    const rank = await getUserRank(user._id);
    if (!rank) return sendNotFound(res, 'Leaderboard entry');
    return sendSuccess(res, { rank });
  } catch (err) {
    next(err);
  }
};

module.exports = { globalLeaderboard, weeklyLeaderboard, monthlyLeaderboard, myRank, userRankByUsername };
