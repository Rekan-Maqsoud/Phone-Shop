const Database = require('better-sqlite3');

try {
  const db = new Database('database/shop.sqlite');
  const result = db.prepare("SELECT * FROM settings WHERE key LIKE 'exchange_%'").all();
  console.log('Exchange rates in database:');
  console.log(JSON.stringify(result, null, 2));
  db.close();
} catch (error) {
  console.error('Error:', error.message);
}
