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
  barcode TEXT UNIQUE NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL,
  archived INTEGER DEFAULT 0
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
`;
db.exec(initSQL);

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
CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password TEXT NOT NULL
);
`;
db.exec(shopInitSQL);

// Ensure admin password exists
const adminRow = db.prepare('SELECT * FROM admin WHERE id = 1').get();
if (!adminRow) {
  db.prepare('INSERT INTO admin (id, password) VALUES (1, ?)').run('admin123');
}

// --- Product CRUD ---
function getProducts() {
  return db.prepare('SELECT * FROM products').all();
}
function addProduct({ name, price, stock, ram, storage }) {
  return db.prepare('INSERT INTO products (name, price, stock, archived, ram, storage) VALUES (?, ?, ?, 0, ?, ?)')
    .run(name, price, stock, ram || null, storage || null);
}
function updateProduct({ id, name, price, stock, archived, ram, storage }) {
  return db.prepare('UPDATE products SET name=?, price=?, stock=?, archived=?, ram=?, storage=? WHERE id=?')
    .run(name, price, stock, archived, ram || null, storage || null, id);
}
function updateProductNoArchive({ id, name, price, stock, ram, storage }) {
  return db.prepare('UPDATE products SET name=?, price=?, stock=?, ram=?, storage=? WHERE id=?')
    .run(name, price, stock, ram || null, storage || null, id);
}
function addStock(id, amount) {
  return db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(amount, id);
}
function deleteProduct(id) {
  // Instead of deleting, archive the product to preserve foreign key integrity
  return db.prepare('UPDATE products SET archived = 1 WHERE id = ?').run(id);
}
// --- Sales ---
function saveSale({ items, total, created_at }) {
  // Use provided total and created_at if available, else calculate
  const saleTotal = typeof total === 'number' ? total : items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const saleCreatedAt = created_at || new Date().toISOString();
  const sale = db.prepare('INSERT INTO sales (total, created_at) VALUES (?, ?)').run(saleTotal, saleCreatedAt);
  const saleId = sale.lastInsertRowid;
  const insertItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
  for (const item of items) {
    // Check if product exists and is not deleted
    const productExists = db.prepare('SELECT id FROM products WHERE id = ?').get(item.product_id);
    if (!item.product_id || typeof item.product_id !== 'number' || !productExists) {
      console.warn('Skipping sale item with invalid or missing product_id:', item);
      continue;
    }
    const qty = Number(item.quantity) || 1;
    insertItem.run(saleId, item.product_id, qty, item.price);
    if (!item.isReturn) {
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(qty, item.product_id);
    } else {
      // If return, increase stock
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(qty, item.product_id);
    }
  }
  return saleId;
}
function getSales() {
  // Return sales with their items and product info
  const sales = db.prepare('SELECT * FROM sales ORDER BY created_at DESC').all();
  const saleItemsStmt = db.prepare(`
    SELECT si.id, si.quantity, si.price, p.name
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
  db.prepare('DELETE FROM sale_items').run();
  db.prepare('DELETE FROM sales').run();
  db.prepare('DELETE FROM products').run();
  db.prepare('DELETE FROM sqlite_sequence WHERE name IN ("products", "sales", "sale_items")').run();
}

// --- Debt functions ---
function addDebt({ sale_id, customer_name }) {
  return db.prepare('INSERT INTO debts (sale_id, customer_name) VALUES (?, ?)')
    .run(sale_id, customer_name);
}
function getDebts() {
  return db.prepare('SELECT d.*, s.total, s.created_at FROM debts d JOIN sales s ON d.sale_id = s.id ORDER BY d.paid, d.created_at DESC').all();
}
function markDebtPaid(id) {
  return db.prepare('UPDATE debts SET paid = 1, paid_at = ? WHERE id = ?').run(new Date().toISOString(), id);
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
  getBackups,
  logBackup,
  saveSetting,
  getSetting,
  resetAllData,
  addDebt,
  getDebts,
  markDebtPaid,
};
