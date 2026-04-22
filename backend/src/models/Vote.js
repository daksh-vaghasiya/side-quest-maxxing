const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
    },
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    voteType: {
      type: String,
      enum: ['legit', 'not_legit'],
      required: true,
    },
    // Voter's XP-based weight at time of voting (snapshot — doesn't change after cast)
    weight: { type: Number, required: true, min: 1.0, max: 3.0 },
    // XP snapshot of voter at time of vote (for audit trail)
    voterXpAtVote: { type: Number, required: true },
    voterLevelAtVote: { type: String, required: true },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Enforce one vote per user per submission at the DB level
voteSchema.index({ submissionId: 1, voterId: 1 }, { unique: true });
voteSchema.index({ submissionId: 1, voteType: 1 });
voteSchema.index({ voterId: 1, createdAt: -1 });

module.exports = mongoose.model('Vote', voteSchema);
