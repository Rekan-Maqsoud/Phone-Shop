const db = require('./database/index.cjs');

async function testSaleFixture() {
  console.log('\n🧪 Testing Sale with Products and Accessories...\n');
  
  try {
    // Get some test data
    const products = db.getProducts();
    const accessories = db.getAccessories();
    
    console.log('📦 Available products:', products.length);
    console.log('🔧 Available accessories:', accessories.length);
    
    if (products.length === 0 && accessories.length === 0) {
      console.log('❌ No products or accessories found. Please add some test data first.');
      return;
    }
    
    // Create a test sale with both products and accessories
    const saleItems = [];
    
    if (products.length > 0) {
      const product = products[0];
      console.log(`➕ Adding product: ${product.name} (Stock: ${product.stock})`);
      
      if (product.stock > 0) {
        saleItems.push({
          id: product.id,
          product_id: product.id,
          itemType: 'product',
          name: product.name,
          quantity: 1,
          selling_price: (product.buying_price || 0) * 1.1,
          buying_price: product.buying_price || 0,
          uniqueId: `product_${product.id}`
        });
      }
    }
    
    if (accessories.length > 0) {
      const accessory = accessories[0];
      console.log(`➕ Adding accessory: ${accessory.name} (Stock: ${accessory.stock})`);
      
      if (accessory.stock > 0) {
        saleItems.push({
          id: accessory.id,
          product_id: accessory.id,
          itemType: 'accessory',
          name: accessory.name,
          quantity: 1,
          selling_price: accessory.buying_price || 0,
          buying_price: accessory.buying_price || 0,
          uniqueId: `accessory_${accessory.id}`
        });
      }
    }
    
    if (saleItems.length === 0) {
      console.log('❌ No items with stock available for testing.');
      return;
    }
    
    const totalAmount = saleItems.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
    
    const testSale = {
      items: saleItems,
      total: totalAmount,
      created_at: new Date().toISOString(),
      is_debt: 0,
      customer_name: 'Test Customer',
      currency: 'USD'
    };
    
    console.log(`💰 Test sale total: $${totalAmount}`);
    console.log(`📝 Sale items: ${saleItems.map(item => `${item.name} (${item.itemType})`).join(', ')}`);
    
    // Attempt to save the sale
    const result = db.saveSale(testSale);
    
    if (result) {
      console.log(`✅ Sale saved successfully with ID: ${result}`);
      
      // Verify the sale was saved
      const savedSale = db.getSaleById(result);
      if (savedSale) {
        console.log('✅ Sale verification successful');
        const saleItems = db.getSaleItems(result);
        console.log(`📊 Sale items saved: ${saleItems.length}`);
        
        saleItems.forEach(item => {
          console.log(`   - ${item.name} (${item.is_accessory ? 'accessory' : 'product'}) x${item.quantity}`);
        });
      } else {
        console.log('❌ Sale verification failed - sale not found');
      }
    } else {
      console.log('❌ Sale failed to save');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testSaleFixture();
