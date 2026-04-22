const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { communityQuestLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/communityquest.controller');

router.get('/', optionalAuth, ctrl.listCommunityQuests);
router.get('/:id', optionalAuth, ctrl.getCommunityQuest);
router.post('/', requireAuth, communityQuestLimiter, ctrl.submitCommunityQuest);
router.post('/:id/vote', requireAuth, ctrl.voteOnCommunityQuest);

module.exports = router;
