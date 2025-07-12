const path = require('path');
const Database = require('better-sqlite3');

console.log('🔧 Fixing sale_items foreign key constraints...\n');

const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const db = new Database(dbPath);

try {
  console.log('1. Checking current sale_items table...');
  const currentSaleItems = db.prepare('SELECT * FROM sale_items').all();
  console.log(`   Found ${currentSaleItems.length} sale items`);
  
  console.log('2. Creating new sale_items table without strict foreign key constraint...');
  
  db.exec(`
    CREATE TABLE sale_items_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      price INTEGER,
      buying_price INTEGER DEFAULT 0,
      profit INTEGER DEFAULT 0,
      is_accessory INTEGER DEFAULT 0,
      name TEXT,
      currency TEXT DEFAULT 'IQD',
      FOREIGN KEY(sale_id) REFERENCES sales(id)
    );
  `);
  
  console.log('3. Copying existing sale_items data...');
  
  if (currentSaleItems.length > 0) {
    const insertSaleItem = db.prepare(`
      INSERT INTO sale_items_new (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const item of currentSaleItems) {
      insertSaleItem.run(
        item.sale_id,
        item.product_id,
        item.quantity || 1,
        item.price || 0,
        item.buying_price || 0,
        item.profit || 0,
        item.is_accessory || 0,
        item.name,
        item.currency || 'IQD'
      );
    }
    console.log(`   Copied ${currentSaleItems.length} sale items`);
  }
  
  console.log('4. Replacing old sale_items table...');
  
  db.exec(`
    DROP TABLE sale_items;
    ALTER TABLE sale_items_new RENAME TO sale_items;
  `);
  
  console.log('5. Verifying the fix...');
  
  const sampleSaleItems = db.prepare('SELECT * FROM sale_items LIMIT 3').all();
  console.log('Sample sale items:');
  sampleSaleItems.forEach(item => {
    console.log(`   ID: ${item.id}, Product ID: ${item.product_id}, Name: ${item.name}, Is Accessory: ${item.is_accessory}`);
  });
  
  console.log('\n✅ Sale items table fixed successfully!');
  
} catch (error) {
  console.error('❌ Error fixing sale_items table:', error.message);
  console.error(error.stack);
} finally {
  db.close();
}
