const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const { uploadChatAttachment } = require('../middleware/upload');
const ctrl = require('../controllers/message.controller');

// All message routes require auth
router.get('/conversations',   requireAuth, ctrl.getConversations);
router.get('/unread-count',    requireAuth, ctrl.getUnreadCount);
router.get('/:userId',         requireAuth, ctrl.getMessages);
router.post('/:userId',        requireAuth, uploadChatAttachment, ctrl.sendMessage);

module.exports = router;
