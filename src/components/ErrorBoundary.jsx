import React from 'react';
import { useLocale } from '../contexts/LocaleContext';

// Wrapper function component to access context
function ErrorBoundaryWithTranslations({ children, fallback }) {
  const { t } = useLocale();
  
  return (
    <ErrorBoundaryClass t={t} fallback={fallback}>
      {children}
    </ErrorBoundaryClass>
  );
}

class ErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('🔥 ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log to external service if available (optional)
    if (window.api?.logError) {
      window.api.logError({
        error: error.toString(),
        errorInfo: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }).catch(console.error);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, retryCount } = this.state;
      const { fallback: CustomFallback, t } = this.props;

      // If a custom fallback is provided, use it
      if (CustomFallback) {
        return (
          <CustomFallback 
            error={error}
            errorInfo={errorInfo}
            onRetry={this.handleRetry}
            onReload={this.handleReload}
            retryCount={retryCount}
          />
        );
      }

      // Default error UI - Fixed for full screen
      return (
        <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-2xl w-full">
            <div className="text-center mb-6">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {t?.applicationError || 'Application Error'}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {t?.unexpectedError || 'The application encountered an unexpected error. Don\'t worry, your data is safe.'}
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <button
                onClick={this.handleRetry}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                disabled={retryCount >= 3}
              >
                {retryCount >= 3 ? (t?.maxRetriesReached || 'Max retries reached') : `${t?.tryAgain || 'Try Again'} ${retryCount > 0 ? `(${retryCount}/3)` : ''}`}
              </button>
              
              <button
                onClick={this.handleReload}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {t?.reloadApplication || 'Reload Application'}
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {t?.goToHome || 'Go to Home'}
              </button>
            </div>

            {import.meta.env.DEV && error && (
              <details className="mt-6">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                  {t?.errorDetailsDev || 'Error Details (Development Only)'}
                </summary>
                <div className="mt-3 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <h3 className="font-medium text-red-600 mb-2">{t?.errorLabel || 'Error:'}</h3>
                  <pre className="text-xs text-red-600 mb-4 overflow-auto">
                    {error.toString()}
                  </pre>
                  
                  {errorInfo && (
                    <>
                      <h3 className="font-medium text-red-600 mb-2">{t?.componentStack || 'Component Stack:'}</h3>
                      <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                        {errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t?.contactSupport || 'If this problem persists, please contact support with the error details above.'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryWithTranslations;
