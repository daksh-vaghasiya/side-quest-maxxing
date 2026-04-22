const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
      type: String,
      required: true,
      enum: [
        'ban_user', 'unban_user', 'warn_user', 'change_user_role',
        'approve_submission', 'reject_submission', 'flag_submission', 'unflag_submission',
        'delete_submission', 'delete_comment',
        'create_quest', 'update_quest', 'delete_quest', 'archive_quest',
        'approve_community_quest', 'reject_community_quest', 'promote_community_quest',
        'award_badge', 'revoke_badge', 'adjust_xp',
      ],
    },
    targetType: {
      type: String,
      enum: ['user', 'submission', 'quest', 'community_quest', 'comment', 'badge'],
    },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    reason: { type: String, maxlength: 500, default: '' },
    // Before/after state for auditing
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
  },
  { timestamps: true }
);

auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
