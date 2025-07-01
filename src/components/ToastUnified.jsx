import React from 'react';

export default function ToastUnified({ message, onClose, type = 'success', duration = 2500 }) {
  React.useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onClose && onClose(), duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  if (!message) return null;

  const styles = {
    success: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg',
    error: 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg',
    info: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg',
  };

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className={`px-8 py-4 rounded-2xl shadow-2xl font-extrabold text-xl animate-fade-in pointer-events-auto ${styles[type] || styles.success}`}>
        {message}
      </div>
    </div>
  );
}
