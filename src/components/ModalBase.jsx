import React, { useEffect, useRef } from 'react';
import { playModalOpenSound } from '../utils/sounds';

export default function ModalBase({ open, show, onClose, children, className = '', maxWidth = 'md', title }) {
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
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isVisible && onClose) {
        onClose();
      }
    };
    
    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isVisible, onClose]);
  
  if (!isVisible) return null;

  const maxWidthClasses = {
    'md': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl'
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 flex items-center justify-center z-50 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${maxWidthClasses[maxWidth] || 'max-w-2xl'} flex flex-col border border-blue-200 dark:border-blue-700 ${className} max-h-[90vh] overflow-hidden`}>
        {title && (
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
