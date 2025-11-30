import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './pages/Signup';
import Chat from './pages/Chat';
import Settings from './pages/Settings'; 
import Onboarding from './pages/Onboarding'; 
import PinSetup from './pages/PinSetup'; // <--- ADDED FOR PIN SETUP

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route redirects to Signup/Login */}
        <Route path="/" element={<Navigate to="/signup" />} />
        
        {/* Authentication and Setup Flow */}
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/pin-setup" element={<PinSetup />} /> {/* <--- NEW PIN SETUP ROUTE */}
        
        {/* Main Application Routes */}
        <Route path="/chat" element={<Chat />} />
        <Route path="/settings" element={<Settings />} /> 
      </Routes>
    </BrowserRouter>
  );
}

export default App;