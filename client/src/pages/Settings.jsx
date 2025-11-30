import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save, ArrowLeft, User, Loader, Lock, Key } from 'lucide-react';

// *** RENDER DEPLOYMENT URL (REPLACE THIS) ***
const BACKEND_URL = "https://raghava-server-z8kq.onrender.com"; // <-- Use YOUR copied URL
const Settings = () => {
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  
  // States for Username and PIN changes
  const [username, setUsername] = useState(userInfo?.username || '');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [pinChangeError, setPinChangeError] = useState('');
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'pin'

  if (!userInfo) {
    navigate('/signup');
    return null;
  }

  // --- 1. Handle Username Update ---
  const handleSaveUsername = async (e) => {
    e.preventDefault();
    if (username.length < 3) {
      alert("Username must be at least 3 characters long.");
      return;
    }

    setLoading(true);
    try {
      // API Call to Update Username on the server
      const res = await axios.post(`${BACKEND_URL}/api/users/update-profile`, {
        userId: userInfo._id,
        username: username,
      });

      // Update Local Storage
      const updatedUser = { ...userInfo, username: res.data.username };
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      
      alert("Username updated successfully!");
    } catch (error) {
      console.error("Username update failed:", error.response?.data || error.message);
      alert("Failed to update username. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- 2. Handle PIN Change ---
  const handleChangePin = async (e) => {
    e.preventDefault();
    setPinChangeError('');

    if (newPin.length !== 4 || isNaN(newPin)) {
        setPinChangeError("PIN must be a 4-digit number.");
        return;
    }
    if (newPin !== confirmPin) {
        setPinChangeError("New PINs do not match!");
        return;
    }
    
    setLoading(true);
    try {
      // API Call to set the new PIN (same endpoint as setup)
      await axios.post(`${BACKEND_URL}/api/auth/set-pin`, {
        userId: userInfo._id,
        pin: newPin,
      });

      setPinChangeError("PIN successfully updated!");
      setNewPin('');
      setConfirmPin('');
      
    } catch (error) {
      console.error("PIN change failed:", error.response?.data || error.message);
      setPinChangeError("Failed to change PIN. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  const activeContent = activeTab === 'profile' ? (
    <form onSubmit={handleSaveUsername} className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <User size={40} className="text-white" />
        </div>
        <p className="text-gray-400 text-sm font-medium">Phone: {userInfo.phoneNumber}</p>
      </div>

      <div>
        <label className="text-gray-400 text-sm font-medium block mb-2">Change Username</label>
        <input
          type="text"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
          placeholder="Your New Name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength="3"
        />
      </div>

      <button disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
        {loading ? <Loader className="animate-spin size-5" /> : <><Save size={20} /> Save Username</>}
      </button>
    </form>
  ) : (
    <form onSubmit={handleChangePin} className="space-y-4">
      <p className="text-center text-gray-400 mb-4">Set your new 4-digit security PIN.</p>
      
      <div>
        <label className="text-gray-400 text-sm font-medium block mb-2">New PIN (4 digits)</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength="4"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white text-center text-xl tracking-widest focus:outline-none focus:border-purple-500 transition-colors"
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
          required
        />
      </div>
      <div>
        <label className="text-gray-400 text-sm font-medium block mb-2">Confirm New PIN</label>
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
      
      {pinChangeError && (
        <p className={`text-sm text-center ${pinChangeError.includes('successfully') ? 'text-green-500' : 'text-red-500'}`}>{pinChangeError}</p>
      )}

      <button disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
        {loading ? <Loader className="animate-spin size-5" /> : <><Key size={20} /> Change PIN</>}
      </button>
    </form>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col p-4">
      
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-800">
        <button onClick={() => navigate('/chat')} className="text-teal-400 hover:text-white transition flex items-center gap-2">
          <ArrowLeft size={24} /> Back to Chat
        </button>
        <h1 className="text-xl font-bold text-white">Account Settings</h1>
        <div></div> {/* Spacer */}
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-1">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
          
          {/* Tabs */}
          <div className="flex mb-6 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-gray-400 hover:text-white'}`}
            >
              Username
            </button>
            <button
              onClick={() => setActiveTab('pin')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'pin' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-gray-400 hover:text-white'}`}
            >
              Change PIN
            </button>
          </div>

          {activeContent}
          
        </div>
      </div>
    </div>
  );
};

export default Settings;