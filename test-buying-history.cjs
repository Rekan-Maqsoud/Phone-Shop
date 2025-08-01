// Simple test to verify company debt payment buying history is correctly recorded
const db = require('better-sqlite3')(':memory:');

// Initialize test database
db.exec(`
  CREATE TABLE company_debts (
    id INTEGER PRIMARY KEY,
    company_name TEXT,
    amount REAL,
    description TEXT,
    currency TEXT DEFAULT 'IQD',
    payment_usd_amount REAL DEFAULT 0,
    payment_iqd_amount REAL DEFAULT 0,
    payment_currency_used TEXT,
    paid_at TEXT
  );

  CREATE TABLE buying_history (
    id INTEGER PRIMARY KEY,
    item_name TEXT,
    quantity INTEGER,
    unit_price REAL,
    total_price REAL,
    date TEXT,
    currency TEXT,
    type TEXT,
    reference_id INTEGER
  );

  CREATE TABLE transactions (
    id INTEGER PRIMARY KEY,
    type TEXT,
    amount_usd REAL DEFAULT 0,
    amount_iqd REAL DEFAULT 0,
    description TEXT,
    reference_id INTEGER,
    reference_type TEXT,
    created_at TEXT
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT INTO settings (key, value) VALUES ('usd_to_iqd_rate', '1440');
  INSERT INTO settings (key, value) VALUES ('balance_usd', '1000');
  INSERT INTO settings (key, value) VALUES ('balance_iqd', '1440000');
`);

// Import debt module functions
const debtModule = require('./database/modules/debts.cjs');

console.log('🧪 Testing company debt payment buying history...\n');

try {
  // Test 1: Single USD payment
  console.log('📋 Test 1: Single USD payment ($50)');
  
  // Add a company debt
  const addResult = debtModule.addCompanyDebt(db, {
    company_name: 'Test Company USD',
    amount: 100,
    description: 'Test USD debt',
    currency: 'USD'
  });
  
  const debtId = addResult.lastInsertRowid;
  console.log(`   Added debt ID: ${debtId}`);

  // Make a single USD payment
  const paymentResult = debtModule.markCompanyDebtPaid(db, debtId, {
    payment_usd_amount: 50,
    payment_iqd_amount: 0
  });
  
  console.log(`   Payment result: ${paymentResult.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`   Is fully paid: ${paymentResult.isFullyPaid}`);
  console.log(`   Remaining debt: ${paymentResult.remainingDebt} ${paymentResult.remainingDebtCurrency}`);

  // Check buying history
  const buyingHistory = db.prepare('SELECT * FROM buying_history WHERE reference_id = ?').all(debtId);
  console.log(`   Buying history entries: ${buyingHistory.length}`);
  
  if (buyingHistory.length > 0) {
    buyingHistory.forEach((entry, index) => {
      console.log(`   Entry ${index + 1}: ${entry.item_name}`);
      console.log(`     Amount: ${entry.total_price} ${entry.currency}`);
      console.log(`     Type: ${entry.type || 'N/A'}`);
    });
  }

  // Test 2: Single IQD payment
  console.log('\n📋 Test 2: Single IQD payment (72,000 IQD)');
  
  const addResult2 = debtModule.addCompanyDebt(db, {
    company_name: 'Test Company IQD',
    amount: 144000,
    description: 'Test IQD debt',
    currency: 'IQD'
  });
  
  const debtId2 = addResult2.lastInsertRowid;
  console.log(`   Added debt ID: ${debtId2}`);

  const paymentResult2 = debtModule.markCompanyDebtPaid(db, debtId2, {
    payment_usd_amount: 0,
    payment_iqd_amount: 72000
  });
  
  console.log(`   Payment result: ${paymentResult2.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`   Is fully paid: ${paymentResult2.isFullyPaid}`);
  console.log(`   Remaining debt: ${paymentResult2.remainingDebt} ${paymentResult2.remainingDebtCurrency}`);

  const buyingHistory2 = db.prepare('SELECT * FROM buying_history WHERE reference_id = ?').all(debtId2);
  console.log(`   Buying history entries: ${buyingHistory2.length}`);
  
  if (buyingHistory2.length > 0) {
    buyingHistory2.forEach((entry, index) => {
      console.log(`   Entry ${index + 1}: ${entry.item_name}`);
      console.log(`     Amount: ${entry.total_price} ${entry.currency}`);
      console.log(`     Type: ${entry.type || 'N/A'}`);
    });
  }

  // Test 3: Multi-currency payment
  console.log('\n📋 Test 3: Multi-currency payment ($25 + 36,000 IQD)');
  
  const addResult3 = debtModule.addCompanyDebt(db, {
    company_name: 'Test Company Multi',
    amount: 100,
    description: 'Test multi-currency debt',
    currency: 'USD'
  });
  
  const debtId3 = addResult3.lastInsertRowid;
  console.log(`   Added debt ID: ${debtId3}`);

  const paymentResult3 = debtModule.markCompanyDebtPaid(db, debtId3, {
    payment_usd_amount: 25,
    payment_iqd_amount: 36000
  });
  
  console.log(`   Payment result: ${paymentResult3.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`   Is fully paid: ${paymentResult3.isFullyPaid}`);
  console.log(`   Remaining debt: ${paymentResult3.remainingDebt} ${paymentResult3.remainingDebtCurrency}`);

  const buyingHistory3 = db.prepare('SELECT * FROM buying_history WHERE reference_id = ?').all(debtId3);
  console.log(`   Buying history entries: ${buyingHistory3.length}`);
  
  if (buyingHistory3.length > 0) {
    buyingHistory3.forEach((entry, index) => {
      console.log(`   Entry ${index + 1}: ${entry.item_name}`);
      console.log(`     Amount: ${entry.total_price} ${entry.currency}`);
      console.log(`     Type: ${entry.type || 'N/A'}`);
    });
  }

  console.log('\n✅ All tests completed!');
  console.log('\n📊 Total buying history records:');
  const allBuyingHistory = db.prepare('SELECT * FROM buying_history ORDER BY id').all();
  allBuyingHistory.forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.item_name} - ${entry.total_price} ${entry.currency} (Type: ${entry.type || 'N/A'})`);
  });

} catch (error) {
  console.error('❌ Test failed:', error);
  console.error(error.stack);
}

db.close();
