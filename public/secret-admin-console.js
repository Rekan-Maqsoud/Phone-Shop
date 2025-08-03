// Secret Admin Console for authorized administrators
// This script provides balance adjustment tools for debugging and emergency fixes

// Only expose commands in admin context
if (window.location.pathname.includes('/admin')) {
  
  // Global admin commands
  window.__showSecretCommands = function() {
    console.log(`
🔧 Secret Admin Console Commands:
- __getShopBalances() - Check current shop balances
- __setShopBalance(currency, amount) - Set shop balance (USD/IQD)
- __resetShopBalances() - Reset all balances to 0
- __exportData() - Export all data to console
- __getSystemInfo() - Get system information
    `);
  };

  window.__getShopBalances = async function() {
    try {
      if (window.api && window.api.getSettings) {
        const settings = await window.api.getSettings();
        console.log('💰 Current Shop Balances:', {
          USD: settings.shopBalanceUSD || 0,
          IQD: settings.shopBalanceIQD || 0
        });
        return settings;
      } else {
        console.warn('⚠️ API not available');
      }
    } catch (error) {
      console.error('❌ Error getting balances:', error);
    }
  };

  window.__setShopBalance = async function(currency, amount) {
    if (!currency || typeof amount !== 'number') {
      console.error('❌ Usage: __setShopBalance("USD", 1000) or __setShopBalance("IQD", 1500000)');
      return;
    }
    
    try {
      if (window.api && window.api.updateShopBalance) {
        await window.api.updateShopBalance(currency, amount);
        console.log(`✅ ${currency} balance set to ${amount}`);
        await window.__getShopBalances();
      } else {
        console.warn('⚠️ API not available');
      }
    } catch (error) {
      console.error('❌ Error setting balance:', error);
    }
  };

  window.__resetShopBalances = async function() {
    try {
      await window.__setShopBalance('USD', 0);
      await window.__setShopBalance('IQD', 0);
      console.log('🔄 All balances reset to 0');
    } catch (error) {
      console.error('❌ Error resetting balances:', error);
    }
  };

  window.__exportData = async function() {
    try {
      if (window.api) {
        const products = await window.api.getProducts();
        const accessories = await window.api.getAccessories();
        const sales = await window.api.getSales();
        const settings = await window.api.getSettings();
        
        const exportData = {
          timestamp: new Date().toISOString(),
          products,
          accessories,
          sales,
          settings
        };
        
        console.log('📦 Export Data:', exportData);
        return exportData;
      } else {
        console.warn('⚠️ API not available');
      }
    } catch (error) {
      console.error('❌ Error exporting data:', error);
    }
  };

  window.__getSystemInfo = function() {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      apiAvailable: !!window.api
    };
    
    
    return info;
  };
  
}