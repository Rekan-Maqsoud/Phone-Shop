import { useEffect, useState } from 'react';
import cloudAuthService from '../services/CloudAuthService';

export default function CloudBackupListener() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize authentication state on mount
    const initializeAuth = async () => {
      try {
        const isAuth = cloudAuthService.isAuthenticated();
        setIsAuthenticated(isAuth);
        setIsInitialized(true);
        
      } catch (error) {
        // Only log errors if not in offline mode
        if (!cloudAuthService._offlineMode) {
          console.error('CloudBackupListener: Error initializing auth:', error);
        }
        setIsAuthenticated(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const listener = (auth) => {
      setIsAuthenticated(auth);
      
    };
    
    cloudAuthService.onAuthChange(listener);
    
    return () => {
      cloudAuthService.offAuthChange(listener);
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    // Throttle cloud backups to prevent excessive operations
    let cloudBackupTimeout = null;
    let lastCloudBackup = 0;
    const CLOUD_BACKUP_THROTTLE = 5000; // Minimum 5 seconds between cloud backups

    const handleUnifiedAutoBackup = async () => {
      // Use cached auth status instead of network call
      try {
        const currentAuth = cloudAuthService.isAuthenticated();
        setIsAuthenticated(currentAuth);
        
        if (currentAuth) {
          // Clear any pending backup to debounce
          if (cloudBackupTimeout) {
            clearTimeout(cloudBackupTimeout);
          }
          
          const now = Date.now();
          const timeSinceLastBackup = now - lastCloudBackup;
          const delay = timeSinceLastBackup > CLOUD_BACKUP_THROTTLE ? 1000 : CLOUD_BACKUP_THROTTLE;
          
          cloudBackupTimeout = setTimeout(async () => {
            try {
             
              const result = await cloudAuthService.performAutoBackup();
              lastCloudBackup = Date.now();
              
              if (result.success) {
              
              } else {
                console.error('CloudBackupListener: Cloud backup failed:', result.error);
                
                // Show error toast for specific backup failures
                if (window.showGlobalToast && result.error !== 'User not authenticated') {
                  window.showGlobalToast(
                    `Cloud backup failed: ${result.error}`,
                    'error',
                    4000
                  );
                }
              }
            } catch (error) {
              console.error('CloudBackupListener: Unexpected error during backup:', error);
              
              if (window.showGlobalToast) {
                window.showGlobalToast(
                  'Cloud backup error occurred',
                  'error',
                  3000
                );
              }
            }
            cloudBackupTimeout = null;
          }, delay);
        } else {
          // Only show the warning once every few seconds to avoid spam
          if (window.showGlobalToast && (!window._lastBackupWarning || 
              Date.now() - window._lastBackupWarning > 10000)) {
            window.showGlobalToast(
              'You are not logged in. Changes will NOT be backed up to the cloud.',
              'error',
              4000
            );
            window._lastBackupWarning = Date.now();
          }
        }
      } catch (error) {
        console.error('CloudBackupListener: Error checking auth status:', error);
        // Fallback to stored state if check fails
        if (isAuthenticated) {
          // Proceed with backup if we think we're authenticated
          if (cloudBackupTimeout) {
            clearTimeout(cloudBackupTimeout);
          }
          
          const now = Date.now();
          const timeSinceLastBackup = now - lastCloudBackup;
          const delay = timeSinceLastBackup > CLOUD_BACKUP_THROTTLE ? 1000 : CLOUD_BACKUP_THROTTLE;
          
          cloudBackupTimeout = setTimeout(async () => {
            try {
            
              const result = await cloudAuthService.performAutoBackup();
              lastCloudBackup = Date.now();
              
              if (result.success) {
                
              } else {
                console.error('CloudBackupListener: Cloud backup failed:', result.error);
                
                // Show error toast for specific backup failures
                if (window.showGlobalToast && result.error !== 'User not authenticated') {
                  window.showGlobalToast(
                    `Cloud backup failed: ${result.error}`,
                    'error',
                    4000
                  );
                }
              }
            } catch (error) {
              console.error('CloudBackupListener: Unexpected error during backup:', error);
              
              if (window.showGlobalToast) {
                window.showGlobalToast(
                  'Cloud backup error occurred',
                  'error',
                  3000
                );
              }
            }
            cloudBackupTimeout = null;
          }, delay);
        }
      }
    };

    if (window.api?.on) {
      window.api.on('trigger-unified-auto-backup', handleUnifiedAutoBackup);
      
    } else {
      console.warn('CloudBackupListener: window.api.on not available');
    }

    return () => {
      if (window.api?.off) {
        window.api.off('trigger-unified-auto-backup', handleUnifiedAutoBackup);
      
      }
    };
  }, [isAuthenticated, isInitialized]);

  return null;
}
