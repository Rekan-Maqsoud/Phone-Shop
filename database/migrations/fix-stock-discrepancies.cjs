/**
 * Migration: Fix Stock Discrepancies
 * 
 * This migration addresses the issue where products added through the purchase modal
 * have incorrect stock values in the database compared to what should be available
 * based on purchase history.
 * 
 * The issue occurs when:
 * 1. Items are added via purchase modal
 * 2. UI shows updated stock (cached)
 * 3. Database update fails or is incomplete
 * 4. Database stock remains 0 while UI shows higher values
 */

const path = require('path');

function fixStockDiscrepancies(dbPath) {
  const Database = require('better-sqlite3');
  const db = new Database(dbPath);
  
  console.log('🔧 [Migration] Starting stock discrepancy fix...');
  
  try {
    // Begin transaction for atomic updates
    const transaction = db.transaction(() => {
      let fixedProducts = 0;
      let fixedAccessories = 0;
      
      // Fix products with stock discrepancies
      console.log('📱 [Migration] Checking products...');
      
      // Get all products that might have stock issues
      const products = db.prepare(`
        SELECT p.*, 
               COALESCE(SUM(ii.quantity), 0) as total_purchased,
               COALESCE(SUM(CASE WHEN s.quantity IS NOT NULL THEN s.quantity ELSE 0 END), 0) as total_sold
        FROM products p
        LEFT JOIN inventory_items ii ON ii.product_id = p.id AND ii.type = 'product'
        LEFT JOIN sales s ON s.product_id = p.id
        WHERE p.archived = 0
        GROUP BY p.id
      `).all();
      
      for (const product of products) {
        const expectedStock = product.total_purchased - product.total_sold;
        const currentStock = product.stock;
        
        if (currentStock !== expectedStock && expectedStock >= 0) {
          console.log(`📱 [Migration] Fixing product "${product.name}": current=${currentStock}, expected=${expectedStock}`);
          
          // Update the product stock to match expected value
          db.prepare(`
            UPDATE products 
            SET stock = ?, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(expectedStock, product.id);
          
          fixedProducts++;
        }
      }
      
      // Fix accessories with stock discrepancies
      console.log('🔧 [Migration] Checking accessories...');
      
      const accessories = db.prepare(`
        SELECT a.*, 
               COALESCE(SUM(ii.quantity), 0) as total_purchased,
               COALESCE(SUM(CASE WHEN s.quantity IS NOT NULL THEN s.quantity ELSE 0 END), 0) as total_sold
        FROM accessories a
        LEFT JOIN inventory_items ii ON ii.accessory_id = a.id AND ii.type = 'accessory'
        LEFT JOIN sales s ON s.accessory_id = a.id
        WHERE a.archived = 0
        GROUP BY a.id
      `).all();
      
      for (const accessory of accessories) {
        const expectedStock = accessory.total_purchased - accessory.total_sold;
        const currentStock = accessory.stock;
        
        if (currentStock !== expectedStock && expectedStock >= 0) {
          console.log(`🔧 [Migration] Fixing accessory "${accessory.name}": current=${currentStock}, expected=${expectedStock}`);
          
          // Update the accessory stock to match expected value
          db.prepare(`
            UPDATE accessories 
            SET stock = ?, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(expectedStock, accessory.id);
          
          fixedAccessories++;
        }
      }
      
      console.log(`✅ [Migration] Fixed ${fixedProducts} products and ${fixedAccessories} accessories`);
      
      // Log the migration
      const now = new Date().toISOString();
      try {
        db.prepare(`
          INSERT INTO migrations_log (migration_name, executed_at, details)
          VALUES (?, ?, ?)
        `).run(
          'fix-stock-discrepancies', 
          now, 
          JSON.stringify({ fixedProducts, fixedAccessories })
        );
      } catch (e) {
        // migrations_log table might not exist, create it
        db.prepare(`
          CREATE TABLE IF NOT EXISTS migrations_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            migration_name TEXT NOT NULL,
            executed_at TEXT NOT NULL,
            details TEXT
          )
        `).run();
        
        db.prepare(`
          INSERT INTO migrations_log (migration_name, executed_at, details)
          VALUES (?, ?, ?)
        `).run(
          'fix-stock-discrepancies', 
          now, 
          JSON.stringify({ fixedProducts, fixedAccessories })
        );
      }
      
      return { fixedProducts, fixedAccessories };
    });
    
    const result = transaction();
    console.log(`🎯 [Migration] Stock discrepancy fix completed successfully!`);
    console.log(`📊 [Migration] Results: ${result.fixedProducts} products, ${result.fixedAccessories} accessories fixed`);
    
  } catch (error) {
    console.error('❌ [Migration] Stock discrepancy fix failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Export for use in other modules
module.exports = { fixStockDiscrepancies };

// Allow direct execution for testing
if (require.main === module) {
  const dbPath = process.argv[2] || path.join(__dirname, '..', 'shop.sqlite');
  fixStockDiscrepancies(dbPath);
}
