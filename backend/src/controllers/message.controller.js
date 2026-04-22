const Message = require('../models/Message');
const User    = require('../models/User');
const mongoose = require('mongoose');

/**
 * GET /api/messages/conversations
 * Returns all unique conversations for the current user,
 * with the latest message and the other user's profile info.
 */
const getConversations = async (req, res, next) => {
  try {
    const myId = req.user._id;

    // All messages where I am sender or receiver, sorted by newest
    const messages = await Message.find({
      $or: [{ senderId: myId }, { receiverId: myId }],
    })
      .sort({ createdAt: -1 })
      .populate('senderId',   'username avatar level')
      .populate('receiverId', 'username avatar level')
      .lean();

    // Build a Map of conversationKey → latest message
    const seen = new Map();
    for (const msg of messages) {
      const otherId =
        msg.senderId._id.toString() === myId.toString()
          ? msg.receiverId._id.toString()
          : msg.senderId._id.toString();
      if (!seen.has(otherId)) seen.set(otherId, msg);
    }

    // Count unread per conversation
    const unreadCounts = await Message.aggregate([
      { $match: { receiverId: myId, read: false } },
      { $group: { _id: '$senderId', count: { $sum: 1 } } },
    ]);
    const unreadMap = {};
    unreadCounts.forEach(u => { unreadMap[u._id.toString()] = u.count; });

    const conversations = Array.from(seen.entries()).map(([otherId, msg]) => {
      const other =
        msg.senderId._id.toString() === myId.toString()
          ? msg.receiverId
          : msg.senderId;
      return {
        userId:    other._id,
        username:  other.username,
        avatar:    other.avatar,
        level:     other.level,
        lastMsg:   msg.content,
        lastAt:    msg.createdAt,
        unread:    unreadMap[otherId] ?? 0,
        isMine:    msg.senderId._id.toString() === myId.toString(),
      };
    });

    return res.json({ success: true, data: conversations });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/messages/:userId
 * Returns all messages between the current user and :userId.
 * Marks received messages as read.
 */
const getMessages = async (req, res, next) => {
  try {
    const myId     = req.user._id;
    const otherId  = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(otherId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    // Fetch full conversation
    const messages = await Message.find({
      $or: [
        { senderId: myId,   receiverId: otherId },
        { senderId: otherId, receiverId: myId   },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('senderId',   'username avatar')
      .populate('receiverId', 'username avatar')
      .lean();

    // Mark all received unread messages as read
    await Message.updateMany(
      { senderId: otherId, receiverId: myId, read: false },
      { $set: { read: true } }
    );

    return res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/messages/:userId
 * Send a message to :userId.
 */
const sendMessage = async (req, res, next) => {
  try {
    const myId    = req.user._id;
    const otherId = req.params.userId;
    const { content } = req.body;
    const files = req.files || [];

    if (!mongoose.Types.ObjectId.isValid(otherId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    
    // Allow message if there is either content OR attachments
    if ((!content || !content.trim()) && files.length === 0) {
      return res.status(400).json({ success: false, message: 'Message or attachment required' });
    }
    if (myId.toString() === otherId) {
      return res.status(400).json({ success: false, message: 'Cannot message yourself' });
    }

    const other = await User.findById(otherId).select('_id username avatar').lean();
    if (!other) return res.status(404).json({ success: false, message: 'User not found' });

    const attachments = files.map(f => f.path);

    const msg = await Message.create({
      senderId:   myId,
      receiverId: otherId,
      content:    content ? content.trim() : '',
      attachments,
    });

    const populated = await Message.findById(msg._id)
      .populate('senderId',   'username avatar')
      .populate('receiverId', 'username avatar')
      .lean();

    // Emit in real-time if io is initialized
    try {
      const { getIO } = require('../services/socket.service');
      const io = getIO();
      if (io) {
        console.log(`[MessageController] Broadcasting message ${msg._id} with ${attachments.length} attachments`);
        // Emit to receiver's room AND sender's room (for multi-device sync)
        io.to(otherId.toString()).to(myId.toString()).emit('new_message', populated);
      }
    } catch (err) {
      console.warn('[MessageController] Real-time emit failed:', err.message);
    }

    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/messages/unread-count
 * Returns total unread message count for the current user.
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Message.countDocuments({
      receiverId: req.user._id,
      read: false,
    });
    return res.json({ success: true, count });
  } catch (err) {
    next(err);
  }
};

module.exports = { getConversations, getMessages, sendMessage, getUnreadCount };
