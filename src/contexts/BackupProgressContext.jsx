import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const BackupProgressContext = createContext();

export const useBackupProgress = () => {
  const context = useContext(BackupProgressContext);
  if (!context) {
    throw new Error('useBackupProgress must be used within a BackupProgressProvider');
  }
  return context;
};

export const BackupProgressProvider = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const timeoutRef = useRef(null);

  // Expose to global window for non-React contexts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__backupProgress = {
        showProgress,
        updateProgress,
        completeBackup,
        hideProgress,
        isVisible,
        progress,
        status,
        isCompleted
      };
    }
  }, [isVisible, progress, status, isCompleted]);

  const showProgress = (message = 'Starting backup...') => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setStatus(message);
    setProgress(0);
    setIsCompleted(false);
    setIsVisible(true);
  };

  const updateProgress = (newProgress, message) => {
    setProgress(newProgress);
    if (message) setStatus(message);
  };

  const completeBackup = (message = 'Backup completed!') => {
    setProgress(100);
    setStatus(message);
    setIsCompleted(true);
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsCompleted(false);
    }, 2000);
  };

  const hideProgress = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
    setIsCompleted(false);
  };

  const value = {
    isVisible,
    progress,
    status,
    isCompleted,
    showProgress,
    updateProgress,
    completeBackup,
    hideProgress
  };

  return (
    <BackupProgressContext.Provider value={value}>
      {children}
    </BackupProgressContext.Provider>
  );
};

// Cloud icon component
const CloudIcon = ({ className = "", completed = false }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
    />
    {completed && (
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="m9 12 2 2 4-4"
        stroke="#10b981"
      />
    )}
  </svg>
);

// Backup progress overlay component
export const BackupProgressOverlay = () => {
  const { isVisible, progress, status, isCompleted } = useBackupProgress();

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-[280px] transition-all duration-300 ease-in-out">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <CloudIcon 
            className={`w-6 h-6 ${isCompleted ? 'text-green-500' : 'text-blue-500'}`}
            completed={isCompleted}
          />
        </div>
        
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            {status}
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isCompleted ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {Math.round(progress)}%
          </div>
        </div>
        
        {isCompleted && (
          <div className="flex-shrink-0">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
