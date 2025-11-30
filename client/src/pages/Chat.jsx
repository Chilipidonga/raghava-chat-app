import { useState, useEffect, useRef } from 'react';
import { 
  Send, Menu, MoreVertical, Search, User, Bot, Trash2, 
  Wand2, Zap, UserPlus, Check, X, Settings, CircleUser, Image, LogOut, UserX
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import ToastNotification from '../components/ToastNotification'; 

// *** RENDER DEPLOYMENT URL (REPLACE THIS) ***
const BACKEND_URL = "https://raghava-server-abc.onrender.com"; 

// Connect to Backend using the live URL
const socket = io.connect(BACKEND_URL);

const Chat = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState({});
  const [activeTab, setActiveTab] = useState('chats'); 
  const [showMenu, setShowMenu] = useState(false); 
  const [showSidebarMenu, setShowSidebarMenu] = useState(false); 
  
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [chatName, setChatName] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [notification, setNotification] = useState(null); 
  
  const messagesEndRef = useRef(null);

  // 1. Initial Load & Data Fetch
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('userInfo'));
    if (!user) navigate('/signup');
    else {
      setCurrentUser(user);
      fetchMyData(user._id);
    }
  }, [navigate]);

  const fetchMyData = async (id) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/users/me/${id}`);
      setFriends(res.data.friends);
      setRequests(res.data.incomingRequests);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => { scrollToBottom(); }, [messageList]); 

  // 2. Search Users
  useEffect(() => {
    if (searchQuery.length > 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await axios.get(`${BACKEND_URL}/api/users/search?query=${searchQuery}&currentUserId=${currentUser._id}`);
          setSearchResults(res.data);
        } catch (error) {
          console.error("Search failed:", error);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, currentUser._id]);

  // 3. Friend Actions
  const sendRequest = async (toId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/users/request`, { fromId: currentUser._id, toId });
      alert("Request Sent!");
      setSearchQuery(""); 
    } catch (error) {
      alert("Failed to send request");
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/users/accept`, { userId: currentUser._id, requestId });
      fetchMyData(currentUser._id); 
    } catch (error) {
      alert("Failed to accept request");
    }
  };

  // 4. Chat/Room Logic (Load History)
  useEffect(() => {
    if (selectedRoom) {
      axios.get(`${BACKEND_URL}/api/messages/${selectedRoom}`).then(res => {
        const formatted = res.data.map(m => ({ ...m, message: m.content, time: m.timestamp }));
        setMessageList(formatted);
      }).catch(err => console.error(err));
    }
  }, [selectedRoom]);

  // 5. Socket Listener (Real-Time Updates + NOTIFICATION LOGIC)
  useEffect(() => {
    const handleReceiveMessage = (data) => {
      // 1. Always update the message list if the room matches
      if (selectedRoom === data.room) {
         setMessageList(prev => [...prev, data]);
      } 
      // 2. NOTIFICATION LOGIC: Show notification if the room does NOT match
      else if (data.author !== (currentUser.username || currentUser.phoneNumber)) {
        setNotification({ author: data.author, message: data.message });
      }
    };
    
    const handleSmartReply = (data) => {
      setCurrentMessage(data.suggestion);
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("smart_reply_result", handleSmartReply);
    
    return () => { 
      socket.off("receive_message", handleReceiveMessage); 
      socket.off("smart_reply_result", handleSmartReply); 
    }
  }, [selectedRoom, currentUser.username, currentUser.phoneNumber]);

  // 6. Notification Timeout Effect
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000); 
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // 7. Send Message 
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!currentMessage) return;
    const msgData = {
      room: selectedRoom,
      author: currentUser.username || currentUser.phoneNumber,
      message: currentMessage,
      content: currentMessage, 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessageList(prev => [...prev, msgData]);
    
    if (selectedRoom === 'ai-bot') socket.emit("chat_with_ai", msgData);
    else socket.emit("send_message", msgData);
    
    setCurrentMessage("");
  };

  const startChat = (friend) => {
    const ids = [currentUser._id, friend._id].sort();
    setSelectedRoom(`${ids[0]}-${ids[1]}`);
    setChatName(friend.username || friend.phoneNumber);
  };
  
  const clearHistory = async () => {
    if (!window.confirm(`Are you sure you want to delete all messages in the ${chatName} chat?`)) {
      return;
    }
    try {
      await axios.delete(`${BACKEND_URL}/api/messages/${selectedRoom}`);
      setMessageList([]); 
    } catch (error) {
      alert("Could not clear history");
    }
  };

  const unfriendUser = async () => {
    if (selectedRoom === 'global' || selectedRoom === 'ai-bot') return;

    if (!window.confirm(`Are you sure you want to disconnect from ${chatName}?`)) {
        return;
    }

    try {
        const friendId = selectedRoom.split('-').find(id => id !== currentUser._id);
        
        if (!friendId) return;

        await axios.post(`${BACKEND_URL}/api/users/unfriend`, {
            userId: currentUser._id,
            friendId: friendId
        });
        
        await fetchMyData(currentUser._id);
        setSelectedRoom(null); 
        setChatName("");
        
        alert(`${chatName} has been removed from your connections.`);

    } catch (error) {
        console.error("Unfriend failed:", error);
        alert("Failed to unfriend connection.");
    }
  };

  const handleSmartReply = () => {
    const lastMsg = messageList.slice().reverse().find(m => m.author !== (currentUser.username || currentUser.phoneNumber));
    if(lastMsg) socket.emit('request_smart_reply', { lastMessage: lastMsg.message });
  };

  const navigateToSettings = () => navigate('/settings');
  
  // User List Item Component (Unchanged)
  const UserItem = ({ user, type }) => (
    <div className="flex items-center justify-between p-3 hover:bg-gray-800 rounded-lg cursor-pointer transition border border-transparent hover:border-gray-700" onClick={() => type === 'friend' && startChat(user)}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-teal-900/50">
          {user.username?.[0]?.toUpperCase() || "U"}
        </div>
        <div>
          <h4 className="text-white font-medium">{user.username || user.phoneNumber}</h4>
          <p className="text-gray-400 text-xs">{type === 'friend' ? 'Tap to chat' : 'Raghava User'}</p>
        </div>
      </div>
      {type === 'search' && (
        <button onClick={(e) => { e.stopPropagation(); sendRequest(user._id); }} className="p-2 bg-blue-600 rounded-full text-white hover:bg-blue-500"><UserPlus size={16} /></button>
      )}
      {type === 'request' && (
        <div className="flex gap-2">
          <button onClick={() => acceptRequest(user._id)} className="p-2 bg-green-600 rounded-full text-white hover:bg-green-500"><Check size={16} /></button>
          <button className="p-2 bg-red-600 rounded-full text-white hover:bg-red-500"><X size={16} /></button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden font-sans text-gray-100">
      
      {/* Renders the toast notification component */}
      <ToastNotification 
        message={notification} 
        onClose={() => setNotification(null)}
      />
      
      {/* LEFT SIDEBAR */}
      <div className="w-full md:w-1/3 border-r border-gray-800 flex flex-col relative bg-gray-900">
        
        {/* HEADER */}
        <div className="bg-gray-900 p-4 flex justify-between items-center shadow-lg z-10 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <button onClick={() => setShowSidebarMenu(!showSidebarMenu)} className="text-gray-400 hover:text-white transition">
              <Menu size={24} />
            </button>
            <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 text-2xl font-extrabold tracking-tight">
              Raghava
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Search size={20} className="text-gray-400 hover:text-white cursor-pointer" />
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)}><MoreVertical size={20} className="text-gray-400 hover:text-white" /></button>
              {showMenu && (
                <div className="absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-48 py-2 z-50 overflow-hidden">
                  <div onClick={navigateToSettings} className="px-4 py-3 hover:bg-gray-700 text-gray-200 cursor-pointer flex gap-3 items-center"><CircleUser size={18}/> Profile</div>
                  <div className="px-4 py-3 hover:bg-gray-700 text-gray-200 cursor-pointer flex gap-3 items-center"><Settings size={18}/> Settings</div>
                  <div className="h-px bg-gray-700 my-1"></div>
                  <div onClick={() => { localStorage.clear(); navigate('/signup'); }} className="px-4 py-3 hover:bg-gray-700 text-red-400 cursor-pointer flex gap-3 items-center"><LogOut size={18}/> Logout</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3-Lines Dropdown */}
        {showSidebarMenu && (
          <div className="bg-gray-800 p-4 border-b border-gray-700 animate-slideDown shadow-inner">
            <div className="text-gray-500 text-[10px] uppercase font-bold mb-3 tracking-widest">Menu</div>
            <div className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded-lg cursor-pointer text-gray-200 transition">
              <div className="p-1.5 bg-purple-500/20 rounded-md"><Image size={18} className="text-purple-400" /></div>
              <span className="text-sm font-medium">Stories</span>
            </div>
            <div className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded-lg cursor-pointer text-gray-200 transition mt-1">
              <div className="p-1.5 bg-yellow-500/20 rounded-md"><Zap size={18} className="text-yellow-400" /></div>
              <span className="text-sm font-medium">Raghava Premium</span>
            </div>
          </div>
        )}

        {/* TABS */}
        <div className="flex border-b border-gray-800 bg-gray-900">
          <button 
            onClick={() => setActiveTab('chats')} 
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors duration-300 ${activeTab === 'chats' ? 'text-teal-400 border-b-2 border-teal-400 bg-gray-800/30' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Chats
          </button>
          <button 
            onClick={() => setActiveTab('requests')} 
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors duration-300 ${activeTab === 'requests' ? 'text-teal-400 border-b-2 border-teal-400 bg-gray-800/30' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Requests {requests.length > 0 && <span className="ml-2 bg-teal-500 text-gray-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{requests.length}</span>}
          </button>
        </div>

        {/* LIST CONTENT */}
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          
          {searchQuery && (
            <div className="mb-4 border-b border-gray-800 pb-2">
              <p className="text-[10px] text-teal-500 font-bold uppercase mb-2 px-2">Global Search</p>
              {searchResults.map(u => <UserItem key={u._id} user={u} type="search" />)}
            </div>
          )}

          {activeTab === 'requests' ? (
            <div className="space-y-1">
              {requests.length === 0 && <div className="text-center text-gray-600 mt-20 flex flex-col items-center"><UserPlus size={40} className="mb-2 opacity-20"/> <p>No pending requests</p></div>}
              {requests.map(u => <UserItem key={u._id} user={u} type="request" />)}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="p-2">
                <input 
                  type="text" 
                  placeholder="Search chats..." 
                  className="w-full bg-gray-800 text-gray-200 p-3 rounded-xl text-sm border border-transparent focus:border-teal-500/50 focus:bg-gray-800 outline-none transition-all placeholder-gray-600"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Raghava's AI Item */}
              <div onClick={() => { setSelectedRoom('ai-bot'); setChatName("Raghava's AI"); }} className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-xl cursor-pointer transition group">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-900/30 group-hover:scale-105 transition-transform"><Bot size={22} className="text-white"/></div>
                <div><h4 className="text-gray-100 font-semibold group-hover:text-purple-300 transition-colors">Raghava's AI</h4><p className="text-gray-500 text-xs font-medium">Your Assistant</p></div>
              </div>

              <div onClick={() => { setSelectedRoom('global'); setChatName("Global Room"); }} className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-xl cursor-pointer transition group">
                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform"><User size={22} className="text-gray-300"/></div>
                <div><h4 className="text-gray-100 font-semibold">Global Room</h4><p className="text-gray-500 text-xs">Public Chat</p></div>
              </div>

              <div className="mt-4 pt-2 border-t border-gray-800">
                <p className="text-[10px] text-gray-500 mb-2 px-3 uppercase font-bold tracking-wider">Friends</p>
                {friends.length === 0 && <p className="text-xs text-gray-600 px-3 italic">Search users to connect...</p>}
                {friends.map(u => <UserItem key={u._id} user={u} type="friend" />)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE (Chat Window) */}
      <div className={`hidden md:flex flex-1 flex-col bg-gray-950 ${selectedRoom ? 'block' : 'hidden'}`}>
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="bg-gray-900 p-4 border-b border-gray-800 flex justify-between items-center z-10">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${selectedRoom === 'ai-bot' ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-teal-500 to-emerald-500'}`}>
                  {selectedRoom === 'ai-bot' ? <Bot size={20} className="text-white"/> : <User size={20} className="text-white"/>}
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">{chatName}</h2>
                  <p className="text-xs text-green-400 flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span> Online</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* UNFRIEND BUTTON: Only visible in 1-on-1 chats */}
                {selectedRoom !== 'global' && selectedRoom !== 'ai-bot' && (
                  <button 
                    onClick={unfriendUser} 
                    className="p-2 hover:bg-red-900/40 rounded-full text-red-400 transition" 
                    title={`Unfriend ${chatName}`}
                  >
                    <UserX size={20} />
                  </button>
                )}
                
                <button onClick={clearHistory} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-red-400 transition" title="Clear Chat History"><Trash2 size={20}/></button>
                <button className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"><MoreVertical size={20}/></button>
              </div>
            </div>

            {/* BACKGROUND: Tech Grid + Glow */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-950 relative">
              {/* CSS Pattern Background */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, #4fd1c5 1px, transparent 0)`,
                  backgroundSize: '40px 40px'
              }}></div>
              <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-gray-950 pointer-events-none"></div>

              {messageList.map((msg, idx) => {
                 const isMe = msg.author === (currentUser.username || currentUser.phoneNumber);
                 return (
                   <div key={idx} className={`flex ${isMe ? "justify-end" : "justify-start"} relative z-10`}>
                     <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-md ${
                       isMe 
                       ? "bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-br-none" 
                       : "bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700"
                     }`}>
                       <p className={`font-bold text-[10px] mb-1 ${isMe ? "text-teal-200" : "text-purple-400"}`}>{msg.author}</p>
                       <p className="leading-relaxed">{msg.message}</p>
                       <p className={`text-[10px] text-right mt-1 ${isMe ? "text-teal-200/70" : "text-gray-500"}`}>{msg.time}</p>
                     </div>
                   </div>
                 )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-gray-900 border-t border-gray-800 flex items-center gap-3">
              {selectedRoom !== 'ai-bot' && (
                <button 
                  onClick={handleSmartReply}
                  className="p-3 bg-gray-800 border border-gray-700 rounded-xl text-purple-400 hover:text-white hover:bg-purple-600 transition-all shadow-sm group" 
                  title="Smart Reply"
                >
                  <Wand2 size={20} className="group-hover:animate-pulse" />
                </button>
              )}
              <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 flex items-center px-4 py-2 focus-within:border-teal-500/50 focus-within:ring-1 focus-within:ring-teal-500/20 transition-all">
                <input 
                  type="text" 
                  className="flex-1 bg-transparent text-white outline-none placeholder-gray-500"
                  placeholder="Type a message..."
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage(e)}
                />
              </div>
              <button 
                onClick={sendMessage} 
                className="p-3 bg-teal-600 rounded-xl text-white hover:bg-teal-500 shadow-lg shadow-teal-900/20 transition-transform active:scale-95"
              >
                <Send size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-950 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
               <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500 rounded-full blur-[128px]"></div>
               <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-[128px]"></div>
            </div>
            
            <div className="z-10 text-center">
                <div className="w-20 h-20 bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3">
                    <Zap size={40} className="text-teal-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-3">Welcome to Raghava</h2>
                <p className="text-gray-400 max-w-sm">Connect with friends, chat with AI, and experience the future of messaging.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;