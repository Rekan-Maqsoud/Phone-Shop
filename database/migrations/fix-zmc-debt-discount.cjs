const Database = require('better-sqlite3');

/**
 * Migration: Fix ZMC debt that had double discount applied
 * This fixes the specific ZMC company debt that was incorrectly calculated
 * from 1465000 to 1421000, should be 1443000 (1.5% discount applied once)
 */
function runMigration(dbPath) {
  console.log('Running migration: Fix ZMC debt double discount...');
  
  const db = new Database(dbPath);
  
  try {
    // Begin transaction
    db.exec('BEGIN TRANSACTION');
    
    // Find the specific ZMC debt that needs fixing
    const zncDebts = db.prepare(`
      SELECT id, company_name, total_amount, currency, created_at 
      FROM company_debts 
      WHERE LOWER(company_name) IN ('zmc', 'znc') 
      AND total_amount = 1421000
      ORDER BY created_at DESC
      LIMIT 1
    `).all();
    
    if (zncDebts.length > 0) {
      const debt = zncDebts[0];
      console.log(`Found ZMC debt: ID ${debt.id}, Amount: ${debt.total_amount} ${debt.currency}`);
      
      // Update the debt amount from 1421000 to 1443000
      const updateStmt = db.prepare(`
        UPDATE company_debts 
        SET total_amount = 1443000,
            remaining_amount = CASE 
              WHEN remaining_amount = total_amount THEN 1443000
              ELSE remaining_amount
            END
        WHERE id = ?
      `);
      
      const result = updateStmt.run(debt.id);
      
      if (result.changes > 0) {
        console.log(`✅ Successfully updated ZMC debt from ${debt.total_amount} to 1443000`);
        
        // Also update any related debt items if they exist
        const updateItemsStmt = db.prepare(`
          UPDATE company_debt_items 
          SET subtotal = ROUND(subtotal * 1443000.0 / 1421000.0, 2)
          WHERE company_debt_id = ?
        `);
        
        const itemsResult = updateItemsStmt.run(debt.id);
        if (itemsResult.changes > 0) {
          console.log(`✅ Updated ${itemsResult.changes} debt items proportionally`);
        }
      } else {
        console.log('⚠️ No changes made to ZMC debt');
      }
    } else {
      console.log('ℹ️ No ZMC debt with amount 1421000 found - migration may have already been applied');
    }
    
    // Mark migration as completed
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.prepare(`
      INSERT OR IGNORE INTO migrations (id) 
      VALUES ('fix-zmc-debt-discount')
    `).run();
    
    // Commit transaction
    db.exec('COMMIT');
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    // Rollback on error
    db.exec('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

module.exports = { runMigration };

// If run directly
if (require.main === module) {
  const path = require('path');
  const dbPath = path.join(__dirname, '..', 'shop.sqlite');
  runMigration(dbPath);
}
