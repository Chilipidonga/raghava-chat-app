const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Required for PIN hashing

// Helper: Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// 1. CHECK PHONE STATUS (Main Entry Point: Creates user if new, checks PIN status)
const checkPhoneStatus = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) return res.status(400).json({ message: "Phone number required" });

    // Find or Create User
    let user = await User.findOne({ phoneNumber });
    
    if (!user) {
      // Create new user immediately for new signups
      console.log("Creating new user (No OTP required)...");
      user = new User({ 
        phoneNumber,
        username: "Raghava User",
        friends: [], 
        incomingRequests: []
      });
      await user.save();
    }

    // Determine the user's setup status for the frontend
    const isPinSet = user.pin !== null;
    const isNewUser = user.username === 'Raghava User'; // Check if they are still using the default name

    res.status(200).json({ 
        message: 'Status checked',
        isPinSet: isPinSet, // Determines if PIN input should be shown (Step 2)
        isNewUser: isNewUser, // Determines if Onboarding is required
        userId: user._id // Pass ID back for routing safety
    });

  } catch (error) {
    console.error("❌ SERVER CRASH ERROR (in checkPhoneStatus):", error); 
    res.status(500).json({ message: error.message });
  }
};

// 2. LOGIN WITH PIN (Fast access for returning users)
const loginWithPin = async (req, res) => {
  try {
    const { phoneNumber, pin } = req.body;
    const user = await User.findOne({ phoneNumber });

    if (!user || !user.pin) return res.status(400).json({ message: 'PIN not set or user not found' });
    
    // Compare Hashed PIN
    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) return res.status(400).json({ message: 'Invalid PIN' });

    // Login successful
    res.status(200).json({
      _id: user.id,
      phoneNumber: user.phoneNumber,
      username: user.username,
      pinSet: true,
      token: generateToken(user.id)
    });
  } catch (error) {
    console.error("❌ SERVER CRASH ERROR (in loginWithPin):", error);
    res.status(500).json({ message: error.message });
  }
};

// 3. SETUP/CHANGE PIN (Used in PinSetup.jsx and Settings.jsx)
const setPin = async (req, res) => {
  try {
    const { userId, pin } = req.body;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Hash the 4-digit PIN for security
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    user.pin = hashedPin;
    await user.save();

    res.status(200).json({ message: 'PIN successfully set/updated' });

  } catch (error) {
    console.error("❌ SERVER CRASH ERROR (in setPin):", error);
    res.status(500).json({ message: error.message });
  }
};


module.exports = { checkPhoneStatus, loginWithPin, setPin }; // Removed sendOtp and verifyOtp