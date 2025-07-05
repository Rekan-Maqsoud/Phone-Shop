// SQLite setup using better-sqlite3
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Export a function that accepts a database path
module.exports = function(dbPath) {
  // Use provided path or default to local path
  const finalDbPath = dbPath || path.join(__dirname, 'shop.sqlite');
  const db = new Database(finalDbPath);

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
  customer_name TEXT,
  is_debt INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  price INTEGER,
  buying_price INTEGER DEFAULT 0,
  profit INTEGER DEFAULT 0,
  is_accessory INTEGER DEFAULT 0,
  name TEXT,
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
  has_items INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME
);
CREATE TABLE IF NOT EXISTS monthly_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_sales INTEGER DEFAULT 0,
  total_profit INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE TABLE IF NOT EXISTS accessories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  buying_price INTEGER DEFAULT 0,
  stock INTEGER NOT NULL,
  archived INTEGER DEFAULT 0,
  brand TEXT,
  model TEXT,
  type TEXT
);
`;
// Create performance indexes for better query performance
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_archived ON products(archived);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_customer_debts_paid_at ON customer_debts(paid_at);
    CREATE INDEX IF NOT EXISTS idx_accessories_archived ON accessories(archived);
    CREATE INDEX IF NOT EXISTS idx_accessories_name ON accessories(name);
  `);

} catch (e) {
  console.warn('Database index creation warning:', e.message);
}

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
try {
  db.exec('ALTER TABLE company_debts ADD COLUMN has_items INTEGER DEFAULT 0');
} catch (e) { /* Column already exists */ }

// Add columns for accessories support in sale_items
try {
  db.exec('ALTER TABLE sale_items ADD COLUMN is_accessory INTEGER DEFAULT 0');
} catch (e) { /* Column already exists */ }
try {
  db.exec('ALTER TABLE sale_items ADD COLUMN name TEXT');
} catch (e) { /* Column already exists */ }

// Add new enhanced tables for buying history system
const enhancedTablesSQL = `
CREATE TABLE IF NOT EXISTS company_debt_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  debt_id INTEGER NOT NULL,
  item_type TEXT NOT NULL, -- 'product' or 'accessory'
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  buying_price INTEGER,
  ram TEXT,
  storage TEXT,
  model TEXT,
  brand TEXT,
  type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(debt_id) REFERENCES company_debts(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS buying_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_debt_id INTEGER,
  company_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  has_items INTEGER DEFAULT 0,
  paid_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_debt_id) REFERENCES company_debts(id)
);
`;
db.exec(enhancedTablesSQL);

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
      // Use itemType from frontend to determine if product or accessory
      const isAccessory = item.itemType === 'accessory';
      let product = null;
      let accessory = null;
      
      if (isAccessory) {
        accessory = db.prepare('SELECT stock, name, buying_price FROM accessories WHERE id = ?').get(item.product_id);
      } else {
        product = db.prepare('SELECT stock, name, buying_price FROM products WHERE id = ?').get(item.product_id);
      }
      
      const itemData = isAccessory ? accessory : product;
      const qty = Number(item.quantity) || 1;
      
      if (!itemData || itemData.stock < qty) {
        throw new Error(`Insufficient stock for ${isAccessory ? 'accessory' : 'product'}: ${itemData ? itemData.name : item.product_id}`);
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
      // Use itemType from frontend to determine if product or accessory
      const isAccessory = item.itemType === 'accessory';
      let product = null;
      let accessory = null;
      
      if (isAccessory) {
        accessory = db.prepare('SELECT id, buying_price, name FROM accessories WHERE id = ?').get(item.product_id);
      } else {
        product = db.prepare('SELECT id, buying_price, name FROM products WHERE id = ?').get(item.product_id);
      }
      
      const itemData = isAccessory ? accessory : product;
      
      if ((!item.product_id || typeof item.product_id !== 'number') && !itemData) {
        continue;
      }
      
      const qty = Number(item.quantity) || 1;
      const buyingPrice = itemData ? Number(itemData.buying_price) : 0;
      const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.price === 'number' ? item.price : 0);
      const profit = (sellingPrice - buyingPrice) * qty;
      
      // Insert with correct fields
      insertItem.run(
        saleId,
        item.product_id, // store the ID for both products and accessories
        qty,
        sellingPrice,
        buyingPrice,
        profit,
        isAccessory ? 1 : 0,
        itemData ? itemData.name : item.name
      );
    }
    return saleId;
  });
  return transaction();
}

