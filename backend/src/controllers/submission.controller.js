const { body } = require('express-validator');
const Submission = require('../models/Submission');
const Quest = require('../models/Quest');
const User = require('../models/User');
const Vote = require('../models/Vote');
const { sendSuccess, sendCreated, sendError, sendNotFound, sendPaginated, sendForbidden } = require('../helpers/response.helper');
const { parsePagination, buildSortObject } = require('../helpers/pagination.helper');
const { validate } = require('../middleware/validate');
const { getVoteSummary } = require('../services/validation.service');

const submitRules = [
  body('questId').isMongoId(),
  body('description').optional().isLength({ max: 1000 }),
];

const flagRules = [
  body('reason').trim().isLength({ min: 5, max: 200 }).withMessage('Reason must be 5-200 characters'),
];

/**
 * POST /api/submissions
 * Create a new submission with uploaded media
 */
const createSubmission = [
  ...submitRules, validate,
  async (req, res, next) => {
    try {
      const { questId, description } = req.body;
      const user = req.user;

      // Check submission ban
      if (user.submissionBanExpiresAt && user.submissionBanExpiresAt > new Date()) {
        return sendError(res, `Submission banned until ${user.submissionBanExpiresAt.toISOString()}`, 403, 'SUBMISSION_BANNED');
      }

      // Validate quest exists and is active
      const quest = await Quest.findById(questId);
      if (!quest) return sendNotFound(res, 'Quest');
      if (quest.status !== 'active') return sendError(res, 'Quest is no longer active', 400);

      // Check user has accepted this quest
      if (!user.acceptedQuests.some((q) => q.toString() === questId)) {
        return sendError(res, 'You must accept the quest before submitting proof', 403);
      }

      // Check for existing submission (one per quest per user, unless repeatable)
      if (!quest.isRepeatable) {
        const existing = await Submission.findOne({ questId, userId: user._id });
        if (existing) return sendError(res, 'You have already submitted for this quest', 409);
      }

      // Require media files
      if (!req.files || req.files.length === 0) {
        return sendError(res, 'At least one media file (image or video) is required', 400);
      }

      const mediaUrls = req.files.map((f) => f.path);
      const mediaTypes = req.files.map((f) => (f.mimetype.startsWith('video/') ? 'video' : 'image'));

      const submission = await Submission.create({
        questId,
        userId: user._id,
        mediaUrls,
        mediaTypes,
        description: description || '',
      });

      // Update user and quest stats
      await User.findByIdAndUpdate(user._id, { $inc: { totalSubmissions: 1 } });
      await Quest.findByIdAndUpdate(questId, { $inc: { submissionCount: 1 } });

      const populated = await Submission.findById(submission._id)
        .populate('questId', 'title category difficulty xpReward')
        .populate('userId', 'username avatar level');

      return sendCreated(res, { submission: populated }, 'Submission created! It is now pending community validation.');
    } catch (err) {
      next(err);
    }
  },
];

/**
 * GET /api/submissions
 * List submissions (public feed - approved only, or all with filters for admin)
 */
const listSubmissions = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'moderator';

    const filter = {};
    if (!isAdmin) filter.status = 'approved'; // Public sees only approved
    if (req.query.status && isAdmin) filter.status = req.query.status;
    if (req.query.questId) filter.questId = req.query.questId;
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.controversial === 'true') filter.isControversial = true;
    if (req.query.flagged === 'true' && isAdmin) filter.flaggedForReview = true;

    const [submissions, total] = await Promise.all([
      Submission.find(filter)
        .populate('questId', 'title category difficulty xpReward')
        .populate('userId', 'username avatar level badges')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Submission.countDocuments(filter),
    ]);

    return sendPaginated(res, { data: submissions, total, page, limit });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/submissions/feed
 * Social feed — approved submissions, sorted by recency, includes vote summary
 */
