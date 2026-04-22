const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

// Update profile uses uploadAvatar middleware from Cloudinary
router.put('/profile', requireAuth, uploadAvatar, userController.updateProfile);

module.exports = router;
