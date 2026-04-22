const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { commentLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/comment.controller');

router.get('/:targetType/:targetId', optionalAuth, ctrl.getComments);
router.get('/:targetType/:targetId/replies/:parentId', ctrl.getReplies);
router.post('/:targetType/:targetId', requireAuth, commentLimiter, ctrl.addComment);
router.delete('/:id', requireAuth, ctrl.deleteComment);
router.post('/:id/like', requireAuth, ctrl.toggleLike);

module.exports = router;
