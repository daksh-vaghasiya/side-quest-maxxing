const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { submissionLimiter } = require('../middleware/rateLimiter');
const { uploadSubmissionMedia } = require('../middleware/upload');
const ctrl = require('../controllers/submission.controller');

// Protected — requires auth
router.get('/my', requireAuth, ctrl.getMySubmissions);
router.post('/feed', optionalAuth, ctrl.getFeed); // POST to allow filter body
router.get('/feed', optionalAuth, ctrl.getFeed);

router.post('/', requireAuth, submissionLimiter, uploadSubmissionMedia, ctrl.createSubmission);
router.get('/', optionalAuth, ctrl.listSubmissions);
router.get('/:id', optionalAuth, ctrl.getSubmission);
router.post('/:id/like', requireAuth, ctrl.toggleLike);
router.post('/:id/flag', requireAuth, ctrl.flagSubmission);

module.exports = router;
