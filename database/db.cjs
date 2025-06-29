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
  model TEXT,
  category TEXT DEFAULT 'phones'
);
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME NOT NULL,
  total INTEGER NOT NULL,
  customer_name TEXT
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
CREATE TABLE IF NOT EXISTS customer_debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER,
  customer_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME,
  FOREIGN KEY(sale_id) REFERENCES sales(id)
);
CREATE TABLE IF NOT EXISTS company_debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME
);
CREATE TABLE IF NOT EXISTS monthly_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_sales INTEGER DEFAULT 0,
  total_profit INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  db.exec('ALTER TABLE products ADD COLUMN category TEXT DEFAULT "phones"');
} catch (e) { /* Column already exists */ }
try {
  db.exec('ALTER TABLE sale_items ADD COLUMN buying_price INTEGER DEFAULT 0');
} catch (e) { /* Column already exists */ }
try {
  db.exec('ALTER TABLE sale_items ADD COLUMN profit INTEGER DEFAULT 0');
} catch (e) { /* Column already exists */ }
try {
  db.exec('ALTER TABLE sales ADD COLUMN customer_name TEXT');
} catch (e) { /* Column already exists */ }

// Add new tables for updated features
const newTablesSQL = `
CREATE TABLE IF NOT EXISTS customer_debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER,
  customer_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME,
  FOREIGN KEY(sale_id) REFERENCES sales(id)
);
CREATE TABLE IF NOT EXISTS company_debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME
);
CREATE TABLE IF NOT EXISTS monthly_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_sales INTEGER DEFAULT 0,
  total_profit INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS accessories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL,
  archived INTEGER DEFAULT 0,
  buying_price INTEGER DEFAULT 0,
  brand TEXT,
  model TEXT,
  type TEXT
);
CREATE TABLE IF NOT EXISTS top_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  sold_count INTEGER NOT NULL,
  FOREIGN KEY(product_id) REFERENCES products(id)
);
`;
db.exec(newTablesSQL);

// Migrate old debts table to customer_debts if exists
try {
  const oldDebts = db.prepare('SELECT * FROM debts').all();
  if (oldDebts.length > 0) {
    const insertCustomerDebt = db.prepare('INSERT INTO customer_debts (sale_id, customer_name, amount, created_at, paid_at) VALUES (?, ?, ?, ?, ?)');
    for (const debt of oldDebts) {
      const sale = db.prepare('SELECT total FROM sales WHERE id = ?').get(debt.sale_id);
      insertCustomerDebt.run(debt.sale_id, debt.customer_name, sale ? sale.total : debt.amount || 0, debt.created_at, debt.paid_at);
    }
    // Drop old debts table
    db.exec('DROP TABLE IF EXISTS debts');
  }
} catch (e) {
}

