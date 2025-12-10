require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

// Routes & Models
const authRoutes = require('./routes/authRoutes');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// --- FIX: Dynamic CORS handling to debug exact origin issues ---
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Explicitly allow your Vercel app and Localhost
    const allowedOrigins = [
      'http://localhost:5173',
      'https://raghava-chat-app.vercel.app'
    ];
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

// Apply CORS to Express
app.use(cors(corsOptions));
app.use(express.json());

// Apply CORS to Socket.io
const io = new Server(server, {
  cors: {
    origin: ["https://raghava-chat-app.vercel.app", "http://localhost:5173"], // Be specific here
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.get('/', (req, res) => res.send('🚀 Raghava Server is Running!'));

// Socket Logic
io.on('connection', (socket) => {
  console.log('✅ New client connected:', socket.id);
  socket.on('joinRoom', (room) => socket.join(room));
  socket.on('sendMessage', async (data) => {
    const { room, sender, message } = data;
    const newMessage = await Message.create({ room, sender, message });
    io.to(room).emit('receiveMessage', newMessage);
  });
});

// --- FIX: Ensure Server Starts even if Mongo fails (for debugging) ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.log('❌ MongoDB Error:', err.message));

// Move server.listen OUTSIDE the mongoose.then block
// This ensures your server answers requests even if DB is slow to connect
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});