import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Loader, Zap } from 'lucide-react';

const Onboarding = () => {
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if accessed without logging in
  if (!userInfo) {
    navigate('/signup');
    return null;
  }
  
  // Quick redirect if they already set their name (prevents accidental access)
  // 'Raghava User' is the default name we check against to force setup.
  if (userInfo.username !== 'Raghava User' && userInfo.username.length > 2) {
     navigate('/chat');
     return null;
  }

  const handleSave = async (e) => {
    e.preventDefault();
    if (username.length < 3) {
      alert("Username must be at least 3 characters long.");
      return;
    }

    setLoading(true);
    try {
      // 1. API Call to Update Username 
      const res = await axios.post('http://localhost:5000/api/users/update-profile', {
        userId: userInfo._id,
        username: username,
      });

      // 2. Update Local Storage with the final, chosen name
      const updatedUser = { ...userInfo, username: res.data.username };
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      
      // Success! Go to the main chat screen
      navigate('/chat'); 
    } catch (error) {
      console.error("Update failed:", error.response?.data || error.message);
      alert("Failed to set username. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      
      {/* Visual Header */}
      <div className="flex items-center gap-3 mb-6">
        <Zap size={30} className="text-teal-400" />
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">Raghava Setup</h1>
      </div>

      {/* Main Content Card */}
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-r from-teal-600 to-teal-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <User size={40} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Welcome to Raghava</h2>
          <p className="text-gray-400 text-sm mt-2">
            Please create a unique username to continue chatting.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm font-medium block mb-2">Username</label>
            <input
              type="text"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
              placeholder="e.g., Hai_Dev_Official"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength="3"
            />
          </div>

          <button disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader className="animate-spin size-5" /> : <>Start Chatting</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;