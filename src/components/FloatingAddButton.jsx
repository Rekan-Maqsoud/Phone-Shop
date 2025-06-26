import React from 'react';

export default function FloatingAddButton({ onClick, label = '+', title = 'Add Product' }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg w-16 h-16 flex items-center justify-center text-3xl font-bold focus:outline-none focus:ring-4 focus:ring-blue-400 transition"
      title={title}
      aria-label={title}
      tabIndex={0}
      style={{ boxShadow: '0 4px 24px 0 rgba(0,0,0,0.18)' }}
    >
      {label}
    </button>
  );
}
