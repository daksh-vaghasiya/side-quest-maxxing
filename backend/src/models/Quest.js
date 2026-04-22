const mongoose = require('mongoose');

const CATEGORIES = [
  'fitness', 'mindfulness', 'creativity', 'social',
  'learning', 'outdoor', 'food', 'tech', 'finance', 'other'
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Legendary'];

const questSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 2000 },
    category: { type: String, required: true, enum: CATEGORIES },
    difficulty: { type: String, required: true, enum: DIFFICULTIES },
    xpReward: { type: Number, required: true, min: 10, max: 1000 },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
    },

    // ── Media ─────────────────────────────────────────────────────────────────
    coverImage: { type: String, default: '' }, // Cloudinary URL

    // ── Creator ───────────────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isOfficial: { type: Boolean, default: false }, // Admin-created vs community

    // ── Community Quest Link ──────────────────────────────────────────────────
    communityQuestId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityQuest', default: null },

    // ── Stats (denormalized) ──────────────────────────────────────────────────
    acceptedCount: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
    submissionCount: { type: Number, default: 0 },

    // ── Tags ──────────────────────────────────────────────────────────────────
    tags: [{ type: String, trim: true, maxlength: 30 }],

    // ── Requirements ─────────────────────────────────────────────────────────
    requirements: [{ type: String, maxlength: 200 }],

    // ── Time Limit ────────────────────────────────────────────────────────────
    timeLimitDays: { type: Number, default: null }, // null = no limit

    // ── Repeatable ───────────────────────────────────────────────────────────
    isRepeatable: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
questSchema.index({ status: 1, category: 1, difficulty: 1 });
questSchema.index({ title: 'text', description: 'text', tags: 'text' });
questSchema.index({ xpReward: -1 });
questSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Quest', questSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.DIFFICULTIES = DIFFICULTIES;
