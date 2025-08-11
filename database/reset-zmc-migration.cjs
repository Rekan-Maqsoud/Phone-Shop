const Database = require('better-sqlite3');
const path = require('path');

/**
 * Reset ZMC debt migration so it can run again
 * This will remove the migration flag so the migration runs again on the user's database
 */
function resetZmcDebtMigration(dbPath) {
  if (!dbPath) {
    dbPath = path.join(__dirname, 'shop.sqlite');
  }
  
  const db = new Database(dbPath);
  
  try {
    console.log('🔄 Resetting ZMC debt migration...');
    
    // Check if migrations table exists
    const migrationTableExists = db.prepare(`
      SELECT 1 FROM sqlite_master 
      WHERE type='table' AND name='migrations'
    `).get();
    
    if (migrationTableExists) {
      // Remove the ZMC debt migration record
      const deleteResult = db.prepare(`
        DELETE FROM migrations 
        WHERE id = 'fix-zmc-debt-discount'
      `).run();
      
      if (deleteResult.changes > 0) {
        console.log('✅ ZMC debt migration flag removed - migration will run again on next app start');
      } else {
        console.log('ℹ️ ZMC debt migration flag was not present');
      }
      
      // Show remaining migrations
      const remainingMigrations = db.prepare('SELECT * FROM migrations').all();
      console.log('📋 Remaining migrations:', remainingMigrations);
    } else {
      console.log('ℹ️ No migrations table found');
    }
    
  } catch (error) {
    console.error('❌ Error resetting migration:', error);
  } finally {
    db.close();
  }
}

module.exports = { resetZmcDebtMigration };

// If run directly
if (require.main === module) {
  const dbPath = process.argv[2]; // Allow custom database path
  resetZmcDebtMigration(dbPath);
}
