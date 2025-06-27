import React from 'react';
import ModalBase from './ModalBase';

export default function ConfirmModal({ open, message, onConfirm, onCancel }) {
  return (
    <ModalBase open={open} onClose={onCancel}>
      <div className="flex flex-col gap-4 items-center">
        <div className="text-lg font-bold text-gray-800 dark:text-gray-100 text-center">{message}</div>
        <div className="flex gap-4 mt-2">
          <button onClick={onCancel} className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 px-3 py-1 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition">Cancel</button>
          <button onClick={onConfirm} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition">OK</button>
        </div>
      </div>
    </ModalBase>
  );
}
