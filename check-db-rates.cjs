const Database = require('better-sqlite3');

try {
  const db = new Database('database/shop.sqlite');
  console.log('=== CURRENT EXCHANGE RATES IN DATABASE ===');
  const rates = db.prepare("SELECT * FROM settings WHERE key LIKE 'exchange_%'").all();
  console.log('Exchange rates found:', rates);
  
  console.log('\n=== ALL SETTINGS ===');
  const allSettings = db.prepare("SELECT * FROM settings").all();
  console.log('All settings:', allSettings);
  
  db.close();
} catch (error) {
  console.error('Error:', error.message);
}
