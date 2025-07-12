// Test script to create a new sale and verify profit calculation
const createDatabase = require('./database/index.cjs');

try {
  const database = createDatabase('./database/shop.sqlite');
  
  console.log('Creating a test sale...');
  
  // Create a test sale with IQD currency and USD product
  const testSale = {
    items: [
      {
        product_id: 1, // assuming this exists
        quantity: 1,
        selling_price: 216000, // 216,000 IQD = $150 USD
        price: 216000,
        is_accessory: false,
        itemType: 'product'
      }
    ],
    total: 216000,
    currency: 'IQD',
    customer_name: 'Test Customer',
    is_debt: false,
    created_at: new Date().toISOString()
  };
  
  // Save the sale
  const saleId = database.saveSale(testSale);
  console.log('Created sale with ID:', saleId);
  
  // Retrieve the sale to check profit calculation
  const sales = database.getSales();
  const newSale = sales.find(s => s.id === saleId);
  
  if (newSale && newSale.items) {
    console.log('\\nSale details:');
    console.log('Currency:', newSale.currency);
    console.log('Total:', newSale.total);
    
    newSale.items.forEach((item, idx) => {
      console.log(`\\nItem ${idx + 1}:`);
      console.log('  Name:', item.name);
      console.log('  Buying price:', item.buying_price, item.product_currency || 'IQD');
      console.log('  Selling price:', item.selling_price, newSale.currency);
      console.log('  Quantity:', item.quantity);
      console.log('  Stored profit_in_sale_currency:', item.profit_in_sale_currency);
      console.log('  Stored buying_price_in_sale_currency:', item.buying_price_in_sale_currency);
    });
  }
  
} catch (error) {
  console.error('Error:', error.message);
  if (error.message.includes('better-sqlite3')) {
    console.log('\\nNote: Database connection issue. The app might be running or module needs rebuilding.');
  }
}
