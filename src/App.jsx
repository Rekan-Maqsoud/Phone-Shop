import React, { useState, useCallback, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LocaleProvider } from './contexts/LocaleContext';
import { DataProvider } from './contexts/DataContext';
import { SoundProvider } from './contexts/SoundContext';
import { BackupProgressProvider, BackupProgressOverlay } from './contexts/BackupProgressContext';
import Cashier from './pages/Cashier';
import Admin from './pages/Admin';
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

  // Check when data is ready from DataContext
  useEffect(() => {
    const checkDataReady = () => {
      // Check if window.api is available and basic data fetching capabilities exist
      if (window.api && window.api.getProducts) {
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
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-800 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <h2 className="text-white text-2xl font-bold mb-2">Mobile Roma</h2>
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

  return (
    <ThemeProvider>
      <LocaleProvider>
        <SoundProvider>
          <DataProvider>
            <BackupProgressProvider>
              <div className="min-h-screen bg-gray-100">
                <RouterProvider router={router} />
                <BackupProgressOverlay />
                {globalToast && (
                  <ToastUnified
                    message={globalToast.msg}
                    type={globalToast.type}
                    duration={globalToast.duration}
                    onClose={handleCloseToast}
                  />
                )}
              </div>
            </BackupProgressProvider>
          </DataProvider>
        </SoundProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

export default App;
