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

// Setup Socket.io
const io = new Server(server, {
  cors: {
    // Allow connections from any local frontend port
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Setup Gemini AI (Using the working model)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// We use the 2.5-flash model as verified by your diagnostic test
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Middleware
app.use(express.json());
app.use(cors());

// Auth Routes
app.use('/api/auth', authRoutes);

// ==========================================
// 👥 SOCIAL ROUTES (Friend System)
// ==========================================

// 1. Search Users (excluding self)
app.get('/api/users/search', async (req, res) => {
  try {
    const { query, currentUserId } = req.query;
    // Search by username OR phone number
    const users = await User.find({
      $or: [
        { username: new RegExp(query, 'i') }, 
        { phoneNumber: new RegExp(query, 'i') }
      ],
      _id: { $ne: currentUserId } // Don't find myself
    }).select('-otp -otpExpires -password'); // Don't send sensitive data
    
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Send Friend Request
app.post('/api/users/request', async (req, res) => {
  try {
    const { fromId, toId } = req.body;
    const targetUser = await User.findById(toId);
    
    // Check if already friends or requested
    if (!targetUser.incomingRequests.includes(fromId) && !targetUser.friends.includes(fromId)) {
      targetUser.incomingRequests.push(fromId);
      await targetUser.save();
    }
    res.json({ message: "Request sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Accept Friend Request
app.post('/api/users/accept', async (req, res) => {
  try {
    const { userId, requestId } = req.body;
    const user = await User.findById(userId);
    const friend = await User.findById(requestId);

    // Add to each other's friend lists
    user.friends.push(requestId);
    friend.friends.push(userId);
    
    // Remove from incoming requests
    user.incomingRequests = user.incomingRequests.filter(id => id.toString() !== requestId);
    
    await user.save();
    await friend.save();
    res.json({ message: "Connected!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get My Data (Friends & Requests)
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
// 5. Update User Profile (Username)
app.post('/api/users/update-profile', async (req, res) => {
  try {
    const { userId, username } = req.body;
    
    if (!username || username.length < 3) {
      return res.status(400).json({ message: "Username must be 3+ characters." });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { username: username },
      { new: true, runValidators: true } // {new: true} returns the updated document
    ).select('-otp -otpExpires -password');

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // You must also fetch the full user data again to update the client correctly
    const updatedUser = await User.findById(user._id).select('-otp -otpExpires -password');
    
    // Return only the necessary data for client to update local storage
    res.json({ username: updatedUser.username, _id: updatedUser._id }); 
  } catch (err) {
    console.error("Profile Update Error:", err);
    res.status(500).json({ error: err.message });
  }
});
// 4. Unfriend / Remove Connection
app.post('/api/users/unfriend', async (req, res) => {
  try {
    const { userId, friendId } = req.body;

    // Remove friendId from userId's friend list
    await User.findByIdAndUpdate(userId, {
      $pull: { friends: friendId }
    });

    // Remove userId from friendId's friend list
    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: userId }
    });

    res.json({ message: "Connection removed successfully" });
  } catch (err) {
    console.error("Unfriend Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ... (rest of the code continues)
// ==========================================
// 💬 CHAT ROUTES (History)
// ==========================================

// Get Messages for a Room
app.get('/api/messages/:room', async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room })
      .sort({ createdAt: 1 })
      .limit(50);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear History
app.delete('/api/messages/:room', async (req, res) => {
  try {
    await Message.deleteMany({ room: req.params.room });
    res.json({ message: "History cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ⚡ SOCKET.IO LOGIC (Real-Time)
// ==========================================
io.on('connection', (socket) => {
  console.log('⚡ User connected:', socket.id);

  // 1. Handle Regular Chat Messages
  socket.on('send_message', async (data) => {
    try {
      // Save to DB
      const newMsg = new Message({
        room: data.room,
        author: data.author,
        content: data.message,
        timestamp: data.time
      });
      await newMsg.save();

      // Broadcast to others (if not AI room)
      if (data.room !== 'ai-bot') {
        socket.broadcast.emit('receive_message', data);
      }
    } catch (e) {
      console.log("Error saving message:", e);
    }
  });

  // 2. Handle AI Chat (Raghava's AI)
  socket.on('chat_with_ai', async (data) => {
    try {
      // Save User Message
      await new Message({
        room: 'ai-bot',
        author: data.author,
        content: data.message,
        timestamp: data.time
      }).save();

      // Ask Gemini
      const result = await model.generateContent(data.message);
      const aiText = result.response.text();
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Save AI Message
      const aiMsg = {
        room: 'ai-bot',
        author: "Raghava's AI", // Custom Bot Name
        content: aiText,
        timestamp: aiTime
      };
      await new Message(aiMsg).save();

      // Send back to user
      socket.emit('receive_message', { ...aiMsg, message: aiText });

    } catch (e) {
      console.error("AI Error:", e);
      socket.emit('receive_message', {
        room: 'ai-bot',
        author: "System",
        message: "AI is busy. Try again later.",
        timestamp: new Date().toLocaleTimeString()
      });
    }
  });

  // 3. Smart Reply (Magic Wand)
  socket.on('request_smart_reply', async (data) => {
    try {
      console.log("🪄 Generating reply for:", data.lastMessage);
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

// Connect DB & Start Server
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    server.listen(PORT, () => console.log(`🚀 Raghava Server Running on Port ${PORT}`));
  })
  .catch((err) => console.log('❌ DB Error:', err.message));