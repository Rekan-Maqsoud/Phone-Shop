const dbFactory = require('./database/index.cjs');
const db = dbFactory(); // Initialize the database

console.log('Testing accessory addition...');

// Test adding an accessory
try {
  const testAccessory = {
    name: 'Test Phone Case',
    buying_price: 15,
    stock: 10,
    brand: 'Generic',
    type: 'Case',
    currency: 'USD'
  };

  console.log('Adding test accessory:', testAccessory);
  const result = db.addAccessory(testAccessory);
  console.log('Add accessory result:', result);

  // Fetch all accessories to verify
  const accessories = db.getAccessories();
  console.log('Current accessories count:', accessories.length);
  
  // Find our test accessory
  const addedAccessory = accessories.find(p => p.name === 'Test Phone Case');
  if (addedAccessory) {
    console.log('✅ Accessory added successfully:', addedAccessory);
  } else {
    console.log('❌ Accessory not found in database');
  }

} catch (error) {
  console.error('❌ Error adding accessory:', error.message);
  console.error(error.stack);
}
