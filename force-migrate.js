const Database = require('better-sqlite3');
const path = require('path');

// Open the database
const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const db = new Database(dbPath);

console.log('Starting forced migration...');

try {
  // Check current buying history entries
  const entries = db.prepare('SELECT id, currency, total_price, amount, multi_currency_usd, multi_currency_iqd FROM buying_history').all();
  console.log('Current buying history entries:');
  entries.forEach(entry => {
    console.log(`  ID: ${entry.id}, Currency: ${entry.currency}, Total: ${entry.total_price || entry.amount}, Multi USD: ${entry.multi_currency_usd}, Multi IQD: ${entry.multi_currency_iqd}`);
  });

  // Force update entries that have 0 in both multi-currency columns
  const updateStmt = db.prepare('UPDATE buying_history SET multi_currency_usd = ?, multi_currency_iqd = ? WHERE id = ?');
  
  let updated = 0;
  for (const entry of entries) {
    if ((entry.multi_currency_usd || 0) === 0 && (entry.multi_currency_iqd || 0) === 0) {
      const value = entry.total_price || entry.amount || 0;
      if (value > 0) {
        if (entry.currency === 'USD') {
          updateStmt.run(value, 0, entry.id);
          console.log(`  Updated entry ${entry.id}: Set multi_currency_usd = ${value}`);
        } else {
          updateStmt.run(0, value, entry.id);
          console.log(`  Updated entry ${entry.id}: Set multi_currency_iqd = ${value}`);
        }
        updated++;
      }
    }
  }
  
  console.log(`\nMigration complete! Updated ${updated} entries.`);
  
  // Show updated entries
  const updatedEntries = db.prepare('SELECT id, currency, total_price, amount, multi_currency_usd, multi_currency_iqd FROM buying_history').all();
  console.log('\nUpdated buying history entries:');
  updatedEntries.forEach(entry => {
    console.log(`  ID: ${entry.id}, Currency: ${entry.currency}, Total: ${entry.total_price || entry.amount}, Multi USD: ${entry.multi_currency_usd}, Multi IQD: ${entry.multi_currency_iqd}`);
  });

} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
