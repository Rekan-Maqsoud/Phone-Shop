// Test script to verify price averaging works correctly
const Database = require('better-sqlite3');
const path = require('path');

// Import database modules
const dbFactory = require('./database/index.cjs');

async function testPriceAveraging() {
  console.log('🧪 Testing price averaging for products and accessories...\n');
  
  // Create test database
  const testDbPath = path.join(__dirname, 'test-price-averaging.sqlite');
  const db = dbFactory(testDbPath);
  
  try {
    // Test 1: Add same product twice with different prices
    console.log('Test 1: Product Price Averaging');
    console.log('=====================================');
    
    // First purchase: 2 iPhone 14 at $500 each
    const purchase1Items = [{
      item_type: 'product',
      item_name: 'iPhone 14',
      brand: 'Apple',
      model: 'iPhone 14',
      ram: '6GB',
      storage: '128GB',
      quantity: 2,
      unit_price: 500,
      currency: 'USD'
    }];
    
    console.log('📦 First purchase: 2 × iPhone 14 at $500 each');
    await db.addDirectPurchaseWithItems({
      supplier: 'Test Supplier',
      date: new Date().toISOString(),
      items: purchase1Items,
      currency: 'USD'
    });
    
    // Check product after first purchase
    const products1 = db.getProducts();
    const iPhone1 = products1.find(p => p.model === 'iPhone 14');
    console.log(`📱 After first purchase: Stock=${iPhone1.stock}, Price=$${iPhone1.buying_price}`);
    
    // Second purchase: 2 more iPhone 14 at $1000 each
    const purchase2Items = [{
      item_type: 'product',
      item_name: 'iPhone 14',
      brand: 'Apple',
      model: 'iPhone 14',
      ram: '6GB',
      storage: '128GB',
      quantity: 2,
      unit_price: 1000,
      currency: 'USD'
    }];
    
    console.log('📦 Second purchase: 2 × iPhone 14 at $1000 each');
    await db.addDirectPurchaseWithItems({
      supplier: 'Test Supplier',
      date: new Date().toISOString(),
      items: purchase2Items,
      currency: 'USD'
    });
    
    // Check product after second purchase
    const products2 = db.getProducts();
    const iPhone2 = products2.find(p => p.model === 'iPhone 14');
    console.log(`📱 After second purchase: Stock=${iPhone2.stock}, Price=$${iPhone2.buying_price}`);
    
    // Expected: Stock=4, Price=$750 (average of $500×2 + $1000×2 = $3000 ÷ 4 = $750)
    const expectedStock = 4;
    const expectedPrice = 750;
    
    console.log(`\n✅ Expected: Stock=${expectedStock}, Price=$${expectedPrice}`);
    console.log(`${iPhone2.stock === expectedStock ? '✅' : '❌'} Stock check: ${iPhone2.stock} ${iPhone2.stock === expectedStock ? 'PASS' : 'FAIL'}`);
    console.log(`${iPhone2.buying_price === expectedPrice ? '✅' : '❌'} Price check: $${iPhone2.buying_price} ${iPhone2.buying_price === expectedPrice ? 'PASS' : 'FAIL'}`);
    
    // Test 2: Same test for accessories
    console.log('\n\nTest 2: Accessory Price Averaging');
    console.log('==================================');
    
    // First purchase: 3 Cases at $10 each
    const accessory1Items = [{
      item_type: 'accessory',
      item_name: 'iPhone Case',
      brand: 'Apple',
      model: 'Silicone Case',
      type: 'Case',
      quantity: 3,
      unit_price: 10,
      currency: 'USD'
    }];
    
    console.log('📦 First purchase: 3 × iPhone Case at $10 each');
    await db.addDirectPurchaseWithItems({
      supplier: 'Test Supplier',
      date: new Date().toISOString(),
      items: accessory1Items,
      currency: 'USD'
    });
    
    // Check accessory after first purchase
    const accessories1 = db.getAccessories();
    const case1 = accessories1.find(a => a.type === 'Case');
    console.log(`🛡️ After first purchase: Stock=${case1.stock}, Price=$${case1.buying_price}`);
    
    // Second purchase: 2 more Cases at $20 each
    const accessory2Items = [{
      item_type: 'accessory',
      item_name: 'iPhone Case',
      brand: 'Apple',
      model: 'Silicone Case',
      type: 'Case',
      quantity: 2,
      unit_price: 20,
      currency: 'USD'
    }];
    
    console.log('📦 Second purchase: 2 × iPhone Case at $20 each');
    await db.addDirectPurchaseWithItems({
      supplier: 'Test Supplier',
      date: new Date().toISOString(),
      items: accessory2Items,
      currency: 'USD'
    });
    
    // Check accessory after second purchase
    const accessories2 = db.getAccessories();
    const case2 = accessories2.find(a => a.type === 'Case');
    console.log(`🛡️ After second purchase: Stock=${case2.stock}, Price=$${case2.buying_price}`);
    
    // Expected: Stock=5, Price=$14 (average of $10×3 + $20×2 = $70 ÷ 5 = $14)
    const expectedCaseStock = 5;
    const expectedCasePrice = 14;
    
    console.log(`\n✅ Expected: Stock=${expectedCaseStock}, Price=$${expectedCasePrice}`);
    console.log(`${case2.stock === expectedCaseStock ? '✅' : '❌'} Stock check: ${case2.stock} ${case2.stock === expectedCaseStock ? 'PASS' : 'FAIL'}`);
    console.log(`${case2.buying_price === expectedCasePrice ? '✅' : '❌'} Price check: $${case2.buying_price} ${case2.buying_price === expectedCasePrice ? 'PASS' : 'FAIL'}`);
    
    console.log('\n🎉 Price averaging test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    db.close();
    
    // Clean up test database
    const fs = require('fs');
    try {
      fs.unlinkSync(testDbPath);
      console.log('🧹 Test database cleaned up');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Run the test
testPriceAveraging().catch(console.error);
