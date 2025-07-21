import React, { useState, useEffect } from 'react';
import { Icon } from '../utils/icons.jsx';
import { playActionSound } from '../utils/sounds';
import { triggerCloudBackupAsync } from '../utils/cloudBackupEnhanced';
import cloudAuthService from '../services/CloudAuthService';

export default function BackupSettingsSection({ admin, t, setShowBackupManager }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);

  // Check authentication and backup status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isAuth = await cloudAuthService.checkAuth();
        setIsAuthenticated(isAuth);
        
        if (isAuth) {
          const currentUser = await cloudAuthService.getCurrentUser();
          setUser(currentUser);
        }

        // Get auto backup setting
        const autoBackupResult = await window.api?.getAutoBackup();
        if (autoBackupResult?.success) {
          setAutoBackupEnabled(autoBackupResult.enabled);
        }

        // Get last backup info
        const lastBackupInfo = await window.api?.getLastBackupInfo();
        if (lastBackupInfo?.success) {
          setLastBackup(lastBackupInfo.lastBackup);
        }
      } catch (error) {
        console.error('Error checking backup status:', error);
      }
    };

    checkStatus();
  }, []);

  const handleManualBackup = async () => {
    setLoading(true);
    playActionSound();
    
    try {
      await triggerCloudBackupAsync();
      admin.setToast('Backup started successfully', 'success');
      
      // Refresh last backup info
      const lastBackupInfo = await window.api?.getLastBackupInfo();
      if (lastBackupInfo?.success) {
        setLastBackup(lastBackupInfo.lastBackup);
      }
    } catch (error) {
      console.error('Backup error:', error);
      admin.setToast('Backup failed: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoBackup = async () => {
    try {
      const newState = !autoBackupEnabled;
      const result = await window.api?.setAutoBackup(newState);
      
      if (result?.success) {
        setAutoBackupEnabled(newState);
        admin.setToast(
          newState ? 'Auto backup enabled' : 'Auto backup disabled',
          'success'
        );
      } else {
        admin.setToast('Failed to update auto backup setting', 'error');
      }
    } catch (error) {
      admin.setToast('Error updating auto backup: ' + error.message, 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="w-full h-full p-8 space-y-8">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
            <Icon name="cloud" size={32} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t.backupSettings || 'Backup & Settings'}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              {t.backupDescription || 'Manage your data backup and synchronization settings'}
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Authentication Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <Icon name="user" size={24} className="text-gray-700 dark:text-gray-300" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {t.cloudAccount || 'Cloud Account'}
          </h2>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          {isAuthenticated ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Icon name="checkCircle" size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="font-semibold text-green-600 dark:text-green-400 text-lg">
                    {t.connected || 'Connected'}
                  </div>
                  {user && (
                    <div className="text-gray-600 dark:text-gray-300">
                      {user.email}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t.cloudStatus || 'Ready for backup'}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Icon name="alertTriangle" size={24} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="font-semibold text-orange-600 dark:text-orange-400 text-lg">
                    {t.notConnected || 'Not Connected'}
                  </div>
                  <div className="text-gray-600 dark:text-gray-300">
                    {t.connectToCloud || 'Connect to enable cloud backup'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowBackupManager(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {t.signIn || 'Sign In'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Backup Controls */}
      <div className="grid grid-cols-2 gap-8">
        {/* Manual Backup */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Icon name="upload" size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {t.manualBackup || 'Manual Backup'}
            </h3>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            {t.manualBackupDesc || 'Create an immediate backup of your data to the cloud. This includes all sales, inventory, debts, and settings.'}
          </p>
          
          <button
            onClick={handleManualBackup}
            disabled={loading || !isAuthenticated}
            className={`w-full px-6 py-4 rounded-lg font-medium transition-colors text-lg ${
              loading || !isAuthenticated
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t.backingUp || 'Backing up...'}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <Icon name="upload" size={20} />
                {t.createBackup || 'Create Backup'}
              </div>
            )}
          </button>
        </div>

        {/* Auto Backup */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Icon name="clock" size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {t.autoBackup || 'Auto Backup'}
            </h3>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            {t.autoBackupDesc || 'Automatically backup data after major operations like sales, payments, and inventory changes.'}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleAutoBackup}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoBackupEnabled 
                    ? 'bg-blue-600' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoBackupEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              
              <span className="text-lg font-medium text-gray-700 dark:text-gray-200">
                {autoBackupEnabled ? (t.enabled || 'Enabled') : (t.disabled || 'Disabled')}
              </span>
            </div>
            
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              autoBackupEnabled
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {autoBackupEnabled ? (t.active || 'Active') : (t.inactive || 'Inactive')}
            </div>
          </div>
        </div>
      </div>

      {/* Backup Status & Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Icon name="info" size={24} className="text-gray-600 dark:text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {t.backupStatus || 'Backup Status'}
          </h3>
        </div>
        
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="calendar" size={20} className="text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {t.lastBackup || 'Last Backup'}
              </span>
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {formatDate(lastBackup)}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="settings" size={20} className="text-green-600 dark:text-green-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {t.autoBackup || 'Auto Backup'}
              </span>
            </div>
            <div className={`text-lg font-semibold ${
              autoBackupEnabled 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-orange-600 dark:text-orange-400'
            }`}>
              {autoBackupEnabled ? (t.enabled || 'Enabled') : (t.disabled || 'Disabled')}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="cloud" size={20} className="text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {t.cloudStatus || 'Cloud Status'}
              </span>
            </div>
            <div className={`text-lg font-semibold ${
              isAuthenticated 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-orange-600 dark:text-orange-400'
            }`}>
              {isAuthenticated ? (t.connected || 'Connected') : (t.disconnected || 'Disconnected')}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            {t.needMoreOptions || 'Need More Options?'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {t.advancedSettingsDesc || 'Access advanced backup settings including restore options, backup history, and detailed configuration.'}
          </p>
          <button
            onClick={() => setShowBackupManager(true)}
            className="px-8 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-3 mx-auto text-lg shadow-md hover:shadow-lg"
          >
            <Icon name="settings" size={24} />
            {t.advancedBackupSettings || 'Advanced Backup Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
