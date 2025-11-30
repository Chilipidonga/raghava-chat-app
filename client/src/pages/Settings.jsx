import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save, ArrowLeft, User, Loader } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  // Use the username from local storage as the initial state
  const [username, setUsername] = useState(userInfo?.username || '');
  const [loading, setLoading] = useState(false);

  if (!userInfo) {
    navigate('/signup');
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
      // API Call to Update Username on the server
      const res = await axios.post('http://localhost:5000/api/users/update-profile', {
        userId: userInfo._id,
        username: username,
      });

      // 2. Update Local Storage to reflect the new username
      const updatedUser = { ...userInfo, username: res.data.username };
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      
      alert("Profile updated successfully! New name will appear in chat now.");
      navigate('/chat'); // Go back to the chat page
    } catch (error) {
      console.error("Update failed:", error.response?.data || error.message);
      alert("Failed to update profile. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col p-4">
      
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-800">
        <button onClick={() => navigate('/chat')} className="text-teal-400 hover:text-white transition flex items-center gap-2">
          <ArrowLeft size={24} /> Back to Chat
        </button>
        <h1 className="text-xl font-bold text-white">Profile Settings</h1>
        <div></div> {/* Spacer */}
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-1">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
          
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <User size={40} className="text-white" />
            </div>
            <p className="text-gray-400 text-sm font-medium">Phone: {userInfo.phoneNumber}</p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
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
              {loading ? <Loader className="animate-spin size-5" /> : <><Save size={20} /> Save Changes</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;