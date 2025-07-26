const db = require('./database/index.cjs')('database/shop.sqlite');

console.log('Recent debt payments in buying_history:');
try {
  const debtPayments = db.prepare('SELECT * FROM buying_history WHERE type = ? ORDER BY date DESC LIMIT 10').all('debt_payment');
  console.log(debtPayments);
} catch (e) {
  console.log('Error or column does not exist:', e.message);
  // Try without type column
  const allEntries = db.prepare('SELECT * FROM buying_history WHERE item_name LIKE ? ORDER BY date DESC LIMIT 10').all('%debt payment%');
  console.log('Entries with debt payment in name:');
  console.log(allEntries);
}

console.log('\nRecent company debt payment transactions:');
try {
  const transactions = db.prepare('SELECT * FROM transactions WHERE type = ? ORDER BY created_at DESC LIMIT 10').all('company_debt_payment');
  console.log(transactions);
} catch (e) {
  console.log('Error:', e.message);
}

db.close();
