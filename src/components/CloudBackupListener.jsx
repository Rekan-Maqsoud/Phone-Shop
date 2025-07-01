import { useEffect, useState } from 'react';
import cloudAuthService from '../services/CloudAuthService';

export default function CloudBackupListener() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize authentication state on mount
    const initializeAuth = async () => {
      try {
        const isAuth = await cloudAuthService.checkAuth();
        setIsAuthenticated(isAuth);
        setIsInitialized(true);
      
      } catch (error) {
        console.error('CloudBackupListener: Error initializing auth:', error);
        setIsAuthenticated(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const listener = (auth) => {
      setIsAuthenticated(auth);
      // Removed: console.log('CloudBackupListener: Auth state changed:', auth);
    };
    
    cloudAuthService.onAuthChange(listener);
    
    return () => {
      cloudAuthService.offAuthChange(listener);
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const handleUnifiedAutoBackup = async () => {
      if (isAuthenticated) {
        try {
          // Removed: console.log('CloudBackupListener: Performing cloud auto backup...');
          const result = await cloudAuthService.performAutoBackup();
          
          if (result.success) {
            // Removed: console.log('CloudBackupListener: Cloud backup completed successfully');
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
      } else {
        // Only show the warning once every few seconds to avoid spam
        if (window.showGlobalToast && !window._lastBackupWarning || 
            Date.now() - window._lastBackupWarning > 10000) {
          window.showGlobalToast(
            'You are not logged in. Changes will NOT be backed up to the cloud.',
            'error',
            4000
          );
          window._lastBackupWarning = Date.now();
        }
      }
    };

    if (window.api?.on) {
      window.api.on('trigger-unified-auto-backup', handleUnifiedAutoBackup);
      // Removed: console.log('CloudBackupListener: Registered backup event handler');
    } else {
      console.warn('CloudBackupListener: window.api.on not available');
    }

    return () => {
      if (window.api?.off) {
        window.api.off('trigger-unified-auto-backup', handleUnifiedAutoBackup);
        // Removed: console.log('CloudBackupListener: Unregistered backup event handler');
      }
    };
  }, [isAuthenticated, isInitialized]);

  return null;
}
