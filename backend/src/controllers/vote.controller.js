const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { castVote, getVoteSummary } = require('../services/validation.service');
const Vote = require('../models/Vote');
const { sendSuccess, sendCreated, sendError, sendNotFound, sendPaginated } = require('../helpers/response.helper');
const { parsePagination } = require('../helpers/pagination.helper');

const voteRules = [
  body('voteType').isIn(['legit', 'not_legit']).withMessage('voteType must be "legit" or "not_legit"'),
];

/**
 * POST /api/votes/:submissionId
 * Cast a vote on a submission
 */
const vote = [
  ...voteRules, validate,
  async (req, res, next) => {
    try {
      const { submissionId } = req.params;
      const { voteType } = req.body;

      const result = await castVote(submissionId, req.user._id, voteType);
      const summary = await getVoteSummary(submissionId, req.user._id);

      const messages = {
        created:   `Voted ${voteType === 'legit' ? '\u2705 Legit' : '\u274c Not Legit'}!`,
        changed:   `Vote changed to ${voteType === 'legit' ? '\u2705 Legit' : '\u274c Not Legit'}!`,
        retracted: '\uD83D\uDDF3\uFE0F Vote retracted.',
      };

      return sendSuccess(res, { action: result.action, summary }, messages[result.action] || 'Vote recorded');
    } catch (err) {
      if (err.statusCode) return sendError(res, err.message, err.statusCode);
      next(err);
    }
  },
];

/**
 * GET /api/votes/:submissionId
 * Get vote stats for a submission
 */
const getVotes = async (req, res, next) => {
  try {
    const summary = await getVoteSummary(req.params.submissionId, req.user?._id);
    if (!summary) return sendNotFound(res, 'Submission');
    return sendSuccess(res, { summary });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/votes/:submissionId/list
 * Get paginated list of votes for a submission (admin/moderator only)
 */
const listVotes = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { submissionId: req.params.submissionId };
    if (req.query.voteType) filter.voteType = req.query.voteType;

    const [votes, total] = await Promise.all([
      Vote.find(filter)
        .populate('voterId', 'username avatar level xp')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Vote.countDocuments(filter),
    ]);

    return sendPaginated(res, { data: votes, total, page, limit });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/votes/my
 * Get all votes cast by the current user
 */
const getMyVotes = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [votes, total] = await Promise.all([
      Vote.find({ voterId: req.user._id })
        .populate('submissionId', 'status approvalPct questId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Vote.countDocuments({ voterId: req.user._id }),
    ]);

    return sendPaginated(res, { data: votes, total, page, limit });
  } catch (err) {
    next(err);
  }
};

module.exports = { vote, getVotes, listVotes, getMyVotes };
