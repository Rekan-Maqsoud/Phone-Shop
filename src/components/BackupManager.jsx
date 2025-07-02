import React, { useState, useEffect } from 'react';

const BackupManager = ({ show, t, onClose, onRestore }) => {
  const [backupHistory, setBackupHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const fetchBackupHistory = async () => {
    try {
      if (window.api?.getBackupHistory) {
        const history = await window.api.getBackupHistory();
        setBackupHistory(history || []);
      }
    } catch (e) {
      // Silent error handling
    }
  };

  useEffect(() => {
    if (show) {
      fetchBackupHistory();
    }
  }, [show]);

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      if (window.api?.createBackup) {
        const result = await window.api.createBackup();
        if (result.success) {
          showMessage(`${t.backupSuccess || 'Backup created successfully!'} ${result.fileName}`, 'success');
          fetchBackupHistory();
        } else {
          showMessage(result.message || t.backupFailed || 'Backup failed', 'error');
        }
      }
    } catch (e) {
      showMessage(t.backupFailed || 'Backup failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    try {
      if (window.api?.selectBackupFile) {
        const fileResult = await window.api.selectBackupFile();
        if (fileResult.success) {
          const confirmed = window.confirm(
            t.confirmRestore || 'Are you sure you want to restore from this backup? This will replace all current data!'
          );
          
          if (confirmed && window.api?.restoreBackup) {
            setLoading(true);
            const result = await window.api.restoreBackup(fileResult.filePath);
            if (result.success) {
              showMessage(result.message || t.restoreSuccess || 'Database restored successfully!', 'success');
              
              // Handle restart requirement
              if (result.requiresRestart) {
                setTimeout(() => {
                  if (confirm(t.restartRequired || 'Database restored successfully! The application needs to restart to apply changes. Restart now?')) {
                    window.location.reload();
                  }
                }, 2000);
              }
              
              // Refresh data if onRestore callback exists
              if (onRestore) {
                onRestore();
              }
            } else {
              showMessage(result.message || t.restoreFailed || 'Restore failed', 'error');
            }
          }
        }
      }
    } catch (e) {
      showMessage(t.restoreFailed || 'Restore failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Removed auto backup functionality - replaced with instant backup

  const formatDate = (dateString) => {
    // Create a proper date object and format it for the user's local timezone
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const handleRestoreFromPath = async (backupPath) => {
    if (!window.confirm(
      t.confirmRestore || 'Are you sure you want to restore from this backup? This will replace all current data!'
    )) {
      return;
    }

    setLoading(true);
    try {
      if (window.api?.restoreBackup) {
        const result = await window.api.restoreBackup(backupPath);
        if (result.success) {
          showMessage(result.message || t.restoreSuccess || 'Database restored successfully!', 'success');
          
          // Handle restart requirement
          if (result.requiresRestart) {
            setTimeout(() => {
              if (confirm(t.restartRequired || 'Database restored successfully! The application needs to restart to apply changes. Restart now?')) {
                window.location.reload();
              }
            }, 2000);
          }
          
          // Refresh data if onRestore callback exists
          if (onRestore) {
            onRestore();
          }
        } else {
          showMessage(result.message || t.restoreFailed || 'Restore failed', 'error');
        }
      }
    } catch (e) {
      showMessage(t.restoreFailed || 'Restore failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto" tabIndex="-1">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {t.backupManager || 'Backup Manager'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
              aria-label="Close Backup Manager"
              tabIndex={0}
              autoFocus
            >
              ×
            </button>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              messageType === 'error' 
                ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100' 
                : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100'
            }`}>
              {message}
            </div>
          )}

          {/* Backup Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Manual Backup */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                {t.manualBackup || 'Manual Backup'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t.manualBackupDesc || 'Create a backup of your database to Documents/Mobile Roma BackUp folder'}
              </p>
              <button
                onClick={handleCreateBackup}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? (t.creating || 'Creating...') : (t.createBackup || 'Create Backup')}
              </button>
            </div>

            {/* Instant Backup Status */}
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                {t.instantBackup || 'Instant Backup'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t.instantBackupDesc || 'Your database is automatically backed up after every change (sale, product modification, etc.)'}
              </p>
              <div className="flex items-center gap-3 p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 dark:text-green-200 font-medium">
                  {t.instantBackupActive || 'Instant backup active'}
                </span>
              </div>
            </div>
          </div>

          {/* Restore Section */}
          <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {t.restoreBackup || 'Restore from Backup'}
            </h3>
            <p className="text-yellow-700 dark:text-yellow-100 mb-4">
              {t.restoreWarning || 'Warning: Restoring from a backup will replace all current data. This action cannot be undone.'}
            </p>
            <button
              onClick={handleRestoreBackup}
              disabled={loading}
              className="bg-yellow-600 text-white px-4 py-3 rounded-lg font-semibold shadow hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? (t.restoring || 'Restoring...') : (t.selectBackupFile || 'Select Backup File')}
            </button>
          </div>

          {/* Backup History */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {t.backupHistory || 'Backup History'}
            </h3>
            {backupHistory.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                {t.noBackups || 'No backups found'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-800 dark:text-gray-100">
                        {t.fileName || 'File Name'}
                      </th>
                      <th className="px-4 py-3 text-left text-gray-800 dark:text-gray-100">
                        {t.createdAt || 'Created At'}
                      </th>
                      <th className="px-4 py-3 text-left text-gray-800 dark:text-gray-100">
                        {t.type || 'Type'}
                      </th>
                      <th className="px-4 py-3 text-left text-gray-800 dark:text-gray-100">
                        {t.status || 'Status'}
                      </th>
                      <th className="px-4 py-3 text-left text-gray-800 dark:text-gray-100">
                        {t.actions || 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {backupHistory.map((backup, index) => (
                      <tr key={backup.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-100 font-mono text-sm">
                          {backup.file_name}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {formatDate(backup.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            backup.file_name === 'phone-shop-current-backup.sqlite'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                          }`}>
                            {backup.file_name === 'phone-shop-current-backup.sqlite' ? (t.instantBackup || 'Instant') : (t.manual || 'Manual')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            {t.completed || 'Completed'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRestoreFromPath(backup.file_path)}
                            disabled={loading}
                            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t.restoreFromThisBackup || 'Restore from this backup'}
                          >
                            📂 {loading ? (t.restoring || 'Restoring...') : (t.restore || 'Restore')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupManager;
