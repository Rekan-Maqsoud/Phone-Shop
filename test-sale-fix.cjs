const createDb = require('./database/index.cjs');
const migrateSalesSchema = require('./migrate-sales-schema.cjs');

async function testImprovedSaleFixture() {
  console.log('\n🧪 Testing Improved Sale System with Currency Conversion...\n');
  
  try {
    // First run the migration to ensure schema is up to date
    console.log('🔄 Running sales schema migration...');
    await migrateSalesSchema();
    
    const db = createDb();
    
    // Get some test data
    const products = db.getProducts();
    const accessories = db.getAccessories();
    
    console.log('📦 Available products:', products.length);
    console.log('🔧 Available accessories:', accessories.length);
    
    if (products.length === 0 && accessories.length === 0) {
      console.log('❌ No products or accessories found. Please add some test data first.');
      return;
    }
    
    // Test Scenario 1: USD item sold with USD
    console.log('\n📋 Test Scenario 1: USD item sold with USD');
    await testSingleCurrencySale(db, products, accessories, 'USD', 'USD');
    
    // Test Scenario 2: USD item sold with IQD
    console.log('\n📋 Test Scenario 2: USD item sold with IQD');
    await testSingleCurrencySale(db, products, accessories, 'USD', 'IQD');
    
    // Test Scenario 3: IQD item sold with USD
    console.log('\n📋 Test Scenario 3: IQD item sold with USD');
    await testSingleCurrencySale(db, products, accessories, 'IQD', 'USD');
    
    // Test Scenario 4: Multi-currency sale (USD + IQD payment)
    console.log('\n📋 Test Scenario 4: Multi-currency payment');
    await testMultiCurrencySale(db, products, accessories);
    
    // Test Scenario 5: Mixed items (USD + IQD) sold together
    console.log('\n📋 Test Scenario 5: Mixed currency items');
    await testMixedCurrencyItems(db, products, accessories);
    
    console.log('\n✅ All currency conversion tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

async function testSingleCurrencySale(db, products, accessories, itemCurrency, saleCurrency) {
  // Find an item with the specified currency, or create a test one
  let testItem = products.find(p => p.currency === itemCurrency && p.stock > 0);
  
  if (!testItem && accessories.length > 0) {
    testItem = accessories.find(a => a.currency === itemCurrency && a.stock > 0);
  }
  
  if (!testItem) {
    console.log(`⚠️ No ${itemCurrency} items found with stock, skipping test.`);
    return;
  }
  
  // Calculate selling price with proper currency conversion
  let sellingPrice = Math.round((testItem.buying_price || 0) * 1.2); // 20% markup in item's currency
  
  // If selling in different currency, convert the price appropriately
  if (itemCurrency !== saleCurrency) {
    if (itemCurrency === 'USD' && saleCurrency === 'IQD') {
      // USD item sold in IQD: convert USD price to IQD
      sellingPrice = Math.round(sellingPrice * 1440); // 1440 IQD per USD
    } else if (itemCurrency === 'IQD' && saleCurrency === 'USD') {
      // IQD item sold in USD: convert IQD price to USD (keep as cents)
      sellingPrice = Math.round(sellingPrice * 0.000694 * 100); // Convert to USD cents
    }
  }

  const saleItems = [{
    id: testItem.id,
    product_id: testItem.id,
    itemType: testItem.type ? 'accessory' : 'product',
    name: testItem.name,
    quantity: 1,
    selling_price: sellingPrice,
    buying_price: testItem.buying_price || 0,
    uniqueId: `${testItem.type ? 'accessory' : 'product'}_${testItem.id}`
  }];
  
  const totalAmount = saleItems.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
  
  const testSale = {
    items: saleItems,
    total: totalAmount,
    created_at: new Date().toISOString(),
    is_debt: 0,
    customer_name: `Test Customer ${itemCurrency}->${saleCurrency}`,
    currency: saleCurrency
  };
  
  console.log(`  📝 Item: ${testItem.name} (${itemCurrency}) - Buying: ${testItem.buying_price}, Selling: ${saleItems[0].selling_price} (${saleCurrency})`);
  
  const result = db.saveSale(testSale);
  
  if (result) {
    console.log(`  ✅ Sale saved with ID: ${result}`);
    
    // Verify the sale details
    const savedSale = db.getSaleById(result);
    const saleItems = db.getSaleItems(result);
    
    if (savedSale && saleItems.length > 0) {
      const item = saleItems[0];
      console.log(`  💰 Stored profit in sale currency: ${item.profit_in_sale_currency || 'Not calculated'}`);
      console.log(`  🔄 Exchange rates stored: USD->IQD: ${savedSale.exchange_rate_usd_to_iqd}, IQD->USD: ${savedSale.exchange_rate_iqd_to_usd}`);
      console.log(`  🏷️ Product currency: ${item.product_currency}, Sale currency: ${savedSale.currency}`);
    }
  } else {
    console.log('  ❌ Sale failed to save');
  }
}

async function testMultiCurrencySale(db, products, accessories) {
  let testItem = products.find(p => p.stock > 0) || accessories.find(a => a.stock > 0);
  
  if (!testItem) {
    console.log('⚠️ No items with stock found, skipping multi-currency test.');
    return;
  }
  
  const saleItems = [{
    id: testItem.id,
    product_id: testItem.id,
    itemType: testItem.type ? 'accessory' : 'product',
    name: testItem.name,
    quantity: 1,
    selling_price: Math.round((testItem.buying_price || 0) * 1.3), // 30% markup
    buying_price: testItem.buying_price || 0,
    uniqueId: `${testItem.type ? 'accessory' : 'product'}_${testItem.id}`
  }];
  
  // Multi-currency payment: part USD, part IQD
  const multiCurrency = {
    usdAmount: 50,    // $50 USD
    iqdAmount: 72000  // 72,000 IQD (approx $50 at 1440 rate)
  };
  
  const testSale = {
    items: saleItems,
    total: saleItems[0].selling_price,
    created_at: new Date().toISOString(),
    is_debt: 0,
    customer_name: 'Multi-Currency Customer',
    currency: 'USD', // Primary currency for display
    multi_currency: multiCurrency
  };
  
  console.log(`  📝 Item: ${testItem.name} - Payment: $${multiCurrency.usdAmount} + د.ع${multiCurrency.iqdAmount}`);
  
  const result = db.saveSale(testSale);
  
  if (result) {
    console.log(`  ✅ Multi-currency sale saved with ID: ${result}`);
    
    const savedSale = db.getSaleById(result);
    if (savedSale) {
      console.log(`  💵 USD amount: $${savedSale.paid_amount_usd}`);
      console.log(`  🇮🇶 IQD amount: د.ع${savedSale.paid_amount_iqd}`);
      console.log(`  🔢 Multi-currency flag: ${savedSale.is_multi_currency ? 'Yes' : 'No'}`);
    }
  } else {
    console.log('  ❌ Multi-currency sale failed to save');
  }
}

async function testMixedCurrencyItems(db, products, accessories) {
  // Find items with different currencies
  const usdItem = products.find(p => p.currency === 'USD' && p.stock > 0);
  const iqdItem = products.find(p => p.currency === 'IQD' && p.stock > 0) || 
                  accessories.find(a => a.stock > 0); // Accessories default to IQD
  
  if (!usdItem || !iqdItem) {
    console.log('⚠️ Need both USD and IQD items for mixed currency test, skipping.');
    return;
  }
  
  const saleItems = [
    {
      id: usdItem.id,
      product_id: usdItem.id,
      itemType: 'product',
      name: usdItem.name,
      quantity: 1,
      selling_price: Math.round((usdItem.buying_price || 0) * 1.25),
      buying_price: usdItem.buying_price || 0,
      uniqueId: `product_${usdItem.id}`
    },
    {
      id: iqdItem.id,
      product_id: iqdItem.id,
      itemType: iqdItem.type ? 'accessory' : 'product',
      name: iqdItem.name,
      quantity: 1,
      selling_price: Math.round((iqdItem.buying_price || 0) * 1.25),
      buying_price: iqdItem.buying_price || 0,
      uniqueId: `${iqdItem.type ? 'accessory' : 'product'}_${iqdItem.id}`
    }
  ];
  
  const totalAmount = saleItems.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
  
  const testSale = {
    items: saleItems,
    total: totalAmount,
    created_at: new Date().toISOString(),
    is_debt: 0,
    customer_name: 'Mixed Currency Customer',
    currency: 'IQD' // Customer pays in IQD
  };
  
  console.log(`  📝 USD Item: ${usdItem.name} (${usdItem.currency})`);
  console.log(`  📝 IQD Item: ${iqdItem.name} (${iqdItem.currency || 'IQD'})`);
  console.log(`  💰 Customer pays in: ${testSale.currency}`);
  
  const result = db.saveSale(testSale);
  
  if (result) {
    console.log(`  ✅ Mixed currency sale saved with ID: ${result}`);
    
    const saleItems = db.getSaleItems(result);
    saleItems.forEach((item, index) => {
      console.log(`  📊 Item ${index + 1}: ${item.name}`);
      console.log(`     Product currency: ${item.product_currency}`);
      console.log(`     Profit in sale currency: ${item.profit_in_sale_currency}`);
      console.log(`     Buying price in sale currency: ${item.buying_price_in_sale_currency}`);
    });
  } else {
    console.log('  ❌ Mixed currency sale failed to save');
  }
}

testImprovedSaleFixture();
