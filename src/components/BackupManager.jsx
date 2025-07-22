import React, { useState, useEffect } from 'react';
import cloudAuthService from '../services/CloudAuthService';
import ModalBase from './ModalBase';
import { Icon } from '../utils/icons.jsx';

export default function BackupManager({ show, onClose, t, showConfirm = null }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);

  // Auth form state
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await cloudAuthService.checkAuth();
      setIsAuthenticated(isAuth);
      if (isAuth) {
        setUser(await cloudAuthService.getCurrentUser());
        loadBackups();
      }
      
      // Load auto backup setting
      const autoBackupResult = await window.api?.getAutoBackup();
      if (autoBackupResult?.success) {
        setAutoBackupEnabled(autoBackupResult.enabled);
      }
    };

    if (show) {
      checkAuth();
    }
  }, [show]);

  // Add auth listener
  useEffect(() => {
    const authListener = (isAuth, currentUser) => {
      setIsAuthenticated(isAuth);
      setUser(currentUser);
      if (isAuth) {
        setShowAuthForm(false);
        loadBackups();
      } else {
        setBackups([]);
      }
    };

    cloudAuthService.addAuthListener(authListener);
    return () => cloudAuthService.removeAuthListener(authListener);
  }, []);

  const loadBackups = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const result = await window.api?.listCloudBackups();
      if (result?.success) {
        setBackups(result.backups || []);
      } else {
        showMessage(result?.message || 'Failed to load backups', 'error');
      }
    } catch (error) {
      showMessage('Failed to load backups', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (authForm.password !== authForm.confirmPassword) {
          showMessage('Passwords do not match', 'error');
          return;
        }
        const result = await cloudAuthService.signUp(authForm.email, authForm.password, authForm.name);
        if (result.success) {
          showMessage('Account created successfully!', 'success');
          setAuthForm({ email: '', password: '', name: '', confirmPassword: '' });
        } else {
          showMessage(result.message || 'Sign up failed', 'error');
        }
      } else {
        const result = await cloudAuthService.signIn(authForm.email, authForm.password);
        if (result.success) {
          showMessage('Signed in successfully!', 'success');
          setAuthForm({ email: '', password: '', name: '', confirmPassword: '' });
        } else {
          showMessage(result.message || 'Sign in failed', 'error');
        }
      }
    } catch (error) {
      showMessage(error.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const result = await cloudAuthService.signOut();
      if (result.success) {
        showMessage('Signed out successfully', 'success');
      } else {
        showMessage(result.message || 'Sign out failed', 'error');
      }
    } catch (error) {
      showMessage('Sign out failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setLoading(true);
    try {
      const description = `Manual backup created at ${new Date().toLocaleString()}`;
      const result = await window.api?.createCloudBackup(description);
      if (result?.success) {
        showMessage('Backup created successfully!', 'success');
        loadBackups();
      } else {
        showMessage(result?.message || 'Failed to create backup', 'error');
      }
    } catch (error) {
      showMessage('Failed to create backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createLocalBackup = async () => {
    setLoading(true);
    try {
      const result = await window.api?.createBackup();
      if (result?.success) {
        showMessage(`Local backup created successfully at: ${result.path}`, 'success');
      } else {
        showMessage(result?.message || 'Failed to create local backup', 'error');
      }
    } catch (error) {
      showMessage('Failed to create local backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openLocalBackupFolder = async () => {
    try {
      const result = await window.api?.openBackupFolder();
      if (!result?.success) {
        showMessage(result?.message || 'Failed to open backup folder', 'error');
      }
    } catch (error) {
      showMessage('Failed to open backup folder', 'error');
    }
  };

  const downloadAndRestore = async (backup) => {
    setLoading(true);
    try {
      const result = await window.api?.downloadCloudBackup(backup.$id);
      if (result?.success) {
        const message = `Backup downloaded. Do you want to restore it now? This will replace all current data!`;
        
        const performRestore = async () => {
          const restoreResult = await window.api?.restoreFromFile(result.downloadPath);
          if (restoreResult?.success) {
            showMessage('Database restored successfully!', 'success');
            if (restoreResult.requiresRestart) {
              const restartMessage = 'The application needs to restart to apply changes. Restart now?';
              
              const handleRestart = () => {
                window.api?.restartApp();
              };
              
              if (typeof showConfirm === 'function') {
                showConfirm(restartMessage, handleRestart);
              } else {
                const restart = confirm(restartMessage);
                if (restart) {
                  handleRestart();
                }
              }
            }
          } else {
            showMessage(restoreResult?.message || 'Failed to restore backup', 'error');
          }
        };
        
        if (typeof showConfirm === 'function') {
          showConfirm(message, performRestore);
        } else {
          const confirmed = confirm(message);
          if (confirmed) {
            await performRestore();
          }
        }
      } else {
        showMessage(result?.message || 'Failed to download backup', 'error');
      }
    } catch (error) {
      showMessage('Failed to download backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = async (backup) => {
    setLoading(true);
    try {
      const result = await window.api?.downloadCloudBackupFile(backup.$id);
      if (result?.success) {
        showMessage(`Backup downloaded successfully to: ${result.downloadPath}`, 'success');
      } else {
        showMessage(result?.message || 'Failed to download backup', 'error');
      }
    } catch (error) {
      showMessage('Failed to download backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = async (backup) => {
    const message = `Are you sure you want to delete "${backup.fileName}"?`;
    
    const performDelete = async () => {
      setLoading(true);
      try {
        const result = await window.api?.deleteCloudBackup(backup.$id);
        if (result?.success) {
          showMessage('Backup deleted successfully', 'success');
          loadBackups();
        } else {
          showMessage(result?.message || 'Failed to delete backup', 'error');
        }
      } catch (error) {
        showMessage('Failed to delete backup', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    if (typeof showConfirm === 'function') {
      showConfirm(message, performDelete);
    } else {
      const confirmed = confirm(message);
      if (confirmed) {
        await performDelete();
      }
    }
  };

  const toggleAutoBackup = async () => {
    try {
      const newState = !autoBackupEnabled;
      const result = await window.api?.setAutoBackup(newState);
      if (result?.success) {
        setAutoBackupEnabled(newState);
        showMessage(`Auto backup ${newState ? 'enabled' : 'disabled'}`, 'success');
      } else {
        showMessage('Failed to change auto backup setting', 'error');
      }
    } catch (error) {
      showMessage('Failed to change auto backup setting', 'error');
    }
  };

  const restoreFromLocalFile = async () => {
    try {
      const result = await window.api?.selectAndRestoreBackup();
      if (result?.success) {
        showMessage('Database restored successfully from local file!', 'success');
        if (result.requiresRestart) {
          const message = 'The application needs to restart to apply changes. Restart now?';
          
          const handleRestart = () => {
            window.api?.restartApp();
          };
          
          if (typeof showConfirm === 'function') {
            showConfirm(message, handleRestart);
          } else {
            const restart = confirm(message);
            if (restart) {
              handleRestart();
            }
          }
        }
      } else {
        showMessage(result?.message || 'Failed to restore from local file', 'error');
      }
    } catch (error) {
      showMessage('Failed to restore from local file', 'error');
    }
  };

  if (!show) {
    return null;
  }

  return (
    <ModalBase show={show} onClose={onClose} maxWidth="6xl">
      <div className="w-full max-h-[80vh] overflow-y-auto">
        {/* Header with title and close button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            <Icon name="cloud" size={24} className="mr-2" /> {t.cloudBackupManager || 'Cloud Backup Manager'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-black/20 dark:hover:bg-black/30 transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {/* Message Display */}
        {message && (
          <div className={`mb-4 p-3 rounded ${
            messageType === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {!isAuthenticated ? (
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">{t.cloudBackupService || 'Cloud Backup Service'}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t.signInToEnable || 'Sign in to enable automatic cloud backup after every data change, plus manual backup and restore capabilities'}
            </p>
            
            {!showAuthForm ? (
              <button
                onClick={() => setShowAuthForm(true)}
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                {t.signInSignUp || 'Sign In / Sign Up'}
              </button>
            ) : (
              <form onSubmit={handleAuth} className="max-w-md mx-auto space-y-4">
                {isSignUp && (
                  <input
                    type="text"
                    placeholder={t.fullName || 'Full Name'}
                    value={authForm.name}
                    onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                )}
                <input
                  type="email"
                  placeholder={t.emailAddress || 'Email Address'}
                  value={authForm.email}
                  onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="password"
                  placeholder={t.password || 'Password'}
                  value={authForm.password}
                  onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {isSignUp && (
                  <input
                    type="password"
                    placeholder={t.confirmPassword || 'Confirm Password'}
                    value={authForm.confirmPassword}
                    onChange={(e) => setAuthForm({...authForm, confirmPassword: e.target.value})}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                )}
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {loading ? (t.processingAuth || 'Processing...') : (isSignUp ? (t.signUp || 'Sign Up') : (t.signIn || 'Sign In'))}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAuthForm(false)}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    {t.cancel || 'Cancel'}
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isSignUp ? (t.alreadyHaveAccount || 'Already have an account?') : (t.dontHaveAccount || "Don't have an account?")}{' '}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium"
                  >
                    {isSignUp ? (t.signIn || 'Sign In') : (t.signUp || 'Sign Up')}
                  </button>
                </p>
              </form>
            )}
          </div>
        ) : (
          <div>
            {/* User Info & Controls */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t.signedInAs || 'Signed in as'}: {user?.email}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t.autoCloudBackupActive || 'Auto Cloud Backup Active (Updates after every change)'}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  {t.signOut || 'Sign Out'}
                </button>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={createBackup}
                  disabled={loading}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? (t.creating || 'Creating...') : (t.createManualBackup || 'Create Manual Backup')}
                </button>
                <button
                  onClick={createLocalBackup}
                  disabled={loading}
                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? (t.creating || 'Creating...') : (t.createLocalBackup || 'Create Local Backup')}
                </button>
                <button
                  onClick={loadBackups}
                  disabled={loading}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {t.refresh || 'Refresh'}
                </button>
              </div>
            </div>

            {/* Backups List */}
            <div className="space-y-6">
              {/* Cloud Backups */}
              <div>
                <h4 className="font-semibold mb-4 text-gray-800 dark:text-gray-100"><Icon name="cloud" size={20} className="inline mr-2" /> {t.cloudBackups || 'Cloud Backups'} ({backups.length} {t.backups || 'backups'})</h4>
                
                {loading && <p className="text-center py-4 text-gray-600 dark:text-gray-400">{t.loading || 'Loading...'}</p>}
                
                {!loading && backups.length === 0 && (
                  <p className="text-center py-8 text-gray-500 dark:text-gray-400">{t.noCloudBackupsFound || 'No cloud backups found'}</p>
                )}
                
                {!loading && backups.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700">
                          <th className="border border-gray-300 dark:border-gray-600 p-3 text-left text-gray-800 dark:text-gray-100">{t.fileName || 'File Name'}</th>
                          <th className="border border-gray-300 dark:border-gray-600 p-3 text-left text-gray-800 dark:text-gray-100">{t.description || 'Description'}</th>
                          <th className="border border-gray-300 dark:border-gray-600 p-3 text-left text-gray-800 dark:text-gray-100">{t.uploadDate || 'Upload Date'}</th>
                          <th className="border border-gray-300 dark:border-gray-600 p-3 text-left text-gray-800 dark:text-gray-100">{t.size || 'Size'}</th>
                          <th className="border border-gray-300 dark:border-gray-600 p-3 text-left text-gray-800 dark:text-gray-100">{t.actions || 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backups.map((backup) => (
                          <tr key={backup.$id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="border border-gray-300 dark:border-gray-600 p-3 text-gray-800 dark:text-gray-200">{backup.fileName}</td>
                            <td className="border border-gray-300 dark:border-gray-600 p-3 text-gray-800 dark:text-gray-200">{backup.description}</td>
                            <td className="border border-gray-300 dark:border-gray-600 p-3 text-gray-800 dark:text-gray-200">
                              {new Date(backup.uploadDate).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 dark:border-gray-600 p-3 text-gray-800 dark:text-gray-200">
                              {backup.fileSize ? `${Math.round(backup.fileSize / 1024)} KB` : (t.unknown || 'Unknown')}
                            </td>
                            <td className="border border-gray-300 dark:border-gray-600 p-3">
                              <div className="space-x-2">
                                <button
                                  onClick={() => downloadBackup(backup)}
                                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors"
                                  title={t.downloadBackupFile || 'Download backup file to your computer'}
                                >
                                  {t.download || 'Download'}
                                </button>
                                <button
                                  onClick={() => downloadAndRestore(backup)}
                                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
                                  title={t.downloadAndRestore || 'Download and restore backup'}
                                >
                                  {t.downloadRestore || 'Download & Restore'}
                                </button>
                                <button
                                  onClick={() => deleteBackup(backup)}
                                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                                  title={t.deleteBackupFromCloud || 'Delete backup from cloud'}
                                >
                                  {t.delete || 'Delete'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Local Backups Section */}
              <div>
                <h4 className="font-semibold mb-4 text-gray-800 dark:text-gray-100">💾 {t.localBackups || 'Local Backups'}</h4>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {t.localBackupsStored || 'Local backups are stored in your Documents folder under "Mobile Roma BackUp"'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={openLocalBackupFolder}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      {t.openBackupFolder || 'Open Backup Folder'}
                    </button>
                    <button
                      onClick={restoreFromLocalFile}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      {t.restoreFromFile || 'Restore from File'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalBase>
  );
}