// Always initialize 3 sample products if table is empty (or after reset)
function initializeSampleData() {
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (productCount === 0) {
    const sampleProducts = [
      // Phones
      { name: 'iPhone 15 Pro', price: 1100, stock: 5, ram: '8GB', storage: '256GB', model: 'A17 Pro', category: 'phones' },
      { name: 'Samsung Galaxy S24', price: 699, stock: 8, ram: '8GB', storage: '128GB', model: 'Snapdragon 8 Gen 3', category: 'phones' },

    ];
    const insertProduct = db.prepare(`
      INSERT INTO products (name, price, buying_price, stock, ram, storage, model, category) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    sampleProducts.forEach(product => {
      insertProduct.run(
        product.name,
        product.price, // price
        product.price, // buying price
        product.stock,
        product.ram,
        product.storage,
        product.model,
        product.category
      );
    });
  }

  // Add 100 sales in 10 different months for testing monthly reports
  const salesCount = db.prepare('SELECT COUNT(*) as count FROM sales').get().count;
  if (salesCount < 100) {
    const product = db.prepare('SELECT * FROM products LIMIT 1').get();
    if (product) {
      const insertSale = db.prepare('INSERT INTO sales (total, created_at, is_debt, customer_name) VALUES (?, ?, 0, ?, 0)');
      const insertSaleItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit) VALUES (?, ?, ?, ?, ?, ?)');
      const now = new Date();
      for (let m = 0; m < 10; m++) {
        for (let i = 0; i < 10; i++) {
          const saleDate = new Date(now.getFullYear(), now.getMonth() - m, 2 + i, 10, 0, 0, 0);
          const total = 100 + Math.floor(Math.random() * 900);
          const customer = `Test Customer ${m * 10 + i + 1}`;
          const sale = insertSale.run(total, saleDate.toISOString(), customer);
          const saleId = sale.lastInsertRowid;
          // Add 1-2 items per sale
          const qty = 1 + Math.floor(Math.random() * 2);
          const price = product.price;
          const buyingPrice = product.buying_price;
          const profit = (price - buyingPrice) * qty;
          insertSaleItem.run(saleId, product.id, qty, price, buyingPrice, profit);
        }
      }
    }
  }

  // --- Always clear and regenerate monthly reports for all months with sales ---
  db.prepare('DELETE FROM monthly_reports').run();
  const months = db.prepare("SELECT DISTINCT strftime('%Y', created_at) as year, strftime('%m', created_at) as month FROM sales").all();
  for (const row of months) {
    const y = parseInt(row.year, 10);
    const m = parseInt(row.month, 10);
    createMonthlyReport(m, y);
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
function addProduct({ name, buying_price, price, stock, archived = 0, ram, storage, model, category = 'phones' }) {
  // Check if product with same name already exists
  const existingProduct = db.prepare('SELECT * FROM products WHERE name = ? AND archived = 0').get(name);
  
  if (existingProduct) {
    // Calculate new average buying price
    const currentStock = existingProduct.stock;
    const currentBuyingPrice = existingProduct.buying_price || existingProduct.price;
    const newStock = Number(stock) || 0;
    const newBuyingPrice = Number(price || buying_price) || 0;
    
    const totalStock = currentStock + newStock;
    const averageBuyingPrice = totalStock > 0 ? 
      Math.round(((currentBuyingPrice * currentStock) + (newBuyingPrice * newStock)) / totalStock) : 
      newBuyingPrice;
    
    // Update existing product with new stock and average buying price
    return db.prepare('UPDATE products SET price=?, buying_price=?, stock=stock+?, ram=?, storage=?, model=?, category=? WHERE id=?')
      .run(averageBuyingPrice, averageBuyingPrice, newStock, ram || existingProduct.ram, storage || existingProduct.storage, model || existingProduct.model, category, existingProduct.id);
  } else {
    // Create new product
    return db.prepare('INSERT INTO products (name, price, buying_price, stock, archived, ram, storage, model, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(name, price || buying_price, price || buying_price, stock, archived, ram || null, storage || null, model || null, category);
  }
}
function updateProduct({ id, name, buying_price, price, stock, archived = 0, ram, storage, model, category = 'phones' }) {
  // For clarity: price is the buying price (what admin enters)
  return db.prepare('UPDATE products SET name=?, price=?, buying_price=?, stock=?, archived=?, ram=?, storage=?, model=?, category=? WHERE id=?')
    .run(name, price || buying_price, price || buying_price, stock, archived, ram || null, storage || null, model || null, category, id);
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
function saveSale({ items, total, created_at, is_debt, customer_name }) {
  // Use provided total and created_at if available, else calculate
  const saleTotal = typeof total === 'number' ? total : items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const saleCreatedAt = created_at || new Date().toISOString();
  const saleIsDebt = is_debt ? 1 : 0;

  const transaction = db.transaction(() => {
    // --- STOCK CHECK & UPDATE FOR ALL SALES (INCLUDING DEBT) ---
    for (const item of items) {
      // For all non-debt sales, check and deduct stock
      let product = db.prepare('SELECT stock, name, buying_price FROM products WHERE id = ?').get(item.product_id);
      let isAccessory = false;
      if (!product) {
        // Try accessories table
        product = db.prepare('SELECT stock, name, buying_price FROM accessories WHERE id = ?').get(item.product_id);
        isAccessory = true;
      }
      const qty = Number(item.quantity) || 1;
      if (!product || product.stock < qty) {
        throw new Error(`Insufficient stock for ${isAccessory ? 'accessory' : 'product'}: ${product ? product.name : item.product_id}`);
      }
      // Decrement stock for all sales (normal and debt)
      if (isAccessory) {
        db.prepare('UPDATE accessories SET stock = stock - ? WHERE id = ?').run(qty, item.product_id);
      } else {
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(qty, item.product_id);
      }
    }
    // --- END STOCK CHECK & UPDATE ---

    // Create the sale record
    const sale = db.prepare('INSERT INTO sales (total, created_at, is_debt, customer_name) VALUES (?, ?, ?, ?)').run(saleTotal, saleCreatedAt, saleIsDebt, customer_name || null);
    const saleId = sale.lastInsertRowid;
    // Insert sale items (new schema: support is_accessory and name)
    const insertItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const item of items) {
      // Determine if product or accessory
      let product = db.prepare('SELECT id, price, name FROM products WHERE id = ?').get(item.product_id);
      let isAccessory = false;
      let accessory = null;
      if (!product) {
        accessory = db.prepare('SELECT id, price, name FROM accessories WHERE id = ?').get(item.product_id);
        isAccessory = true;
      }
      if ((!item.product_id || typeof item.product_id !== 'number') && !isAccessory) {
        continue;
      }
      const qty = Number(item.quantity) || 1;
      const buyingPrice = isAccessory ? (accessory ? Number(accessory.price) : 0) : (product ? Number(product.price) : 0);
      const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.price === 'number' ? item.price : 0);
      const profit = (sellingPrice - buyingPrice) * qty;
      // Insert with correct fields
      insertItem.run(
        saleId,
        isAccessory ? null : item.product_id, // product_id only for products
        qty,
        sellingPrice,
        buyingPrice,
        profit,
        isAccessory ? 1 : 0,
        isAccessory ? (accessory ? accessory.name : item.name) : (product ? product.name : item.name)
      );
    }
    return saleId;
  });
  return transaction();
}

function getSales() {
  // Return only non-debt sales with their items and product info
  const sales = db.prepare('SELECT * FROM sales WHERE is_debt = 0 ORDER BY created_at DESC').all();
  // Get all sale items for each sale
  const saleItemsStmt = db.prepare(`
    SELECT si.*, 
      p.name as product_name, p.ram, p.storage, p.model, p.category,
      a.name as accessory_name, a.type as accessory_type
    FROM sale_items si
    LEFT JOIN products p ON si.product_id = p.id AND si.is_accessory = 0
    LEFT JOIN accessories a ON si.product_id = a.id AND si.is_accessory = 1
    WHERE si.sale_id = ?
  `);
  return sales.map(sale => {
    const items = saleItemsStmt.all(sale.id);
    // Separate products and accessories
    const products = items.filter(i => !i.is_accessory).map(i => ({
      ...i,
      name: i.product_name || i.name,
      ram: i.ram,
      storage: i.storage,
      model: i.model,
      category: i.category,
      selling_price: i.selling_price ?? i.price,
      type: undefined // not used for products
    }));
    const accessories = items.filter(i => i.is_accessory).map(i => ({
      ...i,
      name: i.accessory_name || i.name,
      type: i.accessory_type,
      selling_price: i.selling_price ?? i.price,
      ram: undefined,
      storage: undefined,
      model: undefined,
      category: undefined
    }));
    return {
      ...sale,
      products,
      accessories,
      items // keep for compatibility
    };
  });
}

function getDebtSales() {
  // Return only debt sales with their items and product info
  const sales = db.prepare('SELECT * FROM sales WHERE is_debt = 1 ORDER BY created_at DESC').all();
  const saleItemsStmt = db.prepare(`
    SELECT si.id, si.quantity,
      si.price AS selling_price,
      si.buying_price,
      si.profit,
      COALESCE(p.name, a.name) as name
    FROM sale_items si
    LEFT JOIN products p ON si.product_id = p.id
    LEFT JOIN accessories a ON si.product_id = a.id
    WHERE si.sale_id = ?
  `);
  return sales.map(sale => ({
    ...sale,
    items: saleItemsStmt.all(sale.id)
  }));
}
// --- Backup ---
function getBackups() {
  // Only show the current backup and manual backups
  const backups = db.prepare('SELECT * FROM backups ORDER BY created_at DESC').all();
  // Filter: keep only the latest current backup and all manual backups
  const manualBackups = backups.filter(b => b.file_name && b.file_name.startsWith('phone-shop-backup-'));
  const currentBackup = backups.find(b => b.file_name === 'phone-shop-current-backup.sqlite');
  return [currentBackup, ...manualBackups].filter(Boolean);
}
function logBackup({ file_name, encrypted, log }) {
  // Only allow one log entry for current backup (replace if exists)
  if (file_name === 'phone-shop-current-backup.sqlite') {
    db.prepare('DELETE FROM backups WHERE file_name = ?').run(file_name);
  }
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
    try { db.prepare('DELETE FROM customer_debts').run(); } catch (e) { console.log('No customer_debts table:', e.message); }
    try { db.prepare('DELETE FROM company_debts').run(); } catch (e) { console.log('No company_debts table:', e.message); }
    try { db.prepare('DELETE FROM sales').run(); } catch (e) { console.log('No sales table:', e.message); }
    try { db.prepare('DELETE FROM products').run(); } catch (e) { console.log('No products table:', e.message); }
    try { db.prepare('DELETE FROM accessories').run(); } catch (e) { console.log('No accessories table:', e.message); }
    try { db.prepare('DELETE FROM backups').run(); } catch (e) { console.log('No backups table:', e.message); }
    try { db.prepare('DELETE FROM monthly_reports').run(); } catch (e) { console.log('No monthly_reports table:', e.message); }
    try { db.prepare('DELETE FROM top_products').run(); } catch (e) { console.log('No top_products table:', e.message); }
    // Reset auto-increment sequences for all relevant tables
    try {
      db.prepare('DELETE FROM sqlite_sequence WHERE name IN ("products", "sales", "sale_items", "debts", "customer_debts", "company_debts", "backups", "accessories", "monthly_reports", "top_products")').run();
    } catch (e) {
      console.log('No sqlite_sequence table:', e.message);
    }
    // Re-enable foreign key constraints
    db.prepare('PRAGMA foreign_keys = ON').run();
    // Recreate tables to ensure they exist
    db.exec(initSQL);
    db.exec(debtInitSQL);
    db.exec(newTablesSQL); // ensure accessories, customer_debts, company_debts, top_products
    // Always re-initialize sample data after reset
    initializeSampleData();
    return { success: true, message: 'All data, monthly reports, and top products reset successfully.' };
  } catch (error) {
    console.error('Reset error:', error);
    return { success: false, message: `Reset failed: ${error.message}` };
  }
}

// --- Customer Debt functions ---
function addCustomerDebt({ sale_id, customer_name }) {
  // Get the actual sale to get the customer name and amount
  const sale = db.prepare('SELECT total, customer_name FROM sales WHERE id = ?').get(sale_id);
  if (!sale) {
    throw new Error('Sale not found');
  }
  
  const finalCustomerName = customer_name || sale.customer_name || 'Unknown';
  const amount = sale.total;
  
  return db.prepare('INSERT INTO customer_debts (sale_id, customer_name, amount) VALUES (?, ?, ?)')
    .run(sale_id, finalCustomerName, amount);
}
function getCustomerDebts() {
  return db.prepare(`
    SELECT cd.*, 
           COALESCE(cd.amount, s.total) as total,
           COALESCE(cd.customer_name, s.customer_name, 'Unknown') as customer_name,
           s.created_at,
           CASE WHEN cd.paid_at IS NOT NULL THEN 1 ELSE 0 END as paid
    FROM customer_debts cd 
    JOIN sales s ON cd.sale_id = s.id 
    ORDER BY cd.paid_at IS NULL DESC, cd.created_at DESC
  `).all();
}
function markCustomerDebtPaid(id, paid_at) {
  const paidTime = paid_at || new Date().toISOString();
  // Update the debt record
  const result = db.prepare('UPDATE customer_debts SET paid_at = ? WHERE id = ?').run(paidTime, id);
  
  // Get the debt info to update the sale record
  const debt = db.prepare('SELECT sale_id FROM customer_debts WHERE id = ?').get(id);
  if (debt) {
    // Update the sale to mark it as no longer a debt (move to regular sales)
    db.prepare('UPDATE sales SET is_debt = 0 WHERE id = ?').run(debt.sale_id);
  }
  
  return result;
}

// --- Company Debt functions ---
function addCompanyDebt({ company_name, amount, description }) {
  return db.prepare('INSERT INTO company_debts (company_name, amount, description) VALUES (?, ?, ?)')
    .run(company_name, amount, description || null);
}
function getCompanyDebts() {
  return db.prepare('SELECT * FROM company_debts ORDER BY paid_at IS NULL DESC, created_at DESC').all();
}
function markCompanyDebtPaid(id, paid_at) {
  const paidTime = paid_at || new Date().toISOString();
  return db.prepare('UPDATE company_debts SET paid_at = ? WHERE id = ?').run(paidTime, id);
}

// --- Monthly Reports functions ---
function createMonthlyReport(month, year) {
  // Calculate total sales and profit for the month
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 1).toISOString();

  // Total sales and transaction count
  const salesData = db.prepare(`
    SELECT SUM(total) as total_sales, COUNT(*) as sales_count
    FROM sales 
    WHERE created_at >= ? AND created_at < ? AND is_debt = 0
  `).get(startDate, endDate);

  // Profits by type
  const profitRows = db.prepare(`
    SELECT si.profit, a.id as accessory_id
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    LEFT JOIN accessories a ON si.product_id = a.id
    WHERE s.created_at >= ? AND s.created_at < ? AND s.is_debt = 0
  `).all(startDate, endDate);

  let productProfit = 0;
  let accessoryProfit = 0;
  let totalProductsSold = 0;
  let totalAccessoriesSold = 0;
  // Use quantity for correct totals
  profitRows.forEach(row => {
    if (row.accessory_id) {
      accessoryProfit += row.profit;
    } else {
      productProfit += row.profit;
    }
  });

  // For accurate quantities, sum quantities for each type
  const qtyRows = db.prepare(`
    SELECT si.quantity, a.id as accessory_id
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    LEFT JOIN accessories a ON si.product_id = a.id
    WHERE s.created_at >= ? AND s.created_at < ? AND s.is_debt = 0
  `).all(startDate, endDate);
  totalProductsSold = 0;
  totalAccessoriesSold = 0;
  qtyRows.forEach(row => {
    if (row.accessory_id) {
      totalAccessoriesSold += row.quantity;
    } else {
      totalProductsSold += row.quantity;
    }
  });

  const totalSales = salesData.total_sales || 0;
  const totalProfit = productProfit + accessoryProfit;
  const totalTransactions = salesData.sales_count || 0;

  // Save all details in monthly_reports (add new columns if needed)
  // For now, store only total_sales and total_profit as before
  return db.prepare('INSERT INTO monthly_reports (month, year, total_sales, total_profit) VALUES (?, ?, ?, ?)')
    .run(month, year, totalSales, totalProfit);
}

function getMonthlyReports() {
  return db.prepare('SELECT * FROM monthly_reports ORDER BY year DESC, month DESC').all();
}

function resetMonthlySalesAndProfit() {
  // This function should be called on the first day of each month
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  // Check if report for previous month exists, if not create it
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  
  const existingReport = db.prepare('SELECT * FROM monthly_reports WHERE month = ? AND year = ?').get(prevMonth, prevYear);
  if (!existingReport) {
    createMonthlyReport(prevMonth, prevYear);
  }
  
  return true;
}

// --- Debt functions (backward compatibility) ---
function addDebt({ sale_id, customer_name }) {
  return addCustomerDebt({ sale_id, customer_name });
}
function getDebts() {
  return getCustomerDebts();
}
function markDebtPaid(id, paid_at) {
  return markCustomerDebtPaid(id, paid_at);
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

// --- Accessory CRUD ---
function getAccessories() {
  return db.prepare('SELECT * FROM accessories WHERE archived = 0').all();
}
function getAllAccessories() {
  return db.prepare('SELECT * FROM accessories').all();
}
function addAccessory({ name, buying_price, price, stock, archived = 0, brand, model, type }) {
  // Check if accessory with same name already exists
  const existingAccessory = db.prepare('SELECT * FROM accessories WHERE name = ? AND archived = 0').get(name);
  
  if (existingAccessory) {
    // Calculate new average buying price
    const currentStock = existingAccessory.stock;
    const currentBuyingPrice = existingAccessory.buying_price || existingAccessory.price;
    const newStock = Number(stock) || 0;
    const newBuyingPrice = Number(price || buying_price) || 0;
    
    const totalStock = currentStock + newStock;
    const averageBuyingPrice = totalStock > 0 ? 
      Math.round(((currentBuyingPrice * currentStock) + (newBuyingPrice * newStock)) / totalStock) : 
      newBuyingPrice;
    
    // Update existing accessory with new stock and average buying price
    return db.prepare('UPDATE accessories SET price=?, buying_price=?, stock=stock+?, brand=?, model=?, type=? WHERE id=?')
      .run(averageBuyingPrice, averageBuyingPrice, newStock, brand || existingAccessory.brand, model || existingAccessory.model, type || existingAccessory.type, existingAccessory.id);
  } else {
    // Create new accessory
    return db.prepare('INSERT INTO accessories (name, price, buying_price, stock, archived, brand, model, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(name, price || buying_price, price || buying_price, stock, archived, brand || null, model || null, type || null);
  }
}
function updateAccessory({ id, name, buying_price, price, stock, archived = 0, brand, model, type }) {
  return db.prepare('UPDATE accessories SET name=?, price=?, buying_price=?, stock=?, archived=?, brand=?, model=?, type=? WHERE id=?')
    .run(name, price || buying_price, price || buying_price, stock, archived, brand || null, model || null, type || null, id);
}
function deleteAccessory(id) {
  // Instead of deleting, archive the accessory to preserve foreign key integrity
  return db.prepare('UPDATE accessories SET archived = 1 WHERE id = ?').run(id);
}

// --- Return functionality ---
function returnSale(saleId) {
  const transaction = db.transaction(() => {
    // Get the sale
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
    if (!sale) {
      throw new Error('Sale not found');
    }

    // Get all sale items
    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
    
    // Restore stock for each item
    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      if (item.is_accessory) {
        db.prepare('UPDATE accessories SET stock = stock + ? WHERE id = ?').run(qty, item.product_id);
      } else {
        db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(qty, item.product_id);
      }
    }

    // Delete the sale items
    db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(saleId);
    
    // Delete the sale
    db.prepare('DELETE FROM sales WHERE id = ?').run(saleId);
    
    // If this was a debt sale, also remove the debt record
    db.prepare('DELETE FROM customer_debts WHERE sale_id = ?').run(saleId);
    
    return true;
  });
  
  return transaction();
}

function returnSaleItem(saleId, itemId) {
  const transaction = db.transaction(() => {
    // Get the sale item
    const item = db.prepare('SELECT * FROM sale_items WHERE id = ? AND sale_id = ?').get(itemId, saleId);
    if (!item) {
      throw new Error('Sale item not found');
    }

    // Restore stock
    const qty = Number(item.quantity) || 1;
    if (item.is_accessory) {
      db.prepare('UPDATE accessories SET stock = stock + ? WHERE id = ?').run(qty, item.product_id);
    } else {
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(qty, item.product_id);
    }

    // Remove the item from sale
    db.prepare('DELETE FROM sale_items WHERE id = ?').run(itemId);
    
    // Recalculate sale total
    const remainingItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
    const newTotal = remainingItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (remainingItems.length === 0) {
      // No items left, delete the entire sale
      db.prepare('DELETE FROM sales WHERE id = ?').run(saleId);
      db.prepare('DELETE FROM customer_debts WHERE sale_id = ?').run(saleId);
    } else {
      // Update sale total
      db.prepare('UPDATE sales SET total = ? WHERE id = ?').run(newTotal, saleId);
      
      // Update debt amount if this is a debt sale
      db.prepare('UPDATE customer_debts SET amount = ? WHERE sale_id = ?').run(newTotal, saleId);
    }
    
    return true;
  });
  
  return transaction();
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
  // New functions
  addCustomerDebt,
  getCustomerDebts,
  markCustomerDebtPaid,
  addCompanyDebt,
  getCompanyDebts,
  markCompanyDebtPaid,
  createMonthlyReport,
  getMonthlyReports,
  resetMonthlySalesAndProfit,
  // Accessory functions
  getAccessories,
  getAllAccessories,
  addAccessory,
  updateAccessory,
  deleteAccessory,
  // Return functions
  returnSale,
  returnSaleItem,
};
