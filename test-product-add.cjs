const dbFactory = require('./database/index.cjs');
const db = dbFactory(); // Initialize the database

console.log('Testing product addition...');

// Test adding a product
try {
  const testProduct = {
    name: 'Test iPhone 15',
    buying_price: 1000,
    stock: 5,
    ram: '8GB',
    storage: '256GB',
    model: 'iPhone 15',
    category: 'phones',
    currency: 'USD'
  };

  console.log('Adding test product:', testProduct);
  const result = db.addProduct(testProduct);
  console.log('Add product result:', result);

  // Fetch all products to verify
  const products = db.getProducts();
  console.log('Current products count:', products.length);
  
  // Find our test product
  const addedProduct = products.find(p => p.name === 'Test iPhone 15');
  if (addedProduct) {
    console.log('✅ Product added successfully:', addedProduct);
  } else {
    console.log('❌ Product not found in database');
  }

} catch (error) {
  console.error('❌ Error adding product:', error.message);
  console.error(error.stack);
}
