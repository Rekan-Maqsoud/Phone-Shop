const path = require('path');
const Database = require('better-sqlite3');

// Open database directly to check schema
const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const db = new Database(dbPath);

try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables.map(t => t.name));
  
  // Check if there are any transactions or cash entries
  console.log('\nChecking various tables...');
  
  // Check if transactions table exists and has data
  try {
    const transCount = db.prepare("SELECT COUNT(*) as count FROM transactions").get();
    console.log(`Transactions count: ${transCount.count}`);
    
    if (transCount.count > 0) {
      const recentTrans = db.prepare("SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5").all();
      console.log('Recent transactions:', JSON.stringify(recentTrans, null, 2));
    }
  } catch (e) {
    console.log('No transactions table or error:', e.message);
  }
  
  // Check cash_entries table
  try {
    const cashCount = db.prepare("SELECT COUNT(*) as count FROM cash_entries").get();
    console.log(`Cash entries count: ${cashCount.count}`);
    
    if (cashCount.count > 0) {
      const recentCash = db.prepare("SELECT * FROM cash_entries ORDER BY created_at DESC LIMIT 5").all();
      console.log('Recent cash entries:', JSON.stringify(recentCash, null, 2));
    }
  } catch (e) {
    console.log('No cash_entries table or error:', e.message);
  }
  
} finally {
  db.close();
}
