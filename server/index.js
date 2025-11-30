const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Import Models
const User = require('./models/User');
const Message = require('./models/Message');

// Import Routes
const authRoutes = require('./routes/authRoutes');

dotenv.config();
const app = express();
const server = http.createServer(app);

// *** DEPLOYMENT CONFIGURATION ***
// This MUST match your live Vercel URL exactly (no trailing slash)
const ALLOWED_ORIGIN = "https://raghava-chat-app.vercel.app";

// 1. Setup Socket.io CORS
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST"]
  }
});

// 2. Setup Express CORS
app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());

// Setup Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Auth Routes
app.use('/api/auth', authRoutes);

// ==========================================
// 👥 SOCIAL ROUTES
// ==========================================

// Search Users
app.get('/api/users/search', async (req, res) => {
  try {
    const { query, currentUserId } = req.query;
    const users = await User.find({
      $or: [
        { username: new RegExp(query, 'i') }, 
        { phoneNumber: new RegExp(query, 'i') }
      ],
      _id: { $ne: currentUserId }
    }).select('-otp -otpExpires -password -pin');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send Friend Request
app.post('/api/users/request', async (req, res) => {
  try {
    const { fromId, toId } = req.body;
    const targetUser = await User.findById(toId);
    
    if (!targetUser.incomingRequests.includes(fromId) && !targetUser.friends.includes(fromId)) {
      targetUser.incomingRequests.push(fromId);
      await targetUser.save();
    }
    res.json({ message: "Request sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept Friend Request
app.post('/api/users/accept', async (req, res) => {
  try {
    const { userId, requestId } = req.body;
    const user = await User.findById(userId);
    const friend = await User.findById(requestId);

    user.friends.push(requestId);
    friend.friends.push(userId);
    user.incomingRequests = user.incomingRequests.filter(id => id.toString() !== requestId);
    
    await user.save();
    await friend.save();
    res.json({ message: "Connected!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unfriend / Remove Connection
app.post('/api/users/unfriend', async (req, res) => {
  try {
    const { userId, friendId } = req.body;
    await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });
    res.json({ message: "Connection removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile Name
app.post('/api/users/update-profile', async (req, res) => {
  try {
    const { userId, username } = req.body;
    if (!username || username.length < 3) return res.status(400).json({ message: "Name too short" });

    const user = await User.findByIdAndUpdate(userId, { username }, { new: true });
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get User Data
app.get('/api/users/me/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('friends', 'username phoneNumber profilePic')
      .populate('incomingRequests', 'username phoneNumber profilePic');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 💬 CHAT ROUTES
// ==========================================

app.get('/api/messages/:room', async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room }).sort({ createdAt: 1 }).limit(50);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/messages/:room', async (req, res) => {
  try {
    await Message.deleteMany({ room: req.params.room });
    res.json({ message: "History cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ⚡ SOCKET.IO LOGIC
// ==========================================
io.on('connection', (socket) => {
  console.log('⚡ User connected:', socket.id);

  socket.on('send_message', async (data) => {
    try {
      await new Message(data).save();
      if (data.room !== 'ai-bot') {
        socket.broadcast.emit('receive_message', data);
      }
    } catch (e) {
      console.log("Error saving message:", e);
    }
  });

  socket.on('chat_with_ai', async (data) => {
    try {
      await new Message(data).save();
      const result = await model.generateContent(data.message);
      const aiText = result.response.text();
      
      const aiMsg = { 
        room: 'ai-bot', 
        author: "Raghava's AI", 
        content: aiText, 
        timestamp: new Date().toLocaleTimeString() 
      };
      await new Message(aiMsg).save();
      socket.emit('receive_message', { ...aiMsg, message: aiText });
    } catch (e) {
      console.error("AI Error:", e);
      socket.emit('receive_message', {
        room: 'ai-bot',
        author: "System",
        message: "AI is offline.",
        timestamp: new Date().toLocaleTimeString()
      });
    }
  });

  socket.on('request_smart_reply', async (data) => {
    try {
      const prompt = `Generate a single, short, casual reply to: "${data.lastMessage}"`;
      const result = await model.generateContent(prompt);
      socket.emit('smart_reply_result', { suggestion: result.response.text() });
    } catch (e) {
      console.log(e);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    server.listen(PORT, () => console.log(`🚀 Raghava Server Running on Port ${PORT}`));
  })
  .catch((err) => console.log('❌ DB Error:', err.message));