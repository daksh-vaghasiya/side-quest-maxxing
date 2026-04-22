const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const User = require('../models/User');
const Quest = require('../models/Quest');
const Submission = require('../models/Submission');
const Vote = require('../models/Vote');
const Comment = require('../models/Comment');
const CommunityQuest = require('../models/CommunityQuest');
const Badge = require('../models/Badge');
const AuditLog = require('../models/AuditLog');
const Leaderboard = require('../models/Leaderboard');
const { sendSuccess, sendError, sendNotFound, sendPaginated } = require('../helpers/response.helper');
const { parsePagination } = require('../helpers/pagination.helper');
const { awardXP, createNotification } = require('../services/gamification.service');
const { recomputeSubmissionStats } = require('../services/validation.service');
const { refreshLeaderboards } = require('../services/leaderboard.service');

const moderateRules = [
  body('action').isIn(['approve', 'reject', 'unflag']),
  body('reason').optional().trim().isLength({ max: 500 }),
];

const banRules = [
  body('reason').trim().isLength({ min: 5, max: 500 }).withMessage('Reason must be 5-500 characters'),
  body('durationDays').optional().isInt({ min: 1, max: 3650 }),
];

const warnRules = [
  body('reason').trim().isLength({ min: 5, max: 500 }).withMessage('Reason must be 5-500 characters'),
];

const roleRules = [
  body('role').isIn(['user', 'moderator', 'admin']),
];

const adjustXPRules = [
  body('amount').isInt().notEmpty().withMessage('Amount must be an integer'),
  body('reason').optional().trim().isLength({ max: 200 }),
];

// ── Audit Logger ──────────────────────────────────────────────────────────────
const audit = async (adminId, action, targetType, targetId, reason, metadata = {}) => {
  await AuditLog.create({ adminId, action, targetType, targetId, reason, metadata });
};

/**
 * GET /api/admin/dashboard
 * High-level stats for the admin panel
 */
const getDashboard = async (req, res, next) => {
  try {
    const [
      totalUsers, bannedUsers,
      totalQuests, activeQuests,
      totalSubmissions, pendingSubmissions, approvedSubmissions, rejectedSubmissions, flaggedSubmissions,
      totalVotes, totalComments,
      pendingCommunityQuests,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isBanned: true }),
      Quest.countDocuments(),
      Quest.countDocuments({ status: 'active' }),
      Submission.countDocuments(),
      Submission.countDocuments({ status: 'pending' }),
      Submission.countDocuments({ status: 'approved' }),
      Submission.countDocuments({ status: 'rejected' }),
      Submission.countDocuments({ flaggedForReview: true }),
      Vote.countDocuments(),
      Comment.countDocuments({ isDeleted: false }),
      CommunityQuest.countDocuments({ status: { $in: ['pending', 'auto_approved'] } }),
    ]);

    return sendSuccess(res, {
      stats: {
        users: { total: totalUsers, banned: bannedUsers },
        quests: { total: totalQuests, active: activeQuests },
        submissions: { total: totalSubmissions, pending: pendingSubmissions, approved: approvedSubmissions, rejected: rejectedSubmissions, flagged: flaggedSubmissions },
        votes: { total: totalVotes },
        comments: { total: totalComments },
        communityQuests: { pendingReview: pendingCommunityQuests },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/submissions
 */
const adminListSubmissions = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.flagged === 'true') filter.flaggedForReview = true;
    if (req.query.questId) filter.questId = req.query.questId;
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.controversial === 'true') filter.isControversial = true;

    const [submissions, total] = await Promise.all([
      Submission.find(filter)
        .populate('questId', 'title category xpReward')
        .populate('userId', 'username avatar level warnings')
        .populate('moderatedBy', 'username')
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit).lean(),
      Submission.countDocuments(filter),
    ]);

    return sendPaginated(res, { data: submissions, total, page, limit });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/submissions/:id/moderate
 */
