import React from 'react';

export default function SettingsModal({
  t,
  theme,
  setTheme,
  lang,
  setLang,
  notificationsEnabled,
  setNotificationsEnabled,
  lowStockThreshold,
  setLowStockThreshold,
  handleExportSales,
  handleExportInventory,
  handleTestPrint,
  handleResetAllData,
  show,
  onClose
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:text-gray-500 dark:hover:text-gray-200 text-2xl transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">{t.settings || 'Settings'}</h2>
        {/* Theme */}
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 mb-1 font-semibold">{t.theme || 'Theme'}</label>
          <select
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            value={theme}
            onChange={e => setTheme(e.target.value)}
          >
            <option value="system">{t.system || 'System'}</option>
            <option value="light">{t.light || 'Light'}</option>
            <option value="dark">{t.dark || 'Dark'}</option>
          </select>
        </div>
        {/* Language */}
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 mb-1 font-semibold">{t.language || 'Language'}</label>
          <select
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            value={lang}
            onChange={e => setLang(e.target.value)}
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
            <option value="ku">کوردی</option>
          </select>
        </div>
        {/* Low Stock Threshold */}
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 mb-1 font-semibold">{t.lowStockThreshold || 'Low Stock Threshold'}</label>
          <input
            type="number"
            min="1"
            max="100"
            value={lowStockThreshold}
            onChange={e => setLowStockThreshold(Number(e.target.value))}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
          />
        </div>
        {/* Export Buttons */}
        <div className="flex flex-col gap-2 mb-4">
          <button
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition font-semibold"
            onClick={handleExportSales}
          >
            {t.exportSales || 'Export Sales'}
          </button>
          <button
            className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 transition font-semibold"
            onClick={handleExportInventory}
          >
            {t.exportInventory || 'Export Inventory'}
          </button>
        </div>
        {/* Reset All Data */}
        <div className="flex flex-col gap-2 mb-2">
          <button
            className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition font-semibold"
            onClick={() => {
              if (window.confirm('Are you sure you want to delete ALL products, archived, and sales history? This cannot be undone!')) {
                handleResetAllData();
              }
            }}
          >
            {t.resetAllData || 'Reset All Data'}
          </button>
        </div>
        {/* App Info */}
        <div className="mt-6 text-xs text-gray-500 text-center select-none">
          <span>Made by Rekan M Koye &middot; v1.0.21</span>
        </div>
      </div>
    </div>
  );
}
