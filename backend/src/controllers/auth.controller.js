const { getAuth } = require('@clerk/express');
const { Webhook } = require('svix');
const mongoose = require('mongoose');
const User = require('../models/User');
const Leaderboard = require('../models/Leaderboard');
const { sendSuccess, sendCreated, sendError, sendNotFound } = require('../helpers/response.helper');
const { getXpProgress } = require('../helpers/xp.helper');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

// ── Validation rules ───────────────────────────────────────────────────────────
const syncRules = [
  body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 chars, letters/numbers/underscore only'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('avatar').optional({ checkFalsy: true, nullable: true }).isURL().withMessage('Avatar must be a valid URL'),
];

const updateProfileRules = [
  body('username').optional().trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('bio').optional().isLength({ max: 200 }),
  body('avatar').optional({ checkFalsy: true, nullable: true }).isURL(),
];

/**
 * POST /api/auth/sync
 * Called after Clerk sign-in to ensure the user exists in MongoDB.
 */
const syncUser = [
  ...syncRules, validate,
  async (req, res, next) => {
    try {
      const auth = getAuth(req);
      const authId = auth?.userId;
      
      if (!authId) {
        return sendError(res, 'Authentication required to sync profile', 401);
      }

      const { username, email, avatar } = req.body;

      // Check if already exists in MongoDB
      let user = await User.findOne({ clerkId: authId });

      if (user) {
        // Update profile data from Clerk if provided
        let needsSave = false;
        if (email && user.email !== email) { user.email = email.toLowerCase(); needsSave = true; }
        if (avatar && user.avatar !== avatar) { user.avatar = avatar; needsSave = true; }
        
        if (needsSave) await user.save();
        
        const xpProgress = getXpProgress(user.xp);
        return sendSuccess(res, { user, xpProgress, isNew: false }, 'Profile synced');
      }

      // ─── New User Creation Flow ─────────────────────────────────────────────
      
      // Ensure unique username
      const existing = await User.findOne({ username: username.toLowerCase() });
      const finalUsername = existing 
        ? `${username.toLowerCase()}_${Math.floor(Math.random() * 8999) + 1000}`
        : username.toLowerCase();

      user = await User.create({
        clerkId: authId,
        username: finalUsername,
        email: email.toLowerCase(),
        avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${finalUsername}`,
        xp: 0,
        level: 'Beginner'
      });

      // Initialize leaderboard entry
      await Leaderboard.create({
        userId: user._id,
        totalXp: 0,
        username: user.username,
        avatar: user.avatar,
        level: 'Beginner',
      });

      console.log(`[Auth Controller] ✅ New profile: ${user.username}`);
      
      const xpProgress = getXpProgress(user.xp);
      return sendCreated(res, { user, xpProgress, isNew: true }, 'Welcome! Your profile has been created.');
    } catch (err) {
      if (err.code === 11000) {
        return sendError(res, 'Username or email already exists in our system', 409);
      }
      console.error('[Auth Controller Sync Error]', err);
      next(err);
    }
  },
];

/**
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('badges', 'name slug icon rarity category xpBonus')
      .populate('acceptedQuests', 'title category difficulty xpReward status')
      .lean();

    if (!user) return sendNotFound(res, 'User');

    const xpProgress = getXpProgress(user.xp);
    const leaderboardEntry = await Leaderboard.findOne({ userId: user._id }).lean();

    return sendSuccess(res, { user, xpProgress, rank: leaderboardEntry?.globalRank || null });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/auth/me
 */
const updateProfile = [
  ...updateProfileRules, validate,
  async (req, res, next) => {
    try {
      const { username, bio } = req.body;

      if (username) {
        const taken = await User.findOne({ username: username.toLowerCase(), _id: { $ne: req.user._id } });
        if (taken) return sendError(res, 'Username is already taken', 409, 'USERNAME_TAKEN');
      }

      const updates = {};
      if (username) updates.username = username.toLowerCase();
      if (bio !== undefined) updates.bio = bio;
      if (req.file?.path) updates.avatar = req.file.path;

      const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true })
        .populate('badges', 'name slug icon rarity');

      return sendSuccess(res, { user }, 'Profile updated');
    } catch (err) {
      next(err);
    }
  },
];

/**
 * GET /api/auth/profile/:username
 */
const getPublicProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() })
      .select('-clerkId -email -isBanned -banReason -banExpiresAt -submissionBanExpiresAt -warnings')
      .populate('badges', 'name slug icon rarity')
      .lean();

    if (!user) return sendNotFound(res, 'User');

    const xpProgress = getXpProgress(user.xp);
    const leaderboardEntry = await Leaderboard.findOne({ userId: user._id }).lean();

    return sendSuccess(res, { user, xpProgress, rank: leaderboardEntry?.globalRank || null });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/webhook
 */
const handleWebhook = async (req, res, next) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(500).json({ error: 'Webhook secret not configured' });

  const wh = new Webhook(webhookSecret);
  let event;

  try {
    event = wh.verify(JSON.stringify(req.body), {
      'svix-id': req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    });
  } catch {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const { type, data } = event;

  try {
    if (type === 'user.deleted') {
      await User.findOneAndUpdate(
        { clerkId: data.id },
        { $set: { isBanned: true, banReason: 'Account deleted' } }
      );
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/auth/me/avatar
 */
const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file?.path) return sendError(res, 'No file uploaded', 400);
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: req.file.path },
      { new: true }
    ).populate('badges', 'name slug icon rarity');
    return sendSuccess(res, { user }, 'Avatar updated');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/search
 */
const searchUsers = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ success: true, data: [] });

    const users = await User.find({ username: { $regex: q, $options: 'i' } })
      .select('username avatar level xp reputation bio followers following badges')
      .populate('badges', 'name icon rarity')
      .limit(12)
      .lean();

    const data = users.map((u) => ({
      _id: u._id,
      username: u.username,
      avatar: u.avatar,
      level: u.level,
      xp: u.xp,
      reputation: u.reputation,
      bio: u.bio,
      badges: u.badges,
      followerCount: u.followers?.length ?? 0,
      followingCount: u.following?.length ?? 0,
    }));

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/follow/:userId
 */
const toggleFollow = async (req, res, next) => {
  try {
    const me = req.user;
    const targetId = req.params.userId;

    if (me._id.toString() === targetId) return res.status(400).json({ success: false, message: 'Cannot follow yourself' });

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    const alreadyFollowing = (me.following || []).some((id) => id.toString() === targetId);

    if (alreadyFollowing) {
      await User.findByIdAndUpdate(me._id,    { $pull: { following: targetId } });
      await User.findByIdAndUpdate(targetId,  { $pull: { followers: me._id }  });
    } else {
      await User.findByIdAndUpdate(me._id,    { $addToSet: { following: targetId } });
      await User.findByIdAndUpdate(targetId,  { $addToSet: { followers: me._id }  });
    }

    const updated = await User.findById(targetId).select('followers').lean();
    return res.json({
      success:       true,
      following:     !alreadyFollowing,
      followerCount: updated?.followers?.length ?? 0,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/followers/:userId
 */
const getFollowers = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).populate('followers', 'username avatar bio level').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return sendSuccess(res, { users: user.followers || [] });
  } catch (err) { next(err); }
};

/**
 * GET /api/auth/following/:userId
 */
const getFollowing = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).populate('following', 'username avatar bio level').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return sendSuccess(res, { users: user.following || [] });
  } catch (err) { next(err); }
};

const getProfileById = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ success: false, message: 'Invalid User ID' });
    const user = await User.findById(userId).select('username avatar level bio').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

module.exports = { 
  syncUser, getMe, updateProfile, getPublicProfile, getProfileById,
  handleWebhook, updateAvatar, searchUsers, toggleFollow, getFollowers, getFollowing
};
