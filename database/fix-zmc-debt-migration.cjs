const Database = require('better-sqlite3');
const path = require('path');

/**
 * Migration: Fix ZMC company debt from 1421000 to 1443000
 * This fixes the specific ZMC debt that had incorrect double discount applied
 * Target: Change amount from 1421000 to 1443000 IQD
 */
function runZmcDebtMigration(dbPath) {
  console.log('🔍 Running ZMC debt migration...');
  
  if (!dbPath) {
    dbPath = path.join(__dirname, 'shop.sqlite');
  }
  
  const db = new Database(dbPath);
  
  try {
    // Begin transaction for safety
    db.exec('BEGIN TRANSACTION');
    
    console.log('📊 Searching for ZMC company debt...');
    
    // Search with multiple criteria to find the ZMC debt
    // 1. Look for exact company name variations
    const zmcDebtExact = db.prepare(`
      SELECT id, company_name, amount, currency, created_at, paid_at
      FROM company_debts 
      WHERE LOWER(TRIM(company_name)) IN ('zmc', 'znc', 'z.m.c', 'z m c')
      AND amount = 1421000
      AND currency = 'IQD'
      AND paid_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `).get();
    
    // 2. If not found, search by amount only for unpaid debts
    let zmcDebt = zmcDebtExact;
    if (!zmcDebt) {
      console.log('🔍 Exact ZMC name not found, searching by amount 1421000...');
      zmcDebt = db.prepare(`
        SELECT id, company_name, amount, currency, created_at, paid_at
        FROM company_debts 
        WHERE amount = 1421000
        AND currency = 'IQD'
        AND paid_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `).get();
    }
    
    // 3. If still not found, search for similar amounts (within 1000 IQD range)
    if (!zmcDebt) {
      console.log('🔍 Amount 1421000 not found, searching for similar amounts...');
      const similarDebts = db.prepare(`
        SELECT id, company_name, amount, currency, created_at, paid_at
        FROM company_debts 
        WHERE amount BETWEEN 1420000 AND 1422000
        AND currency = 'IQD'
        AND paid_at IS NULL
        ORDER BY created_at DESC
      `).all();
      
      console.log('📋 Found similar amount debts:', similarDebts);
      
      // If only one debt in this range, assume it's the target
      if (similarDebts.length === 1) {
        zmcDebt = similarDebts[0];
        console.log(`💡 Found potential ZMC debt with amount ${zmcDebt.amount}`);
      }
    }
    
    if (zmcDebt) {
      console.log(`✅ Found target debt:`);
      console.log(`   ID: ${zmcDebt.id}`);
      console.log(`   Company: ${zmcDebt.company_name}`);
      console.log(`   Current Amount: ${zmcDebt.amount} ${zmcDebt.currency}`);
      console.log(`   Created: ${zmcDebt.created_at}`);
      
      // Update the debt amount to 1443000
      const updateStmt = db.prepare(`
        UPDATE company_debts 
        SET amount = 1443000
        WHERE id = ?
      `);
      
      const result = updateStmt.run(zmcDebt.id);
      
      if (result.changes > 0) {
        console.log(`✅ Successfully updated debt ID ${zmcDebt.id}:`);
        console.log(`   From: ${zmcDebt.amount} IQD`);
        console.log(`   To: 1443000 IQD`);
        console.log(`   Difference: +${1443000 - zmcDebt.amount} IQD`);
        
        // Also update IQD amount if it exists and matches
        if (zmcDebt.amount === zmcDebt.iqd_amount) {
          const updateIqdStmt = db.prepare(`
            UPDATE company_debts 
            SET iqd_amount = 1443000
            WHERE id = ?
          `);
          updateIqdStmt.run(zmcDebt.id);
          console.log(`✅ Also updated iqd_amount field to 1443000`);
        }
        
      } else {
        console.log('❌ Failed to update debt - no changes made');
        db.exec('ROLLBACK');
        return false;
      }
    } else {
      console.log('❌ No ZMC debt found matching criteria:');
      console.log('   - Amount: 1421000 IQD (or similar)');
      console.log('   - Status: Unpaid');
      console.log('   - Company name variations of ZMC');
      
      // Show all unpaid debts for debugging
      const allUnpaidDebts = db.prepare(`
        SELECT id, company_name, amount, currency, created_at
        FROM company_debts 
        WHERE paid_at IS NULL
        ORDER BY created_at DESC
      `).all();
      
      console.log('📋 All unpaid debts in database:');
      allUnpaidDebts.forEach(debt => {
        console.log(`   ID: ${debt.id}, Company: ${debt.company_name}, Amount: ${debt.amount} ${debt.currency}, Date: ${debt.created_at}`);
      });
      
      db.exec('ROLLBACK');
      return false;
    }
    
    // Mark migration as completed
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        description TEXT
      )
    `);
    
    db.prepare(`
      INSERT OR REPLACE INTO migrations (id, description) 
      VALUES ('fix-zmc-debt-1421000-to-1443000', 'Fixed ZMC company debt from 1421000 to 1443000 IQD')
    `).run();
    
    // Commit transaction
    db.exec('COMMIT');
    console.log('✅ ZMC debt migration completed successfully');
    return true;
    
  } catch (error) {
    // Rollback on error
    db.exec('ROLLBACK');
    console.error('❌ ZMC debt migration failed:', error.message);
    console.error('📋 Stack trace:', error.stack);
    throw error;
  } finally {
    db.close();
  }
}

module.exports = { runZmcDebtMigration };

// If run directly
if (require.main === module) {
  const dbPath = process.argv[2]; // Allow custom database path
  runZmcDebtMigration(dbPath);
}
