// Test script for multi-currency return functionality
const sqlite3 = require('better-sqlite3');
const path = require('path');

// Import the database module
const dbModule = require('./database/index.cjs');

async function testMultiCurrencyReturn() {
  console.log('🧪 Testing Multi-Currency Return Functionality');
  console.log('===============================================');
  
  try {
    // Check what's available in the database module
    console.log('Available database functions:');
    console.log(Object.keys(dbModule));
    
    // Test the basic functionality
    const buyingHistory = dbModule.getBuyingHistory();
    console.log(`\nFound ${buyingHistory.length} buying history entries`);
    
    // Look for multi-currency entries
    const multiEntries = buyingHistory.filter(entry => entry.currency === 'MULTI');
    console.log(`Found ${multiEntries.length} multi-currency entries`);
    
    if (multiEntries.length > 0) {
      const entry = multiEntries[0];
      console.log('\nFirst multi-currency entry:');
      console.log(`- ID: ${entry.id}`);
      console.log(`- Currency: ${entry.currency}`);
      console.log(`- USD Amount: ${entry.multi_currency_usd}`);
      console.log(`- IQD Amount: ${entry.multi_currency_iqd}`);
      console.log(`- Total Price: ${entry.total_price}`);
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testMultiCurrencyReturn();
