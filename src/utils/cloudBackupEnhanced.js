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
    return { success: false, message: 'Backup already in progress' }; // This is internal, no translation needed
  }

  const backupProgress = getBackupProgress();

  try {
    isBackupInProgress = true;
    
    // Show progress indicator
    if (backupProgress) {
      backupProgress.showProgress('Starting cloud backup...'); // Progress messages are internal, keep in English
    }
    
    if (typeof window !== 'undefined' && window.api?.triggerCloudBackup) {
      // Update progress during backup
      if (backupProgress) {
        backupProgress.updateProgress(20, 'Preparing backup...'); // Progress messages are internal, keep in English
        
        setTimeout(() => {
          if (backupProgress && isBackupInProgress) {
            backupProgress.updateProgress(60, 'Uploading to cloud...'); // Progress messages are internal, keep in English
          }
        }, 300);
        
        setTimeout(() => {
          if (backupProgress && isBackupInProgress) {
            backupProgress.updateProgress(85, 'Finalizing backup...'); // Progress messages are internal, keep in English
          }
        }, 800);
      }
      
      const result = await window.api.triggerCloudBackup();
      
      // Complete progress
      if (backupProgress) {
        if (result.success) {
          backupProgress.completeBackup('Backup completed successfully!'); // Progress messages are internal, keep in English
        } else {
          // Only show failure if not a silent failure (network issues, etc)
          if (!result.silent) {
            backupProgress.updateProgress(100, 'Backup failed'); // Progress messages are internal, keep in English
            setTimeout(() => backupProgress.hideProgress(), 3000);
          } else {
            backupProgress.hideProgress();
          }
        }
      }
      
      return result;
    } else {
      // API not available - fail silently
      if (backupProgress) {
        backupProgress.hideProgress();
      }
      return { success: false, message: 'Cloud backup API not available' }; // This is internal, no translation needed
    }
  } catch (error) {
    // Error during backup - fail silently
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
    // Background backup failed - fail silently
  });
  
  // Return immediately
  return { success: true, message: 'Backup started in background' }; // This is internal, no translation needed
};

export default { triggerCloudBackup, triggerCloudBackupAsync, setGlobalBackupProgress };
