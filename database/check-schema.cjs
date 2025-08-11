const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'shop.sqlite');
const db = new Database(dbPath);

try {
  console.log('=== Checking table schema ===');
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='company_debts'").get();
  console.log('Table schema:', schema);

  console.log('\n=== Checking all columns ===');
  const columns = db.prepare("PRAGMA table_info(company_debts)").all();
  console.log('Columns:', columns);

} catch (error) {
  console.error('Error:', error);
} finally {
  db.close();
}
