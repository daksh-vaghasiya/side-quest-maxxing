const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // ── XP Snapshots ──────────────────────────────────────────────────────────
    totalXp: { type: Number, default: 0 },
    weeklyXp: { type: Number, default: 0 },
    monthlyXp: { type: Number, default: 0 },

    // ── Ranks ─────────────────────────────────────────────────────────────────
    globalRank: { type: Number, default: null },
    weeklyRank: { type: Number, default: null },
    monthlyRank: { type: Number, default: null },

    // ── Snapshot (denormalized for speed) ─────────────────────────────────────
    username: { type: String },
    avatar: { type: String },
    level: { type: String },
    reputation: { type: Number, default: 0 },
    badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
    completedQuestCount: { type: Number, default: 0 },

    // ── Last Updated ──────────────────────────────────────────────────────────
    lastRefreshedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
leaderboardSchema.index({ totalXp: -1 });
leaderboardSchema.index({ weeklyXp: -1 });
leaderboardSchema.index({ monthlyXp: -1 });
leaderboardSchema.index({ globalRank: 1 });

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