const moderateSubmission = [
  ...moderateRules, validate,
  async (req, res, next) => {
    try {
      const { action, reason } = req.body; // action: 'approve' | 'reject' | 'unflag'
      const submission = await Submission.findById(req.params.id);
      if (!submission) return sendNotFound(res, 'Submission');

      if (action === 'unflag') {
        await Submission.findByIdAndUpdate(req.params.id, { flaggedForReview: false, flagReason: '' });
        await audit(req.user._id, 'unflag_submission', 'submission', submission._id, reason);
        return sendSuccess(res, {}, 'Submission unflagged');
      }

      const newStatus = action === 'approve' ? 'approved' : 'rejected';

      await Submission.findByIdAndUpdate(req.params.id, {
        status: newStatus,
        flaggedForReview: false,
        moderationNote: reason || '',
        moderatedBy: req.user._id,
        moderatedAt: new Date(),
        isAdminOverride: true,
        resolvedAt: new Date(),
      });

      // Trigger XP/penalty if not already done
      if (newStatus === 'approved' && !submission.xpAwarded) {
        const { handleApproval } = require('../services/validation.service');
        await handleApproval(submission._id);
        await Submission.findByIdAndUpdate(submission._id, { xpAwarded: true });
      } else if (newStatus === 'rejected' && !submission.penaltyApplied) {
        const { handleRejection } = require('../services/validation.service');
        await handleRejection(submission._id);
        await Submission.findByIdAndUpdate(submission._id, { penaltyApplied: true });
      }

      await audit(req.user._id, `${action}_submission`, 'submission', submission._id, reason, { previousStatus: submission.status });

      return sendSuccess(res, {}, `Submission ${newStatus} by admin`);
    } catch (err) {
      next(err);
    }
  },
];

/**
 * GET /api/admin/users
 */
const adminListUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.banned === 'true') filter.isBanned = true;
    if (req.query.search) filter.$or = [
      { username: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
    ];

    const [users, total] = await Promise.all([
      User.find(filter).sort({ xp: -1 }).skip(skip).limit(limit)
        .select('-clerkId').populate('badges', 'name slug icon').lean(),
      User.countDocuments(filter),
    ]);

    return sendPaginated(res, { data: users, total, page, limit });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/users/:id/ban
 */
const banUser = [
  ...banRules, validate,
  async (req, res, next) => {
    try {
      const { reason, durationDays } = req.body;
      const user = await User.findById(req.params.id);
      if (!user) return sendNotFound(res, 'User');
      if (user.role === 'admin') return sendError(res, 'Cannot ban an admin', 403);

      const banExpiresAt = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : null;
      await User.findByIdAndUpdate(req.params.id, { isBanned: true, banExpiresAt, banReason: reason || 'Policy violation' });
      await createNotification(user._id, 'ban_notice', '🚫 Account Banned', `Your account has been banned. Reason: ${reason}`);
      await audit(req.user._id, 'ban_user', 'user', user._id, reason, { durationDays });

      return sendSuccess(res, {}, `User banned${durationDays ? ` for ${durationDays} days` : ' permanently'}`);
    } catch (err) {
      next(err);
    }
  },
];

/**
 * PATCH /api/admin/users/:id/unban
 */
const unbanUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: false, banExpiresAt: null, banReason: '' },
      { new: true }
    );
    if (!user) return sendNotFound(res, 'User');
    await createNotification(user._id, 'ban_notice', '✅ Account Restored', 'Your account ban has been lifted.');
    await audit(req.user._id, 'unban_user', 'user', user._id, req.body.reason || '');
    return sendSuccess(res, {}, 'User unbanned');
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/users/:id/warn
 */
const warnUser = [
  ...warnRules, validate,
  async (req, res, next) => {
    try {
      const { reason } = req.body;
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $inc: { warnings: 1 } },
        { new: true }
      );
      if (!user) return sendNotFound(res, 'User');
      await createNotification(user._id, 'warning_received', '⚠️ Warning Issued', `Admin warning: ${reason || 'Policy violation'}. Warning ${user.warnings}/8.`);
      await audit(req.user._id, 'warn_user', 'user', user._id, reason);
      return sendSuccess(res, { warnings: user.warnings }, `User warned (${user.warnings} total)`);
    } catch (err) {
      next(err);
    }
  },
];

/**
 * PATCH /api/admin/users/:id/role
 */
const changeUserRole = [
  ...roleRules, validate,
  async (req, res, next) => {
    try {
      const { role } = req.body;
      const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
      if (!user) return sendNotFound(res, 'User');
      await audit(req.user._id, 'change_user_role', 'user', user._id, `Changed role to ${role}`, { role });
      return sendSuccess(res, { role: user.role }, 'Role updated');
    } catch (err) {
      next(err);
    }
  },
];

