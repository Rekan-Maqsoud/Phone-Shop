// Debug script to check sales data and understand profit calculation issues
const Database = require('better-sqlite3');
const path = require('path');

function debugSalesData() {
  try {
    console.log('🔍 DEBUGGING SALES DATA AND PROFIT CALCULATIONS');
    console.log('='.repeat(60));
    
    // Note: This might fail due to Node.js version mismatch with Electron
    // We'll add debugging to the React app instead
    console.log('❌ Cannot access database from Node.js due to Electron compatibility');
    console.log('📱 Check the Electron app console for detailed debugging logs');
    console.log('');
    console.log('DEBUGGING ADDED TO:');
    console.log('- AdminStatsSidebar.jsx (today\'s profit calculations)');  
    console.log('- SalesHistoryTable.jsx (history profit calculations)');
    console.log('');
    console.log('🔍 WHAT TO CHECK IN CONSOLE:');
    console.log('1. Sale currency vs item product_currency');
    console.log('2. Buying price and selling price values');
    console.log('3. Exchange rate conversions');
    console.log('4. Final profit calculations');
    console.log('');
    console.log('📊 EXPECTED CALCULATIONS:');
    console.log('USD item ($1000) sold in IQD (1100 IQD):');
    console.log('  → Profit = 1100 - (1000 * 1440) = 1100 - 1440000 = -1438900 IQD');
    console.log('  → This should show as 144,000 IQD profit if logic is correct');
    console.log('');
    console.log('IQD item sold in USD:');
    console.log('  → Profit = selling_usd - (buying_iqd * 0.000694)');
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugSalesData();
