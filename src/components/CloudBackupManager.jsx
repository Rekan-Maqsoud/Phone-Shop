import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import cloudAuthService from '../services/CloudAuthService';
import ModalBase from './ModalBase';
import ToastUnified from './ToastUnified';

export default function CloudBackupManager({ onClose, t }) {
  const { fetchAllData } = useData();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [storageUsage, setStorageUsage] = useState(null);
  
  // Auth form states
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });
  
  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  const checkAuthStatus = useCallback(async () => {
    setLoading(true);
    try {
      // Use simple cached authentication state (no network calls)
      const authCheck = cloudAuthService.isAuthenticated();
      const user = cloudAuthService.getUser();
      
      if (authCheck && user) {
        setIsAuthenticated(true);
        setUser(user);
        console.log('CloudBackupManager: User authenticated:', user.email);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        console.log('CloudBackupManager: User not authenticated');
      }
    } catch (error) {
      console.error('CloudBackupManager: Error checking auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
    }
    setLoading(false);
  }, []);

  // Replace loadBackups to use window.api
  const loadBackups = useCallback(async () => {
    if (!isAuthenticated || !user) {
      console.log('CloudBackupManager: User not authenticated, skipping backup load');
      return;
    }
    
    setLoading(true);
    let result;
    if (window.api?.getCloudBackups) {
      result = await window.api.getCloudBackups();
    } else {
      result = await cloudAuthService.getBackups();
    }
    if (result.success) {
      setBackups(result.backups);
    } else {
      console.error('CloudBackupManager: Failed to load backups:', result.error);
      showToast(result.error || (t.failedToLoadBackups || 'Failed to load backups'), 'error');
    }
    setLoading(false);
  }, [isAuthenticated, user, t]);

  // Replace loadStorageUsage to use window.api
  const loadStorageUsage = useCallback(async () => {
    if (!isAuthenticated || !user) {
      console.log('CloudBackupManager: User not authenticated, skipping storage usage load');
      return;
    }
    
    let result;
    if (window.api?.getCloudStorageUsage) {
      result = await window.api.getCloudStorageUsage();
    } else {
      result = await cloudAuthService.getStorageUsage();
    }
    if (result.success) {
      setStorageUsage(result);
    } else {
      console.error('CloudBackupManager: Failed to load storage usage:', result.error);
    }
  }, [isAuthenticated, user]);

  // Unified auto backup function - called by the unified backup system
  const performUnifiedAutoBackup = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      const result = await cloudAuthService.performAutoBackup();
      if (result.success) {
        loadBackups();
        loadStorageUsage();
      } else {
        console.warn('Unified cloud auto backup failed:', result.error);
      }
    } catch (error) {
      console.warn('Unified cloud auto backup error:', error);
    }
  }, [isAuthenticated, user, loadBackups, loadStorageUsage]);

  useEffect(() => {
    // Wait a bit to allow Appwrite session restoration
    const timer = setTimeout(() => {
      checkAuthStatus();
    }, 100);

    // Listen for unified auto backup trigger
    const handleUnifiedAutoBackup = () => {
      if (isAuthenticated && user) {
        performUnifiedAutoBackup();
      }
    };

    if (window.api?.on) {
      window.api.on('trigger-unified-auto-backup', handleUnifiedAutoBackup);
    }

    return () => {
      clearTimeout(timer);
      if (window.api?.off) {
        window.api.off('trigger-unified-auto-backup', handleUnifiedAutoBackup);
      }
    };
  }, [isAuthenticated, user, performUnifiedAutoBackup]); // Added performUnifiedAutoBackup to dependencies

  useEffect(() => {
    if (isAuthenticated && user) {
      loadBackups();
      loadStorageUsage();
    }
  }, [isAuthenticated, user, loadBackups, loadStorageUsage]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let result;
      
      if (isLogin) {
        result = await cloudAuthService.login(authForm.email, authForm.password);
      } else {
        if (authForm.password !== authForm.confirmPassword) {
          showToast(t.passwordsDoNotMatch || 'Passwords do not match', 'error');
          setLoading(false);
          return;
        }
        result = await cloudAuthService.createAccount(authForm.email, authForm.password, authForm.name);
      }
      
      if (result && result.success) {
        setIsAuthenticated(true);
        setUser(result.user);
        setShowAuthForm(false);
        setAuthForm({ email: '', password: '', name: '', confirmPassword: '' });
        showToast(isLogin ? (t.loggedInSuccessfully || 'Logged in successfully!') : (t.accountCreatedSuccessfully || 'Account created successfully!'));
        
        // Load backups and storage usage after successful auth
        await loadBackups();
        await loadStorageUsage();
      } else {
        const errorMsg = result?.error || (t.authenticationFailed || 'Authentication failed');
        console.error('CloudBackupManager: Auth failed:', errorMsg);
        showToast(errorMsg, 'error');
      }
    } catch (error) {
      console.error('CloudBackupManager: Auth error:', error);
      showToast((t.authenticationFailed || 'Authentication failed') + ': ' + error.message, 'error');
    }
    
    setLoading(false);
  };

  const handleLogout = async () => {
    const result = await cloudAuthService.logout();
    if (result.success) {
      setIsAuthenticated(false);
      setUser(null);
      setBackups([]);
      setStorageUsage(null);
      showToast(t.loggedOutSuccessfully || 'Logged out successfully');
    } else {
      showToast(result.error || (t.logoutFailed || 'Logout failed'), 'error');
    }
  };

  // Manual backup creation - separate from auto backups
  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      if (window.api?.createBackup) {
        const localBackup = await window.api.createBackup();
        if (!localBackup.success || !localBackup.path) {
          showToast(localBackup.message || (t.failedToCreateLocalBackup || 'Failed to create local backup'), 'error');
          setLoading(false);
          return;
        }
        const backupPath = localBackup.path || localBackup.filePath;
        const backupFile = await window.api.readBackupFile(backupPath);
        if (backupFile && backupFile.length > 0) {
          const now = new Date();
          const backupName = `manual-backup-${now.toISOString().replace(/[:.]/g, '-')}.sqlite`;
          const file = new File([backupFile], backupName, {
            type: 'application/octet-stream'
          });
          const result = await cloudAuthService.uploadBackup(file, backupName, 'Manual backup');
          if (result.success) {
            showToast(t.manualBackupUploadedSuccessfully || 'Manual backup uploaded successfully!');
            loadBackups();
            loadStorageUsage();
          } else {
            showToast(result.error || (t.failedToUploadManualBackup || 'Failed to upload manual backup'), 'error');
          }
        } else {
          showToast(t.failedToReadBackupFile || 'Failed to read backup file or file is empty', 'error');
        }
      } else {
        showToast(t.backupApiNotAvailable || 'Backup API not available', 'error');
      }
    } catch (error) {
      showToast(t.failedToCreateManualBackup || 'Failed to create manual backup', 'error');
    }
    setLoading(false);
  };

  // Replace handleDownloadBackup to use window.api.downloadCloudBackup
  const handleDownloadBackup = async (backup) => {
    setLoading(true);
    try {
      if (window.api?.downloadCloudBackup) {
        const result = await window.api.downloadCloudBackup(backup.$id, backup.fileName);
        if (result.success && result.path) {
          // Extra: Check file exists and is not empty
          const fileCheck = await window.api.readBackupFile(result.path);
          if (!fileCheck || fileCheck.length === 0) {
            showToast(t.downloadedBackupIsEmpty || 'Downloaded backup file is empty or unreadable. Please try again.', 'error');
            setLoading(false);
            return;
          }
          showToast(t.backupDownloadedSuccessfully || 'Backup downloaded successfully! Use the "Restore from File" button in Backup Manager to restore it.');
        } else {
          showToast(result.message || (t.failedToDownloadBackup || 'Failed to download backup'), 'error');
        }
      } else {
        showToast(t.cloudDownloadApiNotAvailable || 'Cloud download API not available', 'error');
      }
    } catch (error) {
      showToast((t.failedToDownloadBackup || 'Failed to download backup') + ': ' + (error?.message || error), 'error');
    }
    setLoading(false);
  };

  // Restore handleDeleteBackup to use cloudAuthService directly
  const handleDeleteBackup = async (backup) => {
    if (!confirm((t.confirmDeleteBackup || 'Are you sure you want to delete "{fileName}"?').replace('{fileName}', backup.fileName))) {
      return;
    }
    setLoading(true);
    try {
      const result = await cloudAuthService.deleteBackup(backup.$id);
      if (result.success) {
        showToast(t.backupDeletedSuccessfully || 'Backup deleted successfully');
        loadBackups();
        loadStorageUsage();
      } else {
        showToast(result.error || (t.failedToDeleteBackup || 'Failed to delete backup'), 'error');
      }
    } catch (error) {
      showToast(t.failedToDeleteBackup || 'Failed to delete backup', 'error');
    }
    setLoading(false);
  };

  const handleRestoreBackup = async (filePath) => {
    setLoading(true);
    
    try {
      const result = await window.api.restoreFromCloudBackup(filePath);
      if (result.success) {
        showToast(result.message || (t.databaseRestoredSuccessfully || 'Database restored successfully!'));
        
        if (result.requiresRestart) {
          // Give user immediate feedback and then restart
          setTimeout(() => {
            if (confirm(t.databaseRestoredRestartRequired || 'Database restored successfully! The application needs to restart to apply changes. Restart now?')) {
              // Use Electron's app restart if available, otherwise reload
              if (window.api?.restartApp) {
                window.api.restartApp();
              } else {
                window.location.reload();
              }
            }
          }, 1000);
        } else {
          // Refresh all data from DataContext after restore if no restart required
          await fetchAllData();
        }
      } else {
        showToast(result.message || (t.failedToRestoreBackup || 'Failed to restore backup'), 'error');
      }
    } catch (error) {
      console.error('Restore error:', error);
      showToast(t.failedToRestoreBackup || 'Failed to restore backup', 'error');
    }
    
    setLoading(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  return (
    <>
      <ModalBase open={true} className="max-w-4xl">
        {/* Header with title and close button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {t.cloudBackupManager || 'Cloud Backup Manager'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            aria-label="Close Cloud Backup Manager"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Authentication Section */}
          {!isAuthenticated ? (
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{t.cloudBackupService || 'Cloud Backup Service'}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t.signInToEnable || 'Sign in to enable automatic cloud backup after every data change, plus manual backup and restore capabilities'}
              </p>
              
              <button
                onClick={() => setShowAuthForm(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {t.signInSignUp || 'Sign In / Sign Up'}
              </button>
            </div>
          ) : (
            <>
              {/* User Info, Storage Usage & Auto Backup Status */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{user?.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    {t.signOut || 'Sign Out'}
                  </button>
                </div>
                {storageUsage && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {t.storageUsed || 'Storage Used'}: {storageUsage.formattedSize} ({storageUsage.count} {t.backups || 'backups'})
                  </div>
                )}
                <div className="flex items-center gap-2 p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-700 dark:text-green-200 font-medium">
                    {t.autoCloudBackupActive || 'Auto Cloud Backup Active (Updates after every change)'}
                  </span>
                </div>
              </div>

              {/* Manual Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleCreateBackup}
                  disabled={loading}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? (t.creating || 'Creating...') : (t.createManualBackup || 'Create Manual Backup')}
                </button>
                <button
                  onClick={loadBackups}
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {t.refresh || 'Refresh'}
                </button>
              </div>

              {/* Backups List */}
              <div>
                <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">{t.cloudBackups || 'Cloud Backups'}</h4>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">{t.loading || 'Loading...'}</p>
                  </div>
                ) : backups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {t.noCloudBackupsFound || 'No cloud backups found'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {backups.map((backup) => (
                      <div key={backup.$id} className="border dark:border-gray-600 p-3 rounded-lg bg-white dark:bg-gray-800">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 dark:text-gray-100">{backup.fileName}</h5>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              <span>{t.version || 'Version'} {backup.version} • </span>
                              <span>{formatDate(backup.uploadDate)} • </span>
                              <span>
                                {typeof backup.fileSize === 'number' && backup.fileSize > 0
                                  ? cloudAuthService.formatFileSize(backup.fileSize)
                                  : (t.unknownSize || 'Unknown size')}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleDownloadBackup(backup)}
                              className="text-blue-500 hover:text-blue-700 text-sm"
                              title={t.download || 'Download backup'}
                            >
                              {t.download || 'Download'}
                            </button>
                            <button
                              onClick={() => handleDeleteBackup(backup)}
                              className="text-red-500 hover:text-red-700 text-sm"
                              title={t.delete || 'Delete'}
                            >
                              {t.delete || 'Delete'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ModalBase>

      {/* Auth Form Modal */}
      {showAuthForm && (
        <ModalBase open={true} className="max-w-md">
          {/* Header with title and close button */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {isLogin ? (t.signIn || 'Sign In') : (t.createAccount || 'Create Account')}
            </h2>
            <button
              onClick={() => setShowAuthForm(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              aria-label="Close Auth Form"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t.fullName || 'Full Name'}</label>
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required={!isLogin}
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t.email || 'Email'}</label>
              <input
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t.password || 'Password'}</label>
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
                minLength="8"
              />
            </div>
            
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t.confirmPassword || 'Confirm Password'}</label>
                <input
                  type="password"
                  value={authForm.confirmPassword}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required={!isLogin}
                  minLength="8"
                />
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? (t.processing || 'Processing...') : (isLogin ? (t.signIn || 'Sign In') : (t.createAccount || 'Create Account'))}
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-500 hover:text-blue-700 px-4"
              >
                {isLogin ? (t.needAnAccount || 'Need an account?') : (t.alreadyHaveAccount || 'Already have an account?')}
              </button>
            </div>
          </form>
        </ModalBase>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <ToastUnified
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </>
  );
}