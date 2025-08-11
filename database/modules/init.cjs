// Database initialization and schema setup
const path = require('path');
const Database = require('better-sqlite3');

function initializeDatabase(dbPath) {
  const finalDbPath = dbPath || path.join(__dirname, '..', 'shop.sqlite');
  const db = new Database(finalDbPath);
  
  db.pragma('foreign_keys = ON');
  
  // Clean, modern schema with proper data types from the start
  const initSQL = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  buying_price REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  archived INTEGER DEFAULT 0,
  ram TEXT,
  storage TEXT,
  model TEXT,
  brand TEXT,
  category TEXT DEFAULT 'phones',
  currency TEXT DEFAULT 'IQD'
);

CREATE TABLE IF NOT EXISTS accessories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  buying_price REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  archived INTEGER DEFAULT 0,
  brand TEXT,
  model TEXT,
  type TEXT,
  color TEXT,
  currency TEXT DEFAULT 'IQD'
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME NOT NULL,
  total REAL NOT NULL,
  customer_name TEXT,
  is_debt INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'IQD',
  paid_amount_usd REAL DEFAULT 0,
  paid_amount_iqd REAL DEFAULT 0,
  is_multi_currency INTEGER DEFAULT 0,
  exchange_rate_usd_to_iqd REAL DEFAULT 1440,
  exchange_rate_iqd_to_usd REAL DEFAULT 0.000694
);

CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  buying_price REAL DEFAULT 0,
  profit REAL DEFAULT 0,
  is_accessory INTEGER DEFAULT 0,
  name TEXT,
  currency TEXT DEFAULT 'IQD',
  product_currency TEXT DEFAULT 'IQD',
  profit_in_sale_currency REAL DEFAULT 0,
  buying_price_in_sale_currency REAL DEFAULT 0,
  original_selling_price REAL DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS customer_debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL,
  paid_at DATETIME,
  currency TEXT DEFAULT 'IQD',
  sale_id INTEGER,
  payment_usd_amount REAL DEFAULT 0,
  payment_iqd_amount REAL DEFAULT 0,
  payment_currency_used TEXT,
  FOREIGN KEY(sale_id) REFERENCES sales(id)
);

CREATE TABLE IF NOT EXISTS company_debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL,
  paid_at DATETIME,
  has_items INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'IQD',
  usd_amount REAL DEFAULT 0,
  iqd_amount REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS company_debt_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  debt_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  item_type TEXT DEFAULT 'product',
  model TEXT,
  ram TEXT,
  storage TEXT,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  currency TEXT DEFAULT 'IQD',
  FOREIGN KEY(debt_id) REFERENCES company_debts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS personal_loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_name TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL,
  paid_at DATETIME,
  currency TEXT DEFAULT 'IQD'
);

