import React from 'react';

export default function ModalBase({ open, show, onClose, children, className = '', maxWidth = 'md' }) {
  const isVisible = open || show;
  if (!isVisible) return null;

  const maxWidthClasses = {
    'md': 'max-w-md',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full ${maxWidthClasses[maxWidth] || 'max-w-md'} flex flex-col gap-6 border border-blue-200 dark:border-blue-700 ${className}`}>
        {children}
      </div>
    </div>
  );
}
