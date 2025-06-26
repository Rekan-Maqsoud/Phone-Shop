import React from 'react';

export default function ConfirmModal({ open, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-xs flex flex-col gap-4">
        <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{message}</div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 px-3 py-1 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition">Cancel</button>
          <button onClick={onConfirm} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition">OK</button>
        </div>
      </div>
    </div>
  );
}
