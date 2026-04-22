const Submission = require('../models/Submission');
const Vote = require('../models/Vote');
const User = require('../models/User');
const Quest = require('../models/Quest');
const { calculateVoteWeight } = require('../helpers/xp.helper');
const { awardXP, applySubmissionPenalty, createNotification } = require('./gamification.service');

const MIN_VOTES = () => parseInt(process.env.MIN_VOTES_REQUIRED || '10');
const APPROVAL_THRESHOLD = () => parseFloat(process.env.APPROVAL_THRESHOLD || '0.70');
const CONTROVERSIAL_LOWER = 0.55;
const CONTROVERSIAL_UPPER = 0.75;

/**
 * Cast, change, or retract a vote on a submission.
 *  - Same voteType as existing → RETRACT (returns action:'retracted')
 *  - Different voteType to existing → CHANGE  (returns action:'changed')
 *  - No existing vote → CREATE             (returns action:'created')
 */
const castVote = async (submissionId, voterId, voteType) => {
  // Load submission
  const submission = await Submission.findById(submissionId).populate('questId');
  if (!submission) throw Object.assign(new Error('Submission not found'), { statusCode: 404 });
  if (submission.status !== 'pending') {
    throw Object.assign(new Error('This submission has already been resolved'), { statusCode: 409 });
  }

  // Load voter
  const voter = await User.findById(voterId);
  if (!voter) throw Object.assign(new Error('Voter not found'), { statusCode: 404 });

  // Prevent submitter from voting on their own submission
  if (submission.userId.toString() === voterId.toString()) {
    throw Object.assign(new Error('You cannot vote on your own submission'), { statusCode: 403 });
  }

  // Reputation gate
  if (voter.reputation < 10) {
    throw Object.assign(new Error('Minimum reputation of 10 required to vote'), { statusCode: 403 });
  }

  const weight = calculateVoteWeight(voter.xp);

  // Check for existing vote
  const existingVote = await Vote.findOne({ submissionId, voterId });

  let action;
  let vote;

  if (existingVote) {
    if (existingVote.voteType === voteType) {
      // Same vote → RETRACT
      await Vote.findByIdAndDelete(existingVote._id);
      action = 'retracted';
      vote = null;
    } else {
      // Different vote type → CHANGE
      existingVote.voteType = voteType;
      existingVote.weight = weight;
      existingVote.voterXpAtVote = voter.xp;
      await existingVote.save();
      action = 'changed';
      vote = existingVote;
    }
  } else {
    // New vote
    vote = await Vote.create({
      submissionId,
      voterId,
      voteType,
      weight,
      voterXpAtVote: voter.xp,
      voterLevelAtVote: voter.level,
    });
    // Update voter stats & award XP (only for new votes, not changes/retracts)
    await User.findByIdAndUpdate(voterId, { $inc: { totalVotesCast: 1 } });
    await awardXP(voterId, 1, 'Voted on submission');
    action = 'created';
  }

  // Recompute submission vote stats for all actions
  await recomputeSubmissionStats(submissionId);

  return { action, vote };
};


/**
 * Recompute all vote stats for a submission and update its status.
 * Called after every vote cast or revoked.
 */
