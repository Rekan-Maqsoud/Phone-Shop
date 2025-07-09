const Database = require('better-sqlite3');

try {
  const db = new Database('./database/shop.sqlite');
  console.log('Tables:', db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\'').all());
  
  try {
    console.log('buying_history schema:', db.prepare('PRAGMA table_info(buying_history)').all());
  } catch(e) {
    console.log('buying_history error:', e.message);
  }
  
  db.close();
} catch(error) {
  console.log('Database error:', error.message);
}
