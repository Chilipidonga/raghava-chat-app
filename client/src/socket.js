// src/socket.js
import io from 'socket.io-client';

const socket = io("https://raghava-server-z8kq.onrender.com", {
  withCredentials: true,
  transports: ["websocket", "polling"], 
  autoConnect: false // Important: We only connect when the user is logged in!
});

export default socket;