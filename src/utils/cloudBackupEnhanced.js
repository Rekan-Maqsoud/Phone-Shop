import { useBackupProgress } from '../contexts/BackupProgressContext';

// Enhanced cloud backup utility with progress feedback
let isBackupInProgress = false;
let globalBackupProgress = null;

// Function to get backup progress from React context or global state
const getBackupProgress = () => {
  if (globalBackupProgress) return globalBackupProgress;
  
  try {
    // This will work if called from within a React component context
    if (typeof window !== 'undefined' && window.__backupProgress) {
      return window.__backupProgress;
    }
  } catch (error) {
    // Not in React context
  }
  
  return null;
};

// Function to set global backup progress for non-React contexts
export const setGlobalBackupProgress = (progressInstance) => {
  globalBackupProgress = progressInstance;
  if (typeof window !== 'undefined') {
    window.__backupProgress = progressInstance;
  }
};

export const triggerCloudBackup = async () => {
  // Prevent multiple simultaneous backups
  if (isBackupInProgress) {
    return { success: false, message: 'Backup already in progress' };
  }

  const backupProgress = getBackupProgress();

  try {
    isBackupInProgress = true;
    
    // Show progress indicator
    if (backupProgress) {
      backupProgress.showProgress('Starting cloud backup...');
    }
    
    if (typeof window !== 'undefined' && window.api?.triggerCloudBackup) {
      // Update progress during backup
      if (backupProgress) {
        backupProgress.updateProgress(20, 'Preparing backup...');
        
        setTimeout(() => {
          if (backupProgress && isBackupInProgress) {
            backupProgress.updateProgress(60, 'Uploading to cloud...');
          }
        }, 300);
        
        setTimeout(() => {
          if (backupProgress && isBackupInProgress) {
            backupProgress.updateProgress(85, 'Finalizing backup...');
          }
        }, 800);
      }
      
      const result = await window.api.triggerCloudBackup();
      
      // Complete progress
      if (backupProgress) {
        if (result.success) {
          backupProgress.completeBackup('Backup completed successfully!');
        } else {
          // Only show failure if not a silent failure (network issues, etc)
          if (!result.silent) {
            backupProgress.updateProgress(100, 'Backup failed');
            setTimeout(() => backupProgress.hideProgress(), 3000);
          } else {
            backupProgress.hideProgress();
          }
        }
      }
      
      return result;
    } else {
      console.warn('[triggerCloudBackup] API not available');
      if (backupProgress) {
        backupProgress.hideProgress();
      }
      return { success: false, message: 'Cloud backup API not available' };
    }
  } catch (error) {
    console.error('[triggerCloudBackup] Error:', error);
    if (backupProgress) {
      backupProgress.hideProgress();
    }
    return { success: false, message: error.message };
  } finally {
    isBackupInProgress = false;
  }
};

// Non-blocking version for automatic backups
export const triggerCloudBackupAsync = () => {
  // Fire and forget - don't block UI
  triggerCloudBackup().catch(error => {
    console.error('[triggerCloudBackupAsync] Background backup failed:', error);
  });
  
  // Return immediately
  return { success: true, message: 'Backup started in background' };
};

export default { triggerCloudBackup, triggerCloudBackupAsync, setGlobalBackupProgress };
