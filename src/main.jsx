import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Disable React DevTools in production
if (import.meta.env.PROD) {
  if (typeof window !== 'undefined') {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      isDisabled: true,
      supportsFiber: true,
      inject: () => {},
      onCommitFiberRoot: () => {},
      onCommitFiberUnmount: () => {},
    };
  }
}

// Add error boundary for production - no translations here since LocaleProvider is inside App
class MainErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Boundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Log to console for debugging
    console.group('🔥 Application Error Details');
    console.error('Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error Boundary Stack:', error.stack);
    console.groupEnd();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Application Error
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Something went wrong. Please refresh the page to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Refresh Page
            </button>
            {!import.meta.env.PROD && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">Error Details (Dev Only)</summary>
                <pre className="mt-2 text-xs text-gray-700 dark:text-gray-300 overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Use consistent rendering approach
const root = createRoot(document.getElementById('root'));

if (import.meta.env.PROD) {
  // Production: No StrictMode, with error boundary
  root.render(
    <MainErrorBoundary>
      <App />
    </MainErrorBoundary>
  );
} else {
  // Development: StrictMode with error boundary
  root.render(
    <StrictMode>
      <MainErrorBoundary>
        <App />
      </MainErrorBoundary>
    </StrictMode>
  );
}
