const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireAdmin, requireModerator } = require('../middleware/requireRole');
const { adminLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/admin.controller');

// All admin routes require auth + at minimum moderator role
router.use(requireAuth, adminLimiter);

// Dashboard
router.get('/dashboard', requireModerator, ctrl.getDashboard);

// Submission moderation
router.get('/submissions', requireModerator, ctrl.adminListSubmissions);
router.patch('/submissions/:id/moderate', requireModerator, ctrl.moderateSubmission);

// User management
router.get('/users', requireModerator, ctrl.adminListUsers);
router.patch('/users/:id/ban', requireAdmin, ctrl.banUser);
router.patch('/users/:id/unban', requireAdmin, ctrl.unbanUser);
router.patch('/users/:id/warn', requireModerator, ctrl.warnUser);
router.patch('/users/:id/role', requireAdmin, ctrl.changeUserRole);
router.patch('/users/:id/adjust-xp', requireAdmin, ctrl.adjustXP);

// Community quests
router.get('/community-quests', requireModerator, ctrl.adminListCommunityQuests);
router.patch('/community-quests/:id', requireModerator, ctrl.moderateCommunityQuest);

// Audit logs
router.get('/audit-logs', requireAdmin, ctrl.getAuditLogs);

// Leaderboard
router.post('/leaderboard/refresh', requireAdmin, ctrl.triggerLeaderboardRefresh);

module.exports = router;
