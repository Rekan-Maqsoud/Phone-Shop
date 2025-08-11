const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'shop.sqlite');
const db = new Database(dbPath);

try {
  console.log('=== Checking ALL company debts ===');
  const allDebts = db.prepare(`
    SELECT id, company_name, amount, currency, created_at, paid_at
    FROM company_debts 
    ORDER BY created_at DESC
  `).all();

  console.log('All company debts:', JSON.stringify(allDebts, null, 2));

  console.log('\n=== Checking for amount 1421000 specifically ===');
  const amount1421000 = db.prepare(`
    SELECT id, company_name, amount, currency, created_at, paid_at
    FROM company_debts 
    WHERE amount = 1421000
    ORDER BY created_at DESC
  `).all();

  console.log('Debts with amount 1421000:', JSON.stringify(amount1421000, null, 2));

  console.log('\n=== Checking for amount 1443000 specifically ===');
  const amount1443000 = db.prepare(`
    SELECT id, company_name, amount, currency, created_at, paid_at
    FROM company_debts 
    WHERE amount = 1443000
    ORDER BY created_at DESC
  `).all();

  console.log('Debts with amount 1443000:', JSON.stringify(amount1443000, null, 2));

} catch (error) {
  console.error('Error:', error);
} finally {
  db.close();
}
