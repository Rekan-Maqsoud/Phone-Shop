import React, { useState, useCallback, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LocaleProvider } from './contexts/LocaleContext';
import { DataProvider } from './contexts/DataContext';
import Cashier from './pages/Cashier';
import Admin from './pages/Admin';
import CloudBackupListener from './components/CloudBackupListener';
import ToastUnified from './components/ToastUnified';
import cloudAuthService from './services/CloudAuthService';

// Add error handling for router
const router = createBrowserRouter([
  {
    path: '/cashier',
    element: <Cashier />,
    errorElement: <div className="p-4 text-red-500">Error loading Cashier page</div>
  },
  {
    path: '/admin',
    element: <Admin />,
    errorElement: <div className="p-4 text-red-500">Error loading Admin page</div>
  },
  {
    path: '/',
    element: <Navigate to="/cashier" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/cashier" replace />,
  },
], {
  future: {
    v7_relativeSplatPath: true,
    v7_startTransition: true,
  },
});

function App() {
  const [globalToast, setGlobalToast] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [appReady, setAppReady] = useState(false);

  // Initialize authentication state on app startup
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('App: Initializing authentication...');
        // Authentication is now initialized in CloudAuthService constructor
        // No need for additional network calls here
        console.log('App: Authentication initialization complete');
        
      } catch (error) {
        console.error('App: Error during auth initialization:', error);
      } finally {
        setAuthInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  // Check when data is ready from DataContext
  useEffect(() => {
    const checkDataReady = () => {
      // Check if window.api is available and basic data fetching capabilities exist
      if (window.api && window.api.getProducts) {
        console.log('App: Data context ready');
        setDataInitialized(true);
        return true;
      }
      return false;
    };

    if (checkDataReady()) {
      return;
    }

    // Poll for data readiness
    const interval = setInterval(() => {
      if (checkDataReady()) {
        clearInterval(interval);
      }
    }, 100);

    // Timeout after 15 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      console.log('App: Data initialization timeout, proceeding anyway');
      setDataInitialized(true);
    }, 15000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Set app as ready when both auth and data are initialized
  useEffect(() => {
    if (authInitialized && dataInitialized && !appReady) {
      console.log('App: All systems ready, showing app');
      setAppReady(true);
      
      // Show authentication status notifications after app is ready
      setTimeout(() => {
        if (window.showGlobalToast) {
          const isAuthenticated = cloudAuthService.isAuthenticated?.();
          if (isAuthenticated) {
            window.showGlobalToast('Cloud backup enabled', 'success', 2000);
          } else if (!cloudAuthService._offlineMode) {
            window.showGlobalToast('You are not logged in. Changes won\'t be saved to cloud.', 'warning', 5000);
          }
        }
      }, 1000);
    }
  }, [authInitialized, dataInitialized, appReady]);

  // Expose global toast setter
  useEffect(() => {
    window.showGlobalToast = (msg, type = 'info', duration = 3000) => {
      setGlobalToast({ msg, type, duration });
    };
    return () => {
      window.showGlobalToast = undefined;
    };
  }, []);

  const handleCloseToast = useCallback(() => setGlobalToast(null), []);

  // Show loading screen while app is initializing
  if (!appReady) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-white text-xl font-semibold mb-2">Mobile Roma</h2>
          <p className="text-gray-400">
            {!authInitialized ? 'Initializing authentication...' : 
             !dataInitialized ? 'Loading data...' : 'Getting ready...'}
          </p>
          <div className="mt-4 w-64 bg-gray-700 rounded-full h-2 mx-auto">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(authInitialized ? 50 : 0) + (dataInitialized ? 50 : 0)}%` 
              }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <LocaleProvider>
        <DataProvider>
          <CloudBackupListener />
          <div className="min-h-screen bg-gray-100">
            <RouterProvider router={router} />
            {globalToast && (
              <ToastUnified
                message={globalToast.msg}
                type={globalToast.type}
                duration={globalToast.duration}
                onClose={handleCloseToast}
              />
            )}
          </div>
        </DataProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

export default App;
