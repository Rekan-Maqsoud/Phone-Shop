// Simple script to check sales data without using better-sqlite3
import fs from 'fs';

// Read the database file as binary and look for patterns
const dbPath = './database/shop.sqlite';

if (fs.existsSync(dbPath)) {
  console.log('Database file exists');
  
  // Let's use the app's existing logic if possible
  try {
    // Try to just analyze the logic without running database queries
    console.log('\nAnalyzing exchange rates:');
    
    // Frontend exchange rates
    const frontendRates = {
      USD_TO_IQD: 1440,
      IQD_TO_USD: 1 / 1440
    };
    
    // Backend exchange rates (from database/index.cjs)
    const backendRates = {
      USD_TO_IQD: 1440,
      IQD_TO_USD: 1 / 1440
    };
    
    console.log('Frontend rates:', frontendRates);
    console.log('Backend rates:', backendRates);
    
    // Simulate the problematic calculation
    console.log('\nSimulating problematic calculation:');
    
    // Example: IQD sale with USD product
    const saleCurrency = 'IQD';
    const productCurrency = 'USD';
    const buyingPrice = 100; // $100 USD
    const sellingPrice = 150000; // 150,000 IQD
    const quantity = 1;
    
    console.log(`Buying price: ${buyingPrice} ${productCurrency}`);
    console.log(`Selling price: ${sellingPrice} ${saleCurrency}`);
    
    // Conversion logic from SaleDetailsModal
    let buyingPriceInSaleCurrency = buyingPrice;
    if (saleCurrency !== productCurrency) {
      if (saleCurrency === 'IQD' && productCurrency === 'USD') {
        buyingPriceInSaleCurrency = buyingPrice * frontendRates.USD_TO_IQD;
      }
    }
    
    const profit = (sellingPrice - buyingPriceInSaleCurrency) * quantity;
    
    console.log(`Buying price converted to ${saleCurrency}: ${buyingPriceInSaleCurrency}`);
    console.log(`Calculated profit: ${profit} ${saleCurrency}`);
    
    // This should be reasonable, let's see if we get the crazy number
    console.log(`Expected profit range: should be around 6,000-10,000 IQD for this example`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
} else {
  console.log('Database file not found');
}
