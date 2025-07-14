// Database initialization and schema setup
const path = require('path');
const Database = require('better-sqlite3');

function initializeDatabase(dbPath) {
  const finalDbPath = dbPath || path.join(__dirname, '..', 'shop.sqlite');
  const db = new Database(finalDbPath);
  
  db.pragma('foreign_keys = ON');
  
  // Initial schema
  const initSQL = `
CREATE TABLE IF NOT EXISTS products (
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

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME NOT NULL,
  total INTEGER NOT NULL,
  customer_name TEXT,
  is_debt INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'IQD',
  paid_amount_usd INTEGER DEFAULT 0,
  paid_amount_iqd INTEGER DEFAULT 0,
  is_multi_currency INTEGER DEFAULT 0,
  exchange_rate_usd_to_iqd INTEGER DEFAULT 1440,
  exchange_rate_iqd_to_usd REAL DEFAULT 0.000694
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
  currency TEXT DEFAULT 'IQD',
  product_currency TEXT DEFAULT 'IQD',
  profit_in_sale_currency INTEGER DEFAULT 0,
  buying_price_in_sale_currency INTEGER DEFAULT 0,
  FOREIGN KEY(sale_id) REFERENCES sales(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS customer_debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL,
  paid_at DATETIME,
  currency TEXT DEFAULT 'IQD',
  sale_id INTEGER,
  FOREIGN KEY(sale_id) REFERENCES sales(id)
);

CREATE TABLE IF NOT EXISTS company_debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL,
  paid_at DATETIME,
  has_items INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'IQD'
);

CREATE TABLE IF NOT EXISTS company_debt_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  debt_id INTEGER,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  currency TEXT DEFAULT 'IQD',
  FOREIGN KEY(debt_id) REFERENCES company_debts(id)
);

CREATE TABLE IF NOT EXISTS personal_loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL,
  paid_at DATETIME,
  currency TEXT DEFAULT 'IQD'
);

CREATE TABLE IF NOT EXISTS buying_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  supplier TEXT,
  date DATETIME NOT NULL,
  currency TEXT DEFAULT 'IQD'
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS accessories (
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

CREATE TABLE IF NOT EXISTS monthly_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_sales_usd INTEGER DEFAULT 0,
  total_sales_iqd INTEGER DEFAULT 0,
  total_profit_usd INTEGER DEFAULT 0,
  total_profit_iqd INTEGER DEFAULT 0,
  total_spent_usd INTEGER DEFAULT 0,
  total_spent_iqd INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  amount_usd INTEGER DEFAULT 0,
  amount_iqd INTEGER DEFAULT 0,
  description TEXT,
  reference_id INTEGER,
  reference_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS balances (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  usd_balance INTEGER DEFAULT 0,
  iqd_balance INTEGER DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_type TEXT NOT NULL,
  reference_id INTEGER NOT NULL,
  discount_type TEXT NOT NULL,
  discount_value REAL NOT NULL,
  currency TEXT DEFAULT 'IQD',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;
  
  // Execute initial schema
  db.exec(initSQL);

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

  return db;
}

// Add missing columns if they don't exist (for existing databases)
function runMigrations(db) {
  const migrations = [
    () => db.exec('ALTER TABLE products ADD COLUMN buying_price INTEGER DEFAULT 0'),
    () => db.exec('ALTER TABLE products ADD COLUMN ram TEXT'),
    () => db.exec('ALTER TABLE products ADD COLUMN storage TEXT'),
    () => db.exec('ALTER TABLE products ADD COLUMN model TEXT'),
    () => db.exec('ALTER TABLE products ADD COLUMN category TEXT DEFAULT "phones"'),
    () => db.exec('ALTER TABLE sale_items ADD COLUMN buying_price INTEGER DEFAULT 0'),
    () => db.exec('ALTER TABLE sale_items ADD COLUMN profit INTEGER DEFAULT 0'),
    () => db.exec('ALTER TABLE sales ADD COLUMN customer_name TEXT'),
    () => db.exec('ALTER TABLE company_debts ADD COLUMN has_items INTEGER DEFAULT 0'),
    () => db.exec('ALTER TABLE sale_items ADD COLUMN is_accessory INTEGER DEFAULT 0'),
    () => db.exec('ALTER TABLE sale_items ADD COLUMN name TEXT'),
    
    // Currency columns
    () => db.exec('ALTER TABLE products ADD COLUMN currency TEXT DEFAULT "USD"'),
    () => db.exec('ALTER TABLE accessories ADD COLUMN currency TEXT DEFAULT "USD"'),
    () => db.exec('ALTER TABLE sales ADD COLUMN currency TEXT DEFAULT "USD"'),
    () => db.exec('ALTER TABLE sale_items ADD COLUMN currency TEXT DEFAULT "USD"'),
    () => db.exec('ALTER TABLE customer_debts ADD COLUMN currency TEXT DEFAULT "USD"'),
    () => db.exec('ALTER TABLE company_debts ADD COLUMN currency TEXT DEFAULT "USD"'),
    () => db.exec('ALTER TABLE company_debt_items ADD COLUMN currency TEXT DEFAULT "USD"'),
    () => db.exec('ALTER TABLE buying_history ADD COLUMN currency TEXT DEFAULT "USD"'),
    
    // Multi-currency payment support columns
    () => db.exec('ALTER TABLE sales ADD COLUMN paid_amount_usd REAL DEFAULT 0'),
    () => db.exec('ALTER TABLE sales ADD COLUMN paid_amount_iqd REAL DEFAULT 0'),
    () => db.exec('ALTER TABLE sales ADD COLUMN is_multi_currency INTEGER DEFAULT 0'),
    
    // Add sale_id to customer_debts
    () => db.exec('ALTER TABLE customer_debts ADD COLUMN sale_id INTEGER'),
    () => db.exec('CREATE INDEX IF NOT EXISTS idx_customer_debts_sale_id ON customer_debts(sale_id)'),
    
    // Update existing records that have NULL or empty currency to IQD
    () => db.prepare('UPDATE products SET currency = ? WHERE currency IS NULL OR currency = ?').run('IQD', ''),
    () => db.prepare('UPDATE accessories SET currency = ? WHERE currency IS NULL OR currency = ?').run('IQD', ''),
    () => db.prepare('UPDATE sales SET currency = ? WHERE currency IS NULL OR currency = ?').run('IQD', ''),
    () => db.prepare('UPDATE sale_items SET currency = ? WHERE currency IS NULL OR currency = ?').run('IQD', ''),
    () => db.prepare('UPDATE customer_debts SET currency = ? WHERE currency IS NULL OR currency = ?').run('IQD', ''),
    () => db.prepare('UPDATE company_debts SET currency = ? WHERE currency IS NULL OR currency = ?').run('IQD', ''),
    () => db.prepare('UPDATE company_debt_items SET currency = ? WHERE currency IS NULL OR currency = ?').run('IQD', ''),
    () => db.prepare('UPDATE buying_history SET currency = ? WHERE currency IS NULL OR currency = ?').run('IQD', ''),
    
    // Database migration to remove price column from products and accessories
    () => db.exec('CREATE TABLE products_temp AS SELECT id, name, buying_price, stock, archived, ram, storage, model, category, currency FROM products'),
    () => db.exec('DROP TABLE products'),
    () => db.exec('ALTER TABLE products_temp RENAME TO products'),
    
    () => db.exec('CREATE TABLE accessories_temp AS SELECT id, name, buying_price, stock, archived, brand, model, type, currency FROM accessories'),
    () => db.exec('DROP TABLE accessories'),
    () => db.exec('ALTER TABLE accessories_temp RENAME TO accessories'),
    
    // Add multi-currency debt storage columns
    () => db.exec('ALTER TABLE company_debts ADD COLUMN usd_amount REAL DEFAULT 0'),
    () => db.exec('ALTER TABLE company_debts ADD COLUMN iqd_amount REAL DEFAULT 0'),
    
    // Add missing columns to buying_history for debt payment tracking
    () => db.exec('ALTER TABLE buying_history ADD COLUMN type TEXT DEFAULT NULL'),
    () => db.exec('ALTER TABLE buying_history ADD COLUMN reference_id INTEGER DEFAULT NULL'),
    
    // Add payment tracking columns to customer_debts
    () => db.exec('ALTER TABLE customer_debts ADD COLUMN payment_usd_amount REAL DEFAULT 0'),
    () => db.exec('ALTER TABLE customer_debts ADD COLUMN payment_iqd_amount REAL DEFAULT 0'),
    () => db.exec('ALTER TABLE customer_debts ADD COLUMN payment_currency_used TEXT DEFAULT NULL')
  ];

  migrations.forEach(migration => {
    try {
      migration();
    } catch (e) {
      // Column already exists or other non-critical error, continue
    }
  });

  // Initialize admin password if not exists
  const adminRow = db.prepare('SELECT * FROM admin WHERE id = 1').get();
  if (!adminRow) {
    db.prepare('INSERT INTO admin (id, password) VALUES (1, ?)').run('admin');
  }

  // Initialize balances if not exists
  const balanceRow = db.prepare('SELECT * FROM balances WHERE id = 1').get();
  if (!balanceRow) {
    db.prepare('INSERT INTO balances (id, usd_balance, iqd_balance) VALUES (1, 0, 0)').run();
  }

  // Initialize sample data if tables are empty
  initializeSampleData(db);
}

function initializeSampleData(db) {
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (productCount === 0) {
    const sampleProducts = [
      { name: 'iPhone 15 Pro', buying_price: 1100, stock: 5, ram: '8GB', storage: '256GB', model: 'A17 Pro', category: 'phones' },
      { name: 'Samsung Galaxy S24', buying_price: 699, stock: 8, ram: '8GB', storage: '128GB', model: 'Snapdragon 8 Gen 3', category: 'phones' },
    ];
    
    const insertProduct = db.prepare(`
      INSERT INTO products (name, buying_price, stock, ram, storage, model, category) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    sampleProducts.forEach(product => {
      insertProduct.run(
        product.name,
        product.buying_price,
        product.stock,
        product.ram,
        product.storage,
        product.model,
        product.category
      );
    });
  }
}

