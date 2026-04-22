const { Server } = require('socket.io');
const { getAuth } = require('@clerk/express');
const User = require('../models/User');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:4200',
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  // Socket Auth Middleware - Basic version
  // In a real prod env, we'd verify the JWT here. 
  // For now, we'll let the client pass their clerkId or verify via handshake.
  io.use(async (socket, next) => {
    try {
      const clerkId = socket.handshake.auth.clerkId;
      if (!clerkId) return next(new Error('Authentication error: Missing clerkId'));

      const user = await User.findOne({ clerkId });
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Internal server error during socket auth'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`[Socket] 🔗 User connected: ${socket.user.username} (${userId})`);

    // Join a private room for this user
    socket.join(userId);

    // Typing Indicators
    socket.on('typing_start', (data) => {
      // data: { receiverId: '...' }
      if (data.receiverId) {
        socket.to(data.receiverId).emit('user_typing_start', { senderId: userId });
      }
    });

    socket.on('typing_stop', (data) => {
      if (data.receiverId) {
        socket.to(data.receiverId).emit('user_typing_stop', { senderId: userId });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] ❌ User disconnected: ${socket.user.username}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

module.exports = { initSocket, getIO };
