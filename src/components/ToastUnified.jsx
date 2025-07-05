import React, { useEffect, useRef } from 'react';

export default function ToastUnified({ message, onClose, type = 'success', duration = 3000 }) {
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!message) return;
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout with proper cleanup
    timeoutRef.current = setTimeout(() => {
      if (onClose) {
        onClose();
      }
    }, duration);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [message, onClose, duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!message) return null;

  const styles = {
    success: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg',
    error: 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg',
    warning: 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg',
    info: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg',
  };

  const handleClick = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div 
        className={`px-8 py-4 rounded-2xl shadow-2xl font-extrabold text-xl animate-fade-in pointer-events-auto cursor-pointer transition-transform hover:scale-105 ${styles[type] || styles.success}`}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2">
          <span>{message}</span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            className="ml-2 text-white/80 hover:text-white text-2xl leading-none bg-black/20 hover:bg-black/30 rounded-full w-6 h-6 flex items-center justify-center transition-colors"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
