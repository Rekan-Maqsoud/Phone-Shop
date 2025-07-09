const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const db = new Database(dbPath);

// Add missing columns to buying_history table
try {
  db.exec('ALTER TABLE buying_history ADD COLUMN type TEXT DEFAULT NULL');
  console.log('Added type column to buying_history');
} catch (e) {
  console.log('type column already exists or error:', e.message);
}

try {
  db.exec('ALTER TABLE buying_history ADD COLUMN reference_id INTEGER DEFAULT NULL');
  console.log('Added reference_id column to buying_history');
} catch (e) {
  console.log('reference_id column already exists or error:', e.message);
}

// Check the final schema
console.log('\nUpdated buying_history schema:');
const schema = db.prepare('PRAGMA table_info(buying_history)').all();
console.log(schema);

db.close();
