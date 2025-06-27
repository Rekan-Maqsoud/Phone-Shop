import React from 'react';

export default function SettingsModal({
  t,
  theme,
  setTheme,
  lang,
  setLang,
  autoBackup,
  setAutoBackup,
  notificationsEnabled,
  setNotificationsEnabled,
  lowStockThreshold,
  setLowStockThreshold,
  handleChangeAdminPassword,
  handleRestoreBackup,
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
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl"
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
            className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:text-gray-100"
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
            className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:text-gray-100"
            value={lang}
            onChange={e => setLang(e.target.value)}
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
            <option value="ku">کوردی</option>
          </select>
        </div>
        {/* Change Password */}
        <form className="mb-4" onSubmit={async e => {
          e.preventDefault();
          const form = e.target;
          const current = form.currentPassword.value;
          const next = form.newPassword.value;
          const confirm = form.confirmPassword.value;
          await handleChangeAdminPassword(current, next, confirm);
        }}>
          <label className="block text-gray-700 dark:text-gray-200 mb-1 font-semibold">{t.changePassword || 'Change Password'}</label>
          <input
            name="currentPassword"
            type="password"
            className="w-full border rounded px-3 py-2 mb-2 dark:bg-gray-800 dark:text-gray-100"
            placeholder={t.currentPassword || 'Current Password'}
            required
          />
          <input
            name="newPassword"
            type="password"
            className="w-full border rounded px-3 py-2 mb-2 dark:bg-gray-800 dark:text-gray-100"
            placeholder={t.newPassword || 'New Password'}
            required
          />
          <input
            name="confirmPassword"
            type="password"
            className="w-full border rounded px-3 py-2 mb-2 dark:bg-gray-800 dark:text-gray-100"
            placeholder={t.confirmNewPassword || 'Confirm New Password'}
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition font-semibold"
          >
            {t.save || 'Save'}
          </button>
        </form>
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
          <span>Made by Rekan M Koye &middot; v1.0.4</span>
        </div>
      </div>
    </div>
  );
}
