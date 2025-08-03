// Route Debugger for navigation debugging
// Provides insights into React Router navigation and route changes

console.log('🛣️ Route Debugger Loaded');

// Global route debugging object
window.__routeDebugger = {
  
  // Current route information
  getCurrentRoute: function() {
    const route = {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      href: window.location.href,
      title: document.title
    };
    
    console.log('📍 Current Route:', route);
    return route;
  },
  
  // History navigation debugging
  trackNavigation: function() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(state, title, url) {
      console.log('🚀 Navigation (pushState):', { state, title, url, from: window.location.href });
      return originalPushState.apply(history, arguments);
    };
    
    history.replaceState = function(state, title, url) {
      console.log('🔄 Navigation (replaceState):', { state, title, url, from: window.location.href });
      return originalReplaceState.apply(history, arguments);
    };
    
    window.addEventListener('popstate', (event) => {
      console.log('⬅️ Navigation (popstate):', { 
        state: event.state, 
        url: window.location.href,
        event 
      });
    });
    
    console.log('🛣️ Navigation tracking enabled');
  },
  
  // React Router specific debugging
  debugReactRouter: function() {
    // Try to find React Router elements
    const routerElements = document.querySelectorAll('[data-react-router]');
    const linkElements = document.querySelectorAll('a[href^="/"]');
    
    const info = {
      routerElements: routerElements.length,
      internalLinks: linkElements.length,
      currentPath: window.location.pathname,
      reactRouterPresent: !!window.React || !!document.querySelector('[data-reactroot]')
    };
    
    console.log('⚛️ React Router Debug Info:', info);
    
    // Add click listeners to internal links for debugging
    linkElements.forEach((link, index) => {
      if (!link.dataset.debugged) {
        link.dataset.debugged = 'true';
        link.addEventListener('click', (e) => {
          console.log('🔗 Link clicked:', {
            href: link.href,
            pathname: link.pathname,
            text: link.textContent.trim(),
            event: e
          });
        });
      }
    });
    
    return info;
  },
  
  // Route validation
  validateRoutes: function() {
    const validRoutes = ['/', '/admin', '/cashier'];
    const currentPath = window.location.pathname;
    
    const validation = {
      currentPath,
      isValid: validRoutes.includes(currentPath) || validRoutes.some(route => currentPath.startsWith(route)),
      validRoutes,
      suggestions: validRoutes.filter(route => route.includes(currentPath.split('/')[1]))
    };
    
    console.log('✅ Route Validation:', validation);
    return validation;
  },
  
  // Navigation helpers
  goTo: function(path) {
    console.log(`🎯 Navigating to: ${path}`);
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  },
  
  // Full route report
  fullReport: function() {
    console.log('🛣️ Running Full Route Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      current: this.getCurrentRoute(),
      validation: this.validateRoutes(),
      reactRouter: this.debugReactRouter(),
      history: {
        length: window.history.length,
        state: window.history.state
      }
    };
    
    console.log('📋 Full Route Report:', report);
    return report;
  }
};

// Auto-start navigation tracking
window.__routeDebugger.trackNavigation();

console.log('🛣️ Route Debugger Ready! Use window.__routeDebugger for navigation debugging.');
