const path = require('path');
const Database = require('better-sqlite3');

console.log('🔧 Fixing database schema...\n');

const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const db = new Database(dbPath);

try {
  console.log('1. Checking current products table...');
  const currentProducts = db.prepare('SELECT * FROM products').all();
  console.log(`   Found ${currentProducts.length} products`);
  
  console.log('2. Checking current accessories table...');
  const currentAccessories = db.prepare('SELECT * FROM accessories').all();
  console.log(`   Found ${currentAccessories.length} accessories`);
  
  // Create the new table with proper schema
  console.log('3. Creating temporary tables with correct schema...');
  
  db.exec(`
    CREATE TABLE products_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      buying_price INTEGER NOT NULL,
      stock INTEGER NOT NULL,
      archived INTEGER DEFAULT 0,
      ram TEXT,
      storage TEXT,
      model TEXT,
      category TEXT DEFAULT 'phones',
      currency TEXT DEFAULT 'IQD'
    );
    
    CREATE TABLE accessories_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      buying_price INTEGER NOT NULL,
      stock INTEGER NOT NULL,
      archived INTEGER DEFAULT 0,
      brand TEXT,
      model TEXT,
      type TEXT,
      currency TEXT DEFAULT 'IQD'
    );
  `);
  
  console.log('4. Copying data to new tables...');
  
  // Copy products data
  if (currentProducts.length > 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products_new (name, buying_price, stock, archived, ram, storage, model, category, currency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const product of currentProducts) {
      insertProduct.run(
        product.name,
        product.buying_price || 0,
        product.stock || 0,
        product.archived || 0,
        product.ram,
        product.storage,
        product.model,
        product.category || 'phones',
        product.currency || 'IQD'
      );
    }
    console.log(`   Copied ${currentProducts.length} products`);
  }
  
  // Copy accessories data
  if (currentAccessories.length > 0) {
    const insertAccessory = db.prepare(`
      INSERT INTO accessories_new (name, buying_price, stock, archived, brand, model, type, currency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const accessory of currentAccessories) {
      insertAccessory.run(
        accessory.name,
        accessory.buying_price || 0,
        accessory.stock || 0,
        accessory.archived || 0,
        accessory.brand,
        accessory.model,
        accessory.type,
        accessory.currency || 'IQD'
      );
    }
    console.log(`   Copied ${currentAccessories.length} accessories`);
  }
  
  console.log('5. Replacing old tables with new ones...');
  
  db.exec(`
    DROP TABLE products;
    ALTER TABLE products_new RENAME TO products;
    
    DROP TABLE accessories;
    ALTER TABLE accessories_new RENAME TO accessories;
  `);
  
  console.log('6. Verifying the fix...');
  
  const newProducts = db.prepare('SELECT * FROM products LIMIT 3').all();
  const newAccessories = db.prepare('SELECT * FROM accessories LIMIT 3').all();
  
  console.log('Sample products:');
  newProducts.forEach(p => {
    console.log(`   ID: ${p.id}, Name: ${p.name}, Stock: ${p.stock}`);
  });
  
  console.log('Sample accessories:');
  newAccessories.forEach(a => {
    console.log(`   ID: ${a.id}, Name: ${a.name}, Stock: ${a.stock}`);
  });
  
  console.log('\n✅ Database schema fixed successfully!');
  
} catch (error) {
  console.error('❌ Error fixing database schema:', error.message);
  console.error(error.stack);
} finally {
  db.close();
}
