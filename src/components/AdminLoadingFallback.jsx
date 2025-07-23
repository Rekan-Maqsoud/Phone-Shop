import React from 'react';
import { useLocale } from '../contexts/LocaleContext';

export default function AdminLoadingFallback({ message = 'Loading Admin Panel...', timeout = false }) {
  const { t } = useLocale();
  return (
    <div className="fixed inset-0 z-50 min-h-screen w-full bg-gradient-to-br from-gray-900 via-purple-900 to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <h2 className="text-white text-2xl font-bold mb-2">{t?.mobileRomaAdmin || 'Mobile Roma Admin'}</h2>
        <p className="text-gray-300 text-lg mb-4">
          {timeout ? 'Taking longer than expected...' : message}
        </p>
        
        {timeout && (
          <div className="mt-6 space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Reload App
            </button>
            <p className="text-gray-400 text-sm">
              If this persists, try restarting the application
            </p>
          </div>
        )}
        
        <div className="mt-6 w-80 bg-gray-700 rounded-full h-3 mx-auto">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full animate-pulse w-3/4"></div>
        </div>
      </div>
    </div>
  );
}
