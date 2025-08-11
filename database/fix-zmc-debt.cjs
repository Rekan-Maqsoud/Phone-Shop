const Database = require('better-sqlite3');
const path = require('path');

// Initialize database
const dbPath = path.join(__dirname, 'shop.sqlite');
const db = new Database(dbPath);

try {
  console.log('Starting ZMC debt migration...');

  // Find all debts for company name ZMC or Zmc
  const allZmcDebts = db.prepare(`
    SELECT id, company_name, amount, currency, created_at 
    FROM company_debts 
    WHERE LOWER(company_name) = 'zmc' 
    ORDER BY created_at DESC
  `).all();

  if (allZmcDebts.length === 0) {
    console.log('No ZMC company debt found.');
    process.exit(0);
  }

  console.log('Found ZMC debts:', allZmcDebts);
  
  // Find the last debt for company name ZMC or Zmc
  const zmcDebt = allZmcDebts[0];

  // Check if the amount is 1421000 (the incorrect amount with double discount)
  if (zmcDebt.amount === 1421000) {
    console.log('Fixing ZMC debt amount from 1421000 to 1443000...');
    
    // Update the amount to the correct value
    const updateStmt = db.prepare(`
      UPDATE company_debts 
      SET amount = ? 
      WHERE id = ?
    `);
    
    const result = updateStmt.run(1443000, zmcDebt.id);
    
    if (result.changes > 0) {
      console.log(`✅ Successfully updated ZMC debt ID ${zmcDebt.id} to 1443000`);
    } else {
      console.log('❌ Failed to update ZMC debt');
    }
  } else {
    console.log(`ZMC debt amount is ${zmcDebt.amount}, not 1421000. No migration needed.`);
  }

} catch (error) {
  console.error('Migration error:', error);
} finally {
  db.close();
  console.log('Database connection closed.');
}
