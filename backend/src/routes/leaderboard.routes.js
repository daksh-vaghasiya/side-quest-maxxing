const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const ctrl = require('../controllers/leaderboard.controller');

router.get('/', ctrl.globalLeaderboard);
router.get('/weekly', ctrl.weeklyLeaderboard);
router.get('/monthly', ctrl.monthlyLeaderboard);
router.get('/me', requireAuth, ctrl.myRank);
router.get('/user/:username', ctrl.userRankByUsername);

module.exports = router;
