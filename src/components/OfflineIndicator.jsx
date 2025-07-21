import React, { useState, useEffect } from 'react';
import useOnlineStatus from './hooks/useOnlineStatus';
import cloudAuthService from '../services/CloudAuthService';

export default function OfflineIndicator({ className = '' }) {
  const { isOnline } = useOnlineStatus();
  const [isCloudAuthenticated, setIsCloudAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check authentication status on mount (using cached state)
    const checkAuth = async () => {
      setIsCheckingAuth(true);
      const isAuth = cloudAuthService.isAuthenticated;
      setIsCloudAuthenticated(isAuth);
      setIsCheckingAuth(false);
    };

    checkAuth();

    // Listen for auth changes
    const listener = (auth) => {
      setIsCloudAuthenticated(auth);
      setIsCheckingAuth(false);
    };
    
    cloudAuthService.addAuthListener(listener);
    
    return () => {
      cloudAuthService.removeAuthListener(listener);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium animate-pulse shadow-lg z-50 relative ${className}`}>
        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
        <span className="font-bold flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
          Offline
        </span>
      </div>
    );
  }

  if (isCheckingAuth) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm font-medium ${className}`}>
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        <span>Checking...</span>
      </div>
    );
  }

  if (isCloudAuthenticated) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium ${className}`}>
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Online</span>
        <div className="w-4 h-4 text-green-600 dark:text-green-400" title="Cloud backup enabled">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.5 17a4.5 4.5 0 01-1.44-8.765 4.5 4.5 0 018.302-3.046 3.5 3.5 0 014.504 4.272A4 4 0 0115 17H5.5zm3.75-2.75a.75.75 0 001.5 0V9.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0l-3.25 3.5a.75.75 0 101.1 1.02l1.95-2.1v4.59z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium ${className}`}>
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span>Online</span>
    </div>
  );
}
