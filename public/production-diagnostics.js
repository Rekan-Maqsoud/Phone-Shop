// Production Diagnostics Tool
// Provides debugging capabilities for production environments

console.log('🔍 Production Diagnostics Loaded');

// Global diagnostics object
window.__diagnostics = {
  
  // Check API connectivity
  checkAPI: async function() {
    const checks = {
      apiExists: !!window.api,
      getProducts: typeof window.api?.getProducts === 'function',
      getSales: typeof window.api?.getSales === 'function',
      getAccessories: typeof window.api?.getAccessories === 'function',
      getSettings: typeof window.api?.getSettings === 'function'
    };
    
    console.log('🔌 API Connectivity Check:', checks);
    
    // Test actual API calls
    if (checks.apiExists) {
      try {
        const testResults = {};
        
        if (checks.getProducts) {
          const products = await window.api.getProducts();
          testResults.products = Array.isArray(products) ? products.length : 'Invalid';
        }
        
        if (checks.getSales) {
          const sales = await window.api.getSales();
          testResults.sales = Array.isArray(sales) ? sales.length : 'Invalid';
        }
        
        if (checks.getAccessories) {
          const accessories = await window.api.getAccessories();
          testResults.accessories = Array.isArray(accessories) ? accessories.length : 'Invalid';
        }
        
        console.log('📊 API Test Results:', testResults);
        return { checks, testResults };
        
      } catch (error) {
        console.error('❌ API Test Failed:', error);
        return { checks, error: error.message };
      }
    }
    
    return { checks };
  },
  
  // Check React Context availability
  checkContexts: function() {
    const contexts = {
      dataContext: !!window.React?.useContext,
      locale: document.querySelector('[data-locale]')?.getAttribute('data-locale'),
      theme: document.querySelector('[data-theme]')?.getAttribute('data-theme')
    };
    
    console.log('⚛️ React Context Check:', contexts);
    return contexts;
  },
  
  // Performance metrics
  getPerformance: function() {
    if (!window.performance) {
      console.warn('⚠️ Performance API not available');
      return null;
    }
    
    const navigation = window.performance.getEntriesByType('navigation')[0];
    const metrics = {
      loadTime: navigation?.loadEventEnd - navigation?.navigationStart,
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.navigationStart,
      firstPaint: window.performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: window.performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
      memoryUsage: window.performance.memory ? {
        used: Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(window.performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(window.performance.memory.jsHeapSizeLimit / 1024 / 1024)
      } : 'Not available'
    };
    
    console.log('📈 Performance Metrics (ms):', metrics);
    return metrics;
  },
  
  // Error tracking
  trackErrors: function() {
    const errors = [];
    
    window.addEventListener('error', (event) => {
      const error = {
        timestamp: new Date().toISOString(),
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      };
      errors.push(error);
      console.error('🚨 JavaScript Error:', error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      const error = {
        timestamp: new Date().toISOString(),
        type: 'unhandledrejection',
        reason: event.reason
      };
      errors.push(error);
      console.error('🚨 Unhandled Promise Rejection:', error);
    });
    
    console.log('🔍 Error tracking enabled');
    return () => errors;
  },
  
  // Full diagnostic report
  fullReport: async function() {
    console.log('🔍 Running Full Diagnostic Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      api: await this.checkAPI(),
      contexts: this.checkContexts(),
      performance: this.getPerformance(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
    
    console.log('📋 Full Diagnostic Report:', report);
    return report;
  }
};

// Auto-start error tracking
window.__diagnostics.getErrors = window.__diagnostics.trackErrors();

console.log('🔍 Production Diagnostics Ready! Use window.__diagnostics for debugging.');
