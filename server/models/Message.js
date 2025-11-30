// server/models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  room: {
    type: String,
    required: true // e.g., "global" or "ai-bot"
  },
  author: {
    type: String,
    required: true 
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: String, 
    default: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  },
  createdAt: {
    type: Date, 
    default: Date.now
  }
});

module.exports = mongoose.model('Message', messageSchema);