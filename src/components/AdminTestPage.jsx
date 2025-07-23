import React from 'react';
import { useLocation } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';

export default function AdminTestPage() {
  const location = useLocation();
  const { t } = useLocale();
  
  return (
    <div className="min-h-screen bg-green-100 dark:bg-green-900 flex items-center justify-center p-8">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center max-w-md">
        <div className="text-green-500 text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-4">
          Admin Route Working!
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          The admin page is loading correctly.
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p>{t?.location || 'Location'}: {location.pathname}</p>
          <p>{t?.hash || 'Hash'}: {window.location.hash}</p>
          <p>{t?.time || 'Time'}: {new Date().toLocaleTimeString()}</p>
        </div>
        <button
          onClick={() => window.location.hash = '#/cashier'}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Go to Cashier
        </button>
      </div>
    </div>
  );
}
