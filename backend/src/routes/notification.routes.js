const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/notification.controller');

router.get('/', requireAuth, ctrl.getNotifications);
router.get('/unread-count', requireAuth, ctrl.getUnreadCount);
router.patch('/mark-all-read', requireAuth, ctrl.markAllRead);
router.patch('/:id/read', requireAuth, ctrl.markOneRead);
router.delete('/:id', requireAuth, ctrl.deleteNotification);

module.exports = router;
