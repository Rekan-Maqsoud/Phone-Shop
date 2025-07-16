// Production diagnostic tool for Phone Shop Admin
// Access via browser console: window.phoneDiagnostics

window.phoneDiagnostics = {
  // Check app initialization state
  checkInitialization() {
    console.group('🔧 Phone Shop Diagnostics');
    
    console.log('Window API availability:', {
      hasWindowApi: !!window.api,
      apiMethods: window.api ? Object.keys(window.api).length : 0,
      criticalMethods: window.api ? {
        getProducts: typeof window.api.getProducts,
        getSales: typeof window.api.getSales,
        addProduct: typeof window.api.addProduct,
        editProduct: typeof window.api.editProduct,
      } : 'N/A'
    });
    
    console.log('React components availability:', {
      hasReactRoot: !!document.getElementById('root'),
      hasReactDevTools: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
    });
    
    console.log('Navigation state:', {
      currentPath: window.location.hash || window.location.pathname,
      canNavigate: typeof window.history?.pushState === 'function'
    });
    
    console.groupEnd();
  },

  // Test database connectivity
  async testDatabase() {
    console.group('🗄️ Database Connectivity Test');
    
    try {
      if (!window.api?.getProducts) {
        throw new Error('getProducts API not available');
      }
      
      const products = await window.api.getProducts();
      console.log('✅ Products fetch successful:', Array.isArray(products) ? `${products.length} items` : 'Invalid data');
      
      if (window.api?.getSales) {
        const sales = await window.api.getSales();
        console.log('✅ Sales fetch successful:', Array.isArray(sales) ? `${sales.length} items` : 'Invalid data');
      }
      
      console.log('✅ Database connectivity: OK');
      
    } catch (error) {
      console.error('❌ Database connectivity test failed:', error);
    }
    
    console.groupEnd();
  },

  // Force reload admin section
  forceReloadAdmin() {
    console.log('🔄 Force reloading admin section...');
    
    if (window.location.hash !== '#/admin') {
      window.location.hash = '#/admin';
    } else {
      window.location.reload();
    }
  },

  // Get current app state
  getAppState() {
    return {
      url: window.location.href,
      hash: window.location.hash,
      apiAvailable: !!window.api,
      apiMethods: window.api ? Object.keys(window.api) : [],
      reactRoot: !!document.getElementById('root'),
      timestamp: new Date().toISOString()
    };
  },

  // Emergency recovery
  emergencyRecovery() {
    console.warn('🚨 Attempting emergency recovery...');
    
    // Clear any problematic state
    try {
      localStorage.removeItem('adminError');
      sessionStorage.clear();
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    
    // Navigate to cashier as fallback
    window.location.hash = '#/cashier';
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  },

  // Show diagnostic info
  showInfo() {
    this.checkInitialization();
    console.log('📊 Current app state:', this.getAppState());
    console.log('💡 Available commands:', Object.keys(this).filter(key => typeof this[key] === 'function'));
  }
};

// Auto-run basic diagnostics on load in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  setTimeout(() => {
    console.log('🔧 Phone Shop diagnostics loaded. Run window.phoneDiagnostics.showInfo() for details.');
  }, 2000);
}