function getSales() {
  // Return non-debt sales AND paid debt sales (when customer_debts.paid_at is not null)
  const sales = db.prepare(`
    SELECT DISTINCT s.* 
    FROM sales s
    LEFT JOIN customer_debts cd ON s.id = cd.sale_id
    WHERE s.is_debt = 0 OR (s.is_debt = 1 AND cd.paid_at IS NOT NULL)
    ORDER BY s.created_at DESC
  `).all();
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

// Add missing accessories table to the initial schema
const newTablesSQL = `
CREATE TABLE IF NOT EXISTS accessories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  buying_price INTEGER DEFAULT 0,
  stock INTEGER NOT NULL,
  archived INTEGER DEFAULT 0,
  brand TEXT,
  model TEXT,
  type TEXT
);
`;
db.exec(newTablesSQL);

// Add total_spent column to monthly_reports table if it doesn't exist
try {
  // Check if the column exists first
  const columns = db.pragma('table_info(monthly_reports)');
  const hasColumn = columns.some(col => col.name === 'total_spent');
  
  if (!hasColumn) {
    db.exec('ALTER TABLE monthly_reports ADD COLUMN total_spent INTEGER DEFAULT 0');
  }
} catch (e) { 
  console.error('Error adding total_spent column:', e.message);
}

// Migration: Make company_debt_id nullable in buying_history for paid purchases
try {
  // Check if we need to recreate the table to make company_debt_id nullable
  const tableInfo = db.pragma('table_info(buying_history)');
  const debtIdColumn = tableInfo.find(col => col.name === 'company_debt_id');
  
  if (debtIdColumn && debtIdColumn.notnull === 1) {

    
    // Backup existing data
    const existingData = db.prepare('SELECT * FROM buying_history').all();
    
    // Drop and recreate the table with the new schema
    db.exec(`
      DROP TABLE IF EXISTS buying_history_backup;
      CREATE TABLE buying_history_backup AS SELECT * FROM buying_history;
      DROP TABLE buying_history;
      CREATE TABLE buying_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_debt_id INTEGER,
        company_name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        description TEXT,
        has_items INTEGER DEFAULT 0,
        paid_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(company_debt_id) REFERENCES company_debts(id)
      );
    `);
    
    // Restore data
    if (existingData.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO buying_history (id, company_debt_id, company_name, amount, description, has_items, paid_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const row of existingData) {
        insertStmt.run(row.id, row.company_debt_id, row.company_name, row.amount, row.description, row.has_items, row.paid_at, row.created_at);
      }
    }
    
    // Clean up backup table
    db.exec('DROP TABLE IF EXISTS buying_history_backup');

  }
} catch (e) {
  console.log('Migration for buying_history table error:', e.message);
}

function resetAllData() {
  try {
    // Disable foreign key constraints temporarily
    db.prepare('PRAGMA foreign_keys = OFF').run();
    // Delete data in the correct order to avoid foreign key issues
    try { db.prepare('DELETE FROM sale_items').run(); } catch (e) { console.log('No sale_items table:', e.message); }
    try { db.prepare('DELETE FROM debts').run(); } catch (e) { console.log('No debts table:', e.message); }
    try { db.prepare('DELETE FROM customer_debts').run(); } catch (e) { console.log('No customer_debts table:', e.message); }
    try { db.prepare('DELETE FROM company_debts').run(); } catch (e) { console.log('No company_debts table:', e.message); }
    try { db.prepare('DELETE FROM buying_history').run(); } catch (e) { console.log('No buying_history table:', e.message); }
    try { db.prepare('DELETE FROM sales').run(); } catch (e) { console.log('No sales table:', e.message); }
    try { db.prepare('DELETE FROM products').run(); } catch (e) { console.log('No products table:', e.message); }
    try { db.prepare('DELETE FROM accessories').run(); } catch (e) { console.log('No accessories table:', e.message); }
    try { db.prepare('DELETE FROM backups').run(); } catch (e) { console.log('No backups table:', e.message); }
    try { db.prepare('DELETE FROM monthly_reports').run(); } catch (e) { console.log('No monthly_reports table:', e.message); }
    // Reset auto-increment sequences for all relevant tables
    try {
      db.prepare('DELETE FROM sqlite_sequence WHERE name IN ("products", "sales", "sale_items", "debts", "customer_debts", "company_debts", "buying_history", "backups", "accessories", "monthly_reports")').run();
    } catch (e) {
 
    }
    // Re-enable foreign key constraints
    db.prepare('PRAGMA foreign_keys = ON').run();
    // Recreate tables to ensure they exist
    db.exec(initSQL);
    db.exec(debtInitSQL);
    db.exec(newTablesSQL); // ensure accessories, customer_debts, company_debts
    // Always re-initialize sample data after reset
    initializeSampleData();
    return { success: true, message: 'All data and monthly reports reset successfully.' };
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
  
  const transaction = db.transaction(() => {
    // Get the debt info
    const debt = db.prepare('SELECT sale_id FROM customer_debts WHERE id = ?').get(id);
    if (!debt) throw new Error('Debt not found');
    
    // Update the debt record as paid (but keep the debt record for tracking)
    const result = db.prepare('UPDATE customer_debts SET paid_at = ? WHERE id = ?').run(paidTime, id);
    
    // DON'T move the sale from debt to regular sales history
    // Keep the sale as is_debt = 1 so it stays in debt sales
    // The paid_at timestamp in customer_debts table will indicate it's paid
    
    return result;
  });
  
  return transaction();
}

// --- Company Debt functions ---
function addCompanyDebt({ company_name, amount, description }) {
  return db.prepare('INSERT INTO company_debts (company_name, amount, description) VALUES (?, ?, ?)')
    .run(company_name, amount, description || null);
}

// Enhanced function to add company debt with items
function addCompanyDebtWithItems({ company_name, description, items }) {
  const transaction = db.transaction(() => {
    // Calculate total amount from items
    const total_amount = items.reduce((sum, item) => sum + (item.total_price || (item.unit_price * item.quantity)), 0);
    
    // Insert the main debt record
    const debtResult = db.prepare('INSERT INTO company_debts (company_name, amount, description, has_items) VALUES (?, ?, ?, 1)')
      .run(company_name, total_amount, description || null);
    
    const debtId = debtResult.lastInsertRowid;
    
    // Insert each item
    const insertItem = db.prepare(`
      INSERT INTO company_debt_items (debt_id, item_type, item_name, quantity, unit_price, total_price, buying_price, ram, storage, model, brand, type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    items.forEach(item => {
      const total_price = item.total_price || (item.unit_price * item.quantity);
      insertItem.run(
        debtId,
        item.item_type,
        item.item_name,
        item.quantity,
        item.unit_price,
        total_price,
        item.buying_price || item.unit_price,
        item.ram || null,
        item.storage || null,
        item.model || null,
        item.brand || null,
        item.type || null
      );
      
      // Update or create inventory
      if (item.item_type === 'product') {
        // Check if product exists
        const existingProduct = db.prepare('SELECT id, stock FROM products WHERE name = ? AND (ram = ? OR ram IS NULL) AND (storage = ? OR storage IS NULL)').get(item.item_name, item.ram || null, item.storage || null);
        
        if (existingProduct) {
          // Update existing product stock
          db.prepare('UPDATE products SET stock = stock + ?, buying_price = ? WHERE id = ?')
            .run(item.quantity, item.buying_price || item.unit_price, existingProduct.id);
        } else {
          // Create new product
          db.prepare(`
            INSERT INTO products (name, price, buying_price, stock, ram, storage, model, category)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'phones')
          `).run(item.item_name, item.unit_price, item.buying_price || item.unit_price, item.quantity, item.ram || null, item.storage || null, item.model || null);
        }
      } else if (item.item_type === 'accessory') {
        // Check if accessory exists
        const existingAccessory = db.prepare('SELECT id, stock FROM accessories WHERE name = ? AND (brand = ? OR brand IS NULL) AND (type = ? OR type IS NULL)').get(item.item_name, item.brand || null, item.type || null);
        
        if (existingAccessory) {
          // Update existing accessory stock
          db.prepare('UPDATE accessories SET stock = stock + ?, buying_price = ? WHERE id = ?')
            .run(item.quantity, item.buying_price || item.unit_price, existingAccessory.id);
        } else {
          // Create new accessory
          db.prepare(`
            INSERT INTO accessories (name, price, buying_price, stock, brand, type, model)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(item.item_name, item.unit_price, item.buying_price || item.unit_price, item.quantity, item.brand || null, item.type || null, item.model || null);
        }
      }
    });
    
    return debtResult;
  });
  
  return transaction();
}

