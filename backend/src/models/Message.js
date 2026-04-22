const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content:    { type: String, required: true, trim: true, maxlength: 2000 },
    attachments: [{ type: String }],
    read:       { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for fetching conversation between two users efficiently
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
