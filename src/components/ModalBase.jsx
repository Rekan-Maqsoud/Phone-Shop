import React, { useEffect, useRef } from 'react';
import { playModalOpenSound } from '../utils/sounds';

export default function ModalBase({ open, show, onClose, children, className = '', maxWidth = 'md' }) {
  const isVisible = open || show;
  const previouslyFocusedElement = useRef(null);
  
  useEffect(() => {
    if (isVisible) {
      // Store the currently focused element before modal opens
      previouslyFocusedElement.current = document.activeElement;
      playModalOpenSound();
    } else if (previouslyFocusedElement.current) {
      // Restore focus when modal closes
      setTimeout(() => {
        if (previouslyFocusedElement.current && typeof previouslyFocusedElement.current.focus === 'function') {
          previouslyFocusedElement.current.focus();
        }
      }, 0);
    }
  }, [isVisible]);
  
  if (!isVisible) return null;

  const maxWidthClasses = {
    'md': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 flex items-center justify-center z-50 animate-fade-in">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full ${maxWidthClasses[maxWidth] || 'max-w-2xl'} flex flex-col gap-6 border border-blue-200 dark:border-blue-700 ${className}`}>
        {children}
      </div>
    </div>
  );
}