function getCompanyDebts() {
  return db.prepare('SELECT * FROM company_debts ORDER BY company_name ASC, paid_at IS NULL DESC, created_at DESC').all();
}

function getCompanyDebtItems(debtId) {
  return db.prepare('SELECT * FROM company_debt_items WHERE debt_id = ? ORDER BY created_at DESC').all(debtId);
}

function markCompanyDebtPaid(id, paid_at) {
  const paidTime = paid_at || new Date().toISOString();
  
  const transaction = db.transaction(() => {
    // Get the debt info
    const debt = db.prepare('SELECT * FROM company_debts WHERE id = ?').get(id);
    if (!debt) throw new Error('Debt not found');
    
    // Update the debt as paid
    const result = db.prepare('UPDATE company_debts SET paid_at = ? WHERE id = ?').run(paidTime, id);
    
    // Add to buying history
    db.prepare(`
      INSERT INTO buying_history (company_debt_id, company_name, amount, description, has_items, paid_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, debt.company_name, debt.amount, debt.description, debt.has_items || 0, paidTime);
    
    return result;
  });
  
  return transaction();
}

// --- Buying History functions ---
function getBuyingHistory() {
  return db.prepare(`
    SELECT bh.*, cd.created_at as original_created_at
    FROM buying_history bh
    LEFT JOIN company_debts cd ON bh.company_debt_id = cd.id
    ORDER BY bh.paid_at DESC
  `).all();
}

function getBuyingHistoryWithItems() {
  const buyingHistory = getBuyingHistory();
  
  return buyingHistory.map(entry => {
    if (entry.has_items) {
      const items = db.prepare('SELECT * FROM company_debt_items WHERE debt_id = ?').all(entry.company_debt_id);
      return { ...entry, items };
    }
    return entry;
  });
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
    SELECT si.profit, si.is_accessory
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.created_at >= ? AND s.created_at < ? AND s.is_debt = 0
  `).all(startDate, endDate);

  let productProfit = 0;
  let accessoryProfit = 0;
  let totalProductsSold = 0;
  let totalAccessoriesSold = 0;
  // Use quantity for correct totals
  profitRows.forEach(row => {
    if (row.is_accessory) {
      accessoryProfit += row.profit;
    } else {
      productProfit += row.profit;
    }
  });

  // For accurate quantities, sum quantities for each type
  const qtyRows = db.prepare(`
    SELECT si.quantity, si.is_accessory
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.created_at >= ? AND s.created_at < ? AND s.is_debt = 0
  `).all(startDate, endDate);
  totalProductsSold = 0;
  totalAccessoriesSold = 0;
  qtyRows.forEach(row => {
    if (row.is_accessory) {
      totalAccessoriesSold += row.quantity;
    } else {
      totalProductsSold += row.quantity;
    }
  });

  const totalSales = salesData.total_sales || 0;
  const totalProfit = productProfit + accessoryProfit;
  const totalTransactions = salesData.sales_count || 0;

  // Calculate total spending (use buying history for actual cash spent)
  // This avoids double-counting inventory costs vs debt payments
  let totalSpent = 0;
  
  // Get all buying history entries for this month (actual payments made)
  const buyingHistorySpent = db.prepare(`
    SELECT amount
    FROM buying_history
    WHERE paid_at >= ? AND paid_at < ?
  `).all(startDate, endDate);
  
  buyingHistorySpent.forEach(purchase => {
    totalSpent += purchase.amount || 0;
  });

  // Save all details in monthly_reports including total spent
  return db.prepare('INSERT INTO monthly_reports (month, year, total_sales, total_profit, total_spent) VALUES (?, ?, ?, ?, ?)')
    .run(month, year, totalSales, totalProfit, totalSpent);
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

// Fix foreign key constraint for sale_items to handle accessories
// Since sale_items can reference both products and accessories, we need to drop the FK constraint
try {
  // Check if the foreign key constraint exists and drop it
  // SQLite doesn't support dropping constraints directly, so we need to recreate the table
  const tableInfo = db.prepare("PRAGMA foreign_key_list(sale_items)").all();
  const hasProductFK = tableInfo.some(fk => fk.table === 'products');
  
  if (hasProductFK) {
    // Disable foreign keys temporarily
    db.prepare('PRAGMA foreign_keys = OFF').run();
    
    // Create new table without the foreign key constraint
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
        FOREIGN KEY(sale_id) REFERENCES sales(id)
      );
    `);
    
    // Copy data from old table
    db.exec(`
      INSERT INTO sale_items_new (id, sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name)
      SELECT id, sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name
      FROM sale_items;
    `);
    
    // Drop old table and rename new one
    db.exec('DROP TABLE sale_items');
    db.exec('ALTER TABLE sale_items_new RENAME TO sale_items');
    
    // Re-enable foreign keys
    db.prepare('PRAGMA foreign_keys = ON').run();
  }
} catch (e) {

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
    const newBuyingPrice = Number(buying_price || price) || 0;
    
    const totalStock = currentStock + newStock;
    const averageBuyingPrice = totalStock > 0 ? 
      Math.round(((currentBuyingPrice * currentStock) + (newBuyingPrice * newStock)) / totalStock) : 
      newBuyingPrice;
    
    // Update existing accessory with new stock and average buying price
    return db.prepare('UPDATE accessories SET buying_price=?, stock=stock+?, brand=?, model=?, type=? WHERE id=?')
      .run(averageBuyingPrice, newStock, brand || existingAccessory.brand, model || existingAccessory.model, type || existingAccessory.type, existingAccessory.id);
  } else {
    // Create new accessory - only store buying price, selling price will be determined at point of sale
    return db.prepare('INSERT INTO accessories (name, buying_price, stock, archived, brand, model, type) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(name, buying_price || price, stock, archived, brand || null, model || null, type || null);
  }
}
function updateAccessory({ id, name, buying_price, price, stock, archived = 0, brand, model, type }) {
  // Only update buying price, not selling price
  return db.prepare('UPDATE accessories SET name=?, buying_price=?, stock=?, archived=?, brand=?, model=?, type=? WHERE id=?')
    .run(name, buying_price || price, stock, archived, brand || null, model || null, type || null, id);
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
    
    // Restore stock for each item and unarchive if needed
    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      if (item.is_accessory) {
        // Unarchive and restore stock for accessories
        db.prepare('UPDATE accessories SET stock = stock + ?, archived = 0 WHERE id = ?').run(qty, item.product_id);
      } else {
        // Unarchive and restore stock for products  
        db.prepare('UPDATE products SET stock = stock + ?, archived = 0 WHERE id = ?').run(qty, item.product_id);
      }
    }

    // Delete the sale items
    db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(saleId);
    
    // If this was a debt sale, remove the debt record FIRST (before deleting the sale due to foreign key constraint)
    db.prepare('DELETE FROM customer_debts WHERE sale_id = ?').run(saleId);
    
    // Delete the sale
    db.prepare('DELETE FROM sales WHERE id = ?').run(saleId);
    
    return true;
  });
  
  return transaction();
}

function returnSaleItem(saleId, itemId, returnQuantity = null) {
  const transaction = db.transaction(() => {
    // Get the sale item
    const item = db.prepare('SELECT * FROM sale_items WHERE id = ? AND sale_id = ?').get(itemId, saleId);
    if (!item) {
      throw new Error('Sale item not found');
    }

    const currentQuantity = Number(item.quantity) || 1;
    const returnQty = returnQuantity !== null ? Math.min(returnQuantity, currentQuantity) : currentQuantity;
    
    if (returnQty <= 0) {
      throw new Error('Invalid return quantity');
    }

    // Restore stock and unarchive if needed - check if product/accessory exists first
    if (item.is_accessory) {
      // Check if accessory exists before updating
      const accessory = db.prepare('SELECT id FROM accessories WHERE id = ?').get(item.product_id);
      if (accessory) {
        db.prepare('UPDATE accessories SET stock = stock + ?, archived = 0 WHERE id = ?').run(returnQty, item.product_id);
      }
    } else {
      // Check if product exists before updating
      const product = db.prepare('SELECT id FROM products WHERE id = ?').get(item.product_id);
      if (product) {
        db.prepare('UPDATE products SET stock = stock + ?, archived = 0 WHERE id = ?').run(returnQty, item.product_id);
      }
    }

    const newQuantity = currentQuantity - returnQty;
    const unitPrice = item.price;
    
    if (newQuantity <= 0) {
      // Remove the item completely from sale
      db.prepare('DELETE FROM sale_items WHERE id = ?').run(itemId);
    } else {
      // Update the item quantity - keeping unit price per item, not total price
      db.prepare('UPDATE sale_items SET quantity = ? WHERE id = ?').run(newQuantity, itemId);
    }
    
    // Recalculate sale total
    const remainingItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
    const newTotal = remainingItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (remainingItems.length === 0) {
      // No items left, delete the entire sale and related debt records
      db.prepare('DELETE FROM customer_debts WHERE sale_id = ?').run(saleId);
      db.prepare('DELETE FROM sales WHERE id = ?').run(saleId);
    } else {
      // Update sale total
      db.prepare('UPDATE sales SET total = ? WHERE id = ?').run(newTotal, saleId);
      
      // Update debt amount if this is a debt sale (check if debt exists first)
      const debtExists = db.prepare('SELECT id FROM customer_debts WHERE sale_id = ?').get(saleId);
      if (debtExists) {
        db.prepare('UPDATE customer_debts SET amount = ? WHERE sale_id = ?').run(newTotal, saleId);
      }
    }
    
    return true;
  });
  
  return transaction();
}

// Return functions for buying history
function returnBuyingHistoryEntry(entryId) {
  const transaction = db.transaction(() => {
    // Get the buying history entry
    const entry = db.prepare('SELECT * FROM buying_history WHERE id = ?').get(entryId);
    if (!entry) {
      throw new Error('Buying history entry not found');
    }

    // If entry has items, restore stock by decreasing it
    if (entry.has_items && entry.company_debt_id) {
      const items = db.prepare('SELECT * FROM company_debt_items WHERE debt_id = ?').all(entry.company_debt_id);
      
      for (const item of items) {
        const qty = Number(item.quantity) || 1;
        if (item.item_type === 'accessory') {
          // Decrease accessory stock (opposite of sales return)
          db.prepare('UPDATE accessories SET stock = stock - ? WHERE name = ?').run(qty, item.item_name);
        } else {
          // Decrease product stock (opposite of sales return)
          const productUpdate = db.prepare(`
            UPDATE products 
            SET stock = stock - ? 
            WHERE name = ? AND model = ? AND ram = ? AND storage = ?
          `);
          productUpdate.run(qty, item.item_name, item.model || '', item.ram || '', item.storage || '');
        }
      }
    }

    // Delete the buying history entry
    db.prepare('DELETE FROM buying_history WHERE id = ?').run(entryId);
    
    return { success: true, returnedAmount: entry.amount };
  });
  
  return transaction();
}

function returnBuyingHistoryItem(entryId, itemId, returnQuantity = null) {
  const transaction = db.transaction(() => {
    // Get the buying history entry
    const entry = db.prepare('SELECT * FROM buying_history WHERE id = ?').get(entryId);
    if (!entry) {
      throw new Error('Buying history entry not found');
    }

    if (!entry.has_items || !entry.company_debt_id) {
      throw new Error('Buying history entry has no items');
    }

    // Get the specific item
    const item = db.prepare('SELECT * FROM company_debt_items WHERE id = ? AND debt_id = ?').get(itemId, entry.company_debt_id);
    if (!item) {
      throw new Error('Item not found in buying history');
    }

    const currentQuantity = Number(item.quantity) || 1;
    const returnQty = returnQuantity !== null ? Math.min(returnQuantity, currentQuantity) : currentQuantity;
    
    if (returnQty <= 0) {
      throw new Error('Invalid return quantity');
    }

    // Decrease stock (opposite of sales return)
    if (item.item_type === 'accessory') {
      db.prepare('UPDATE accessories SET stock = stock - ? WHERE name = ?').run(returnQty, item.item_name);
    } else {
      const productUpdate = db.prepare(`
        UPDATE products 
        SET stock = stock - ? 
        WHERE name = ? AND model = ? AND ram = ? AND storage = ?
      `);
      productUpdate.run(returnQty, item.item_name, item.model || '', item.ram || '', item.storage || '');
    }

    const newQuantity = currentQuantity - returnQty;
    const returnedAmount = item.unit_price * returnQty;
    
    if (newQuantity <= 0) {
      // Remove the item completely
      db.prepare('DELETE FROM company_debt_items WHERE id = ?').run(itemId);
    } else {
      // Update the item quantity and total price
      const newTotalPrice = item.unit_price * newQuantity;
      db.prepare('UPDATE company_debt_items SET quantity = ?, total_price = ? WHERE id = ?').run(newQuantity, newTotalPrice, itemId);
    }
    
    // Recalculate buying history entry total
    const remainingItems = db.prepare('SELECT * FROM company_debt_items WHERE debt_id = ?').all(entry.company_debt_id);
    const newTotal = remainingItems.reduce((sum, item) => sum + item.total_price, 0);
    
    if (remainingItems.length === 0) {
      // No items left, delete the entire entry
      db.prepare('DELETE FROM buying_history WHERE id = ?').run(entryId);
    } else {
      // Update entry total
      db.prepare('UPDATE buying_history SET amount = ? WHERE id = ?').run(newTotal, entryId);
    }
    
    return { success: true, returnedAmount, newTotal: remainingItems.length > 0 ? newTotal : 0 };
  });
  
  return transaction();
}

// Direct Purchase functions
function addDirectPurchase(purchaseData) {
  const { company_name, amount, description, paid_at } = purchaseData;
  
  const transaction = db.transaction(() => {
    // Insert into buying_history without items
    const insertPurchase = db.prepare(`
      INSERT INTO buying_history (company_name, amount, description, has_items, paid_at)
      VALUES (?, ?, ?, 0, ?)
    `);
    
    const result = insertPurchase.run(company_name, amount, description || '', paid_at || new Date().toISOString());
    return { success: true, id: result.lastInsertRowid };
  });
  
  return transaction();
}

function addDirectPurchaseWithItems(purchaseData) {
  const { company_name, description, items, paid_at } = purchaseData;
  
  const transaction = db.transaction(() => {
    // Calculate total amount from items
    const totalAmount = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    
    // Create a company debt first to link items
    const insertDebt = db.prepare(`
      INSERT INTO company_debts (company_name, amount, description, created_at, paid_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const debtResult = insertDebt.run(
      company_name,
      totalAmount,
      description || '',
      new Date().toISOString(),
      paid_at || new Date().toISOString()
    );
    
    const debtId = debtResult.lastInsertRowid;
    
    // Insert items into company_debt_items
    const insertItem = db.prepare(`
      INSERT INTO company_debt_items (debt_id, item_type, item_name, quantity, unit_price, total_price, buying_price, ram, storage, model, brand, type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const item of items) {
      insertItem.run(
        debtId,
        item.item_type || 'product',
        item.item_name,
        item.quantity,
        item.unit_price,
        item.total_price,
        item.buying_price || item.unit_price,
        item.ram || null,
        item.storage || null,
        item.model || null,
        item.brand || null,
        item.type || null
      );
      
      // Update stock for products/accessories
      const qty = Number(item.quantity) || 1;
      if (item.item_type === 'accessory') {
        // Find accessory by name and update stock
        db.prepare('UPDATE accessories SET stock = stock + ? WHERE name = ?').run(qty, item.item_name);
      } else {
        // Find product by matching criteria and update stock
        const productUpdate = db.prepare(`
          UPDATE products 
          SET stock = stock + ? 
          WHERE name = ? AND model = ? AND ram = ? AND storage = ?
        `);
        productUpdate.run(qty, item.item_name, item.model || '', item.ram || '', item.storage || '');
      }
    }
    
    // Insert into buying_history
    const insertPurchase = db.prepare(`
      INSERT INTO buying_history (company_debt_id, company_name, amount, description, has_items, paid_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `);
    
    const purchaseResult = insertPurchase.run(debtId, company_name, totalAmount, description || '', paid_at || new Date().toISOString());
    
    return { success: true, id: purchaseResult.lastInsertRowid, debtId };
  });
  
  return transaction();
}

return {
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
  // Enhanced Company Debt functions
  addCompanyDebtWithItems,
  getCompanyDebtItems,
  // Buying History functions
  getBuyingHistory,
  getBuyingHistoryWithItems,
  // Direct Purchase functions
  addDirectPurchase,
  addDirectPurchaseWithItems,
  // Return functions
  returnSale,
  returnSaleItem,
  // Buying History Return functions
  returnBuyingHistoryEntry,
  returnBuyingHistoryItem,
  };
};
