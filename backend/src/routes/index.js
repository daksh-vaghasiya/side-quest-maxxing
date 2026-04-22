const express = require('express');
const router = express.Router();

router.use('/auth',             require('./auth.routes'));
router.use('/user',             require('./user.routes'));
router.use('/quests',           require('./quest.routes'));
router.use('/submissions',      require('./submission.routes'));
router.use('/votes',            require('./vote.routes'));
router.use('/leaderboard',      require('./leaderboard.routes'));
router.use('/comments',         require('./comment.routes'));
router.use('/notifications',    require('./notification.routes'));
router.use('/admin',            require('./admin.routes'));
router.use('/community-quests', require('./communityquest.routes'));
router.use('/messages',         require('./message.routes'));

module.exports = router;
