const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    questId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quest', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // ── Proof Media (Cloudinary URLs only) ────────────────────────────────────
    mediaUrls: {
      type: [{ type: String }],
      required: true,
      validate: {
        validator: (arr) => arr.length >= 1 && arr.length <= 5,
        message: 'Must provide 1 to 5 media files',
      },
    },
    mediaTypes: [{ type: String, enum: ['image', 'video'] }], // matches mediaUrls

    description: { type: String, maxlength: 1000, default: '' },

    // ── Vote Stats (denormalized for fast access) ─────────────────────────────
    rawVoteCount: { type: Number, default: 0 },
    legitimVotes: { type: Number, default: 0 },
    notLegitVotes: { type: Number, default: 0 },
    weightedLegitTotal: { type: Number, default: 0.0 },
    weightedVoteTotal: { type: Number, default: 0.0 },
    approvalPct: { type: Number, default: 0.0, min: 0, max: 1 },

    // ── Resolution ────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    isControversial: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },

    // ── Gamification State Tracking ───────────────────────────────────────────
    xpAwarded: { type: Boolean, default: false },
    penaltyApplied: { type: Boolean, default: false },
    xpAmount: { type: Number, default: 0 }, // actual XP awarded/deducted

    // ── Social ────────────────────────────────────────────────────────────────
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },

    // ── Moderation ────────────────────────────────────────────────────────────
    flaggedForReview: { type: Boolean, default: false },
    flagReason: { type: String, default: '' },
    moderationNote: { type: String, default: '' },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    moderatedAt: { type: Date, default: null },
    isAdminOverride: { type: Boolean, default: false },

    // ── Spam Prevention ───────────────────────────────────────────────────────
    ipHash: { type: String, default: '' }, // hashed client IP, not stored raw
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// One submission per user per quest
submissionSchema.index({ questId: 1, userId: 1 }, { unique: true });
submissionSchema.index({ userId: 1, createdAt: -1 }); // Optimized for "My Submissions" feed
submissionSchema.index({ userId: 1, status: 1 });
submissionSchema.index({ status: 1, createdAt: -1 });
submissionSchema.index({ flaggedForReview: 1, status: 1 });
submissionSchema.index({ approvalPct: -1 });

// ── Virtuals ──────────────────────────────────────────────────────────────────
submissionSchema.virtual('isResolved').get(function () {
  return this.status !== 'pending';
});

submissionSchema.virtual('votesNeeded').get(function () {
  const MIN_VOTES = parseInt(process.env.MIN_VOTES_REQUIRED || '10');
  return Math.max(0, MIN_VOTES - this.rawVoteCount);
});

module.exports = mongoose.model('Submission', submissionSchema);
