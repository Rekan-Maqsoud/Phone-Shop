// SQLite setup using better-sqlite3
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'shop.sqlite');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON'); // Ensure foreign key constraints are enforced

// Initial schema
const initSQL = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL,
  archived INTEGER DEFAULT 0,
  buying_price INTEGER DEFAULT 0,
  ram TEXT,
  storage TEXT,
  model TEXT
);
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME NOT NULL,
  total INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  price INTEGER,
  FOREIGN KEY(sale_id) REFERENCES sales(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  file_name TEXT,
  encrypted BOOLEAN,
  log TEXT
);
CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY,
  password TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS shop_info (
  id INTEGER PRIMARY KEY,
  name TEXT,
  address TEXT,
  contact TEXT,
  logo_path TEXT
);
CREATE TABLE IF NOT EXISTS debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER,
  customer_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME,
  FOREIGN KEY(sale_id) REFERENCES sales(id)
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;
db.exec(initSQL);

// Add missing columns if they don't exist (for existing databases)
try {
  db.exec('ALTER TABLE products ADD COLUMN buying_price INTEGER DEFAULT 0');
} catch (e) { /* Column already exists */ }
try {
  db.exec('ALTER TABLE products ADD COLUMN ram TEXT');
} catch (e) { /* Column already exists */ }
try {
  db.exec('ALTER TABLE products ADD COLUMN storage TEXT');
} catch (e) { /* Column already exists */ }
try {
  db.exec('ALTER TABLE sale_items ADD COLUMN buying_price INTEGER DEFAULT 0');
} catch (e) { /* Column already exists */ }
try {
  db.exec('ALTER TABLE sale_items ADD COLUMN profit INTEGER DEFAULT 0');
} catch (e) { /* Column already exists */ }

