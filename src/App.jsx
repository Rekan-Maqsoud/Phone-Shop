import React, { useState, useCallback, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LocaleProvider, useLocale } from './contexts/LocaleContext';
import { DataProvider } from './contexts/DataContext';
import { SoundProvider } from './contexts/SoundContext';
import { BackupProgressProvider, BackupProgressOverlay } from './contexts/BackupProgressContext';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import ErrorBoundary from './components/ErrorBoundary';
import Cashier from './pages/Cashier';
import Admin from './pages/Admin';
import AdminTestPage from './components/AdminTestPage';
import ToastUnified from './components/ToastUnified';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import cloudAuthService from './services/CloudAuthService';

// Error boundary wrapper for route components
class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`Error in ${this.props.routeName}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center max-w-2xl w-full">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              {this.props.routeName} Loading Error
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg">
              Something went wrong while loading this page. Please try again.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-lg font-medium"
              >
                Reload Application
              </button>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="w-full px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-lg font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const { t } = useLocale();
  const [globalToast, setGlobalToast] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Global keyboard shortcuts
  useKeyboardNavigation({
    enabled: appReady,
    shortcuts: {
      'f1': () => setShowKeyboardShortcuts(true),
      'ctrl+shift+k': () => setShowKeyboardShortcuts(true),
    }
  });

  // Global error handling for production
  useEffect(() => {
    const handleGlobalError = (event) => {
      console.error('🔥 Global Error:', event.error);
      
      // Show user-friendly error message
      if (window.showGlobalToast) {
        window.showGlobalToast(
          'An unexpected error occurred. The application will continue running.', 
          'error', 
          5000
        );
      }
      
      // Prevent the error from crashing the app
      event.preventDefault();
    };

    const handleUnhandledRejection = (event) => {
      console.error('🔥 Unhandled Promise Rejection:', event.reason);
      
      // Show user-friendly error message
      if (window.showGlobalToast) {
        window.showGlobalToast(
          'A background operation failed. Some features may not work correctly.', 
          'warning', 
          5000
        );
      }
      
      // Prevent the error from crashing the app
      event.preventDefault();
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Initialize authentication state on app startup
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Initialize CloudAuthService
        const isAuthenticated = await cloudAuthService.initializeAuth();
        
        // Give it a bit more time to ensure proper initialization
        await new Promise(resolve => setTimeout(resolve, 500));
        
        
      } catch (error) {
        console.error('[App] Error during auth initialization:', error);
      } finally {
        setAuthInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  // Enhanced data readiness check with better fallbacks
  useEffect(() => {
    const checkDataReady = () => {
      // More comprehensive API check
      if (window.api && 
          typeof window.api.getProducts === 'function' &&
          typeof window.api.getSales === 'function' &&
          typeof window.api.addProduct === 'function') {
        setDataInitialized(true);
        return true;
      }
      return false;
    };

    if (checkDataReady()) {
      return;
    }

    // Poll for data readiness with exponential backoff
    let attempts = 0;
    const maxAttempts = 150; // 15 seconds max
    
    const checkWithBackoff = () => {
      attempts++;
      if (checkDataReady()) {
        return;
      }
      
      if (attempts >= maxAttempts) {
        console.warn('[App] API not ready after maximum attempts, proceeding anyway');
        setDataInitialized(true);
        return;
      }
      
      // Exponential backoff: start at 100ms, max 1000ms
      const delay = Math.min(100 * Math.pow(1.1, attempts), 1000);
      setTimeout(checkWithBackoff, delay);
    };

    checkWithBackoff();
  }, []);

  // Set app as ready when both auth and data are initialized
  useEffect(() => {
    if (authInitialized && dataInitialized && !appReady) {
      setAppReady(true);
      
      // Show authentication status notifications after app is ready
      setTimeout(async () => {
        if (window.showGlobalToast) {
          // Double check authentication status
          const isAuthenticated = await cloudAuthService.checkAuth();
          if (isAuthenticated) {
            const user = await cloudAuthService.getCurrentUser();
            window.showGlobalToast(`Cloud backup enabled for ${user?.email || 'user'}`, 'success', 3000);
          } else {
            window.showGlobalToast('You are not logged in. Changes won\'t be saved to cloud.', 'warning', 5000);
          }
        }
      }, 2000);
    }
  }, [authInitialized, dataInitialized, appReady]);

  // Expose global toast setter and navigation helper
  useEffect(() => {
    window.showGlobalToast = (msg, type = 'info', duration = 3000) => {
      setGlobalToast({ msg, type, duration });
    };
    
    return () => {
      window.showGlobalToast = undefined;
      window.debugNavigation = undefined;
    };
  }, []);

  const handleCloseToast = useCallback(() => setGlobalToast(null), []);

  // Show loading screen while app is initializing
  if (!appReady) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-800 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <h2 className="text-white text-2xl font-bold mb-2">{t?.mobileRoma || 'Mobile Roma'}</h2>
          <p className="text-gray-300 text-lg mb-4">
            {!authInitialized ? 'Initializing authentication...' : 
             !dataInitialized ? 'Loading data...' : 'Getting ready...'}
          </p>
          <div className="mt-6 w-80 bg-gray-700 rounded-full h-3 mx-auto">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
              style={{ 
                width: `${(authInitialized ? 50 : 0) + (dataInitialized ? 50 : 0)}%` 
              }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  // CRITICAL: Wrap the entire application in ErrorBoundary for comprehensive error handling
  return (
    <div className="h-full w-full bg-gray-100">
      <HashRouter>
        <Routes>
          <Route 
            path="/cashier" 
            element={
              <RouteErrorBoundary routeName="Cashier">
                <Cashier />
              </RouteErrorBoundary>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <RouteErrorBoundary routeName="Admin">
                <Admin />
              </RouteErrorBoundary>
            } 
          />
          <Route path="/" element={<Navigate to="/cashier" replace />} />
          <Route path="*" element={<Navigate to="/cashier" replace />} />
        </Routes>
      </HashRouter>
      <BackupProgressOverlay />
      {globalToast && (
        <ToastUnified
          message={globalToast.msg}
          type={globalToast.type}
          duration={globalToast.duration}
          onClose={handleCloseToast}
        />
      )}
      <KeyboardShortcutsModal
        show={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
        t={t}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <ErrorBoundary>
          <SoundProvider>
            <DataProvider>
              <BackupProgressProvider>
                <AppContent />
              </BackupProgressProvider>
            </DataProvider>
          </SoundProvider>
        </ErrorBoundary>
      </LocaleProvider>
    </ThemeProvider>
  );
}

export default App;