const getFeed = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 15 });

    // Feed shows approved (showcase) AND pending (needs community votes)
    // Filter by specific status with ?status=approved|pending|rejected
    const filter = {};
    const allowedStatuses = ['approved', 'pending', 'rejected'];
    if (req.query.status && allowedStatuses.includes(req.query.status)) {
      filter.status = req.query.status;
    } else {
      filter.status = { $in: ['approved', 'pending'] };
    }

    if (req.query.category) {
      // Filter by quest category via lookup
      const quests = await Quest.find({ category: req.query.category }).select('_id');
      filter.questId = { $in: quests.map((q) => q._id) };
    }

    const [submissions, total] = await Promise.all([
      Submission.find(filter)
        .populate('questId', 'title category difficulty xpReward')
        .populate('userId', 'username avatar level badges')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Submission.countDocuments(filter),
    ]);

    // Enrich: attach user's like status, vote direction, and normalise approvalPct to 0-100
    const userId = req.user?._id;
    const enriched = await (async () => {
      if (!userId) {
        return submissions.map((s) => ({
          ...s,
          isLiked: false,
          hasUserVoted: null,
          approvalPct: Math.round((s.approvalPct ?? 0) * 100),
        }));
      }
      const submissionIds = submissions.map((s) => s._id);
      const userVotes = await Vote.find({ submissionId: { $in: submissionIds }, voterId: userId }).lean();
      const votesMap = {};
      userVotes.forEach((v) => { votesMap[v.submissionId.toString()] = v.voteType; });
      return submissions.map((s) => ({
        ...s,
        isLiked: s.likes?.some((id) => id.toString() === userId.toString()) ?? false,
        hasUserVoted: votesMap[s._id.toString()] ?? null,
        approvalPct: Math.round((s.approvalPct ?? 0) * 100),
      }));
    })();

    return sendPaginated(res, { data: enriched, total, page, limit, message: 'Feed loaded' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/submissions/my
 * Get the current user's submissions
 */
const getMySubmissions = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { userId: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const [submissions, total] = await Promise.all([
      Submission.find(filter)
        .populate('questId', 'title category difficulty xpReward')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Submission.countDocuments(filter),
    ]);

    return sendPaginated(res, { data: submissions, total, page, limit });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/submissions/:id
 */
const getSubmission = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('questId', 'title description category difficulty xpReward')
      .populate('userId', 'username avatar level badges')
      .populate('moderatedBy', 'username')
      .lean();

    if (!submission) return sendNotFound(res, 'Submission');

    // Include vote summary
    const voteSummary = await getVoteSummary(submission._id, req.user?._id);

    return sendSuccess(res, { submission: { ...submission, voteSummary } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/submissions/:id/like
 * Toggle like on a submission
 */
const toggleLike = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return sendNotFound(res, 'Submission');

    const userId = req.user._id;
    const isLiked = submission.likes.some((id) => id.toString() === userId.toString());

    if (isLiked) {
      submission.likes.pull(userId);
      submission.likeCount = Math.max(0, submission.likeCount - 1);
    } else {
      submission.likes.push(userId);
      submission.likeCount = submission.likeCount + 1;
    }

    await submission.save();

    return sendSuccess(res, { isLiked: !isLiked, likeCount: submission.likeCount });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/submissions/:id/flag
 * Flag a submission for review
 */
const flagSubmission = [
  ...flagRules, validate,
  async (req, res, next) => {
    try {
      const { reason } = req.body;
      const submission = await Submission.findByIdAndUpdate(
        req.params.id,
        { flaggedForReview: true, flagReason: reason },
        { new: true }
      );
      if (!submission) return sendNotFound(res, 'Submission');
      return sendSuccess(res, {}, 'Submission flagged for review');
    } catch (err) {
      next(err);
    }
  },
];

module.exports = { createSubmission, listSubmissions, getFeed, getMySubmissions, getSubmission, toggleLike, flagSubmission };
