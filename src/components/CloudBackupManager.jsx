import React, { useState, useEffect } from 'react';
import cloudAuthService from '../services/CloudAuthService';
import appwriteValidator from '../services/AppwriteConfigValidator';
import ModalBase from './ModalBase';
import ToastUnified from './ToastUnified';

export default function CloudBackupManager({ onClose, t }) {
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
  
  // Backup form states
  const [showBackupForm, setShowBackupForm] = useState(false);
  const [backupForm, setBackupForm] = useState({
    name: '',
    description: ''
  });
  
  // Auto backup settings
  const [autoBackupSettings, setAutoBackupSettings] = useState({
    enabled: false,
    frequency: 'daily'
  });
  
  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Configuration state
  const [configValid, setConfigValid] = useState(null);
  const [showConfigTest, setShowConfigTest] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  useEffect(() => {
    checkAuthStatus();
    loadAutoBackupSettings();
    validateConfiguration();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadBackups();
      loadStorageUsage();
    }
  }, [isAuthenticated]);

  const checkAuthStatus = async () => {
    const result = await cloudAuthService.getCurrentUser();
    if (result.success) {
      setIsAuthenticated(true);
      setUser(result.user);
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const loadBackups = async () => {
    setLoading(true);
    const result = await cloudAuthService.getBackups();
    if (result.success) {
      setBackups(result.backups);
    } else {
      showToast(result.error || 'Failed to load backups', 'error');
    }
    setLoading(false);
  };

  const loadStorageUsage = async () => {
    const result = await cloudAuthService.getStorageUsage();
    if (result.success) {
      setStorageUsage(result);
    }
  };

  const loadAutoBackupSettings = async () => {
    const settings = await cloudAuthService.getAutoBackupSettings();
    setAutoBackupSettings(settings);
  };

  const validateConfiguration = async () => {
    const validation = await appwriteValidator.validate();
    setConfigValid(validation);
    
    if (!validation.isValid && validation.errors.length > 0) {
      showToast('Cloud backup configuration incomplete. Click "Test Configuration" for details.', 'warning');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let result;
      
      if (isLogin) {
        result = await cloudAuthService.login(authForm.email, authForm.password);
      } else {
        if (authForm.password !== authForm.confirmPassword) {
          showToast('Passwords do not match', 'error');
          setLoading(false);
          return;
        }
        result = await cloudAuthService.createAccount(authForm.email, authForm.password, authForm.name);
      }
      
      if (result.success) {
        setIsAuthenticated(true);
        setUser(result.user);
        setShowAuthForm(false);
        setAuthForm({ email: '', password: '', name: '', confirmPassword: '' });
        showToast(isLogin ? 'Logged in successfully!' : 'Account created successfully!');
      } else {
        showToast(result.error || 'Authentication failed', 'error');
      }
    } catch (error) {
      showToast('Authentication failed', 'error');
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
      showToast('Logged out successfully');
    } else {
      showToast(result.error || 'Logout failed', 'error');
    }
  };

  const handleCreateBackup = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Create local backup first
      if (window.api?.createBackup) {
        const localBackup = await window.api.createBackup();
        if (!localBackup.success || !localBackup.path) {
          showToast(localBackup.message || 'Failed to create local backup', 'error');
          setLoading(false);
          return;
        }
        // Read the backup file
        const backupPath = localBackup.path || localBackup.filePath;
        const backupFile = await window.api.readBackupFile(backupPath);
        if (backupFile && backupFile.length > 0) {
          // Convert to File object for Appwrite
          const file = new File([backupFile], backupForm.name || localBackup.fileName, {
            type: 'application/octet-stream'
          });
          const result = await cloudAuthService.uploadBackup(
            file,
            backupForm.name || localBackup.fileName,
            backupForm.description
          );
          if (result.success) {
            showToast('Backup uploaded successfully!');
            setShowBackupForm(false);
            setBackupForm({ name: '', description: '' });
            loadBackups();
            loadStorageUsage();
          } else {
            showToast(result.error || 'Failed to upload backup', 'error');
          }
        } else {
          showToast('Failed to read backup file or file is empty', 'error');
        }
      } else {
        showToast('Backup API not available', 'error');
      }
    } catch (error) {
      showToast('Failed to create backup', 'error');
    }
    
    setLoading(false);
  };

  const handleDownloadBackup = async (backup) => {
    setLoading(true);
    try {
      const result = await cloudAuthService.downloadBackup(backup.$id);
      if (result.success) {
        // Download the file and save it locally
        const response = await fetch(result.downloadUrl);
        const arrayBuffer = await response.arrayBuffer();
        const backupData = new Uint8Array(arrayBuffer);

        // Save the backup locally
        const saveResult = await window.api.saveCloudBackup(backupData, backup.fileName);
        if (saveResult.success && saveResult.path) {
          // Extra: Check file exists and is not empty
          const fileCheck = await window.api.readBackupFile(saveResult.path);
          if (!fileCheck || fileCheck.length === 0) {
            showToast('Downloaded backup file is empty or unreadable. Please try again.', 'error');
            setLoading(false);
            return;
          }
          showToast('Backup downloaded successfully! You can now restore it.');
          // Ask if user wants to restore immediately
          if (confirm(`Backup downloaded to ${saveResult.path}. Do you want to restore it now?`)) {
            await handleRestoreBackup(saveResult.path);
          }
        } else {
          showToast(saveResult.message || 'Failed to save backup locally', 'error');
        }
      } else {
        showToast(result.error || 'Failed to download backup', 'error');
      }
    } catch (error) {
      showToast('Failed to download backup: ' + (error?.message || error), 'error');
    }
    setLoading(false);
  };

  const handleDeleteBackup = async (backup) => {
    if (!confirm(`Are you sure you want to delete "${backup.fileName}"?`)) {
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await cloudAuthService.deleteBackup(backup.$id);
      if (result.success) {
        showToast('Backup deleted successfully');
        loadBackups();
        loadStorageUsage();
      } else {
        showToast(result.error || 'Failed to delete backup', 'error');
      }
    } catch (error) {
      showToast('Failed to delete backup', 'error');
    }
    
    setLoading(false);
  };

  const handleRestoreBackup = async (filePath) => {
    setLoading(true);
    
    try {
      const result = await window.api.restoreFromCloudBackup(filePath);
      if (result.success) {
        showToast(result.message || 'Database restored successfully!');
        
        if (result.requiresRestart) {
          if (confirm('Database restored successfully! The application needs to restart to apply changes. Restart now?')) {
            window.location.reload();
          }
        }
      } else {
        showToast(result.message || 'Failed to restore backup', 'error');
      }
    } catch (error) {
      showToast('Failed to restore backup', 'error');
    }
    
    setLoading(false);
  };

  const handleAutoBackupToggle = async (enabled) => {
    const result = await cloudAuthService.updateAutoBackupSettings(enabled, autoBackupSettings.frequency);
    if (result.success) {
      setAutoBackupSettings(prev => ({ ...prev, enabled }));
      showToast(`Auto backup ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      showToast('Failed to update auto backup settings', 'error');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  return (
    <>
      <ModalBase open={true} title="Cloud Backup Manager" onClose={onClose}>
        <div className="space-y-6">
          {/* Authentication Section */}
          {!isAuthenticated ? (
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Cloud Backup Service</h3>
              <p className="text-gray-600 mb-6">
                Sign in to backup and restore your data securely in the cloud
              </p>
              
              {/* Configuration Warning */}
              {configValid && !configValid.isValid && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Cloud backup configuration incomplete. 
                    <button
                      onClick={() => setShowConfigTest(true)}
                      className="ml-1 text-yellow-600 hover:text-yellow-800 underline"
                    >
                      Click here to test configuration
                    </button>
                  </p>
                </div>
              )}
              
              <button
                onClick={() => setShowAuthForm(true)}
                disabled={configValid && !configValid.isValid}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sign In / Sign Up
              </button>
              
              {configValid && !configValid.isValid && (
                <p className="text-xs text-gray-500 mt-2">
                  Please fix configuration issues before signing in
                </p>
              )}
            </div>
          ) : (
            <>
              {/* User Info & Storage Usage */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-semibold">{user?.name}</h3>
                    <p className="text-sm text-gray-600">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Sign Out
                  </button>
                </div>
                {storageUsage && (
                  <div className="text-sm text-gray-600">
                    Storage Used: {storageUsage.formattedSize} ({storageUsage.count} backups)
                  </div>
                )}
              </div>

              {/* Auto Backup Settings */}
              <div className="border p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Auto Backup Settings</h4>
                <div className="flex items-center justify-between">
                  <span>Enable automatic cloud backup</span>
                  <button
                    onClick={() => handleAutoBackupToggle(!autoBackupSettings.enabled)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      autoBackupSettings.enabled ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        autoBackupSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBackupForm(true)}
                  disabled={loading}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Backup'}
                </button>
                <button
                  onClick={loadBackups}
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setShowConfigTest(true)}
                  className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                  title="Test Appwrite configuration"
                >
                  Test Config
                </button>
              </div>

              {/* Backups List */}
              <div>
                <h4 className="font-semibold mb-3">Cloud Backups</h4>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading...</p>
                  </div>
                ) : backups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No cloud backups found
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {backups.map((backup) => (
                      <div key={backup.$id} className="border p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h5 className="font-medium">{backup.fileName}</h5>
                            {backup.description && (
                              <p className="text-sm text-gray-600 mt-1">{backup.description}</p>
                            )}
                            <div className="text-xs text-gray-500 mt-2">
                              <span>Version {backup.version} • </span>
                              <span>{formatDate(backup.uploadDate)} • </span>
                              <span>
                                {typeof backup.fileSize === 'number' && backup.fileSize > 0
                                  ? cloudAuthService.formatFileSize(backup.fileSize)
                                  : 'Unknown size'}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleDownloadBackup(backup)}
                              className="text-blue-500 hover:text-blue-700 text-sm"
                              title="Download backup"
                            >
                              Download
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to restore from "${backup.fileName}"? This will replace all current data!`)) {
                                  handleDownloadBackup(backup);
                                }
                              }}
                              className="text-green-500 hover:text-green-700 text-sm"
                              title="Download and restore backup"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handleDeleteBackup(backup)}
                              className="text-red-500 hover:text-red-700 text-sm"
                              title="Delete backup"
                            >
                              Delete
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
        <ModalBase
          open={true}
          title={isLogin ? 'Sign In' : 'Create Account'}
          onClose={() => setShowAuthForm(false)}
        >
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required={!isLogin}
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                minLength="8"
              />
            </div>
            
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={authForm.confirmPassword}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-500 hover:text-blue-700 px-4"
              >
                {isLogin ? 'Need an account?' : 'Already have an account?'}
              </button>
            </div>
          </form>
        </ModalBase>
      )}

      {/* Backup Form Modal */}
      {showBackupForm && (
        <ModalBase
          open={true}
          title="Create Cloud Backup"
          onClose={() => setShowBackupForm(false)}
        >
          <form onSubmit={handleCreateBackup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Backup Name</label>
              <input
                type="text"
                value={backupForm.name}
                onChange={(e) => setBackupForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Leave empty for auto-generated name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description (Optional)</label>
              <textarea
                value={backupForm.description}
                onChange={(e) => setBackupForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Add a description for this backup..."
              />
            </div>
            
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Backup'}
              </button>
              <button
                type="button"
                onClick={() => setShowBackupForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </ModalBase>
      )}

      {/* Configuration Test Modal */}
      {showConfigTest && (
        <ModalBase
          open={true}
          title="Appwrite Configuration Test"
          onClose={() => setShowConfigTest(false)}
        >
          <div className="space-y-4">
            {configValid && (
              <>
                <div className="space-y-2">
                  <h4 className="font-semibold">Configuration Status</h4>
                  
                  {configValid.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <h5 className="font-medium text-red-800 mb-2">Errors:</h5>
                      <ul className="text-sm text-red-700 space-y-1">
                        {configValid.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {configValid.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <h5 className="font-medium text-yellow-800 mb-2">Warnings:</h5>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {configValid.warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {configValid.isValid && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-700">✅ Configuration is valid!</p>
                    </div>
                  )}
                </div>
                
                {!configValid.isValid && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h5 className="font-medium text-blue-800 mb-2">Setup Instructions:</h5>
                    <ol className="text-sm text-blue-700 space-y-1 ml-4">
                      <li>1. Create an Appwrite account at https://appwrite.io</li>
                      <li>2. Create a new project</li>
                      <li>3. Set up Authentication (enable Email/Password)</li>
                      <li>4. Create a database and collection for backups</li>
                      <li>5. Create a storage bucket for backup files</li>
                      <li>6. Update your .env file with the configuration</li>
                      <li>7. Restart the application</li>
                    </ol>
                    <p className="text-sm text-blue-600 mt-2">
                      See CLOUD_BACKUP_SETUP.md for detailed instructions
                    </p>
                  </div>
                )}
              </>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => validateConfiguration()}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Retest Configuration
              </button>
              <button
                onClick={() => setShowConfigTest(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
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