// Route debugging utility for Phone Shop
// Run: window.routeDebugger.diagnose() in console

window.routeDebugger = {
  // Comprehensive route diagnosis
  diagnose() {
    console.group('🛠️ Route Debugging Diagnosis');
    
    console.log('Current URL:', window.location.href);
    console.log('Current Hash:', window.location.hash);
    console.log('Current Pathname:', window.location.pathname);
    
    // Check React Router elements
    const rootElement = document.getElementById('root');
    console.log('Root element exists:', !!rootElement);
    console.log('Root element content length:', rootElement?.innerHTML?.length || 0);
    
    // Check for router components
    const routerElements = document.querySelectorAll('[data-testid*="router"], .router');
    console.log('Router elements found:', routerElements.length);
    
    // Check for admin page elements
    const adminElements = document.querySelectorAll('[class*="admin"], [id*="admin"]');
    console.log('Admin-related elements:', adminElements.length);
    
    // Check window.api availability
    console.log('Window API available:', !!window.api);
    if (window.api) {
      console.log('API methods count:', Object.keys(window.api).length);
      const criticalMethods = ['getProducts', 'getSales', 'addProduct', 'editProduct'];
      const missingMethods = criticalMethods.filter(method => !window.api[method]);
      console.log('Missing critical methods:', missingMethods);
    }
    
    // Check React error boundaries
    const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
    console.log('Error elements found:', errorElements.length);
    
    console.groupEnd();
  },

  // Force navigate to admin with debugging
  forceAdmin() {
    console.log('🚀 Force navigating to admin...');
    
    // Clear any existing hash first
    if (window.location.hash) {
      console.log('Clearing existing hash:', window.location.hash);
    }
    
    // Set hash to admin
    window.location.hash = '#/admin';
    
    // Wait and check if it worked
    setTimeout(() => {
      console.log('After navigation - Hash:', window.location.hash);
      this.diagnose();
    }, 1000);
  },

  // Check for routing errors
  checkRoutingErrors() {
    console.group('🚨 Checking for Routing Errors');
    
    // Check console for routing-related errors
    const originalError = console.error;
    const errors = [];
    console.error = (...args) => {
      errors.push(args.join(' '));
      originalError.apply(console, args);
    };
    
    // Try to trigger any lazy routing
    setTimeout(() => {
      console.log('Captured errors during check:', errors);
      console.error = originalError;
      console.groupEnd();
    }, 2000);
  },

  // Emergency admin access
  emergencyAdminAccess() {
    console.warn('🚨 Emergency Admin Access - This will reload the page');
    
    // Store intention in localStorage
    localStorage.setItem('emergencyAdminAccess', 'true');
    
    // Reload with hash
    window.location.href = window.location.origin + window.location.pathname + '#/admin';
  },

  // Run all diagnostics
  runAll() {
    this.diagnose();
    this.checkRoutingErrors();
    
    console.log('💡 Available commands:');
    console.log('- window.routeDebugger.forceAdmin() - Force navigate to admin');
    console.log('- window.routeDebugger.emergencyAdminAccess() - Emergency admin access');
    console.log('- window.debugNavigation.goToAdmin() - Debug navigation helper');
  }
};

// Check for emergency admin access flag
if (localStorage.getItem('emergencyAdminAccess') === 'true') {
  console.log('🚨 Emergency admin access detected');
  localStorage.removeItem('emergencyAdminAccess');
  
  setTimeout(() => {
    if (window.location.hash !== '#/admin') {
      window.location.hash = '#/admin';
    }
  }, 1000);
}

// Auto-run diagnostics in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  setTimeout(() => {
    console.log('🛠️ Route debugger loaded. Run window.routeDebugger.runAll() for full diagnosis.');
  }, 3000);
}
