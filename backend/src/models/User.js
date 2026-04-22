const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    avatar: { type: String, default: '' },
    bio: { type: String, maxlength: 200, default: '' },
    fullName: { type: String, trim: true, default: '' },

    // ── Gamification ──────────────────────────────────────────────────────────
    xp: { type: Number, default: 0, min: 0 },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Pro', 'Legend'],
      default: 'Beginner',
    },
    reputation: { type: Number, default: 100, min: 0 },

    // ── Badges ────────────────────────────────────────────────────────────────
    badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],

    // ── Quest Tracking ────────────────────────────────────────────────────────
    acceptedQuests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quest' }],
    completedQuests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quest' }],

    // ── Streak System ─────────────────────────────────────────────────────────
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActivityDate: { type: Date },

    // ── Moderation ────────────────────────────────────────────────────────────
    warnings: { type: Number, default: 0 },
    isBanned: { type: Boolean, default: false },
    banExpiresAt: { type: Date, default: null },
    submissionBanExpiresAt: { type: Date, default: null },
    banReason: { type: String, default: '' },

    // ── Role ──────────────────────────────────────────────────────────────────
    role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },

    // ── Social ────────────────────────────────────────────────────────────────
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ── Aggregated Stats (denormalized for performance) ───────────────────────
    totalSubmissions: { type: Number, default: 0 },
    approvedSubmissions: { type: Number, default: 0 },
    rejectedSubmissions: { type: Number, default: 0 },
    totalVotesCast: { type: Number, default: 0 },
    totalLikesReceived: { type: Number, default: 0 },
    totalCommentsPosted: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
userSchema.index({ xp: -1 });
userSchema.index({ reputation: -1 });
userSchema.index({ username: 'text' });
userSchema.index({ role: 1 });

// ── Virtual: Vote weight based on XP ─────────────────────────────────────────
userSchema.virtual('voteWeight').get(function () {
  if (this.xp >= 5000) return 3.0; // Legend
  if (this.xp >= 2000) return 2.0; // Pro
  if (this.xp >= 500) return 1.5;  // Intermediate
  return 1.0;                        // Beginner
});

// ── Virtual: Is submission banned? ───────────────────────────────────────────
userSchema.virtual('isSubmissionBanned').get(function () {
  if (!this.submissionBanExpiresAt) return false;
  return this.submissionBanExpiresAt > new Date();
});

// ── Virtual: Is account banned? ──────────────────────────────────────────────
userSchema.virtual('isCurrentlyBanned').get(function () {
  if (!this.isBanned) return false;
  if (!this.banExpiresAt) return true; // Permanent ban
  return this.banExpiresAt > new Date();
});

module.exports = mongoose.model('User', userSchema);
