const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireRole');
const { uploadQuestCover } = require('../middleware/upload');
const ctrl = require('../controllers/quest.controller');

// Public
router.get('/categories', ctrl.getCategories);
router.get('/', optionalAuth, ctrl.listQuests);
router.get('/:id', optionalAuth, ctrl.getQuest);

// Protected — user
router.post('/:id/accept', requireAuth, ctrl.acceptQuest);
router.post('/:id/abandon', requireAuth, ctrl.abandonQuest);

// Protected — admin only
router.post('/', requireAuth, requireAdmin, uploadQuestCover, ctrl.createQuest);
router.patch('/:id', requireAuth, requireAdmin, uploadQuestCover, ctrl.updateQuest);
router.delete('/:id', requireAuth, requireAdmin, ctrl.deleteQuest);

module.exports = router;
