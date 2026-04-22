const { body, query, param } = require('express-validator');
const Quest = require('../models/Quest');
const User = require('../models/User');
const Submission = require('../models/Submission');
const { sendSuccess, sendCreated, sendError, sendNotFound, sendPaginated } = require('../helpers/response.helper');
const { parsePagination, parseSearch, buildSortObject } = require('../helpers/pagination.helper');
const { validate } = require('../middleware/validate');
const { CATEGORIES, DIFFICULTIES } = require('../models/Quest');

const questRules = [
  body('title').trim().isLength({ min: 5, max: 100 }),
  body('description').trim().isLength({ min: 20, max: 2000 }),
  body('category').isIn(CATEGORIES),
  body('difficulty').isIn(DIFFICULTIES),
  body('xpReward').isInt({ min: 10, max: 1000 }),
  body('requirements').optional().isArray(),
  body('tags').optional().isArray(),
  body('timeLimitDays').optional().isInt({ min: 1, max: 365 }),
  body('isRepeatable').optional().isBoolean(),
];

const updateQuestRules = [
  body('title').optional().trim().isLength({ min: 5, max: 100 }),
  body('description').optional().trim().isLength({ min: 20, max: 2000 }),
  body('category').optional().isIn(CATEGORIES),
  body('difficulty').optional().isIn(DIFFICULTIES),
  body('xpReward').optional().isInt({ min: 10, max: 1000 }),
  body('requirements').optional().isArray(),
  body('tags').optional().isArray(),
  body('timeLimitDays').optional().isInt({ min: 1, max: 365 }),
  body('isRepeatable').optional().isBoolean(),
];

/**
 * GET /api/quests
 * List quests with filtering, search, sorting, pagination
 */
const listQuests = async (req, res, next) => {
  try {
    const { page, limit, skip, sort } = parsePagination(req.query, { defaultLimit: 20 });
    const allowedSort = ['createdAt', 'xpReward', 'difficulty', 'completedCount', 'acceptedCount'];
    const sortObj = buildSortObject(sort, allowedSort);

    const filter = { status: 'active' };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    if (req.query.isOfficial !== undefined) filter.isOfficial = req.query.isOfficial === 'true';
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { category: { $regex: req.query.search, $options: 'i' } },
        { difficulty: { $regex: req.query.search, $options: 'i' } },
        { tags: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [quests, total] = await Promise.all([
      Quest.find(filter)
        .populate('createdBy', 'username avatar level')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Quest.countDocuments(filter),
    ]);

    // Attach user's acceptance status if authenticated
    let acceptedSet = new Set();
    let completedSet = new Set();
    let userSubmissions = {};
    if (req.user) {
      acceptedSet = new Set(req.user.acceptedQuests.map((id) => id.toString()));
      completedSet = new Set(req.user.completedQuests.map((id) => id.toString()));
      const subs = await Submission.find({ userId: req.user._id }).select('questId status').lean();
      subs.forEach((s) => {
        userSubmissions[s.questId.toString()] = s.status;
      });
    }

    const enriched = quests.map((q) => {
      const qid = q._id.toString();
      return {
        ...q,
        isAccepted: acceptedSet.has(qid),
        isCompleted: completedSet.has(qid),
        submissionStatus: userSubmissions[qid] || null,
      };
    });

    return sendPaginated(res, { data: enriched, total, page, limit });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/quests/:id
 */
const getQuest = async (req, res, next) => {
  try {
    const quest = await Quest.findById(req.params.id)
      .populate('createdBy', 'username avatar level badges')
      .lean();
    if (!quest) return sendNotFound(res, 'Quest');

    let userStatus = 'none';
    let submissionStatus = null;
    if (req.user) {
      if (req.user.completedQuests.includes(quest._id)) userStatus = 'completed';
      else if (req.user.acceptedQuests.includes(quest._id)) userStatus = 'accepted';

      const sub = await Submission.findOne({ userId: req.user._id, questId: quest._id }).lean();
      if (sub) {
        submissionStatus = sub.status;
      }
    }

    return sendSuccess(res, { quest: { ...quest, userStatus, submissionStatus } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/quests/:id/accept
 */
const acceptQuest = async (req, res, next) => {
  try {
    const quest = await Quest.findById(req.params.id);
    if (!quest) return sendNotFound(res, 'Quest');
    if (quest.status !== 'active') return sendError(res, 'This quest is not active', 400);

    const user = req.user;
    const alreadyAccepted = user.acceptedQuests.includes(quest._id);
    const alreadyCompleted = user.completedQuests.includes(quest._id);

    if (alreadyCompleted && !quest.isRepeatable) {
      return sendError(res, 'You have already completed this quest', 409);
    }
    if (alreadyAccepted) return sendError(res, 'You have already accepted this quest', 409);

    await User.findByIdAndUpdate(user._id, { $addToSet: { acceptedQuests: quest._id } });
    await Quest.findByIdAndUpdate(quest._id, { $inc: { acceptedCount: 1 } });

    return sendSuccess(res, { questId: quest._id }, 'Quest accepted! Good luck!');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/quests/:id/abandon
 */
const abandonQuest = async (req, res, next) => {
  try {
    const quest = await Quest.findById(req.params.id);
    if (!quest) return sendNotFound(res, 'Quest');

    await User.findByIdAndUpdate(req.user._id, { $pull: { acceptedQuests: quest._id } });
    await Quest.findByIdAndUpdate(quest._id, { $inc: { acceptedCount: -1 } });

    return sendSuccess(res, {}, 'Quest abandoned');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/quests (admin only)
 */
const createQuest = [
  ...questRules, validate,
  async (req, res, next) => {
    try {
      const { title, description, category, difficulty, xpReward, requirements, tags, timeLimitDays, isRepeatable } = req.body;
      const questData = {
        title, description, category, difficulty,
        xpReward: parseInt(xpReward),
        requirements: requirements || [],
        tags: tags || [],
        timeLimitDays: timeLimitDays || null,
        isRepeatable: isRepeatable || false,
        isOfficial: true,
        createdBy: req.user._id,
      };
      if (req.file?.path) questData.coverImage = req.file.path;
      const quest = await Quest.create(questData);
      return sendCreated(res, { quest }, 'Quest created');
    } catch (err) {
      next(err);
    }
  },
];

/**
 * PATCH /api/quests/:id (admin only)
 */
const updateQuest = [
  ...updateQuestRules, validate,
  async (req, res, next) => {
    try {
      const allowed = ['title', 'description', 'category', 'difficulty', 'xpReward', 'status', 'requirements', 'tags', 'timeLimitDays', 'isRepeatable'];
      const updates = {};
      allowed.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });
      if (req.file?.path) updates.coverImage = req.file.path;

      const quest = await Quest.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
      if (!quest) return sendNotFound(res, 'Quest');

      return sendSuccess(res, { quest }, 'Quest updated');
    } catch (err) {
      next(err);
    }
  },
];

/**
 * DELETE /api/quests/:id (admin only)
 */
const deleteQuest = async (req, res, next) => {
  try {
    const quest = await Quest.findByIdAndUpdate(req.params.id, { status: 'archived' });
    if (!quest) return sendNotFound(res, 'Quest');
    return sendSuccess(res, {}, 'Quest archived');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/quests/categories
 */
const getCategories = (req, res) => {
  return sendSuccess(res, { categories: CATEGORIES, difficulties: DIFFICULTIES });
};

module.exports = { listQuests, getQuest, acceptQuest, abandonQuest, createQuest, updateQuest, deleteQuest, getCategories };
