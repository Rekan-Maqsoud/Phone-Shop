import React from 'react';
import { useSound } from '../contexts/SoundContext';
import { playActionSound, playSystemSound } from '../utils/sounds';

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
  onClose,
  handleRefreshBalances
}) {
  const { soundSettings, toggleSounds, setVolume, toggleSoundType } = useSound();
  
  if (!show) return null;

  const handleSoundToggle = () => {
    toggleSounds();
    playSystemSound();
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    playActionSound();
  };

  const handleSoundTypeToggle = (soundType) => {
    toggleSoundType(soundType);
    playActionSound();
  };

  // Support RTL for sound bar and all settings
  const isRTL = lang === 'ar' || lang === 'ku';
  return (
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <button
          className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 text-2xl bg-gray-200 hover:bg-gray-300 dark:bg-black/20 dark:hover:bg-black/30 rounded-full w-8 h-8 flex items-center justify-center transition-colors z-10`}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">{t.settings || 'Settings'}</h2>
        
        {/* Sound Settings Section */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100 flex items-center">
            🔊 {t.soundSettings || 'Sound Settings'}
          </h3>
          
          {/* Enable/Disable Sounds */}
          <div className="mb-4 flex items-center justify-between">
            <label className="text-gray-700 dark:text-gray-200 font-medium">
              {t.enableSounds || 'Enable Sounds'}
            </label>
            <button
              onClick={handleSoundToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                soundSettings.enabled 
                  ? 'bg-blue-600' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  soundSettings.enabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Volume Control */}
          {soundSettings.enabled && (
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-200 mb-2 font-medium">
                {t.volume || 'Volume'}: {Math.round(soundSettings.volume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={soundSettings.volume}
                onChange={handleVolumeChange}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer slider ${isRTL ? 'direction-rtl' : ''}`}
                style={{
                  background: isRTL 
                    ? `linear-gradient(to left, #3b82f6 0%, #3b82f6 ${soundSettings.volume * 100}%, #e5e7eb ${soundSettings.volume * 100}%, #e5e7eb 100%)`
                    : `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${soundSettings.volume * 100}%, #e5e7eb ${soundSettings.volume * 100}%, #e5e7eb 100%)`
                }}
              />
            </div>
          )}

          {/* Sound Type Toggles */}
          {soundSettings.enabled && (
            <div className="space-y-2">
              <label className="block text-gray-700 dark:text-gray-200 mb-2 font-medium">
                {t.soundTypes || 'Sound Types'}
              </label>
              {Object.entries(soundSettings.enabledTypes).map(([type, enabled]) => (
                <div key={type} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                    {(() => {
                      // Special translation for warning and notification
                      if (type === 'warning') return t.WarningSounds || t.warning || 'Warning';
                      if (type === 'notification') return t.NotificationSounds || t.notification || 'Notification';
                      return t[type + 'Sounds'] || t[type] || type;
                    })()}
                  </span>
                  <button
                    onClick={() => handleSoundTypeToggle(type)}
                    className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                      enabled 
                        ? 'bg-blue-600' 
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        enabled ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Theme */}
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 mb-1 font-semibold">{t.theme || 'Theme'}</label>
          <select
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            value={theme}
            onChange={e => setTheme(e.target.value)}
          >
            <option value="system">{t?.system || 'System'}</option>
            <option value="light">{t?.light || 'Light'}</option>
            <option value="dark">{t?.dark || 'Dark'}</option>
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
            <option value="en">{t?.english || 'English'}</option>
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
        
        {/* Balance Management */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100 flex items-center">
            💰 {t.balanceManagement || 'Balance Management'}
          </h3>
          
          <div className="space-y-4">
            {/* USD Balance */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-200 font-medium">
                {t.usdBalance || 'USD Balance'}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-24 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  id="usd-balance-input"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('usd-balance-input');
                    const amount = parseFloat(input.value) || 0;
                    if (window.api?.setBalance) {
                      window.api.setBalance('USD', amount).then(() => {
                        if (handleRefreshBalances) handleRefreshBalances();
                        input.value = '';
                      });
                    }
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition"
                >
                  {t.set || 'Set'}
                </button>
              </div>
            </div>
            
            {/* IQD Balance */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-200 font-medium">
                {t.iqdBalance || 'IQD Balance'}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  className="w-24 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  id="iqd-balance-input"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('iqd-balance-input');
                    const amount = parseFloat(input.value) || 0;
                    if (window.api?.setBalance) {
                      window.api.setBalance('IQD', amount).then(() => {
                        if (handleRefreshBalances) handleRefreshBalances();
                        input.value = '';
                      });
                    }
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition"
                >
                  {t.set || 'Set'}
                </button>
              </div>
            </div>
          </div>
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
            onClick={handleResetAllData}
          >
            {t.resetAllData || 'Reset All Data'}
          </button>
        </div>
        
        {/* App Info */}
        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center select-none">
          <span>{t.madeBy || 'Made by'} "Rekan M Koye"  &middot; v1.2.10</span>
        </div>
      </div>
    </div>
  );
}
