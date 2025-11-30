import { useState } from 'react';
import { MessageSquare, ArrowRight, Loader, Lock, Key, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const navigate = useNavigate();
  // Steps: 1: Phone Input, 2: PIN Input
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');

  // Store user status after phone check (not used directly, but useful for context)
  const [userStatus, setUserStatus] = useState(null); 

  // Helper function to get the clean phone number for API calls
  const getFullNumber = () => `${countryCode}${phoneNumber.replace(/\s+/g, '')}`;

  // 1. Handle Phone Check (Main entry point, checks user existence/PIN status)
  const handlePhoneCheck = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fullNumber = getFullNumber();
      
      // *** CORRECTED ENDPOINT: Now calls /check-status ***
      const { data } = await axios.post('http://localhost:5000/api/auth/check-status', { phoneNumber: fullNumber });
      
      setUserStatus(data);
      
      if (!data.isPinSet) {
        // New user or user never set PIN -> Go immediately to PIN setup
        navigate('/pin-setup');
      } else {
        // PIN is already set -> Go to PIN login
        setStep(2); 
      }

    } catch (error) {
      console.error("Phone check error:", error.response?.data || error.message);
      alert("Error processing number. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Login with PIN
  const handleLoginPin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fullNumber = getFullNumber();
      
      const { data } = await axios.post('http://localhost:5000/api/auth/login-pin', { 
        phoneNumber: fullNumber,
        pin: pin 
      });
      
      localStorage.setItem('userInfo', JSON.stringify(data));
      
      // Check if user needs to set a custom username
      if (data.username === 'Raghava User') {
        navigate('/onboarding'); 
      } else {
        navigate('/chat');
      }

    } catch (error) {
      console.error("PIN Login Error:", error.response?.data || error.message);
      alert("Invalid PIN or Login Failed");
    } finally {
      setLoading(false);
    }
  };

  // UI Helper: Get Current Step Title
  const getStepTitle = () => {
    if (step === 1) return 'Enter Phone Number';
    if (step === 2) return 'Enter Your 4-digit PIN';
    return '';
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-800">
        
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-teal-500 to-blue-600 p-3 rounded-xl shadow-lg shadow-teal-900/50">
              {step === 2 ? <Lock className="w-8 h-8 text-white" /> : <MessageSquare className="w-8 h-8 text-white" />}
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white">{getStepTitle()}</h2>
          <p className="text-gray-400 mt-2">
            {step === 1 && 'We will check your security preferences.'}
            {step === 2 && 'Enter your security PIN for fast access.'}
          </p>
        </div>

        {/* STEP 1: PHONE INPUT (Now goes directly to check status) */}
        {step === 1 && (
          <form onSubmit={handlePhoneCheck} className="space-y-6">
            <div className="flex space-x-2">
              {/* Country Code Dropdown */}
              <select 
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
              >
                <option value="+91">🇮🇳 +91</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
              </select>

              {/* Phone Number */}
              <input
                type="tel"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
                placeholder="98765 43210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>

            <button disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center shadow-md shadow-teal-900/40 active:scale-95">
              {loading ? <Loader className="animate-spin size-5" /> : <>Continue <ArrowRight className="ml-2 w-4 h-4" /></>}
            </button>
          </form>
        )}
        
        {/* STEP 2: PIN INPUT (Previously Step 3) */}
        {step === 2 && (
            <form onSubmit={handleLoginPin} className="space-y-6">
                <div className="flex justify-center">
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength="4"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-center text-2xl tracking-widest placeholder-gray-500 focus:outline-none focus:border-teal-500"
                      placeholder="• • • •"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                      required
                    />
                </div>
                
                <button disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center shadow-md shadow-teal-900/40 active:scale-95">
                    {loading ? <Loader className="animate-spin size-5" /> : <>Login with PIN <Key className="ml-2 w-4 h-4" /></>}
                </button>

                <div className="flex justify-between text-sm mt-3">
                    <button type="button" onClick={() => setStep(1)} className="text-gray-400 hover:text-white transition-colors">
                        Change Number
                    </button>
                    {/* Since there is no OTP, clicking Forgot PIN sends them to PIN setup */}
                    <button type="button" onClick={() => navigate('/pin-setup')} className="text-red-400 hover:text-red-300 transition-colors">
                        Forgot PIN? (Re-Setup)
                    </button>
                </div>
            </form>
        )}

      </div>
    </div>
  );
};

export default Signup;