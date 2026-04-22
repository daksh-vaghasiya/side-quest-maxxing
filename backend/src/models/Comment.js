const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    // ── Polymorphic target ────────────────────────────────────────────────────
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    targetType: {
      type: String,
      enum: ['submission', 'community_quest'],
      required: true,
    },

    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 500 },

    // ── Likes ─────────────────────────────────────────────────────────────────
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likeCount: { type: Number, default: 0 },

    // ── Threading (replies) ───────────────────────────────────────────────────
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    replyCount: { type: Number, default: 0 },

    // ── Moderation ────────────────────────────────────────────────────────────
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    flaggedForReview: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
commentSchema.index({ targetId: 1, targetType: 1, createdAt: -1 });
commentSchema.index({ authorId: 1, createdAt: -1 });
commentSchema.index({ parentId: 1 });

module.exports = mongoose.model('Comment', commentSchema);
