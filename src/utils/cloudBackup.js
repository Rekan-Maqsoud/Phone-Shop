// Cloud backup utility functions
let isBackupInProgress = false;

export const triggerCloudBackup = async () => {
  // Prevent multiple simultaneous backups
  if (isBackupInProgress) {
    return { success: false, message: 'Backup already in progress' };
  }

  try {
    isBackupInProgress = true;
    
    if (typeof window !== 'undefined' && window.api?.triggerCloudBackup) {
      const result = await window.api.triggerCloudBackup();
      return result;
    } else {
      console.warn('[triggerCloudBackup] API not available');
      return { success: false, message: 'Cloud backup API not available' };
    }
  } catch (error) {
    console.error('[triggerCloudBackup] Error:', error);
    return { success: false, message: error.message };
  } finally {
    isBackupInProgress = false;
  }
};

export default { triggerCloudBackup };