CREATE TABLE IF NOT EXISTS buying_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  supplier TEXT,
  date DATETIME NOT NULL,
  currency TEXT DEFAULT 'IQD',
  type TEXT,
  reference_id INTEGER,
  amount REAL,
  has_items INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS buying_history_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  buying_history_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  item_type TEXT DEFAULT 'product',
  brand TEXT,
  model TEXT,
  ram TEXT,
  storage TEXT,
  type TEXT,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  currency TEXT DEFAULT 'IQD',
  FOREIGN KEY(buying_history_id) REFERENCES buying_history(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
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
  total_sales_usd REAL DEFAULT 0,
  total_sales_iqd REAL DEFAULT 0,
  total_profit_usd REAL DEFAULT 0,
  total_profit_iqd REAL DEFAULT 0,
  total_spent_usd REAL DEFAULT 0,
  total_spent_iqd REAL DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  avg_transaction_usd REAL DEFAULT 0,
  avg_transaction_iqd REAL DEFAULT 0,
  top_products TEXT, -- JSON string of top selling products
  analytics_data TEXT, -- JSON string for enhanced analytics
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(month, year)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  amount_usd REAL DEFAULT 0,
  amount_iqd REAL DEFAULT 0,
  description TEXT,
  reference_id INTEGER,
  reference_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS balances (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  usd_balance REAL DEFAULT 0,
  iqd_balance REAL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS incentives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL,
  currency TEXT DEFAULT 'IQD'
);

CREATE TABLE IF NOT EXISTS returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER,
  accessory_id INTEGER,
  item_name TEXT NOT NULL,
  item_type TEXT DEFAULT 'product',
  brand TEXT,
  model TEXT,
  ram TEXT,
  storage TEXT,
  quantity INTEGER NOT NULL,
  return_price REAL NOT NULL,
  original_price REAL NOT NULL,
  supplier TEXT,
  reason TEXT,
  date DATETIME NOT NULL,
  currency TEXT DEFAULT 'IQD',
  buying_history_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(accessory_id) REFERENCES accessories(id),
  FOREIGN KEY(buying_history_id) REFERENCES buying_history(id)
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  debt_type TEXT NOT NULL, -- 'customer', 'company', 'personal'
  debt_id INTEGER NOT NULL,
  payment_usd_amount REAL DEFAULT 0,
  payment_iqd_amount REAL DEFAULT 0,
  payment_currency_used TEXT,
  exchange_rate_usd_to_iqd REAL NOT NULL,
  exchange_rate_iqd_to_usd REAL NOT NULL,
  payment_date DATETIME NOT NULL,
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
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
      CREATE INDEX IF NOT EXISTS idx_accessories_archived ON accessories(archived);
      CREATE INDEX IF NOT EXISTS idx_accessories_name ON accessories(name);
      CREATE INDEX IF NOT EXISTS idx_accessories_type ON accessories(type);
      CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
      CREATE INDEX IF NOT EXISTS idx_sales_currency ON sales(currency);
      CREATE INDEX IF NOT EXISTS idx_sales_is_debt ON sales(is_debt);
      CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
      CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
      CREATE INDEX IF NOT EXISTS idx_sale_items_is_accessory ON sale_items(is_accessory);
      CREATE INDEX IF NOT EXISTS idx_customer_debts_paid_at ON customer_debts(paid_at);
      CREATE INDEX IF NOT EXISTS idx_customer_debts_sale_id ON customer_debts(sale_id);
      CREATE INDEX IF NOT EXISTS idx_company_debts_paid_at ON company_debts(paid_at);
      CREATE INDEX IF NOT EXISTS idx_incentives_company_name ON incentives(company_name);
      CREATE INDEX IF NOT EXISTS idx_incentives_created_at ON incentives(created_at);
      CREATE INDEX IF NOT EXISTS idx_incentives_currency ON incentives(currency);
      CREATE INDEX IF NOT EXISTS idx_returns_product_id ON returns(product_id);
      CREATE INDEX IF NOT EXISTS idx_returns_accessory_id ON returns(accessory_id);
      CREATE INDEX IF NOT EXISTS idx_returns_date ON returns(date);
      CREATE INDEX IF NOT EXISTS idx_returns_item_type ON returns(item_type);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_buying_history_date ON buying_history(date);
      CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_type ON debt_payments(debt_type);
      CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
      CREATE INDEX IF NOT EXISTS idx_debt_payments_payment_date ON debt_payments(payment_date);
    `);
  } catch (e) {
    console.warn('Database index creation warning:', e.message);
  }

  return db;
}

// Minimal migrations for existing databases only
function runMigrations(db) {
  // Initialize admin password if not exists
  try {
    const adminRow = db.prepare('SELECT * FROM admin WHERE id = 1').get();
    if (!adminRow) {
      db.prepare('INSERT INTO admin (id, password) VALUES (1, ?)').run('admin');
    }
  } catch (e) {
    // Table might not exist yet, ignore
  }

  // Initialize balances if not exists
  try {
    const balanceRow = db.prepare('SELECT * FROM balances WHERE id = 1').get();
    if (!balanceRow) {
      db.prepare('INSERT INTO balances (id, usd_balance, iqd_balance) VALUES (1, 0, 0)').run();
    }
  } catch (e) {
    // Table might not exist yet, ignore
  }

  // Initialize balance settings if not exists (for compatibility with existing code)
  try {
    const usdBalance = db.prepare('SELECT value FROM settings WHERE key = ?').get('balanceUSD');
    if (!usdBalance) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('balanceUSD', '0');
    }
    const iqdBalance = db.prepare('SELECT value FROM settings WHERE key = ?').get('balanceIQD');
    if (!iqdBalance) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('balanceIQD', '0');
    }
  } catch (e) {
    // Table might not exist yet, ignore
  }

  // Initialize default exchange rates if not exists
  try {
    const exchangeRateUSD = db.prepare('SELECT value FROM settings WHERE key = ?').get('exchange_USD_IQD');
    if (!exchangeRateUSD) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('exchange_USD_IQD', '1440');
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('exchange_IQD_USD', (1/1440).toString());
    }
  } catch (e) {
    // Table might not exist yet, ignore
  }

  // Migrate personal_loans table to support multi-currency
  try {
    // Check if the new columns exist
    const tableInfo = db.prepare("PRAGMA table_info(personal_loans)").all();
    const hasUsdAmount = tableInfo.some(col => col.name === 'usd_amount');
    const hasIqdAmount = tableInfo.some(col => col.name === 'iqd_amount');
    const hasPaymentUsdAmount = tableInfo.some(col => col.name === 'payment_usd_amount');
    const hasPaymentIqdAmount = tableInfo.some(col => col.name === 'payment_iqd_amount');
    const hasPaymentExchangeRateUsdToIqd = tableInfo.some(col => col.name === 'payment_exchange_rate_usd_to_iqd');
    const hasPaymentExchangeRateIqdToUsd = tableInfo.some(col => col.name === 'payment_exchange_rate_iqd_to_usd');

    if (!hasUsdAmount) {
      // Add new columns for multi-currency support
      db.prepare('ALTER TABLE personal_loans ADD COLUMN usd_amount REAL DEFAULT 0').run();
    }
    if (!hasIqdAmount) {
      db.prepare('ALTER TABLE personal_loans ADD COLUMN iqd_amount REAL DEFAULT 0').run();
    }
    if (!hasPaymentUsdAmount) {
      db.prepare('ALTER TABLE personal_loans ADD COLUMN payment_usd_amount REAL DEFAULT 0').run();
    }
    if (!hasPaymentIqdAmount) {
      db.prepare('ALTER TABLE personal_loans ADD COLUMN payment_iqd_amount REAL DEFAULT 0').run();
    }
    if (!hasPaymentExchangeRateUsdToIqd) {
      db.prepare('ALTER TABLE personal_loans ADD COLUMN payment_exchange_rate_usd_to_iqd REAL DEFAULT 1440').run();
    }
    if (!hasPaymentExchangeRateIqdToUsd) {
      db.prepare('ALTER TABLE personal_loans ADD COLUMN payment_exchange_rate_iqd_to_usd REAL DEFAULT 0.000694').run();
    }

    // Migrate existing data from single amount/currency to multi-currency
    const existingLoans = db.prepare('SELECT id, amount, currency FROM personal_loans WHERE (usd_amount = 0 AND iqd_amount = 0)').all();
    
    for (const loan of existingLoans) {
      if (loan.currency === 'USD') {
        db.prepare('UPDATE personal_loans SET usd_amount = ? WHERE id = ?').run(loan.amount || 0, loan.id);
      } else {
        db.prepare('UPDATE personal_loans SET iqd_amount = ? WHERE id = ?').run(loan.amount || 0, loan.id);
      }
    }
  } catch (e) {
    console.warn('Personal loans migration warning:', e.message);
  }

  // Migrate company_debts table to support payment tracking
  try {
    const companyDebtsTableInfo = db.prepare("PRAGMA table_info(company_debts)").all();
    const hasPaymentUsdAmount = companyDebtsTableInfo.some(col => col.name === 'payment_usd_amount');
    const hasPaymentIqdAmount = companyDebtsTableInfo.some(col => col.name === 'payment_iqd_amount');
    const hasPaymentCurrencyUsed = companyDebtsTableInfo.some(col => col.name === 'payment_currency_used');
    const hasPaymentExchangeRateUsdToIqd = companyDebtsTableInfo.some(col => col.name === 'payment_exchange_rate_usd_to_iqd');
    const hasPaymentExchangeRateIqdToUsd = companyDebtsTableInfo.some(col => col.name === 'payment_exchange_rate_iqd_to_usd');

    if (!hasPaymentUsdAmount) {
      db.prepare('ALTER TABLE company_debts ADD COLUMN payment_usd_amount REAL DEFAULT 0').run();
    }
    if (!hasPaymentIqdAmount) {
      db.prepare('ALTER TABLE company_debts ADD COLUMN payment_iqd_amount REAL DEFAULT 0').run();
    }
    if (!hasPaymentCurrencyUsed) {
      db.prepare('ALTER TABLE company_debts ADD COLUMN payment_currency_used TEXT').run();
    }
    if (!hasPaymentExchangeRateUsdToIqd) {
      db.prepare('ALTER TABLE company_debts ADD COLUMN payment_exchange_rate_usd_to_iqd REAL DEFAULT 1390').run();
    }
    if (!hasPaymentExchangeRateIqdToUsd) {
      db.prepare('ALTER TABLE company_debts ADD COLUMN payment_exchange_rate_iqd_to_usd REAL DEFAULT 0.000719').run();
    }
  } catch (e) {
    console.warn('Company debts migration warning:', e.message);
  }

  // Migrate customer_debts table to support currency column
  try {
    const customerDebtsTableInfo = db.prepare("PRAGMA table_info(customer_debts)").all();
    const hasCurrencyColumn = customerDebtsTableInfo.some(col => col.name === 'currency');

    if (!hasCurrencyColumn) {
      db.prepare('ALTER TABLE customer_debts ADD COLUMN currency TEXT DEFAULT \'IQD\'').run();
    }
    
    // Also ensure payment tracking columns exist
    const hasPaymentUsdAmount = customerDebtsTableInfo.some(col => col.name === 'payment_usd_amount');
    const hasPaymentIqdAmount = customerDebtsTableInfo.some(col => col.name === 'payment_iqd_amount');
    const hasPaymentCurrencyUsed = customerDebtsTableInfo.some(col => col.name === 'payment_currency_used');
    const hasPaymentExchangeRateUsdToIqd = customerDebtsTableInfo.some(col => col.name === 'payment_exchange_rate_usd_to_iqd');
    const hasPaymentExchangeRateIqdToUsd = customerDebtsTableInfo.some(col => col.name === 'payment_exchange_rate_iqd_to_usd');

    if (!hasPaymentUsdAmount) {
      db.prepare('ALTER TABLE customer_debts ADD COLUMN payment_usd_amount REAL DEFAULT 0').run();
    }
    if (!hasPaymentIqdAmount) {
      db.prepare('ALTER TABLE customer_debts ADD COLUMN payment_iqd_amount REAL DEFAULT 0').run();
    }
    if (!hasPaymentCurrencyUsed) {
      db.prepare('ALTER TABLE customer_debts ADD COLUMN payment_currency_used TEXT').run();
    }
    if (!hasPaymentExchangeRateUsdToIqd) {
      db.prepare('ALTER TABLE customer_debts ADD COLUMN payment_exchange_rate_usd_to_iqd REAL DEFAULT 1390').run();
    }
    if (!hasPaymentExchangeRateIqdToUsd) {
      db.prepare('ALTER TABLE customer_debts ADD COLUMN payment_exchange_rate_iqd_to_usd REAL DEFAULT 0.000719').run();
    }
  } catch (e) {
    console.warn('Customer debts migration warning:', e.message);
  }

  // Migrate accessories table to add created_at and updated_at columns
  try {
    const accessoriesTableInfo = db.prepare("PRAGMA table_info(accessories)").all();
    const hasCreatedAt = accessoriesTableInfo.some(col => col.name === 'created_at');
    const hasUpdatedAt = accessoriesTableInfo.some(col => col.name === 'updated_at');

    if (!hasCreatedAt) {
      db.prepare('ALTER TABLE accessories ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP').run();
      
      // Update existing accessories with current timestamp
      db.prepare('UPDATE accessories SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL').run();
    }
    
    if (!hasUpdatedAt) {
      db.prepare('ALTER TABLE accessories ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP').run();
      
      // Update existing accessories with current timestamp
      db.prepare('UPDATE accessories SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL').run();
    }
  } catch (e) {
    console.warn('Accessories migration warning:', e.message);
  }

  // Migrate buying_history table to support has_items column
  try {
    const buyingHistoryTableInfo = db.prepare("PRAGMA table_info(buying_history)").all();
    const hasItemsColumn = buyingHistoryTableInfo.some(col => col.name === 'has_items');

    if (!hasItemsColumn) {
      db.prepare('ALTER TABLE buying_history ADD COLUMN has_items INTEGER DEFAULT 0').run();
    }
  } catch (e) {
    console.warn('Buying history migration warning:', e.message);
  }

  // Migrate buying_history table to support multi-currency columns
  try {
    const buyingHistoryTableInfo = db.prepare("PRAGMA table_info(buying_history)").all();
    const hasMultiCurrencyUsd = buyingHistoryTableInfo.some(col => col.name === 'multi_currency_usd');
    const hasMultiCurrencyIqd = buyingHistoryTableInfo.some(col => col.name === 'multi_currency_iqd');

    if (!hasMultiCurrencyUsd) {
      db.prepare('ALTER TABLE buying_history ADD COLUMN multi_currency_usd REAL DEFAULT 0').run();
    }
    if (!hasMultiCurrencyIqd) {
      db.prepare('ALTER TABLE buying_history ADD COLUMN multi_currency_iqd REAL DEFAULT 0').run();
    }

    // Migrate existing data to populate multi-currency columns
    const existingEntries = db.prepare(`
      SELECT id, currency, total_price, amount 
      FROM buying_history 
      WHERE (multi_currency_usd = 0 AND multi_currency_iqd = 0) AND (total_price > 0 OR amount > 0)
    `).all();
    
    for (const entry of existingEntries) {
      const value = entry.total_price || entry.amount || 0;
      if (value > 0) {
        if (entry.currency === 'USD') {
          db.prepare('UPDATE buying_history SET multi_currency_usd = ? WHERE id = ?').run(value, entry.id);
        } else {
          db.prepare('UPDATE buying_history SET multi_currency_iqd = ? WHERE id = ?').run(value, entry.id);
        }
      }
    }
  } catch (e) {
    console.warn('Buying history multi-currency migration warning:', e.message);
  }

  // Migrate to add debt_payments table for existing databases
  try {
    // Check if debt_payments table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='debt_payments'").all();
    
    if (tables.length === 0) {
      console.log('Creating debt_payments table for existing database...');
      // Create the debt_payments table
      db.exec(`
        CREATE TABLE debt_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          debt_type TEXT NOT NULL,
          debt_id INTEGER NOT NULL,
          payment_usd_amount REAL DEFAULT 0,
          payment_iqd_amount REAL DEFAULT 0,
          payment_currency_used TEXT,
          exchange_rate_usd_to_iqd REAL NOT NULL,
          exchange_rate_iqd_to_usd REAL NOT NULL,
          payment_date DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_type ON debt_payments(debt_type);
        CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
        CREATE INDEX IF NOT EXISTS idx_debt_payments_payment_date ON debt_payments(payment_date);
      `);
      console.log('✅ debt_payments table created successfully');
    }
  } catch (e) {
    console.warn('Debt payments table migration warning:', e.message);
  }

  // Fix ZMC debt that had double discount applied
  try {
    // Check if migration was already applied
    const migrationExists = db.prepare(`
      SELECT 1 FROM sqlite_master 
      WHERE type='table' AND name='migrations'
    `).get();
    
    let migrationApplied = false;
    if (migrationExists) {
      migrationApplied = db.prepare(`
        SELECT 1 FROM migrations WHERE id = 'fix-zmc-debt-discount'
      `).get();
    }
    
    if (!migrationApplied) {
      // Create migrations table if it doesn't exist
      db.prepare(`
        CREATE TABLE IF NOT EXISTS migrations (
          id TEXT PRIMARY KEY,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      // Find the specific ZMC debt that needs fixing with multiple search strategies
      let zmcDebt = null;
      
      // Strategy 1: Look for exact company name and amount
      zmcDebt = db.prepare(`
        SELECT id, company_name, amount, currency, created_at, paid_at
        FROM company_debts 
        WHERE LOWER(TRIM(company_name)) IN ('zmc', 'znc', 'z.m.c', 'z m c')
        AND amount = 1421000
        AND currency = 'IQD'
        AND paid_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `).get();
      
      // Strategy 2: If not found, search by amount only for unpaid debts
      if (!zmcDebt) {
        console.log('🔍 Exact ZMC name not found, searching by amount 1421000...');
        zmcDebt = db.prepare(`
          SELECT id, company_name, amount, currency, created_at, paid_at
          FROM company_debts 
          WHERE amount = 1421000
          AND currency = 'IQD'
          AND paid_at IS NULL
          ORDER BY created_at DESC
          LIMIT 1
        `).get();
      }
      
      // Strategy 3: If still not found, search for similar amounts (within 1000 IQD range)
      if (!zmcDebt) {
        console.log('🔍 Amount 1421000 not found, searching for similar amounts...');
        const similarDebts = db.prepare(`
          SELECT id, company_name, amount, currency, created_at, paid_at
          FROM company_debts 
          WHERE amount BETWEEN 1420000 AND 1422000
          AND currency = 'IQD'
          AND paid_at IS NULL
          ORDER BY created_at DESC
        `).all();
        
        if (similarDebts.length === 1) {
          zmcDebt = similarDebts[0];
          console.log(`💡 Found potential ZMC debt with amount ${zmcDebt.amount}`);
        } else if (similarDebts.length > 1) {
          console.log('📋 Multiple similar debts found:', similarDebts.map(d => `ID: ${d.id}, Company: ${d.company_name}, Amount: ${d.amount}`));
        }
      }
      
      if (zmcDebt) {
        console.log(`🔧 Fixing ZMC debt: ID ${zmcDebt.id}, Company: ${zmcDebt.company_name}, Amount: ${zmcDebt.amount} ${zmcDebt.currency}`);
        
        // Update the debt amount to 1443000
        const updateStmt = db.prepare(`
          UPDATE company_debts 
          SET amount = 1443000,
              iqd_amount = CASE 
                WHEN iqd_amount = amount THEN 1443000
                WHEN iqd_amount > 0 THEN iqd_amount + (1443000 - ?)
                ELSE iqd_amount
              END
          WHERE id = ?
        `);
        
        const result = updateStmt.run(zmcDebt.amount, zmcDebt.id);
        
        if (result.changes > 0) {
          console.log(`✅ Successfully updated ZMC debt from ${zmcDebt.amount} to 1443000 (difference: +${1443000 - zmcDebt.amount} IQD)`);
          
          // Also update any related debt items proportionally if they exist
          try {
            const updateItemsStmt = db.prepare(`
              UPDATE company_debt_items 
              SET subtotal = ROUND(subtotal * 1443000.0 / ?, 2)
              WHERE company_debt_id = ?
            `);
            
            const itemsResult = updateItemsStmt.run(zmcDebt.amount, zmcDebt.id);
            if (itemsResult.changes > 0) {
              console.log(`✅ Updated ${itemsResult.changes} debt items proportionally`);
            }
          } catch (itemsError) {
            console.log('ℹ️ No debt items table found or no items to update');
          }
        } else {
          console.log('❌ Failed to update ZMC debt - no changes made');
        }
      } else {
        console.log('ℹ️ No ZMC debt found matching search criteria');
        
        // Show all unpaid debts for debugging
        const allUnpaidDebts = db.prepare(`
          SELECT id, company_name, amount, currency, created_at
          FROM company_debts 
          WHERE paid_at IS NULL
          ORDER BY created_at DESC
          LIMIT 10
        `).all();
        
        if (allUnpaidDebts.length > 0) {
          console.log('📋 Recent unpaid debts in database:');
          allUnpaidDebts.forEach(debt => {
            console.log(`   ID: ${debt.id}, Company: ${debt.company_name}, Amount: ${debt.amount} ${debt.currency}, Date: ${debt.created_at}`);
          });
        } else {
          console.log('📋 No unpaid debts found in database');
        }
      }
      
      // Mark migration as completed
      db.prepare(`
        INSERT INTO migrations (id) VALUES ('fix-zmc-debt-discount')
      `).run();
      
      console.log('✅ ZMC debt fix migration completed');
    }
  } catch (e) {
    console.warn('ZMC debt fix migration warning:', e.message);
  }

  // Initialize sample data if tables are empty
  initializeSampleData(db);
}

