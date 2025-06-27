import React, { useState, useEffect } from 'react';

export default function BackupManager({ t, onClose }) {
  const [backupHistory, setBackupHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(() => 
    localStorage.getItem('autoBackupEnabled') === 'true'
  );
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
    fetchBackupHistory();
  }, []);

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
              showMessage(t.restoreSuccess || 'Database restored successfully!', 'success');
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

  const handleAutoBackupToggle = async (enabled) => {
    setLoading(true);
    try {
      if (window.api?.setAutoBackup) {
        const result = await window.api.setAutoBackup(enabled);
        if (result.success) {
          setAutoBackupEnabled(enabled);
          localStorage.setItem('autoBackupEnabled', enabled.toString());
          showMessage(
            enabled 
              ? t.autoBackupSystemEnabled || 'Auto backup enabled - Database will be backed up every 24 hours'
              : t.autoBackupSystemDisabled || 'Auto backup disabled',
            'success'
          );
        } else {
          showMessage(result.message || t.autoBackupFailed || 'Failed to toggle auto backup', 'error');
        }
      }
    } catch (e) {
      showMessage(t.autoBackupFailed || 'Failed to toggle auto backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

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
            >
              ✕
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
                {t.manualBackupDesc || 'Create a backup of your database to Documents/Phone Shop Backups folder'}
              </p>
              <button
                onClick={handleCreateBackup}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? (t.creating || 'Creating...') : (t.createBackup || 'Create Backup')}
              </button>
            </div>

            {/* Auto Backup */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                {t.autoBackupSystem || 'Auto Backup'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t.autoBackupDesc || 'Automatically backup your database every 24 hours'}
              </p>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBackupEnabled}
                  onChange={(e) => handleAutoBackupToggle(e.target.checked)}
                  disabled={loading}
                  className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="ml-3 text-gray-700 dark:text-gray-300">
                  {t.enableAutoBackup || 'Enable automatic daily backup'}
                </span>
              </label>
              {autoBackupEnabled && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-100">
                    {t.autoBackupActive || 'Auto backup is active. Next backup will be created in approximately 24 hours.'}
                  </p>
                </div>
              )}
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
                            backup.file_name.includes('auto-backup') 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                          }`}>
                            {backup.file_name.includes('auto-backup') ? 'Auto' : 'Manual'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            {t.completed || 'Completed'}
                          </span>
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
}
