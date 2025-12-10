require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

// Routes
const authRoutes = require('./routes/authRoutes');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// --- 1. DEFINED ORIGINS ---
const allowedOrigins = [
  "http://localhost:5173",             // Your local frontend
  "http://localhost:5174",             // Sometimes Vite uses this port
  "https://raghava-chat-app.vercel.app" // Your live frontend
];

// --- 2. CORS CONFIGURATION ---
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      console.log("❌ CORS Blocked Origin:", origin); // Log blocked attempts
      return callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true, // Allow cookies/headers
  allowedHeaders: ["Content-Type", "Authorization"]
};

// --- 3. APPLY CORS MIDDLEWARE ---
app.use(cors(corsOptions));
// Explicitly handle pre-flight requests (OPTIONS)
app.options('*', cors(corsOptions)); 

app.use(express.json());

// --- 4. DEBUG LOGGING MIDDLEWARE ---
app.use((req, res, next) => {
  console.log(`📡 Request: ${req.method} ${req.url} from Origin: ${req.headers.origin}`);
  next();
});

// --- 5. ROUTES ---
app.use('/api/auth', authRoutes);
app.get('/', (req, res) => res.send('🚀 Server is Running!'));

// --- 6. SOCKET.IO SETUP ---
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('✅ Socket Connected:', socket.id);
  
  socket.on('sendMessage', async (data) => {
    // Your message logic
    io.emit('receiveMessage', data);
  });

  socket.on('disconnect', () => console.log('❌ Socket Disconnected:', socket.id));
});

// --- 7. DATABASE & SERVER START ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.log('❌ MongoDB Error:', err.message));

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});