function resetAllData(db) {
  try {
    console.log('Starting reset all data...');
    
    // Disable foreign key constraints temporarily
    db.prepare('PRAGMA foreign_keys = OFF').run();
    
    // Delete data in the correct order to avoid foreign key issues
    try { db.prepare('DELETE FROM sale_items').run(); } catch (e) { console.log('No sale_items table:', e.message); }
    try { db.prepare('DELETE FROM debts').run(); } catch (e) { console.log('No debts table:', e.message); }
    try { db.prepare('DELETE FROM customer_debts').run(); } catch (e) { console.log('No customer_debts table:', e.message); }
    try { db.prepare('DELETE FROM company_debts').run(); } catch (e) { console.log('No company_debts table:', e.message); }
    try { db.prepare('DELETE FROM company_debt_items').run(); } catch (e) { console.log('No company_debt_items table:', e.message); }
    try { db.prepare('DELETE FROM buying_history').run(); } catch (e) { console.log('No buying_history table:', e.message); }
    try { db.prepare('DELETE FROM personal_loans').run(); } catch (e) { console.log('No personal_loans table:', e.message); }
    try { db.prepare('DELETE FROM transactions').run(); } catch (e) { console.log('No transactions table:', e.message); }
    try { db.prepare('DELETE FROM sales').run(); } catch (e) { console.log('No sales table:', e.message); }
    try { db.prepare('DELETE FROM products').run(); } catch (e) { console.log('No products table:', e.message); }
    try { db.prepare('DELETE FROM accessories').run(); } catch (e) { console.log('No accessories table:', e.message); }
    try { db.prepare('DELETE FROM monthly_reports').run(); } catch (e) { console.log('No monthly_reports table:', e.message); }
    
    // Reset auto-increment sequences for all relevant tables
    try {
      db.prepare('DELETE FROM sqlite_sequence WHERE name IN ("products", "sales", "sale_items", "debts", "customer_debts", "company_debts", "company_debt_items", "buying_history", "personal_loans", "transactions", "accessories", "monthly_reports")').run();
    } catch (e) {
      console.log('Error resetting sequences:', e.message);
    }
    
    // Reset balance to default values
    try {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('balanceUSD', '0');
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('balanceIQD', '0');
    } catch (e) {
      console.log('Error resetting balance:', e.message);
    }
    
    // Re-enable foreign key constraints
    db.prepare('PRAGMA foreign_keys = ON').run();
    
    console.log('Reset all data completed successfully');
    return { success: true, message: 'All data reset successfully.' };
  } catch (error) {
    console.error('Reset error:', error);
    return { success: false, message: `Reset failed: ${error.message}` };
  }
}

module.exports = {
  initializeDatabase,
  runMigrations,
  resetAllData
};
