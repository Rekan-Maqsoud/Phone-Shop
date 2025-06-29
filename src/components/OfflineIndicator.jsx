import React from 'react';
import useOnlineStatus from './hooks/useOnlineStatus';

export default function OfflineIndicator({ className = '' }) {
  const { isOnline } = useOnlineStatus();

  if (isOnline) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium ${className}`}>
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Online</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium animate-pulse shadow-lg z-50 relative ${className}`}>
      <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
      <span className="font-bold">⚠️ Offline</span>
    </div>
  );
}
