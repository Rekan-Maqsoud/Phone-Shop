// Fix mixed-currency purchases in existing data
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const db = new Database(dbPath);

console.log('🔧 Fixing mixed-currency purchases...');

try {
  // Start transaction
  const transaction = db.transaction(() => {
    // Get all buying history entries with items
    const entriesWithItems = db.prepare(`
      SELECT DISTINCT bh.* 
      FROM buying_history bh 
      WHERE bh.has_items = 1 
        AND (bh.multi_currency_usd IS NULL OR bh.multi_currency_iqd IS NULL OR 
             (bh.multi_currency_usd = 0 AND bh.multi_currency_iqd = 0))
    `).all();
    
    console.log(`Found ${entriesWithItems.length} entries with items to check...`);
    
    let updatedCount = 0;
    
    for (const entry of entriesWithItems) {
      // Get items for this entry
      const items = db.prepare('SELECT * FROM buying_history_items WHERE buying_history_id = ?').all(entry.id);
      
      if (items.length === 0) continue;
      
      // Calculate totals by original item currency
      const usdItemsTotal = items
        .filter(item => (item.currency || 'IQD') === 'USD')
        .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      const iqdItemsTotal = items
        .filter(item => (item.currency || 'IQD') === 'IQD')
        .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      // Check if this is a mixed-currency scenario
      const itemCurrencies = [...new Set(items.map(item => item.currency || 'IQD'))];
      const hasMixedCurrencies = itemCurrencies.length > 1;
      const hasPaymentCurrencyMismatch = itemCurrencies.some(itemCurrency => itemCurrency !== entry.currency);
      const isMixedCurrencyPurchase = hasMixedCurrencies || hasPaymentCurrencyMismatch;
      
      if (isMixedCurrencyPurchase && (usdItemsTotal > 0 || iqdItemsTotal > 0)) {
        // Update the entry with multi-currency columns
        db.prepare(`
          UPDATE buying_history 
          SET multi_currency_usd = ?, multi_currency_iqd = ?
          WHERE id = ?
        `).run(usdItemsTotal, iqdItemsTotal, entry.id);
        
        updatedCount++;
        console.log(`✅ Updated entry #${entry.id}: USD items: $${usdItemsTotal.toFixed(2)}, IQD items: د.ع${iqdItemsTotal.toFixed(0)}, Payment: ${entry.currency}`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`- Entries checked: ${entriesWithItems.length}`);
    console.log(`- Entries updated: ${updatedCount}`);
    
    return updatedCount;
  });
  
  // Execute the transaction
  const result = transaction();
  
  console.log(`\n✅ Successfully updated ${result} mixed-currency purchase entries!`);
  
} catch (error) {
  console.error('❌ Error fixing mixed-currency purchases:', error);
  process.exit(1);
} finally {
  db.close();
}
