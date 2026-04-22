const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const CommunityQuest = require('../models/CommunityQuest');
const Quest = require('../models/Quest');
const User = require('../models/User');
const { sendSuccess, sendCreated, sendError, sendNotFound, sendPaginated } = require('../helpers/response.helper');
const { parsePagination, buildSortObject } = require('../helpers/pagination.helper');
const { awardXP, checkAndAwardBadges, createNotification } = require('../services/gamification.service');

const AUTO_APPROVE_THRESHOLD = () => parseInt(process.env.COMMUNITY_QUEST_UPVOTE_THRESHOLD || '20');

const communityQuestRules = [
  body('title').trim().isLength({ min: 5, max: 100 }),
  body('description').trim().isLength({ min: 20, max: 2000 }),
  body('category').isIn(['fitness', 'mindfulness', 'creativity', 'social', 'learning', 'outdoor', 'food', 'tech', 'finance', 'other']),
  body('difficulty').isIn(['Easy', 'Medium', 'Hard', 'Legendary']),
  body('suggestedXpReward').isInt({ min: 10, max: 1000 }),
];

/**
 * GET /api/community-quests
 */
const listCommunityQuests = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = buildSortObject(req.query.sort || '-upvoteCount', ['upvoteCount', 'createdAt']);

    const filter = {};
    if (!req.query.status || req.user?.role === 'user') {
      filter.status = { $in: ['pending', 'auto_approved'] };
    } else if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.category) filter.category = req.query.category;

    const [quests, total] = await Promise.all([
      CommunityQuest.find(filter)
        .populate('submittedBy', 'username avatar level')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      CommunityQuest.countDocuments(filter),
    ]);

    const userId = req.user?._id?.toString();
    const enriched = quests.map((q) => ({
      ...q,
      hasUpvoted: userId ? q.upvotes?.some((id) => id.toString() === userId) : false,
      hasDownvoted: userId ? q.downvotes?.some((id) => id.toString() === userId) : false,
    }));

    return sendPaginated(res, { data: enriched, total, page, limit });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/community-quests/:id
 */
const getCommunityQuest = async (req, res, next) => {
  try {
    const quest = await CommunityQuest.findById(req.params.id)
      .populate('submittedBy', 'username avatar level badges')
      .populate('moderatedBy', 'username')
      .lean();
    if (!quest) return sendNotFound(res, 'Community Quest');
    return sendSuccess(res, { quest });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/community-quests
 */
const submitCommunityQuest = [
  ...communityQuestRules, validate,
  async (req, res, next) => {
    try {
      const { title, description, category, difficulty, suggestedXpReward, requirements, tags } = req.body;

      const quest = await CommunityQuest.create({
        title, description, category, difficulty,
        suggestedXpReward: parseInt(suggestedXpReward),
        requirements: requirements || [],
        tags: tags || [],
        submittedBy: req.user._id,
      });

      return sendCreated(res, { quest }, 'Community quest submitted! Others can now vote on it.');
    } catch (err) {
      next(err);
    }
  },
];

/**
 * POST /api/community-quests/:id/vote
 * Upvote or downvote a community quest
 */
const voteOnCommunityQuest = async (req, res, next) => {
  try {
    const { direction } = req.body; // 'up' | 'down'
    if (!['up', 'down'].includes(direction)) {
      return sendError(res, 'direction must be "up" or "down"', 400);
    }

    const quest = await CommunityQuest.findById(req.params.id);
    if (!quest) return sendNotFound(res, 'Community Quest');
    if (['approved', 'rejected'].includes(quest.status)) {
      return sendError(res, 'Voting is closed for this quest', 409);
    }

    const userId = req.user._id;
    const hasUpvoted = quest.upvotes.some((id) => id.toString() === userId.toString());
    const hasDownvoted = quest.downvotes.some((id) => id.toString() === userId.toString());

    if (direction === 'up') {
      if (hasUpvoted) {
        quest.upvotes.pull(userId); quest.upvoteCount--;
      } else {
        quest.upvotes.push(userId); quest.upvoteCount++;
        if (hasDownvoted) { quest.downvotes.pull(userId); quest.downvoteCount--; }
      }
    } else {
      if (hasDownvoted) {
        quest.downvotes.pull(userId); quest.downvoteCount--;
      } else {
        quest.downvotes.push(userId); quest.downvoteCount++;
        if (hasUpvoted) { quest.upvotes.pull(userId); quest.upvoteCount--; }
      }
    }

    // Auto-approve if threshold reached
    if (quest.upvoteCount >= AUTO_APPROVE_THRESHOLD() && quest.status === 'pending') {
      quest.status = 'auto_approved';
      // Notify creator
      await createNotification(
        quest.submittedBy, 'community_quest_approved',
        '🎉 Your Quest Was Auto-Approved!',
        `"${quest.title}" reached ${AUTO_APPROVE_THRESHOLD()} upvotes and is now pending admin review.`,
        { communityQuestId: quest._id }
      );
      // Award XP to creator
      await awardXP(quest.submittedBy, 50, 'Community quest auto-approved');
    }

    await quest.save();
    return sendSuccess(res, { upvoteCount: quest.upvoteCount, downvoteCount: quest.downvoteCount, status: quest.status });
  } catch (err) {
    next(err);
  }
};

module.exports = { listCommunityQuests, getCommunityQuest, submitCommunityQuest, voteOnCommunityQuest };