const recomputeSubmissionStats = async (submissionId) => {
  const votes = await Vote.find({ submissionId });

  const rawVoteCount = votes.length;
  const legitimVotes = votes.filter((v) => v.voteType === 'legit').length;
  const notLegitVotes = votes.filter((v) => v.voteType === 'not_legit').length;

  const weightedLegitTotal = votes
    .filter((v) => v.voteType === 'legit')
    .reduce((sum, v) => sum + v.weight, 0);

  const weightedVoteTotal = votes.reduce((sum, v) => sum + v.weight, 0);

  const approvalPct = weightedVoteTotal > 0 ? weightedLegitTotal / weightedVoteTotal : 0;

  const isControversial =
    rawVoteCount >= MIN_VOTES() &&
    approvalPct >= CONTROVERSIAL_LOWER &&
    approvalPct < CONTROVERSIAL_UPPER;

  // Determine new status
  let newStatus = 'pending';
  if (rawVoteCount >= MIN_VOTES()) {
    newStatus = approvalPct >= APPROVAL_THRESHOLD() ? 'approved' : 'rejected';
  }

  const submission = await Submission.findById(submissionId);
  const oldStatus = submission.status;

  await Submission.findByIdAndUpdate(submissionId, {
    $set: {
      rawVoteCount,
      legitimVotes,
      notLegitVotes,
      weightedLegitTotal,
      weightedVoteTotal,
      approvalPct,
      isControversial,
      status: newStatus,
      resolvedAt: newStatus !== 'pending' ? new Date() : null,
    },
  });

  // Handle status transition (only fire once)
  if (oldStatus === 'pending' && newStatus === 'approved' && !submission.xpAwarded) {
    await handleApproval(submissionId);
  } else if (oldStatus === 'pending' && newStatus === 'rejected' && !submission.penaltyApplied) {
    await handleRejection(submissionId);
  }
};

/**
 * Handle a newly approved submission — award XP, update quest stats
 */
const handleApproval = async (submissionId) => {
  const submission = await Submission.findByIdAndUpdate(
    submissionId,
    { xpAwarded: true },
    { new: true }
  ).populate('questId');

  if (!submission || !submission.questId) return;

  const quest = submission.questId;
  const xpAmount = quest.xpReward;

  // Award XP to the submitter
  await awardXP(submission.userId, xpAmount, `Quest approved: ${quest.title}`);

  // Update submission with actual XP amount
  await Submission.findByIdAndUpdate(submissionId, { xpAmount });

  // Update user quest completion
  await User.findByIdAndUpdate(submission.userId, {
    $addToSet: { completedQuests: quest._id },
    $pull: { acceptedQuests: quest._id },
    $inc: { approvedSubmissions: 1 },
  });

  // Update quest stats
  await Quest.findByIdAndUpdate(quest._id, { $inc: { completedCount: 1 } });

  // Notify submitter
  await createNotification(
    submission.userId,
    'submission_approved',
    '✅ Quest Approved!',
    `Your submission for "${quest.title}" was approved! +${xpAmount} XP`,
    { submissionId, questId: quest._id, xpAwarded: xpAmount }
  );
};

/**
 * Handle a newly rejected submission — apply penalties
 */
const handleRejection = async (submissionId) => {
  const submission = await Submission.findByIdAndUpdate(
    submissionId,
    { penaltyApplied: true },
    { new: true }
  ).populate('questId');

  if (!submission) return;

  await applySubmissionPenalty(submission.userId, `Quest rejected: ${submission.questId?.title}`);

  await User.findByIdAndUpdate(submission.userId, {
    $pull: { acceptedQuests: submission.questId },
  });

  await createNotification(
    submission.userId,
    'submission_rejected',
    '❌ Quest Rejected',
    `Your submission was rejected by the community. -20 XP. Review guidelines and try again.`,
    { submissionId, questId: submission.questId }
  );
};

/**
 * Get vote summary for a submission
 */
const getVoteSummary = async (submissionId, requestingUserId = null) => {
  const submission = await Submission.findById(submissionId, {
    rawVoteCount: 1, legitimVotes: 1, notLegitVotes: 1,
    approvalPct: 1, isControversial: 1, status: 1, weightedVoteTotal: 1,
  });

  if (!submission) return null;

  let userVote = null;
  if (requestingUserId) {
    const vote = await Vote.findOne({ submissionId, voterId: requestingUserId });
    userVote = vote ? vote.voteType : null;
  }

  return {
    rawVoteCount: submission.rawVoteCount,
    legitimVotes: submission.legitimVotes,
    notLegitVotes: submission.notLegitVotes,
    approvalPct: Math.round(submission.approvalPct * 100),
    isControversial: submission.isControversial,
    status: submission.status,
    votesNeeded: Math.max(0, MIN_VOTES() - submission.rawVoteCount),
    userVote,
  };
};

module.exports = { castVote, recomputeSubmissionStats, getVoteSummary, handleApproval, handleRejection };
