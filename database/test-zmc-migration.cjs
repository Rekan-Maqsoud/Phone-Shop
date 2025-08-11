const Database = require('better-sqlite3');
const path = require('path');

// Import the runMigrations function from init module
const { runMigrations } = require('./modules/init.cjs');

const dbPath = path.join(__dirname, 'shop.sqlite');
const db = new Database(dbPath);

console.log('🧪 Testing ZMC debt migration...');

try {
  // Run migrations
  runMigrations(db);
  console.log('✅ Migration test completed');
} catch (error) {
  console.error('❌ Migration test failed:', error);
} finally {
  db.close();
}
