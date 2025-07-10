const Database = require('better-sqlite3');

try {
  const db = new Database('./database/shop.sqlite');
  console.log('Tables:', db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\'').all());
  
  try {
    console.log('products schema:', db.prepare('PRAGMA table_info(products)').all());
  } catch(e) {
    console.log('products error:', e.message);
  }
  
  try {
    console.log('accessories schema:', db.prepare('PRAGMA table_info(accessories)').all());
  } catch(e) {
    console.log('accessories error:', e.message);
  }
  
  db.close();
} catch(error) {
  console.log('Database error:', error.message);
}
