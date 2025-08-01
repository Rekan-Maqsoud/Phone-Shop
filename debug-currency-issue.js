// Debug script to check currency issue in buying history
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Starting currency issue debugging...');

try {
  // Connect to database
  const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
  const db = new Database(dbPath);
  
  console.log('✅ Connected to database');
  
  // Get all buying history entries
  const buyingHistory = db.prepare('SELECT * FROM buying_history ORDER BY date DESC').all();
  
  console.log(`📊 Found ${buyingHistory.length} buying history entries`);
  
  // Focus on recent entries that might be causing the issue
  const recentEntries = buyingHistory.slice(0, 10);
  
  console.log('\n🔍 Recent buying history entries:');
  recentEntries.forEach((entry, index) => {
    console.log(`\n--- Entry ${index + 1} (ID: ${entry.id}) ---`);
    console.log(`Date: ${entry.date}`);
    console.log(`Supplier: ${entry.supplier}`);
    console.log(`Item: ${entry.item_name}`);
    console.log(`Currency: ${entry.currency}`);
    console.log(`Total Price: ${entry.total_price}`);
    console.log(`Quantity: ${entry.quantity}`);
    console.log(`Unit Price: ${entry.unit_price}`);
    console.log(`Has Items: ${entry.has_items}`);
    
    // Check for transaction data if multi-currency
    if (entry.currency === 'MULTI') {
      const transaction = db.prepare(`
        SELECT amount_usd, amount_iqd, created_at 
        FROM transactions 
        WHERE reference_id = ? AND reference_type = 'buying_history' AND type = 'direct_purchase'
        ORDER BY created_at DESC 
        LIMIT 1
      `).get(entry.id);
      
      if (transaction) {
        console.log(`Transaction USD: ${transaction.amount_usd}`);
        console.log(`Transaction IQD: ${transaction.amount_iqd}`);
        console.log(`Transaction Date: ${transaction.created_at}`);
      }
    }
    
    // Check for items if has_items is true
    if (entry.has_items) {
      const items = db.prepare('SELECT * FROM buying_history_items WHERE buying_history_id = ?').all(entry.id);
      console.log(`Items (${items.length}):`);
      items.forEach((item, itemIndex) => {
        console.log(`  Item ${itemIndex + 1}: ${item.item_name} - ${item.quantity}x ${item.unit_price} ${item.currency} = ${item.total_price}`);
      });
    }
  });
  
  // Check for any entries with suspicious amounts (like 3214 vs 4000000)
  console.log('\n🔍 Checking for potential currency conversion issues...');
  
  const suspiciousEntries = buyingHistory.filter(entry => {
    const totalPrice = parseFloat(entry.total_price || 0);
    // Look for values that might be incorrectly converted (e.g., 3214 instead of 4000000)
    return (totalPrice > 3000 && totalPrice < 4000) || 
           (entry.currency === 'IQD' && totalPrice < 10000); // IQD amounts should typically be larger
  });
  
  console.log(`Found ${suspiciousEntries.length} potentially suspicious entries:`);
  suspiciousEntries.forEach(entry => {
    console.log(`ID: ${entry.id}, Currency: ${entry.currency}, Total: ${entry.total_price}, Supplier: ${entry.supplier}`);
  });
  
  // Check for large IQD entries
  const largeIQDEntries = buyingHistory.filter(entry => 
    entry.currency === 'IQD' && parseFloat(entry.total_price || 0) > 1000000
  );
  
  console.log(`\nFound ${largeIQDEntries.length} large IQD entries (>1M):`);
  largeIQDEntries.forEach(entry => {
    console.log(`ID: ${entry.id}, Total: ${entry.total_price}, Supplier: ${entry.supplier}, Date: ${entry.date}`);
  });
  
  db.close();
  console.log('\n✅ Database debugging completed');
  
} catch (error) {
  console.error('❌ Error during debugging:', error);
}
