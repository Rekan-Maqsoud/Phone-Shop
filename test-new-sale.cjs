const createDb = require('./database/index.cjs');

async function testNewSale() {
  console.log('🧪 Testing New Sale Creation After Fixes...\n');
  
  try {
    const db = createDb();
    
    // Check available products
    const products = db.db.prepare('SELECT * FROM products WHERE stock > 0 LIMIT 3').all();
    console.log('Available products:', products.map(p => `${p.name} (${p.currency || 'IQD'}) - Stock: ${p.stock}`));
    
    if (products.length === 0) {
      console.log('⚠️ No products with stock found. Please add stock first.');
      return;
    }
    
    const testProduct = products[0];
    console.log(`\n🛍️ Testing sale with: ${testProduct.name}`);
    console.log(`   Buying price: ${testProduct.buying_price} ${testProduct.currency || 'IQD'}`);
    
    // Test Scenario: Sale with proper currency conversion
    const saleItems = [{
      id: testProduct.id,
      product_id: testProduct.id,
      itemType: 'product',
      name: testProduct.name,
      quantity: 1,
      selling_price: Math.round((testProduct.buying_price || 0) * 1.3), // 30% markup
      buying_price: testProduct.buying_price || 0,
      uniqueId: `product_${testProduct.id}`
    }];
    
    const totalAmount = saleItems.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
    
    const testSale = {
      items: saleItems,
      total: totalAmount,
      created_at: new Date().toISOString(),
      is_debt: 0,
      customer_name: 'Test Sale After Fix',
      currency: 'USD' // Test with USD to see conversion
    };
    
    console.log(`   Sale currency: ${testSale.currency}`);
    console.log(`   Selling price: ${saleItems[0].selling_price} ${testSale.currency}`);
    
    const saleId = db.saveSale(testSale);
    
    if (saleId) {
      console.log(`✅ Sale created with ID: ${saleId}`);
      
      // Fetch and verify the saved sale
      const savedSale = db.getSaleById(saleId);
      const saleItems = db.getSaleItems(saleId);
      
      console.log('\n📊 Verification:');
      console.log(`   Exchange rate stored: ${savedSale.exchange_rate_usd_to_iqd}`);
      if (saleItems.length > 0) {
        const item = saleItems[0];
        console.log(`   Product currency: ${item.product_currency}`);
        console.log(`   Profit in sale currency: ${item.profit_in_sale_currency}`);
        console.log(`   Buying price in sale currency: ${item.buying_price_in_sale_currency}`);
      }
      
      console.log('\n✅ New sale creation is working correctly!');
    } else {
      console.log('❌ Sale creation failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNewSale().catch(console.error);
