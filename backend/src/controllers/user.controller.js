const { createClerkClient } = require('@clerk/express');

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY
});

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.auth?.userId; 
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { fullName, username, bio } = req.body;
    const imageUrl = req.file ? req.file.path : undefined; 

    // Split Full Name
    const firstName = fullName ? fullName.split(' ')[0] : undefined;
    const lastName = fullName ? fullName.substring(firstName.length).trim() : undefined;

    // Params for Clerk SDK
    const updateParams = {
      ...(firstName && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(username && { username }),
    };

    let publicMetadataPayload = {};
    if (bio !== undefined) publicMetadataPayload.bio = bio;
    if (imageUrl) publicMetadataPayload.profileImageUrl = imageUrl;

    if (Object.keys(publicMetadataPayload).length > 0) {
      // Must fetch user to not overwrite existing non-bio metadata if we wanted, 
      // but assuming bio/profileImageUrl are our only custom fields.
      updateParams.publicMetadata = publicMetadataPayload;
    }

    console.log(`[Profile Update] Starting for user: ${userId}`);
    const updatedUser = await clerkClient.users.updateUser(userId, updateParams);
    console.log(`[Profile Update] Clerk update successful`);

    // Sync with MongoDB directly
    const mongooseUpdates = {};
    if (username) mongooseUpdates.username = username.toLowerCase();
    if (fullName) mongooseUpdates.fullName = fullName;
    if (bio !== undefined) mongooseUpdates.bio = bio;
    if (imageUrl) mongooseUpdates.avatar = imageUrl;

    console.log(`[Profile Update] Syncing to Mongo:`, mongooseUpdates);
    const User = require('../models/User');
    const mongoUser = await User.findOneAndUpdate(
      { clerkId: userId },
      mongooseUpdates,
      { new: true, runValidators: true }
    ).populate('badges', 'name slug icon rarity');
    console.log(`[Profile Update] Mongo sync successful`);

    res.status(200).json({ 
      success: true, 
      message: 'Profile updated securely via Clerk',
      user: mongoUser
    });

  } catch (error) {
    console.error('Profile Update Error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};