/**
 * PATCH /api/admin/users/:id/adjust-xp
 */
const adjustXP = [
  ...adjustXPRules, validate,
  async (req, res, next) => {
    try {
      const { amount, reason } = req.body;
      const result = await awardXP(req.params.id, amount, reason || 'Admin adjustment');
      await audit(req.user._id, 'adjust_xp', 'user', req.params.id, reason, { amount });
      return sendSuccess(res, result, `XP adjusted by ${amount}`);
    } catch (err) {
      next(err);
    }
  },
];

/**
 * GET /api/admin/community-quests
 */
const adminListCommunityQuests = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    else filter.status = { $in: ['auto_approved', 'pending'] };

    const [quests, total] = await Promise.all([
      CommunityQuest.find(filter)
        .populate('submittedBy', 'username avatar level')
        .sort({ upvoteCount: -1 })
        .skip(skip).limit(limit).lean(),
      CommunityQuest.countDocuments(filter),
    ]);

    return sendPaginated(res, { data: quests, total, page, limit });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/community-quests/:id
 * Approve/reject AND optionally promote to official quest
 */
const moderateCommunityQuest = async (req, res, next) => {
  try {
    const { action, reason, xpReward } = req.body;
    const cq = await CommunityQuest.findById(req.params.id);
    if (!cq) return sendNotFound(res, 'Community Quest');

    if (action === 'approve') {
      cq.status = 'approved';
      cq.moderatedBy = req.user._id;
      cq.moderatedAt = new Date();
      cq.moderationNote = reason || '';
      await cq.save();

      // Promote to official Quest
      const quest = await Quest.create({
        title: cq.title,
        description: cq.description,
        category: cq.category,
        difficulty: cq.difficulty,
        xpReward: xpReward || cq.suggestedXpReward,
        requirements: cq.requirements,
        tags: cq.tags,
        createdBy: cq.submittedBy,
        isOfficial: false,
        communityQuestId: cq._id,
      });

      await CommunityQuest.findByIdAndUpdate(cq._id, { promotedQuestId: quest._id });

      await createNotification(cq.submittedBy, 'community_quest_approved',
        '🎉 Your Quest is Now Live!',
        `"${cq.title}" was approved by admin and is now an official quest!`,
        { communityQuestId: cq._id, questId: quest._id }
      );

      await audit(req.user._id, 'approve_community_quest', 'community_quest', cq._id, reason, { promotedQuestId: quest._id });
      return sendSuccess(res, { quest }, 'Community quest approved and promoted to official quest');

    } else if (action === 'reject') {
      await CommunityQuest.findByIdAndUpdate(req.params.id, {
        status: 'rejected',
        moderatedBy: req.user._id,
        moderatedAt: new Date(),
        moderationNote: reason || '',
      });

      await createNotification(cq.submittedBy, 'community_quest_rejected',
        '❌ Quest Submission Rejected',
        `"${cq.title}" was rejected. Reason: ${reason || 'Did not meet guidelines'}`,
        { communityQuestId: cq._id }
      );

      await audit(req.user._id, 'reject_community_quest', 'community_quest', cq._id, reason);
      return sendSuccess(res, {}, 'Community quest rejected');
    }

    return sendError(res, 'action must be "approve" or "reject"', 400);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/audit-logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.adminId) filter.adminId = req.query.adminId;
    if (req.query.action) filter.action = req.query.action;
    if (req.query.targetType) filter.targetType = req.query.targetType;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('adminId', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return sendPaginated(res, { data: logs, total, page, limit });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/leaderboard/refresh
 * Manually trigger leaderboard refresh
 */
const triggerLeaderboardRefresh = async (req, res, next) => {
  try {
    const result = await refreshLeaderboards();
    return sendSuccess(res, result, 'Leaderboard refreshed');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboard, adminListSubmissions, moderateSubmission,
  adminListUsers, banUser, unbanUser, warnUser, changeUserRole, adjustXP,
  adminListCommunityQuests, moderateCommunityQuest,
  getAuditLogs, triggerLeaderboardRefresh,
};
