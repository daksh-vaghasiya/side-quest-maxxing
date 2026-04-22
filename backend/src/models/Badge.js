const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true, maxlength: 300 },
    icon: { type: String, required: true }, // emoji or Cloudinary URL
    iconType: { type: String, enum: ['emoji', 'image'], default: 'emoji' },

    // ── Categorization ────────────────────────────────────────────────────────
    category: {
      type: String,
      enum: ['milestone', 'streak', 'social', 'quest', 'special', 'level'],
      required: true,
    },
    rarity: {
      type: String,
      enum: ['common', 'rare', 'epic', 'legendary'],
      default: 'common',
    },

    // ── Award Conditions ──────────────────────────────────────────────────────
    condition: {
      type: String,
      enum: [
        'first_quest',          // Complete your first quest
        'streak_5',             // 5-day streak
        'streak_30',            // 30-day streak
        'quests_10',            // Complete 10 quests
        'quests_50',            // Complete 50 quests
        'top10_leaderboard',    // Reach top 10
        'top1_leaderboard',     // Rank #1
        'level_intermediate',   // Reach Intermediate
        'level_pro',            // Reach Pro
        'level_legend',         // Reach Legend
        'quest_creator',        // Community quest approved
        'votes_50',             // Cast 50 votes
        'controversy_king',     // 3 controversial submissions
        'reputation_500',       // Reputation ≥ 500
        'manual',               // Manually awarded by admin
      ],
      required: true,
    },

    // ── XP Bonus ─────────────────────────────────────────────────────────────
    xpBonus: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

badgeSchema.index({ slug: 1 });
badgeSchema.index({ category: 1, rarity: 1 });

module.exports = mongoose.model('Badge', badgeSchema);
