// Test script to verify company debt fixes
const Database = require('better-sqlite3');
const path = require('path');

// Create the database modules
const createDatabase = require('./database/index.cjs');

const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const db = createDatabase(dbPath);

console.log('🧪 Testing Company Debt Fixes...\n');

// Test 1: Add a small company debt (less than 250 IQD)
console.log('✅ Test 1: Adding small company debt (100 IQD)');
try {
  const smallDebt = db.addCompanyDebt({
    company_name: 'Test Small Debt Company',
    amount: 100,
    description: 'Small debt test',
    currency: 'IQD'
  });
  console.log('   Small debt added:', smallDebt.lastInsertRowid);

  // Make a payment of 90 IQD (leaving 10 IQD remaining - should be considered fully paid)
  const paymentResult = db.markCompanyDebtPaid(smallDebt.lastInsertRowid, {
    payment_iqd_amount: 90,
    payment_currency_used: 'IQD'
  });
  
  console.log('   Payment result:', paymentResult.isFullyPaid ? 'FULLY PAID ✅' : 'NOT FULLY PAID ❌');
  console.log('   Remaining debt:', paymentResult.remainingDebt);
  
  // Cleanup
  db.deleteCompanyDebt(smallDebt.lastInsertRowid);
} catch (error) {
  console.error('   Error in Test 1:', error.message);
}

// Test 2: Add a large company debt and make partial payment
console.log('\n✅ Test 2: Adding large company debt (5000 IQD) with partial payment');
try {
  const largeDebt = db.addCompanyDebt({
    company_name: 'Test Large Debt Company',
    amount: 5000,
    description: 'Large debt test',
    currency: 'IQD'
  });
  console.log('   Large debt added:', largeDebt.lastInsertRowid);

  // Make a partial payment of 1000 IQD (leaving 4000 IQD remaining)
  const partialPaymentResult = db.markCompanyDebtPaid(largeDebt.lastInsertRowid, {
    payment_iqd_amount: 1000,
    payment_currency_used: 'IQD'
  });
  
  console.log('   Partial payment result:', partialPaymentResult.isFullyPaid ? 'FULLY PAID ❌' : 'PARTIAL PAYMENT ✅');
  console.log('   Remaining debt:', partialPaymentResult.remainingDebt);
  
  // Check buying history entries
  const buyingHistory = db.prepare('SELECT * FROM buying_history WHERE reference_id = ? AND type = ?')
    .all(largeDebt.lastInsertRowid, 'debt_payment');
  
  console.log('   Buying history entries:', buyingHistory.length);
  buyingHistory.forEach((entry, index) => {
    console.log(`     Entry ${index + 1}: ${entry.currency} ${entry.total_price}, multi_usd: ${entry.multi_currency_usd || 'N/A'}, multi_iqd: ${entry.multi_currency_iqd || 'N/A'}`);
  });
  
  // Cleanup
  db.deleteCompanyDebt(largeDebt.lastInsertRowid);
} catch (error) {
  console.error('   Error in Test 2:', error.message);
}

// Test 3: Test getTotalDebts function
console.log('\n✅ Test 3: Testing getTotalDebts function');
try {
  const totalDebts = db.getTotalDebts();
  console.log('   Total debts result:');
  console.log('     Customer debts:', totalDebts.customer);
  console.log('     Company debts:', totalDebts.company);
  console.log('     Personal loans:', totalDebts.personal);
} catch (error) {
  console.error('   Error in Test 3:', error.message);
}

console.log('\n🎉 Testing completed!');
