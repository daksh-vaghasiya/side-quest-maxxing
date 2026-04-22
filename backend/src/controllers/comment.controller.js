const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const Comment = require('../models/Comment');
const Submission = require('../models/Submission');
const CommunityQuest = require('../models/CommunityQuest');
const { sendSuccess, sendCreated, sendError, sendNotFound, sendForbidden, sendPaginated } = require('../helpers/response.helper');
const { parsePagination } = require('../helpers/pagination.helper');
const { awardXP } = require('../services/gamification.service');

const commentRules = [
  body('text').trim().isLength({ min: 1, max: 500 }).withMessage('Comment must be 1-500 characters'),
  body('parentId').optional().isMongoId(),
];

const VALID_TARGETS = ['submission', 'community_quest'];

/**
 * GET /api/comments/:targetType/:targetId
 */
const getComments = async (req, res, next) => {
  try {
    const { targetType, targetId } = req.params;
    if (!VALID_TARGETS.includes(targetType)) return sendError(res, 'Invalid target type', 400);

    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });

    const filter = { targetId, targetType, isDeleted: false, parentId: null }; // Top-level only

    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .populate('authorId', 'username avatar level badges')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Comment.countDocuments(filter),
    ]);

    // Attach user like status and replies count
    const userId = req.user?._id?.toString();
    const enriched = comments.map((c) => ({
      ...c,
      isLiked: userId ? c.likes?.some((id) => id.toString() === userId) : false,
    }));

    return sendPaginated(res, { data: enriched, total, page, limit });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/comments/:targetType/:targetId/replies/:parentId
 */
const getReplies = async (req, res, next) => {
  try {
    const { parentId } = req.params;
    const replies = await Comment.find({ parentId, isDeleted: false })
      .populate('authorId', 'username avatar level')
      .sort({ createdAt: 1 })
      .lean();
    return sendSuccess(res, { replies });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/comments/:targetType/:targetId
 */
const addComment = [
  ...commentRules, validate,
  async (req, res, next) => {
    try {
      const { targetType, targetId } = req.params;
      if (!VALID_TARGETS.includes(targetType)) return sendError(res, 'Invalid target type', 400);

      const { text, parentId } = req.body;

      // Verify target exists
      let target;
      if (targetType === 'submission') target = await Submission.findById(targetId);
      else target = await CommunityQuest.findById(targetId);
      if (!target) return sendNotFound(res, targetType);

      const comment = await Comment.create({
        targetId, targetType,
        authorId: req.user._id,
        text,
        parentId: parentId || null,
      });

      // Update comment count on target
      if (targetType === 'submission') {
        await Submission.findByIdAndUpdate(targetId, { $inc: { commentCount: 1 } });
      }

      // Update parent reply count
      if (parentId) {
        await Comment.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
      }

      // Award XP for commenting
      await awardXP(req.user._id, 1, 'Posted a comment');

      const populated = await Comment.findById(comment._id)
        .populate('authorId', 'username avatar level badges');

      return sendCreated(res, { comment: populated }, 'Comment posted');
    } catch (err) {
      next(err);
    }
  },
];

/**
 * DELETE /api/comments/:id
 */
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return sendNotFound(res, 'Comment');

    const isOwner = comment.authorId.toString() === req.user._id.toString();
    const isModerator = ['admin', 'moderator'].includes(req.user.role);

    if (!isOwner && !isModerator) return sendForbidden(res);

    comment.isDeleted = true;
    comment.text = '[deleted]';
    comment.deletedAt = new Date();
    await comment.save();

    // Decrement comment count on submission
    if (comment.targetType === 'submission') {
      await Submission.findByIdAndUpdate(comment.targetId, { $inc: { commentCount: -1 } });
    }

    return sendSuccess(res, {}, 'Comment deleted');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/comments/:id/like
 */
const toggleLike = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment || comment.isDeleted) return sendNotFound(res, 'Comment');

    const userId = req.user._id;
    const isLiked = comment.likes.some((id) => id.toString() === userId.toString());

    if (isLiked) {
      comment.likes.pull(userId);
      comment.likeCount = Math.max(0, comment.likeCount - 1);
    } else {
      comment.likes.push(userId);
      comment.likeCount = comment.likeCount + 1;
    }

    await comment.save();
    return sendSuccess(res, { isLiked: !isLiked, likeCount: comment.likeCount });
  } catch (err) {
    next(err);
  }
};

module.exports = { getComments, getReplies, addComment, deleteComment, toggleLike };
