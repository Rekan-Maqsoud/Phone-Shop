// Test script to verify debt payment fixes
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Create a temporary test database
const testDbPath = path.join(__dirname, 'test-debt-fixes.sqlite');
const db = new Database(testDbPath);

// Import the debt module
const debtModule = require('./database/modules/debts.cjs');
const settingsModule = require('./database/modules/settings.cjs');

console.log('🧪 Testing debt payment fixes...\n');

try {
  // Initialize test tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      created_at TEXT,
      paid_at TEXT,
      has_items INTEGER DEFAULT 0,
      currency TEXT DEFAULT 'IQD',
      payment_usd_amount REAL DEFAULT 0,
      payment_iqd_amount REAL DEFAULT 0,
      payment_currency_used TEXT
    );

    CREATE TABLE IF NOT EXISTS customer_debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      created_at TEXT,
      paid_at TEXT,
      currency TEXT DEFAULT 'IQD',
      payment_usd_amount REAL DEFAULT 0,
      payment_iqd_amount REAL DEFAULT 0,
      payment_currency_used TEXT,
      sale_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      amount_usd REAL DEFAULT 0,
      amount_iqd REAL DEFAULT 0,
      description TEXT,
      reference_id INTEGER,
      reference_type TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS buying_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      date TEXT,
      currency TEXT DEFAULT 'IQD',
      type TEXT,
      reference_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paid_amount_usd REAL DEFAULT 0,
      paid_amount_iqd REAL DEFAULT 0,
      is_multi_currency INTEGER DEFAULT 0,
      currency TEXT DEFAULT 'IQD',
      total REAL DEFAULT 0
    );
  `);

  // Set up initial exchange rate
  settingsModule.updateSetting(db, 'usd_to_iqd_rate', '1440');
  settingsModule.updateBalance(db, 'USD', 1000);
  settingsModule.updateBalance(db, 'IQD', 1440000);

  console.log('✅ Test database initialized');

  // Test 1: Company debt partial payment
  console.log('\n📋 Test 1: Company debt partial payment');
  
  // Add a company debt of $100
  const addResult = debtModule.addCompanyDebt(db, {
    company_name: 'Test Company',
    amount: 100,
    description: 'Test debt',
    currency: 'USD'
  });
  
  const debtId = addResult.lastInsertRowid;
  console.log(`   Added company debt ID: ${debtId} for $100`);

  // Make a partial payment of $30
  const partialPayment = debtModule.markCompanyDebtPaid(db, debtId, {
    payment_usd_amount: 30,
    payment_iqd_amount: 0
  });
  
  console.log(`   Partial payment result:`, {
    success: partialPayment.success,
    isFullyPaid: partialPayment.isFullyPaid,
    remainingDebt: partialPayment.remainingDebt,
    remainingDebtCurrency: partialPayment.remainingDebtCurrency
  });

  // Check buying history entry
  const buyingHistory = db.prepare('SELECT * FROM buying_history WHERE reference_id = ? AND type = ?').all(debtId, 'debt_payment');
  console.log(`   Buying history entries: ${buyingHistory.length}`);
  if (buyingHistory.length > 0) {
    console.log(`   First entry: ${buyingHistory[0].item_name} - $${buyingHistory[0].total_price} ${buyingHistory[0].currency}`);
  }

  // Make another payment to complete the debt ($70)
  const finalPayment = debtModule.markCompanyDebtPaid(db, debtId, {
    payment_usd_amount: 70,
    payment_iqd_amount: 0
  });
  
  console.log(`   Final payment result:`, {
    success: finalPayment.success,
    isFullyPaid: finalPayment.isFullyPaid,
    remainingDebt: finalPayment.remainingDebt
  });

  // Test 2: Customer debt partial payment
  console.log('\n📋 Test 2: Customer debt partial payment');
  
  // Add customer debt of 144,000 IQD
  const customerDebtResult = debtModule.addCustomerDebt(db, {
    customer_name: 'Test Customer',
    amount: 144000,
    description: 'Test customer debt',
    currency: 'IQD'
  });
  
  const customerDebtId = customerDebtResult.lastInsertRowid;
  console.log(`   Added customer debt ID: ${customerDebtId} for 144,000 IQD`);

  // Make partial payment of 50,000 IQD
  const customerPartialPayment = debtModule.markCustomerDebtPaid(db, customerDebtId, {
    payment_usd_amount: 0,
    payment_iqd_amount: 50000
  });
  
  console.log(`   Customer partial payment result:`, {
    success: customerPartialPayment.success,
    isFullyPaid: customerPartialPayment.isFullyPaid,
    remainingDebt: customerPartialPayment.remainingDebt,
    remainingDebtCurrency: customerPartialPayment.remainingDebtCurrency
  });

  // Complete the customer debt with remaining 94,000 IQD
  const customerFinalPayment = debtModule.markCustomerDebtPaid(db, customerDebtId, {
    payment_usd_amount: 0,
    payment_iqd_amount: 94000
  });
  
  console.log(`   Customer final payment result:`, {
    success: customerFinalPayment.success,
    isFullyPaid: customerFinalPayment.isFullyPaid,
    remainingDebt: customerFinalPayment.remainingDebt
  });

  // Test 3: Cross-currency payment
  console.log('\n📋 Test 3: Cross-currency payment');
  
  // Add USD debt, pay with both USD and IQD
  const crossCurrencyDebtResult = debtModule.addCompanyDebt(db, {
    company_name: 'Cross Currency Company',
    amount: 100,
    description: 'USD debt paid with mixed currencies',
    currency: 'USD'
  });
  
  const crossDebtId = crossCurrencyDebtResult.lastInsertRowid;
  console.log(`   Added USD debt ID: ${crossDebtId} for $100`);

  // Pay $50 USD + 72,000 IQD (equivalent to ~$50)
  const crossPayment = debtModule.markCompanyDebtPaid(db, crossDebtId, {
    payment_usd_amount: 50,
    payment_iqd_amount: 72000
  });
  
  console.log(`   Cross-currency payment result:`, {
    success: crossPayment.success,
    isFullyPaid: crossPayment.isFullyPaid,
    remainingDebt: crossPayment.remainingDebt
  });

  // Check multi-currency buying history entries
  const crossBuyingHistory = db.prepare('SELECT * FROM buying_history WHERE reference_id = ? AND type = ?').all(crossDebtId, 'debt_payment');
  console.log(`   Cross-currency buying history entries: ${crossBuyingHistory.length}`);
  crossBuyingHistory.forEach((entry, index) => {
    console.log(`   Entry ${index + 1}: ${entry.item_name} - ${entry.total_price} ${entry.currency}`);
  });

  console.log('\n🎉 All tests completed successfully!');

} catch (error) {
  console.error('❌ Test failed:', error);
} finally {
  db.close();
  // Clean up test file
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
    console.log('🧹 Test database cleaned up');
  }
}
