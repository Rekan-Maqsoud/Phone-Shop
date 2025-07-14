const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const db = new Database(dbPath);

console.log('=== EMERGENCY DATABASE FIX ===');

// Check current products
const currentProducts = db.prepare('SELECT * FROM products LIMIT 3').all();
console.log('Current products:', currentProducts);

// Check table schema
const schema = db.prepare("PRAGMA table_info(products)").all();
console.log('Table schema:', schema);

// Backup the current products data
const allProducts = db.prepare('SELECT * FROM products').all();
console.log(`Found ${allProducts.length} products to repair`);

if (allProducts.length > 0) {
  console.log('Dropping and recreating products table...');
  
  // Create backup table
  db.prepare('CREATE TABLE products_backup AS SELECT * FROM products').run();
  
  // Drop and recreate products table
  db.prepare('DROP TABLE products').run();
  
  db.prepare(`
    CREATE TABLE products (
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
    )
  `).run();
  
  // Re-insert all products with proper IDs
  const insertStmt = db.prepare(`
    INSERT INTO products (name, buying_price, stock, archived, ram, storage, model, category, currency) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const product of allProducts) {
    insertStmt.run(
      product.name,
      product.buying_price,
      product.stock,
      product.archived || 0,
      product.ram,
      product.storage,
      product.model,
      product.category || 'phones',
      product.currency || 'IQD'
    );
  }
  
  // Verify fix
  const fixedProducts = db.prepare('SELECT id, name FROM products').all();
  console.log('Fixed products:', fixedProducts);
  
  // Drop backup table
  db.prepare('DROP TABLE products_backup').run();
  
  console.log('✅ Database repair completed!');
} else {
  console.log('No products found to repair');
}

db.close();
