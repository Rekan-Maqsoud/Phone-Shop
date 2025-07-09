const path = require('path');
const dbModule = require('./database/index.cjs');

// Initialize database
const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const db = dbModule(dbPath);

async function testTransactions() {
  console.log('Testing transaction system...\n');
  
  // Test 1: Add a company debt
  console.log('1. Adding a company debt...');
  const debtResult = db.addCompanyDebt({
    company_name: 'Test Company',
    amount: 100,
    description: 'Test debt',
    currency: 'USD'
  });
  console.log('Company debt added:', debtResult);
  
  // Test 2: Mark the debt as paid
  console.log('\n2. Marking debt as paid...');
  const paymentResult = db.markCompanyDebtPaid(
    debtResult.lastInsertRowid,
    null, // paid_at (use current time)
    'USD', // payment_currency_used
    100, // payment_usd_amount
    0 // payment_iqd_amount
  );
  console.log('Payment result:', paymentResult);
  
  // Test 3: Check transactions
  console.log('\n3. Checking transactions...');
  const transactions = db.getTransactions(10);
  console.log('Recent transactions:', transactions);
  
  // Test 4: Check buying history with transactions
  console.log('\n4. Checking buying history with transactions...');
  const buyingHistory = db.getBuyingHistoryWithTransactions();
  console.log('Buying history with transactions:');
  buyingHistory.slice(0, 5).forEach(item => {
    console.log(`- ${item.entry_type}: ${item.item_name || item.description} (${item.currency}: ${item.total_price})`);
  });
  
  // Test 5: Check balance
  console.log('\n5. Checking balance...');
  const balanceUSD = db.getSetting('balanceUSD');
  const balanceIQD = db.getSetting('balanceIQD');
  console.log('Balance USD:', balanceUSD);
  console.log('Balance IQD:', balanceIQD);
  
  console.log('\nTest completed!');
}

testTransactions().catch(console.error);
