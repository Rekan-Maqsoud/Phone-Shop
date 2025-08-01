// Test script to validate sales calculations after returns
// This can be run in browser console while testing the app

function testSalesCalculations() {
  console.log('🧪 Testing Sales History Calculations After Returns');
  
  // Test data - simulating a sale with returns
  const testSale = {
    id: 'test-123',
    total: 1000, // Original sale total for 10 items
    items: [
      // 8 remaining items after 2 returns
      { quantity: 2, item_price: 50 }, // 100
      { quantity: 2, item_price: 75 }, // 150  
      { quantity: 2, item_price: 100 }, // 200
      { quantity: 2, item_price: 125 }, // 250
      // Total current value: 700 (instead of original 1000)
    ],
    currency: 'USD',
    created_at: new Date().toISOString()
  };
  
  // Simulate our new calculation logic
  function calculateCurrentRevenue(sale) {
    return sale.items.reduce((sum, item) => sum + (item.quantity * item.item_price), 0);
  }
  
  const originalTotal = testSale.total;
  const currentRevenue = calculateCurrentRevenue(testSale);
  
  console.log('📊 Test Results:');
  console.log(`Original Sale Total: $${originalTotal}`);
  console.log(`Current Revenue (after returns): $${currentRevenue}`);
  console.log(`Difference: $${originalTotal - currentRevenue}`);
  console.log(`✅ Revenue correctly reflects current items: ${currentRevenue === 700 ? 'PASS' : 'FAIL'}`);
  
  return {
    originalTotal,
    currentRevenue,
    difference: originalTotal - currentRevenue,
    testPassed: currentRevenue === 700
  };
}

// Test return quantity validation
function testReturnQuantityValidation() {
  console.log('🧪 Testing Return Quantity Validation');
  
  const testEntry = {
    id: 'purchase-123',
    quantity: 5,
    total_price: 500,
    currency: 'USD'
  };
  
  // Test various return quantities
  const testCases = [
    { returnQty: 1, expected: 'valid', description: 'Return 1 of 5' },
    { returnQty: 3, expected: 'valid', description: 'Return 3 of 5' },
    { returnQty: 5, expected: 'valid', description: 'Return all 5' },
    { returnQty: 0, expected: 'invalid', description: 'Return 0 (should fail)' },
    { returnQty: 6, expected: 'invalid', description: 'Return 6 of 5 (should fail)' },
    { returnQty: -1, expected: 'invalid', description: 'Return negative quantity (should fail)' }
  ];
  
  function validateReturnQuantity(originalQty, returnQty) {
    if (returnQty < 1) return { valid: false, reason: 'Quantity must be at least 1' };
    if (returnQty > originalQty) return { valid: false, reason: 'Cannot exceed original quantity' };
    return { valid: true };
  }
  
  console.log('📊 Quantity Validation Test Results:');
  testCases.forEach(testCase => {
    const result = validateReturnQuantity(testEntry.quantity, testCase.returnQty);
    const passed = testCase.expected === 'valid' ? result.valid : !result.valid;
    
    console.log(`${passed ? '✅' : '❌'} ${testCase.description}: ${passed ? 'PASS' : 'FAIL'}`);
    if (!result.valid) {
      console.log(`   Reason: ${result.reason}`);
    }
  });
  
  return {
    testsPassed: testCases.every(testCase => {
      const result = validateReturnQuantity(testEntry.quantity, testCase.returnQty);
      return testCase.expected === 'valid' ? result.valid : !result.valid;
    })
  };
}

// For mixed currency test
function testMixedCurrencyCalculations() {
  console.log('🧪 Testing Mixed Currency Sales Calculations');
  
  const testMixedSale = {
    id: 'mixed-123',
    total: 1500, // Original total
    items: [
      { quantity: 1, item_price: 200 }, // USD item
      { quantity: 2, item_price: 300000 }, // IQD items (600,000 IQD)
    ],
    currency: 'Mixed',
    multi_currency_usd: 200,
    multi_currency_iqd: 600000,
    exchange_rate: 1320
  };
  
  function calculateMixedCurrencyRevenue(sale) {
    let totalUSD = 0;
    let totalIQD = 0;
    
    sale.items.forEach(item => {
      const itemTotal = item.quantity * item.item_price;
      if (item.item_price >= 1000) { // IQD threshold
        totalIQD += itemTotal;
      } else {
        totalUSD += itemTotal;
      }
    });
    
    return { totalUSD, totalIQD };
  }
  
  const { totalUSD, totalIQD } = calculateMixedCurrencyRevenue(testMixedSale);
  
  console.log('📊 Mixed Currency Test Results:');
  console.log(`Current USD: $${totalUSD}`);
  console.log(`Current IQD: ${totalIQD.toLocaleString()} IQD`);
  console.log(`Original USD: $${testMixedSale.multi_currency_usd}`);
  console.log(`Original IQD: ${testMixedSale.multi_currency_iqd.toLocaleString()} IQD`);
  console.log(`✅ USD calculation correct: ${totalUSD === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`✅ IQD calculation correct: ${totalIQD === 600000 ? 'PASS' : 'FAIL'}`);
  
  return {
    currentUSD: totalUSD,
    currentIQD: totalIQD,
    originalUSD: testMixedSale.multi_currency_usd,
    originalIQD: testMixedSale.multi_currency_iqd,
    testPassed: totalUSD === 200 && totalIQD === 600000
  };
}

// Export for console testing
if (typeof window !== 'undefined') {
  window.testSalesCalculations = testSalesCalculations;
  window.testMixedCurrencyCalculations = testMixedCurrencyCalculations;
  window.testReturnQuantityValidation = testReturnQuantityValidation;
  console.log('🚀 Test functions loaded! Run:');
  console.log('- testSalesCalculations()');
  console.log('- testMixedCurrencyCalculations()');
  console.log('- testReturnQuantityValidation()');
}

// Run tests immediately if in Node.js environment
if (typeof module !== 'undefined') {
  console.log('\n🧪 Running Tests...\n');
  testSalesCalculations();
  console.log('\n');
  testMixedCurrencyCalculations();
  console.log('\n');
  testReturnQuantityValidation();
}
