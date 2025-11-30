const express = require('express');
const router = express.Router();
// We import the new controller functions that handle status checking and PIN login
const { checkPhoneStatus, loginWithPin, setPin } = require('../controllers/authController');

// Main Entry Point: Checks if user exists and if PIN is set
router.post('/check-status', checkPhoneStatus); 

// PIN Routes: Handles login and setting/changing the PIN
router.post('/login-pin', loginWithPin); 
router.post('/set-pin', setPin);         

// NOTE: Original OTP routes (/send-otp, /verify-otp) have been removed.

module.exports = router;