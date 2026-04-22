const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'submission_approved',
  'submission_rejected',
  'submission_flagged',
  'level_up',
  'badge_earned',
  'vote_received',
  'comment_received',
  'like_received',
  'streak_warning',
  'streak_broken',
  'warning_received',
  'ban_notice',
  'community_quest_approved',
  'community_quest_rejected',
  'quest_accepted',
  'rank_change',
];

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, enum: NOTIFICATION_TYPES },
    title: { type: String, required: true, maxlength: 100 },
    message: { type: String, required: true, maxlength: 500 },
    read: { type: Boolean, default: false },
    // Extra data to link the notification to its source
    metadata: {
      submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', default: null },
      questId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quest', default: null },
      commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
      communityQuestId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityQuest', default: null },
      fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      xpAwarded: { type: Number, default: null },
      newLevel: { type: String, default: null },
      badgeName: { type: String, default: null },
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // Auto-delete after 90 days

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