function initializeSampleData(db) {
  // No sample data - user will add their own products
}

function resetAllData(db) {
  try {
    // Disable foreign key constraints temporarily
    db.prepare('PRAGMA foreign_keys = OFF').run();
    
    // Delete data in the correct order to avoid foreign key issues
    const tablesToClear = [
      'sale_items', 'customer_debts', 'company_debt_items', 'company_debts', 
      'personal_loans', 'transactions', 'sales', 'products', 'accessories', 
      'buying_history_items', 'buying_history', 'monthly_reports', 'discounts',
      'incentives', 'returns'
    ];
    
    tablesToClear.forEach(table => {
      try {
        db.prepare(`DELETE FROM ${table}`).run();
      } catch (e) {
        // Table might not exist, ignore
      }
    });
    
    // Reset auto-increment sequences
    try {
      db.prepare(`DELETE FROM sqlite_sequence WHERE name IN (${tablesToClear.map(() => '?').join(',')})`).run(...tablesToClear);
    } catch (e) {
      // Ignore if sqlite_sequence doesn't exist
    }
    
    // Reset balances in both locations
    try {
      db.prepare('UPDATE balances SET usd_balance = 0, iqd_balance = 0 WHERE id = 1').run();
    } catch (e) {
      // Table might not exist, ignore
    }
    
    // Reset balance settings
    try {
      db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('0', 'balanceUSD');
      db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('0', 'balanceIQD');
    } catch (e) {
      // Settings might not exist, ignore
    }
    
    // Re-enable foreign key constraints
    db.prepare('PRAGMA foreign_keys = ON').run();
    
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
