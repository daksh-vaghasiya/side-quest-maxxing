const mongoose = require('mongoose');

const communityQuestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 2000 },
    category: {
      type: String,
      required: true,
      enum: ['fitness', 'mindfulness', 'creativity', 'social',
             'learning', 'outdoor', 'food', 'tech', 'finance', 'other'],
    },
    difficulty: { type: String, required: true, enum: ['Easy', 'Medium', 'Hard', 'Legendary'] },
    suggestedXpReward: { type: Number, required: true, min: 10, max: 1000 },
    requirements: [{ type: String, maxlength: 200 }],
    tags: [{ type: String, trim: true, maxlength: 30 }],

    // ── Creator ───────────────────────────────────────────────────────────────
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // ── Community Voting ──────────────────────────────────────────────────────
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    upvoteCount: { type: Number, default: 0 },
    downvoteCount: { type: Number, default: 0 },

    // ── Moderation Status ─────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'auto_approved'],
      default: 'pending',
    },
    moderationNote: { type: String, default: '' },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    moderatedAt: { type: Date, default: null },

    // ── Auto-approval ─────────────────────────────────────────────────────────
    autoApproveThreshold: {
      type: Number,
      default: parseInt(process.env.COMMUNITY_QUEST_UPVOTE_THRESHOLD || '20'),
    },

    // ── Promoted Quest ────────────────────────────────────────────────────────
    // Set after admin converts this to an official Quest
    promotedQuestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quest', default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
communityQuestSchema.index({ status: 1, upvoteCount: -1 });
communityQuestSchema.index({ submittedBy: 1 });
communityQuestSchema.index({ title: 'text', description: 'text' });

// ── Virtual: Net vote score ───────────────────────────────────────────────────
communityQuestSchema.virtual('score').get(function () {
  return this.upvoteCount - this.downvoteCount;
});

module.exports = mongoose.model('CommunityQuest', communityQuestSchema);
