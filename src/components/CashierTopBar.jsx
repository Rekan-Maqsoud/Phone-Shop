import React from 'react';
import OfflineIndicator from './OfflineIndicator';

export default function CashierTopBar({ 
  t, 
  clock, 
  admin 
}) {
  return (
    <div className="w-full flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
      <button
        onClick={admin.openAdminModal}
        className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold shadow-lg hover:scale-105 hover:from-indigo-700 hover:to-blue-600 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300"
        title={t.backToAdmin}
      >
        {t.backToAdmin || 'Admin Panel'}
      </button>
      <div className="flex items-center gap-4">
        <OfflineIndicator />
        <div className="text-gray-800 dark:text-gray-200 text-base font-mono tracking-wide bg-white/40 dark:bg-gray-800/60 px-4 py-2 rounded-xl shadow">
          {clock.toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
