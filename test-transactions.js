const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const db = new Database(dbPath);

console.log('=== TRANSACTION COUNT ===');
const transactionCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
console.log('Total transactions:', transactionCount.count);

console.log('\n=== RECENT TRANSACTIONS ===');
const recentTransactions = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10').all();
console.log('Recent transactions:');
recentTransactions.forEach(t => {
  console.log(`- ${t.type}: USD=${t.amount_usd}, IQD=${t.amount_iqd}, ${t.description} (ref: ${t.reference_type}:${t.reference_id})`);
});

console.log('\n=== PAYMENT TRANSACTIONS ===');
const paymentTransactions = db.prepare(`
  SELECT * FROM transactions 
  WHERE type LIKE '%payment%' OR type LIKE '%_payment'
  ORDER BY created_at DESC LIMIT 10
`).all();
console.log('Payment transactions:');
paymentTransactions.forEach(t => {
  console.log(`- ${t.type}: USD=${t.amount_usd}, IQD=${t.amount_iqd}, ${t.description} (ref: ${t.reference_type}:${t.reference_id}) at ${t.created_at}`);
});

db.close();
