import React, { useState, useEffect } from 'react';
import { Icon } from '../utils/icons.jsx';
import { playActionSound, playModalOpenSound, playModalCloseSound } from '../utils/sounds';

export default function UpdateSettingsSection({ admin, t }) {
  const [updateSettings, setUpdateSettings] = useState({
    autoUpdateEnabled: true,
    autoDownload: false,
    checkOnStartup: true,
    updateChannel: 'latest',
    skippedVersion: null
  });
  const [currentVersion, setCurrentVersion] = useState('');
  const [checkingForUpdates, setCheckingForUpdates] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load current settings and version
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        
        // Get current version
        const versionResult = await window.api?.getAppVersion();
        if (versionResult?.success) {
          setCurrentVersion(versionResult.version);
        }

        // Get update settings
        const settingsResult = await window.api?.getUpdateSettings();
        if (settingsResult?.success) {
          setUpdateSettings(settingsResult.settings);
        }
      } catch (error) {
        console.error('Error loading update settings:', error);
        admin.setToast(t.failedToLoadSettings || 'Failed to load update settings', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [admin]);

  // Listen for update events from main process
  useEffect(() => {
    if (!window.api?.on) return;

    const handleUpdateChecking = () => {
      setCheckingForUpdates(true);
    };

    const handleUpdateAvailable = (event, data) => {
      setCheckingForUpdates(false);
      setUpdateAvailable(true);
      admin.setToast(`${t.updateVersion || 'Update'} v${data.version} ${t.updateAvailable || 'is available'}!`, 'info', 5000);
    };

    const handleUpdateNotAvailable = () => {
      setCheckingForUpdates(false);
      setUpdateAvailable(false);
    };

    const handleUpdateError = (event, error) => {
      setCheckingForUpdates(false);
      console.error('Update error:', error);
      
      // Enhanced error message for users
      let userMessage = error;
      if (error.includes('No releases found')) {
        userMessage = t.noReleasesFound || 'No updates are currently available. Please check back later.';
      } else if (error.includes('Network error')) {
        userMessage = t.networkError || 'Unable to check for updates. Please check your internet connection.';
      } else if (error.includes('timed out')) {
        userMessage = t.updateTimeout || 'Update check timed out. Please try again.';
      }
      
      admin.setToast(userMessage, 'error', 8000);
    };

    const handleDownloadProgress = (event, data) => {
      setDownloadProgress(data.percent);
      setIsDownloading(true);
    };

    const handleDownloadStarted = () => {
      setIsDownloading(true);
      setDownloadProgress(0);
      admin.setToast(t.updateDownloadStarted || 'Update download started', 'info');
    };

    const handleUpdateDownloaded = (event, data) => {
      setIsDownloading(false);
      setUpdateDownloaded(true);
      setDownloadProgress(100);
      admin.setToast(`${t.updateVersion || 'Update'} v${data.version} ${t.updateDownloadedReady || 'downloaded and ready to install'}`, 'success');
    };

    const handleDownloadError = (event, error) => {
      setIsDownloading(false);
      setDownloadProgress(0);
      admin.setToast(`${t.downloadFailed || 'Download failed'}: ${error}`, 'error');
    };

    const handleInstalling = () => {
      admin.setToast(t.installingUpdate || 'Installing update...', 'info');
    };

    const handleInstallError = (event, error) => {
      admin.setToast(`${t.installationFailed || 'Installation failed'}: ${error}`, 'error');
    };

    // Add event listeners
    window.api.on('update-checking', handleUpdateChecking);
    window.api.on('update-available', handleUpdateAvailable);
    window.api.on('update-not-available', handleUpdateNotAvailable);
    window.api.on('update-error', handleUpdateError);
    window.api.on('update-download-progress', handleDownloadProgress);
    window.api.on('update-download-started', handleDownloadStarted);
    window.api.on('update-downloaded', handleUpdateDownloaded);
    window.api.on('update-download-error', handleDownloadError);
    window.api.on('update-installing', handleInstalling);
    window.api.on('update-install-error', handleInstallError);

    // Cleanup event listeners
    return () => {
      if (window.api?.off) {
        window.api.off('update-checking', handleUpdateChecking);
        window.api.off('update-available', handleUpdateAvailable);
        window.api.off('update-not-available', handleUpdateNotAvailable);
        window.api.off('update-error', handleUpdateError);
        window.api.off('update-download-progress', handleDownloadProgress);
        window.api.off('update-download-started', handleDownloadStarted);
        window.api.off('update-downloaded', handleUpdateDownloaded);
        window.api.off('update-download-error', handleDownloadError);
        window.api.off('update-installing', handleInstalling);
        window.api.off('update-install-error', handleInstallError);
      }
    };
  }, [admin]);

  const handleCheckForUpdates = async () => {
    try {
      playActionSound();
      const result = await window.api?.checkForUpdates(true); // Manual check
      if (!result?.success) {
        admin.setToast(t.failedToCheckUpdates || 'Failed to check for updates', 'error');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      admin.setToast(t.failedToCheckUpdates || 'Failed to check for updates', 'error');
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      playActionSound();
      const result = await window.api?.downloadUpdate();
      if (!result?.success) {
        admin.setToast(t.failedToStartDownload || 'Failed to start download', 'error');
      }
    } catch (error) {
      console.error('Error downloading update:', error);
      admin.setToast(t.failedToStartDownload || 'Failed to start download', 'error');
    }
  };

  const handleInstallUpdate = async () => {
    try {
      playActionSound();
      const result = await window.api?.installUpdate();
      if (!result?.success) {
        admin.setToast(t.failedToInstallUpdate || 'Failed to install update', 'error');
      }
    } catch (error) {
      console.error('Error installing update:', error);
      admin.setToast(t.failedToInstallUpdate || 'Failed to install update', 'error');
    }
  };

  const handleSettingChange = async (key, value) => {
    try {
      const newSettings = { ...updateSettings, [key]: value };
      setUpdateSettings(newSettings);
      
      const result = await window.api?.updateUpdateSettings({ [key]: value });
      if (result?.success) {
        playActionSound();
        admin.setToast(t.updateSettingsSaved || 'Update settings saved', 'success');
      } else {
        // Revert on failure
        setUpdateSettings(updateSettings);
        admin.setToast(t.failedToSaveSettings || 'Failed to save settings', 'error');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      setUpdateSettings(updateSettings);
      admin.setToast(t.failedToSaveSettings || 'Failed to save settings', 'error');
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Icon name="download" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t.updateSettings || 'Update Settings'}</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">{t.loadingSettings || 'Loading settings'}...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Icon name="download" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t.updateSettings || 'Update Settings'}</h3>
      </div>

      {/* Current Version */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-800 dark:text-gray-200">{t.currentVersion || 'Current Version'}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Mobile Roma v{currentVersion}</p>
          </div>
          <button
            onClick={handleCheckForUpdates}
            disabled={checkingForUpdates}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {checkingForUpdates ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{t.checkingUpdates || 'Checking'}...</span>
              </div>
            ) : (
              t.checkForUpdates || 'Check for Updates'
            )}
          </button>
        </div>
        
        {/* Note about enabling updates */}
        {!updateSettings.autoUpdateEnabled && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              <Icon name="info" className="w-4 h-4 inline mr-1" />
              {t.updateHint || 'Enable "Auto Updates" below to receive automatic notifications when new versions are available.'}
            </p>
          </div>
        )}
      </div>

      {/* Update Available */}
      {updateAvailable && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-300">{t.updateAvailable || 'Update Available'}</h4>
              <p className="text-sm text-blue-600 dark:text-blue-400">{t.newVersionAvailable || 'A new version is ready to download'}</p>
            </div>
            {!isDownloading && !updateDownloaded && (
              <button
                onClick={handleDownloadUpdate}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                {t.downloadUpdate || 'Download Update'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Download Progress */}
      {isDownloading && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">{t.downloadingUpdate || 'Downloading Update'}</h4>
          <div className="w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-2">
            <div 
              className="bg-yellow-600 dark:bg-yellow-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">{downloadProgress}% {t.complete || 'complete'}</p>
        </div>
      )}

      {/* Update Downloaded */}
      {updateDownloaded && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-green-800 dark:text-green-300">{t.updateReady || 'Update Ready'}</h4>
              <p className="text-sm text-green-600 dark:text-green-400">{t.updateDownloadedReady || 'The update has been downloaded and is ready to install'}</p>
            </div>
            <button
              onClick={handleInstallUpdate}
              className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
            >
              {t.installRestart || 'Install & Restart'}
            </button>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2">{t.updatePreferences || 'Update Preferences'}</h4>
        
        {/* Auto Update Enabled */}
        <div className="flex items-center justify-between">
          <div>
            <h5 className="font-medium text-gray-700 dark:text-gray-300">{t.enableAutoUpdates || 'Enable Auto Updates'}</h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t.autoUpdateDesc || 'Automatically check for updates'}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={updateSettings.autoUpdateEnabled}
              onChange={(e) => handleSettingChange('autoUpdateEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
          </label>
        </div>

        {/* Check on Startup */}
        <div className="flex items-center justify-between">
          <div>
            <h5 className="font-medium text-gray-700 dark:text-gray-300">{t.checkOnStartup || 'Check on Startup'}</h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t.checkOnStartupDesc || 'Check for updates when the app starts'}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={updateSettings.checkOnStartup}
              onChange={(e) => handleSettingChange('checkOnStartup', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
          </label>
        </div>

        {/* Auto Download */}
        <div className="flex items-center justify-between">
          <div>
            <h5 className="font-medium text-gray-700 dark:text-gray-300">{t.autoDownloadUpdates || 'Auto Download Updates'}</h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t.autoDownloadDesc || 'Automatically download updates (not recommended for production)'}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={updateSettings.autoDownload}
              onChange={(e) => handleSettingChange('autoDownload', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
          </label>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
        <div className="flex items-start space-x-2">
          <Icon name="info" className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h5 className="font-medium text-blue-800 dark:text-blue-300">{t.howUpdatesWork || 'How Updates Work'}</h5>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              {t.updatesInfo || 'Updates are fetched from the official repository. You will always be notified before any update is installed. The app will restart automatically after installation to apply the update.'}
            </p>
          </div>
        </div>
      </div>

      {/* Troubleshooting Info */}
      <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
        <div className="flex items-start space-x-2">
          <Icon name="alert-triangle" className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <h5 className="font-medium text-yellow-800 dark:text-yellow-300">{t.troubleshooting || 'Troubleshooting'}</h5>
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
              {t.troubleshootingInfo || 'If update checks fail, ensure you have an active internet connection. Updates may not be available if no new releases have been published. Contact support if issues persist.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
