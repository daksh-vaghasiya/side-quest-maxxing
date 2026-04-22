const { getAuth, createClerkClient } = require('@clerk/express');
const User = require('../models/User');
const Leaderboard = require('../models/Leaderboard');

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY
});

/**
 * autoSyncUser — Provisions a MongoDB user and leaderboard entry from Clerk data.
 * Sanitizes data to comply with database constraints and handles collisions.
 */
async function autoSyncUser(authId) {
  try {
    const clerkUser = await clerkClient.users.getUser(authId);
    if (!clerkUser) {
      console.warn(`[AutoSync] Clerk user ${authId} not found in Clerk system.`);
      return null;
    }

    // Sanitize username: remove non-alphanumeric, lowercase, ensure length
    let username = (clerkUser.username || clerkUser.firstName || 'user')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase();
    
    if (username.length < 3) {
      username = `user_${authId.substring(authId.length - 6)}_${Date.now().toString().slice(-4)}`;
    }

    const email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
    const avatar = clerkUser.imageUrl || '';

    // Robust existence check for username
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      username = `${username}_${Math.floor(Math.random() * 899) + 100}`;
    }

    // Check if user already exists by clerkId (double-check for race conditions)
    let user = await User.findOne({ clerkId: authId });
    if (user) return user;

    // Check if user already exists by email
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      // If email exists but different clerkId, we might have a conflict.
      // For safety, update existing user with new clerkId if it's the same person, 
      // but usually Clerk ensures unique emails across the app.
      console.warn(`[AutoSync] Email conflict for ${email}. Updating clerkId.`);
      existingEmail.clerkId = authId;
      await existingEmail.save();
      return existingEmail;
    }

    user = await User.create({
      clerkId: authId,
      username,
      email: email.toLowerCase(),
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      xp: 0,
      level: 'Beginner'
    });

    await Leaderboard.create({
      userId: user._id,
      totalXp: 0,
      username: user.username,
      avatar: user.avatar,
      level: 'Beginner',
    });

    console.log(`[AutoSync] ✅ Created profile for ${username} (${authId})`);
    return await User.findById(user._id).populate('badges', 'name slug icon rarity');
  } catch (err) {
    console.error('[AutoSync Error] Failed to sync user:', err.message, '| Code:', err.code, '| Status:', err.status);
    if (err.stack) console.error(err.stack);
    // If it's a duplicate key error we missed, try one more time or fail gracefully
    if (err.code === 11000) {
      console.log('[AutoSync] Duplicate key — user may already exist. Attempting findOne fallback...');
      try {
        return await User.findOne({ clerkId: authId }).populate('badges', 'name slug icon rarity');
      } catch (fallbackErr) {
        console.error('[AutoSync] Fallback findOne also failed:', fallbackErr.message);
      }
    }
    return null;
  }
}

/**
 * requireAuth — Standardized Clerk authentication + MongoDB user synchronization.
 */
const requireAuth = async (req, res, next) => {
  try {
    const auth = getAuth(req);
    const authId = auth?.userId;
    
    if (!authId) {
      console.error(`[Auth Middleware] ❌ Unauthorized: userId missing for ${req.url}`);
      return res.status(401).json({ success: false, message: 'Authentication required', code: 'UNAUTHORIZED' });
    }
      
    let user = await User.findOne({ clerkId: authId }).populate('badges', 'name slug icon rarity');

    // Existence guaranteed: if user is valid in Clerk, ensure they exist in MongoDB
    if (!user) {
      console.log(`[Auth Middleware] User ${authId} not found in DB. Auto-syncing...`);
      user = await autoSyncUser(authId);
      if (!user) {
        return res.status(503).json({
          success: false,
          message: 'User profile synchronization failed. Please retry in a moment.',
          code: 'PROFILE_SYNC_FAILED',
        });
      }
    }

    // Check account ban
    if (user.isBanned) {
      const isPermanent = !user.banExpiresAt;
      const isActive = isPermanent || user.banExpiresAt > new Date();
      if (isActive) {
        return res.status(403).json({
          success: false,
          message: isPermanent
            ? `Your account is permanently banned. Reason: ${user.banReason || 'Policy violation'}`
            : `Your account is banned until ${user.banExpiresAt.toISOString()}. Reason: ${user.banReason}`,
          code: 'ACCOUNT_BANNED',
        });
      }
      // Ban expired — auto-lift
      user = await User.findByIdAndUpdate(user._id, { isBanned: false, banExpiresAt: null, banReason: '' }, { new: true }).populate('badges', 'name slug icon rarity');
    }

    req.user = user;
    req.auth = auth;
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]', error.message);
    res.status(500).json({ success: false, message: 'Internal server error during authentication' });
  }
};

/**
 * optionalAuth — Attaches user if token is present, but doesn't block unauthenticated requests
 */
const optionalAuth = async (req, res, next) => {
  try {
    const auth = getAuth(req);
    if (auth && auth.userId) {
      let user = await User.findOne({ clerkId: auth.userId }).populate('badges', 'name slug icon rarity');
      if (!user) {
        user = await autoSyncUser(auth.userId);
      }
      if (user) {
        req.user = user;
      }
      req.auth = auth;
    }
    next();
  } catch {
    next();
  }
};

module.exports = { requireAuth, optionalAuth };
