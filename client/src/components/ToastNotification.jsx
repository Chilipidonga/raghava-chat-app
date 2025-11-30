import React from 'react';
import { MessageSquare, User, Zap } from 'lucide-react';

const ToastNotification = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 z-[100] bg-gray-900 border border-gray-700 p-4 rounded-xl shadow-2xl transition-all duration-300 transform animate-slideUp max-w-xs cursor-pointer hover:bg-gray-800"
      onClick={onClose}
    >
      <div className="flex items-start gap-3">
        {/* Icon based on sender */}
        <div className="mt-1">
          {message.author === "Raghava's AI" ? (
            <MessageSquare size={20} className="text-purple-400" />
          ) : (
            <User size={20} className="text-teal-400" />
          )}
        </div>
        <div>
          <h4 className="font-bold text-white mb-0.5">{message.author}</h4>
          {/* Truncate the message content */}
          <p className="text-sm text-gray-300 truncate">{message.message}</p>
        </div>
      </div>
    </div>
  );
};

export default ToastNotification;