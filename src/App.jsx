import React, { useState, useCallback, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LocaleProvider } from './contexts/LocaleContext';
import Cashier from './pages/Cashier';
import Admin from './pages/Admin';
import CloudBackupListener from './components/CloudBackupListener';
import ToastUnified from './components/ToastUnified';
import cloudAuthService from './services/CloudAuthService';

const router = createBrowserRouter([
  {
    path: '/cashier',
    element: <Cashier />,
  },
  {
    path: '/admin',
    element: <Admin />,
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

  // Initialize authentication state on app startup
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const isAuthenticated = await cloudAuthService.checkAuth();
        
        if (isAuthenticated) {
          // Optional: Show a subtle success message
          setTimeout(() => {
            if (window.showGlobalToast) {
              window.showGlobalToast('Cloud backup enabled', 'success', 2000);
            }
          }, 1000);
        } 
      } catch (error) {
        console.error('App: Error during auth initialization:', error);
      } finally {
        setAuthInitialized(true);
      }
    };

    initializeAuth();
  }, []);

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

  return (
    <ThemeProvider>
      <LocaleProvider>
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
      </LocaleProvider>
    </ThemeProvider>
  );
}

export default App;
