const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { uploadAvatar } = require('../middleware/upload');
const ctrl = require('../controllers/auth.controller');

// Public — sync user to MongoDB after Clerk sign-in
router.post('/sync', ctrl.syncUser);

// Public — Clerk webhook
router.post('/webhook', express.raw({ type: 'application/json' }), ctrl.handleWebhook);

// Public — view a user profile by username
router.get('/profile/:username', ctrl.getPublicProfile);
router.get('/profile-by-id/:userId', ctrl.getProfileById);

// Public — search users by username
router.get('/search', ctrl.searchUsers);

// Protected
router.get('/me', requireAuth, ctrl.getMe);
router.patch('/me', requireAuth, ctrl.updateProfile);
router.patch('/me/avatar', requireAuth, uploadAvatar, ctrl.updateAvatar);
router.post('/follow/:userId', requireAuth, ctrl.toggleFollow);

// Social lists
router.get('/followers/:userId', ctrl.getFollowers);
router.get('/following/:userId', ctrl.getFollowing);

module.exports = router;
