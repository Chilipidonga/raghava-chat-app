// server/index.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Import Models & Routes
const User = require('./models/User');
const Message = require('./models/Message');
const authRoutes = require('./routes/authRoutes');

dotenv.config();
const app = express();
const server = http.createServer(app);

// *** CORS CONFIGURATION (CRITICAL FIX) ***
// This allows your Vercel frontend to talk to this Render backend
const ALLOWED_ORIGINS = [
  "http://localhost:5173",                  // For local testing
  "https://raghava-chat-app.vercel.app"     // Your LIVE Vercel App
];

// 1. Socket.io CORS
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"]
  }
});

// 2. Express API CORS
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());

// ... (Rest of your file: Routes, Socket Logic, DB Connection) ...
// (Keep your existing Gemini AI, Routes, and Socket.io logic here)

// --- PASTE THE REST OF YOUR SERVER CODE HERE IF YOU COPY-PASTED ---
// If you want the full file again, let me know, but the CORS part above is what matters.

// Setup Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

app.use('/api/auth', authRoutes);

// ... Social Routes ...
app.get('/api/users/search', async (req, res) => { /* ... */ });
app.post('/api/users/request', async (req, res) => { /* ... */ });
app.post('/api/users/accept', async (req, res) => { /* ... */ });
app.get('/api/users/me/:id', async (req, res) => { /* ... */ });
app.post('/api/users/unfriend', async (req, res) => { /* ... */ });
app.post('/api/users/update-profile', async (req, res) => { /* ... */ });

// ... Chat Routes ...
app.get('/api/messages/:room', async (req, res) => { /* ... */ });
app.delete('/api/messages/:room', async (req, res) => { /* ... */ });

// ... Socket Logic ...
io.on('connection', (socket) => {
    // ... your socket events ...
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.log('❌ DB Error:', err.message));