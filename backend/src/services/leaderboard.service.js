const Leaderboard = require('../models/Leaderboard');
const User = require('../models/User');

/**
 * Refresh all leaderboard entries and recompute global ranks.
 * Called by cron job every hour.
 */
const refreshLeaderboards = async () => {
  // Fetch all users sorted by XP
  const users = await User.find({ isBanned: false })
    .select('_id username avatar level xp reputation badges completedQuests')
    .sort({ xp: -1 })
    .lean();

  const bulkOps = users.map((user, index) => ({
    updateOne: {
      filter: { userId: user._id },
      update: {
        $set: {
          userId: user._id,
          totalXp: user.xp,
          globalRank: index + 1,
          username: user.username,
          avatar: user.avatar,
          level: user.level,
          reputation: user.reputation,
          badges: user.badges,
          completedQuestCount: user.completedQuests?.length || 0,
          lastRefreshedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  if (bulkOps.length > 0) {
    await Leaderboard.bulkWrite(bulkOps);
  }

  return { updated: bulkOps.length };
};

/**
 * Get paginated global leaderboard
 */
const getGlobalLeaderboard = async ({ page = 1, limit = 50 } = {}) => {
  const skip = (page - 1) * limit;
  const total = await Leaderboard.countDocuments();

  const entries = await Leaderboard.find()
    .sort({ totalXp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'clerkId')
    .populate('badges', 'name slug icon rarity')
    .lean();

  return { entries, total, page, limit };
};

/**
 * Get paginated weekly leaderboard
 */
const getWeeklyLeaderboard = async ({ page = 1, limit = 50 } = {}) => {
  const skip = (page - 1) * limit;
  const total = await Leaderboard.countDocuments({ weeklyXp: { $gt: 0 } });

  const entries = await Leaderboard.find({ weeklyXp: { $gt: 0 } })
    .sort({ weeklyXp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('badges', 'name slug icon rarity')
    .lean();

  // Dynamic weekly rank
  return {
    entries: entries.map((e, i) => ({ ...e, weeklyRank: skip + i + 1 })),
    total, page, limit,
  };
};

/**
 * Get paginated monthly leaderboard
 */
const getMonthlyLeaderboard = async ({ page = 1, limit = 50 } = {}) => {
  const skip = (page - 1) * limit;
  const total = await Leaderboard.countDocuments({ monthlyXp: { $gt: 0 } });

  const entries = await Leaderboard.find({ monthlyXp: { $gt: 0 } })
    .sort({ monthlyXp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('badges', 'name slug icon rarity')
    .lean();

  return {
    entries: entries.map((e, i) => ({ ...e, monthlyRank: skip + i + 1 })),
    total, page, limit,
  };
};

/**
 * Get a specific user's leaderboard entry and rank
 */
const getUserRank = async (userId) => {
  const entry = await Leaderboard.findOne({ userId })
    .populate('badges', 'name slug icon rarity')
    .lean();

  if (!entry) return null;

  // Count users with more XP for accurate rank
  const usersAbove = await Leaderboard.countDocuments({ totalXp: { $gt: entry.totalXp } });
  entry.globalRank = usersAbove + 1;

  return entry;
};

/**
 * Add XP to weekly and monthly totals (called whenever XP is awarded)
 */
const addXpToLeaderboard = async (userId, xpAmount) => {
  if (xpAmount <= 0) return;
  await Leaderboard.findOneAndUpdate(
    { userId },
    { $inc: { weeklyXp: xpAmount, monthlyXp: xpAmount } },
    { upsert: false } // Only update existing entries (created by syncLeaderboardEntry)
  );
};

module.exports = {
  refreshLeaderboards,
  getGlobalLeaderboard,
  getWeeklyLeaderboard,
  getMonthlyLeaderboard,
  getUserRank,
  addXpToLeaderboard,
};
