const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { requireModerator } = require('../middleware/requireRole');
const { voteLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/vote.controller');

router.get('/my', requireAuth, ctrl.getMyVotes);
router.get('/:submissionId', optionalAuth, ctrl.getVotes);
router.get('/:submissionId/list', requireAuth, requireModerator, ctrl.listVotes);
router.post('/:submissionId', requireAuth, voteLimiter, ctrl.vote);

module.exports = router;
