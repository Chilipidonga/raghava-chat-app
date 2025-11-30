import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save, Lock, Loader } from 'lucide-react';

// *** RENDER DEPLOYMENT URL (REPLACE THIS) ***
const BACKEND_URL = "https://raghava-server-z8kq.onrender.com"; // <-- Use YOUR copied URL
const PinSetup = () => {
  const navigate = useNavigate();
  // We assume userInfo is present from the previous step (Signup/Login)
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  // If session data is missing, redirect to the start
  if (!userInfo || !userInfo._id) {
    navigate('/signup');
    return null;
  }
  
  const handleSavePin = async (e) => {
    e.preventDefault();

    // Basic client-side validation
    if (pin.length !== 4 || isNaN(pin)) {
        alert("PIN must be a 4-digit number.");
        return;
    }
    if (pin !== confirmPin) {
        alert("PINs do not match!");
        return;
    }

    setLoading(true);
    try {
      // 1. API Call to set the PIN on the server
      const res = await axios.post(`${BACKEND_URL}/api/auth/set-pin`, {
        userId: userInfo._id,
        pin: pin,
      });

      // 2. Update local storage to reflect PIN is now set
      const updatedUser = { ...userInfo, pinSet: true };
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      
      alert("PIN set successfully! Now setting up your profile.");
      
      // *** STRICT FLOW REDIRECT: Go immediately to the Onboarding page ***
      navigate('/onboarding'); 
      // ***************************************************************

    } catch (error) {
      console.error("PIN setup failed:", error.response?.data || error.message);
      alert("Failed to set PIN. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      
      <div className="flex items-center gap-3 mb-6">
        <Lock size={30} className="text-purple-400" />
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">Setup Your PIN</h1>
      </div>

      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm border border-gray-700">
        
        <p className="text-center text-gray-400 mb-6">
            This 4-digit PIN will be used for fast logins.
        </p>

        <form onSubmit={handleSavePin} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm font-medium block mb-2">New PIN (4 digits)</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength="4"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white text-center text-xl tracking-widest focus:outline-none focus:border-purple-500 transition-colors"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              required
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm font-medium block mb-2">Confirm PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength="4"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white text-center text-xl tracking-widest focus:outline-none focus:border-purple-500 transition-colors"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              required
            />
          </div>

          <button disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader className="animate-spin size-5" /> : <><Save size={20} /> Set My PIN</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PinSetup;