require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Routes & Models
const authRoutes = require('./routes/authRoutes');
const Message = require('./models/Message');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// ✅ Allowed origins
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://raghava-chat-app.vercel.app'
];

// ✅ Express CORS
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use(express.json());

// ✅ Socket.io CORS
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST']
  }
});

// ✅ Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ✅ Routes
app.use('/api/auth', authRoutes);

// ✅ Health check
app.get('/', (req, res) => {
  res.send('🚀 Raghava Server is Running!');
});

// ✅ Test route
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok' });
});

// ✅ Socket logic
io.on('connection', (socket) => {
  console.log('✅ New client connected:', socket.id);

  socket.on('joinRoom', (room) => {
    socket.join(room);
  });

  socket.on('sendMessage', async (data) => {
    const { room, sender, message } = data;

    const newMessage = await Message.create({
      room,
      sender,
      message,
    });

    io.to(room).emit('receiveMessage', newMessage);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log('❌ MongoDB Error:', err.message);
  });
