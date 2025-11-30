const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  otp: {
    type: String, 
    default: null
  },
  otpExpires: {
    type: Date,
    default: null
  },
  username: {
    type: String,
    default: "Raghava User" // Default name for the onboarding check
  },
  // --- NEW FIELD FOR PIN LOGIN ---
  pin: { 
    type: String, 
    default: null // Will store the hashed 4-digit PIN
  },
  // -----------------------------
  profilePic: {
    type: String,
    default: ""
  },
  // --- SOCIAL FIELDS ---
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  incomingRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);