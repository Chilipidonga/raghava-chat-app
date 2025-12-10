// server/index.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Models & Routes
const User = require('./models/User');
const Message = require('./models/Message');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

const app = express();
const server = http.createServer(app);

/* ================================
   ✅ CORS CONFIGURATION
================================ */

const ALLOWED_ORIGINS = [
  "http://localhost:5173",                   // Local Vite/React
  "https://raghava-chat-app.vercel.app"      // Production (Vercel)
];

// Express Middleware
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

app.use(express.json());

/* ================================
   ✅ SOCKET.IO SETUP
================================ */

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log("✅ Socket connected:", socket.id);

  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`📥 Joined room: ${room}`);
  });

  socket.on('send_message', (data) => {
    socket.to(data.room).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

/* ================================
   ✅ GEMINI AI SETUP
================================ */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/* ================================
   ✅ ROUTES
================================ */

app.use('/api/auth', authRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('🚀 Raghava Server is Running!');
});

// Search users
app.get('/api/users/search', async (req, res) => {
  try {
    const { q } = req.query;
    const users = await User.find({ name: new RegExp(q, 'i') }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Friend request
app.post('/api/users/request', async (req, res) => {
  try {
    const { fromId, toId } = req.body;
    const user = await User.findById(toId);

    if (!user.requests.includes(fromId)) {
      user.requests.push(fromId);
      await user.save();
    }

    res.json({ message: 'Friend request sent' });
  } catch (err) {
    res.status(500).json({ error: 'Request failed' });
  }
});

// Accept request
app.post('/api/users/accept', async (req, res) => {
  try {
    const { fromId, toId } = req.body;

    const receiver = await User.findById(toId);
    const sender = await User.findById(fromId);

    receiver.friends.push(fromId);
    sender.friends.push(toId);

    receiver.requests = receiver.requests.filter(id => id.toString() !== fromId);

    await receiver.save();
    await sender.save();

    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    res.status(500).json({ error: 'Accept failed' });
  }
});

// Get profile
app.get('/api/users/me/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(404).json({ error: 'User not found' });
  }
});

// Unfriend
app.post('/api/users/unfriend', async (req, res) => {
  try {
    const { userId, friendId } = req.body;

    await User.findByIdAndUpdate(userId, {
      $pull: { friends: friendId }
    });

    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: userId }
    });

    res.json({ message: 'Unfriended successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Unfriend failed' });
  }
});

// Update profile
app.post('/api/users/update-profile', async (req, res) => {
  try {
    const { id, bio } = req.body;
    await User.findByIdAndUpdate(id, { bio });
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// Get messages
app.get('/api/messages/:room', async (req, res) => {
  try {
    const msgs = await Message.find({ room: req.params.room });
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// Delete messages
app.delete('/api/messages/:room', async (req, res) => {
  try {
    await Message.deleteMany({ room: req.params.room });
    res.json({ message: 'Messages deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

/* ================================
   ✅ DATABASE + SERVER START
================================ */

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log('❌ DB Error:', err.message);
  });