// Always initialize 3 sample products if table is empty (or after reset)
function initializeSampleData() {
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (productCount === 0) {
    const sampleProducts = [
      { name: 'iPhone 15 Pro', price: 110000, stock: 5, ram: '8GB', storage: '256GB', model: 'A17 Pro' },
      { name: 'Samsung Galaxy S24', price: 85000, stock: 8, ram: '8GB', storage: '128GB', model: 'Snapdragon 8 Gen 3' },
      { name: 'Xiaomi Redmi Note 13', price: 22000, stock: 20, ram: '4GB', storage: '128GB', model: 'Snapdragon 685' }
    ];
    const insertProduct = db.prepare(`
      INSERT INTO products (name, price, buying_price, stock, ram, storage, model) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    sampleProducts.forEach(product => {
      insertProduct.run(
        product.name,
        product.price, // buying price
        product.price, // buying price (duplicate for backward compatibility)
        product.stock,
        product.ram,
        product.storage,
        product.model
      );
    });
  }
}

initializeSampleData();

// --- MIGRATION: Convert all sales.created_at to ISO 8601 if not already ---
const salesToFix = db.prepare('SELECT id, created_at FROM sales').all();
const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const updateCreatedAt = db.prepare('UPDATE sales SET created_at = ? WHERE id = ?');
for (const sale of salesToFix) {
  if (!isoRegex.test(sale.created_at)) {
    // Try to parse as Date and convert to ISO
    const date = new Date(sale.created_at);
    if (!isNaN(date.getTime())) {
      updateCreatedAt.run(date.toISOString(), sale.id);
    }
  }
}

// Add shop info and settings table if not exists
const shopInitSQL = `
CREATE TABLE IF NOT EXISTS shop_info (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT,
  address TEXT,
  contact TEXT,
  logo_path TEXT
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;
db.exec(shopInitSQL);

// Ensure admin password exists
const adminRow = db.prepare('SELECT * FROM admin WHERE id = 1').get();
if (!adminRow) {
  db.prepare('INSERT INTO admin (id, password) VALUES (1, ?)').run('admin');
}

// --- Product CRUD ---
function getProducts() {
  return db.prepare('SELECT * FROM products').all();
}
function addProduct({ name, buying_price, price, stock, archived = 0, ram, storage, model }) {
  // For clarity: price is the buying price (what admin enters)
  // buying_price column is kept for backward compatibility but we use price as buying price
  return db.prepare('INSERT INTO products (name, price, buying_price, stock, archived, ram, storage, model) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(name, price || buying_price, price || buying_price, stock, archived, ram || null, storage || null, model || null);
}
function updateProduct({ id, name, buying_price, price, stock, archived = 0, ram, storage, model }) {
  // For clarity: price is the buying price (what admin enters)
  return db.prepare('UPDATE products SET name=?, price=?, buying_price=?, stock=?, archived=?, ram=?, storage=?, model=? WHERE id=?')
    .run(name, price || buying_price, price || buying_price, stock, archived, ram || null, storage || null, model || null, id);
}
function updateProductNoArchive({ id, name, price, stock, ram, storage }) {
  return db.prepare('UPDATE products SET name=?, price=?, buying_price=?, stock=?, ram=?, storage=? WHERE id=?')
    .run(name, price, price, stock, ram || null, storage || null, id);
}
function addStock(id, amount) {
  return db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(amount, id);
}
function deleteProduct(id) {
  // Instead of deleting, archive the product to preserve foreign key integrity
  return db.prepare('UPDATE products SET archived = 1 WHERE id = ?').run(id);
}
// --- Sales ---
function saveSale({ items, total, created_at, is_debt }) {
  // Use provided total and created_at if available, else calculate
  const saleTotal = typeof total === 'number' ? total : items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const saleCreatedAt = created_at || new Date().toISOString();
  const saleIsDebt = is_debt ? 1 : 0;

  const transaction = db.transaction(() => {
    // --- STOCK CHECK & UPDATE FOR ALL SALES (INCLUDING DEBT) ---
    for (const item of items) {
      if (!item.isReturn) {
        // For all non-return sales (including debt sales), check and deduct stock
        const product = db.prepare('SELECT stock, name, buying_price FROM products WHERE id = ?').get(item.product_id);
        const qty = Number(item.quantity) || 1;
        if (!product || product.stock < qty) {
          throw new Error(`Insufficient stock for product: ${product ? product.name : item.product_id}`);
        }
        // Decrement stock for all sales (normal and debt)
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(qty, item.product_id);
      } else if (item.isReturn) {
        // If return, increase stock (regardless of debt status)
        const qty = Number(item.quantity) || 1;
        db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(qty, item.product_id);
      }
    }
    // --- END STOCK CHECK & UPDATE ---

    // Create the sale record
    const sale = db.prepare('INSERT INTO sales (total, created_at, is_debt) VALUES (?, ?, ?)').run(saleTotal, saleCreatedAt, saleIsDebt);
    const saleId = sale.lastInsertRowid;
    // Insert sale items
    const insertItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit) VALUES (?, ?, ?, ?, ?, ?)');
    for (const item of items) {
      // Fetch product buying price
      const product = db.prepare('SELECT id, price FROM products WHERE id = ?').get(item.product_id);
      if (!item.product_id || typeof item.product_id !== 'number' || !product) {
        continue;
      }
      const qty = Number(item.quantity) || 1;
      const buyingPrice = Number(product.price) || 0; // products.price is the buying price
      const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.price === 'number' ? item.price : 0); // selling price from cart
      const profit = (sellingPrice - buyingPrice) * qty;
      // Store selling price in price column, buying price in buying_price column
      insertItem.run(saleId, item.product_id, qty, sellingPrice, buyingPrice, profit);
    }
    return saleId;
  });
  return transaction();
}

function getSales() {
  // Return only non-debt sales with their items and product info
  const sales = db.prepare('SELECT * FROM sales WHERE is_debt = 0 ORDER BY created_at DESC').all();
  const saleItemsStmt = db.prepare(`
    SELECT si.id, si.quantity,
      si.price AS selling_price,
      si.buying_price,
      si.profit,
      p.name
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = ?
  `);
  return sales.map(sale => ({
    ...sale,
    items: saleItemsStmt.all(sale.id)
  }));
}

function getDebtSales() {
  // Return only debt sales with their items and product info
  const sales = db.prepare('SELECT * FROM sales WHERE is_debt = 1 ORDER BY created_at DESC').all();
  const saleItemsStmt = db.prepare(`
    SELECT si.id, si.quantity,
      si.price AS selling_price,
      si.buying_price,
      si.profit,
      p.name
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = ?
  `);
  return sales.map(sale => ({
    ...sale,
    items: saleItemsStmt.all(sale.id)
  }));
}
// --- Backup ---
function getBackups() {
  return db.prepare('SELECT * FROM backups ORDER BY created_at DESC').all();
}
function logBackup({ file_name, encrypted, log }) {
  return db.prepare('INSERT INTO backups (file_name, encrypted, log) VALUES (?, ?, ?)')
    .run(file_name, encrypted ? 1 : 0, log);
}
function saveSetting(key, value) {
  // Convert booleans to numbers, and all other non-string/number types to JSON
  let toStore;
  if (typeof value === 'boolean') {
    toStore = value ? 1 : 0;
  } else if (typeof value === 'number' || typeof value === 'string' || value === null) {
    toStore = value;
  } else if (typeof value === 'object' && value !== null) {
    toStore = JSON.stringify(value);
  } else {
    toStore = String(value);
  }
  return db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, toStore);
}
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  if (!row) return null;
  // Try to parse JSON, fallback to string
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

// Add archived column if not exists
try {
  db.prepare('ALTER TABLE products ADD COLUMN archived INTEGER DEFAULT 0').run();
} catch (e) {
  // Ignore if already exists
}

// Migration: add ram and storage columns to products if not exist
try {
  db.prepare('ALTER TABLE products ADD COLUMN ram TEXT').run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}
try {
  db.prepare('ALTER TABLE products ADD COLUMN storage TEXT').run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}
try {
  db.prepare('ALTER TABLE products ADD COLUMN buying_price INTEGER DEFAULT 0').run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

// Add debts table
const debtInitSQL = `
CREATE TABLE IF NOT EXISTS debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER,
  customer_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paid INTEGER DEFAULT 0,
  paid_at DATETIME,
  FOREIGN KEY(sale_id) REFERENCES sales(id)
);
`;
db.exec(debtInitSQL);

function resetAllData() {
  try {
    // Disable foreign key constraints temporarily
    db.prepare('PRAGMA foreign_keys = OFF').run();
    
    // Delete data in the correct order to avoid foreign key issues
    try { db.prepare('DELETE FROM sale_items').run(); } catch (e) { console.log('No sale_items table:', e.message); }
    try { db.prepare('DELETE FROM debts').run(); } catch (e) { console.log('No debts table:', e.message); }
    try { db.prepare('DELETE FROM sales').run(); } catch (e) { console.log('No sales table:', e.message); }
    try { db.prepare('DELETE FROM products').run(); } catch (e) { console.log('No products table:', e.message); }
    try { db.prepare('DELETE FROM backups').run(); } catch (e) { console.log('No backups table:', e.message); }
    
    // Reset auto-increment sequences
    try { 
      db.prepare('DELETE FROM sqlite_sequence WHERE name IN ("products", "sales", "sale_items", "debts", "backups")').run(); 
    } catch (e) { 
      console.log('No sqlite_sequence table:', e.message); 
    }
    
    // Re-enable foreign key constraints
    db.prepare('PRAGMA foreign_keys = ON').run();
    
    // Recreate tables to ensure they exist
    db.exec(initSQL);
    db.exec(debtInitSQL);
    
    // Always re-initialize 3 sample products after reset
    initializeSampleData();
    
    return { success: true, message: 'All data reset successfully' };
  } catch (error) {
    console.error('Reset error:', error);
    return { success: false, message: `Reset failed: ${error.message}` };
  }
}

// --- Debt functions ---
function addDebt({ sale_id, customer_name }) {
  return db.prepare('INSERT INTO debts (sale_id, customer_name) VALUES (?, ?)')
    .run(sale_id, customer_name);
}
function getDebts() {
  return db.prepare('SELECT d.*, s.total, s.created_at FROM debts d JOIN sales s ON d.sale_id = s.id ORDER BY d.paid, d.created_at DESC').all();
}
function markDebtPaid(id, paid_at) {
  const paidTime = paid_at || new Date().toISOString();
  // Update the debt record
  const result = db.prepare('UPDATE debts SET paid = 1, paid_at = ? WHERE id = ?').run(paidTime, id);
  
  // Get the debt info to update the sale record
  const debt = db.prepare('SELECT sale_id FROM debts WHERE id = ?').get(id);
  if (debt) {
    // Update the sale to mark it as no longer a debt (move to regular sales)
    db.prepare('UPDATE sales SET is_debt = 0 WHERE id = ?').run(debt.sale_id);
  }
  
  return result;
}

// Add buying_price column to sale_items table for gain calculation
try {
  db.prepare('ALTER TABLE sale_items ADD COLUMN buying_price INTEGER DEFAULT 0').run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

// Add is_debt column to sales table to distinguish debt sales from normal sales
try {
  db.prepare('ALTER TABLE sales ADD COLUMN is_debt INTEGER DEFAULT 0').run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

module.exports = {
  db,
  getProducts,
  addProduct,
  updateProduct,
  addStock,
  deleteProduct,
  saveSale,
  getSales,
  getDebtSales,
  getBackups,
  logBackup,
  saveSetting,
  getSetting,
  resetAllData,
  addDebt,
  getDebts,
  markDebtPaid,
};
