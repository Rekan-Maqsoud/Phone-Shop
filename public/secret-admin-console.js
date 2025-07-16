// Secret Admin Console Commands
// This file creates global console commands for admin-only operations
// To use these commands, open the browser developer console (F12) and type the commands

// Prevent multiple loading
if (!window.__secretAdminLoaded) {
  window.__secretAdminLoaded = true;

(function() {
  'use strict';

  // Helper function to check if we're on admin page
  function checkAdminPage() {
    return window.location.pathname.includes('/admin') || window.location.hash.includes('#/admin');
  }

  // Secret balance change function - only accessible via console
  window.__setShopBalance = async function(currency, amount) {
    // Security check - only allow in admin context
    if (!checkAdminPage()) {
      console.error('❌ Secret commands only available in admin panel');
      return;
    }
    
    if (typeof currency !== 'string' || !['USD', 'IQD'].includes(currency.toUpperCase())) {
      console.error('Invalid currency. Use "USD" or "IQD"');
      return;
    }
    
    if (typeof amount !== 'number' || isNaN(amount)) {
      console.error('Invalid amount. Must be a number');
      return;
    }
    
    const curr = currency.toUpperCase();
    
    try {
      const result = await window.api?.setBalance?.(curr, amount);
      if (result) {
        // Trigger a refresh of the balance display
        if (window.adminRefreshBalances) {
          await window.adminRefreshBalances();
        }
      } else {
        console.error('❌ Failed to set balance. API not available or operation failed.');
      }
    } catch (error) {
      console.error('❌ Error setting balance:', error);
    }
  };

  // Helper function to get current balances
  window.__getShopBalances = async function() {
    if (!checkAdminPage()) {
      console.error('❌ Secret commands only available in admin panel');
      return;
    }
    
    try {
      const balances = await window.api?.getBalances?.();
      if (balances) {
        return balances;
      } else {
        console.error('❌ Could not retrieve balances. API not available.');
        return null;
      }
    } catch (error) {
      console.error('❌ Error retrieving balances:', error);
      return null;
    }
  };

  // Add balance adjustment function (add/subtract from current balance)
  window.__adjustShopBalance = async function(currency, amount) {
    if (!checkAdminPage()) {
      console.error('❌ Secret commands only available in admin panel');
      return;
    }
    
    if (typeof currency !== 'string' || !['USD', 'IQD'].includes(currency.toUpperCase())) {
      console.error('Invalid currency. Use "USD" or "IQD"');
      return;
    }
    
    if (typeof amount !== 'number' || isNaN(amount)) {
      console.error('Invalid amount. Must be a number');
      return;
    }
    
    const curr = currency.toUpperCase();
    
    try {
      const result = await window.api?.updateBalance?.(curr, amount);
      if (result) {
        // Show new balance
        await window.__getShopBalances();
        // Trigger a refresh of the balance display
        if (window.adminRefreshBalances) {
          await window.adminRefreshBalances();
        }
      } else {
        console.error('❌ Failed to adjust balance. API not available or operation failed.');
      }
    } catch (error) {
      console.error('❌ Error adjusting balance:', error);
    }
  };

  // Show help for available secret commands
  window.__showSecretCommands = function() {
    console.log('    Regular cashiers should not have access to these commands.');
  };

  // Only log the availability message in admin pages
  if (checkAdminPage()) {
    console.log('🔒 Secret admin commands available. Type __showSecretCommands() for help.');
  }

  // Re-check when the route changes (for SPA navigation)
  let lastHash = window.location.hash;
  setInterval(() => {
    if (window.location.hash !== lastHash) {
      lastHash = window.location.hash;
      if (checkAdminPage()) {
        console.log('🔒 Secret admin commands available. Type __showSecretCommands() for help.');
      }
    }
  }, 1000);

})();

} // End of __secretAdminLoaded check
