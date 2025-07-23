// Test script for multi-currency return functionality
const sqlite3 = require('better-sqlite3');
const path = require('path');

// Import the database module
const dbModule = require('./database/index.cjs');

async function testMultiCurrencyReturn() {
  console.log('🧪 Testing Multi-Currency Return Functionality');
  console.log('===============================================');
  
  try {
    // Test 1: Add a multi-currency purchase
    console.log('\n✅ Test 1: Adding multi-currency purchase');
    const purchaseResult = await dbModule.addDirectPurchaseMultiCurrency({
      item_name: 'Test Multi Purchase',
      quantity: 1,
      supplier: 'Test Supplier',
      date: new Date().toISOString(),
      usdAmount: 100,
      iqdAmount: 50000
    });
    console.log('Purchase result:', purchaseResult);
    
    // Test 2: Get buying history to see the entry
    console.log('\n✅ Test 2: Checking buying history');
    const buyingHistory = dbModule.getBuyingHistory();
    const multiEntry = buyingHistory.find(entry => entry.currency === 'MULTI');
    if (multiEntry) {
      console.log('Multi-currency entry found:');
      console.log(`- ID: ${multiEntry.id}`);
      console.log(`- Currency: ${multiEntry.currency}`);
      console.log(`- USD Amount: ${multiEntry.multi_currency_usd}`);
      console.log(`- IQD Amount: ${multiEntry.multi_currency_iqd}`);
      
      // Test 3: Return the purchase
      console.log('\n✅ Test 3: Returning multi-currency purchase');
      const returnResult = dbModule.returnBuyingHistoryEntry(multiEntry.id);
      console.log('Return result:', returnResult);
      
      if (returnResult.success) {
        console.log(`✅ Successfully returned purchase!`);
        console.log(`- USD Refunded: $${returnResult.returnedAmountUSD}`);
        console.log(`- IQD Refunded: د.ع${returnResult.returnedAmountIQD}`);
        console.log(`- Stock Issues: ${returnResult.hasStockIssues ? 'Yes' : 'No'}`);
      } else {
        console.log('❌ Return failed');
      }
    } else {
      console.log('❌ No multi-currency entry found');
    }
    
    console.log('\n🎉 Multi-currency return test completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testMultiCurrencyReturn();
