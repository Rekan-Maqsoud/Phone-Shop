import React, { useRef } from 'react';
import ModalBase from './ModalBase';
import { playActionSound, playModalCloseSound } from '../utils/sounds';
import { useModalKeyboardNavigation } from '../hooks/useKeyboardNavigation';

export default function ConfirmModal({ open, message, onConfirm, onCancel, t }) {
  const cancelButtonRef = useRef(null);
  const confirmButtonRef = useRef(null);

  const handleConfirm = () => {
    playActionSound();
    onConfirm();
  };

  const handleCancel = () => {
    playModalCloseSound();
    onCancel();
  };

  // Keyboard navigation for modal
  useModalKeyboardNavigation(
    open,
    handleCancel,
    handleConfirm,
    [cancelButtonRef, confirmButtonRef]
  );

  return (
    <ModalBase open={open} onClose={handleCancel}>
      <div className="flex flex-col gap-6 items-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto">
        <div className="text-lg font-semibold text-gray-800 dark:text-gray-100 text-center leading-relaxed">
          {message}
        </div>
        <div className="flex gap-4 mt-2 w-full justify-center">
          <button 
            ref={cancelButtonRef}
            onClick={handleCancel} 
            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100 px-6 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium border border-gray-300 dark:border-gray-600 flex items-center justify-center gap-2"
            title="Escape to cancel"
          >
            {t.cancel}
            <span className="text-xs opacity-75">(Esc)</span>
          </button>
          <button 
            ref={confirmButtonRef}
            onClick={handleConfirm} 
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium border border-blue-700 flex items-center justify-center gap-2"
            autoFocus
            title="Ctrl+Enter to confirm"
          >
            {t.ok}
            <span className="text-xs opacity-75">(Ctrl+⏎)</span>
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
