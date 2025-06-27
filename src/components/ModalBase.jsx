import React from 'react';

export default function ModalBase({ open, onClose, children, className = '' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md flex flex-col gap-6 border border-blue-200 dark:border-blue-700 ${className}`}>
        {children}
        {onClose && (
          <button onClick={onClose} className="mt-4 w-full bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded-lg font-semibold shadow hover:bg-gray-400 dark:hover:bg-gray-500 transition">Close</button>
        )}
      </div>
    </div>
  );
}
