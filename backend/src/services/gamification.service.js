const User = require('../models/User');
const Badge = require('../models/Badge');
const Notification = require('../models/Notification');
const Leaderboard = require('../models/Leaderboard');
const { calculateLevel, calculateVoteWeight, didLevelUp } = require('../helpers/xp.helper');

/**
 * Award or deduct XP from a user. Triggers level-up check and badge check.
 * @param {string} userId - MongoDB User _id
 * @param {number} amount - XP to add (negative to deduct)
 * @param {string} reason - description for logging
 * @returns {{ oldXp, newXp, oldLevel, newLevel, leveledUp, newBadges }}
 */
const awardXP = async (userId, amount, reason = '') => {
  const user = await User.findById(userId);
  if (!user) throw new Error(`User ${userId} not found`);

  const oldXp = user.xp;
  const oldLevel = user.level;

  // Clamp XP to 0 minimum
  user.xp = Math.max(0, user.xp + amount);
  user.level = calculateLevel(user.xp);

  // Update activity date and streak
  await updateStreak(user);

  await user.save();

  const leveledUp = didLevelUp(oldXp, user.xp);

  // Send level-up notification
  if (leveledUp) {
    await createNotification(userId, 'level_up', '🎉 Level Up!', `You are now ${user.level}!`, {
      newLevel: user.level,
      xpAwarded: amount,
    });
  }

  // Check and award any newly unlocked badges
  const newBadges = await checkAndAwardBadges(userId, user);

  // Sync leaderboard entry
  await syncLeaderboardEntry(user);

  return {
    oldXp,
    newXp: user.xp,
    oldLevel,
    newLevel: user.level,
    leveledUp,
    newBadges,
  };
};

/**
 * Update user streak based on last activity date
 */
const updateStreak = async (user) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!user.lastActivityDate) {
    user.currentStreak = 1;
    user.lastActivityDate = now;
    return;
  }

  const lastActivity = new Date(user.lastActivityDate);
  const lastDay = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());
  const diffDays = Math.floor((today - lastDay) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Already active today — no change
    return;
  } else if (diffDays === 1) {
    // Consecutive day — extend streak
    user.currentStreak = (user.currentStreak || 0) + 1;
    if (user.currentStreak > user.longestStreak) {
      user.longestStreak = user.currentStreak;
    }
    user.lastActivityDate = now;

    // Award streak bonus XP (added directly to avoid recursion)
    user.xp = Math.max(0, user.xp + 10);
  } else {
    // Streak broken
    if (user.currentStreak > 1) {
      await createNotification(user._id, 'streak_broken', '💔 Streak Lost', `Your ${user.currentStreak}-day streak has ended. Start a new one today!`);
    }
    user.currentStreak = 1;
    user.lastActivityDate = now;
  }
};

/**
 * Check all badge conditions and award newly earned badges
 */
const checkAndAwardBadges = async (userId, user) => {
  const allBadges = await Badge.find({ isActive: true });
  const userBadgeIds = user.badges.map((b) => b.toString());
  const newlyEarned = [];

  for (const badge of allBadges) {
    if (userBadgeIds.includes(badge._id.toString())) continue; // Already has it

    const earned = await evaluateBadgeCondition(badge.condition, user);
    if (earned) {
      user.badges.push(badge._id);
      user.xp = Math.max(0, user.xp + (badge.xpBonus || 0));
      newlyEarned.push(badge);

      await createNotification(
        userId,
        'badge_earned',
        `🏆 Badge Earned: ${badge.name}`,
        badge.description,
        { badgeName: badge.name }
      );
    }
  }

  if (newlyEarned.length > 0) {
    await user.save();
  }

  return newlyEarned;
};

/**
 * Evaluate a single badge condition against a user
 */
const evaluateBadgeCondition = async (condition, user) => {
  switch (condition) {
    case 'first_quest':
      return user.completedQuests.length >= 1;
    case 'streak_5':
      return user.currentStreak >= 5 || user.longestStreak >= 5;
    case 'streak_30':
      return user.currentStreak >= 30 || user.longestStreak >= 30;
    case 'quests_10':
      return user.completedQuests.length >= 10;
    case 'quests_50':
      return user.completedQuests.length >= 50;
    case 'level_intermediate':
      return ['Intermediate', 'Pro', 'Legend'].includes(user.level);
    case 'level_pro':
      return ['Pro', 'Legend'].includes(user.level);
    case 'level_legend':
      return user.level === 'Legend';
    case 'votes_50':
      return user.totalVotesCast >= 50;
    case 'reputation_500':
      return user.reputation >= 500;
    case 'top10_leaderboard': {
      const entry = await Leaderboard.findOne({ userId: user._id });
      return entry && entry.globalRank && entry.globalRank <= 10;
    }
    case 'top1_leaderboard': {
      const entry = await Leaderboard.findOne({ userId: user._id });
      return entry && entry.globalRank === 1;
    }
    default:
      return false; // manual, quest_creator, controversy_king handled elsewhere
  }
};

/**
 * Apply warning + penalty system for rejected/fake submissions
 * Warnings → submission bans → account bans
 */
const applySubmissionPenalty = async (userId, reason = 'Submission rejected') => {
  const user = await User.findById(userId);
  if (!user) return;

  // Deduct XP
  user.xp = Math.max(0, user.xp - 20);
  user.level = calculateLevel(user.xp);
  user.warnings += 1;
  user.reputation = Math.max(0, user.reputation - 10);
  user.rejectedSubmissions += 1;

  const now = new Date();

  // Escalating penalty system
  if (user.warnings === 3) {
    // 24-hour submission ban
    user.submissionBanExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await createNotification(userId, 'warning_received',
      '⚠️ Submission Ban (24 hours)',
      `You've received ${user.warnings} warnings. Submissions disabled for 24 hours.`
    );
  } else if (user.warnings === 5) {
    // 7-day submission ban + reputation hit
    user.submissionBanExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    user.reputation = Math.max(0, user.reputation - 50);
    await createNotification(userId, 'ban_notice',
      '🚫 Extended Submission Ban (7 days)',
      `You've received ${user.warnings} warnings. Submissions disabled for 7 days. Reputation reduced.`
    );
  } else if (user.warnings >= 8) {
    // Full account ban
    user.isBanned = true;
    user.banExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    user.banReason = 'Repeated policy violations and fake submissions';
    await createNotification(userId, 'ban_notice',
      '🚫 Account Banned',
      'Your account has been suspended for 30 days due to repeated violations.'
    );
  } else {
    await createNotification(userId, 'warning_received',
      '⚠️ Warning Issued',
      `Your submission was rejected. Warning ${user.warnings}/8. XP -20, Reputation -10.`
    );
  }

  await user.save();
  await syncLeaderboardEntry(user);
};

/**
 * Sync user data to leaderboard entry
 */
const syncLeaderboardEntry = async (user) => {
  await Leaderboard.findOneAndUpdate(
    { userId: user._id },
    {
      $set: {
        totalXp: user.xp,
        username: user.username,
        avatar: user.avatar,
        level: user.level,
        reputation: user.reputation,
        badges: user.badges,
        completedQuestCount: user.completedQuests.length,
        lastRefreshedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );
};

/**
 * Create a notification for a user
 */
const createNotification = async (userId, type, title, message, metadata = {}) => {
  try {
    await Notification.create({ userId, type, title, message, metadata });
  } catch (err) {
    console.error('[GamificationService] Notification error:', err.message);
  }
};

module.exports = {
  awardXP,
  updateStreak,
  checkAndAwardBadges,
  applySubmissionPenalty,
  syncLeaderboardEntry,
  createNotification,
};
