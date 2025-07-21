// Buying history and inventory management functions
const settings = require('./settings.cjs');

function getBuyingHistory(db) {
  const buyingHistory = db.prepare('SELECT * FROM buying_history ORDER BY date DESC').all();
  
  // Add items to entries that have them and transaction data for multi-currency entries
  return buyingHistory.map(entry => {
    let enhancedEntry = { ...entry };
    
    if (entry.has_items) {
      const items = db.prepare('SELECT * FROM buying_history_items WHERE buying_history_id = ?').all(entry.id);
      enhancedEntry.items = items;
    }
    
    // For MULTI currency entries, get the actual USD and IQD amounts from transactions
    if (entry.currency === 'MULTI') {
      const transaction = db.prepare(`
        SELECT amount_usd, amount_iqd 
        FROM transactions 
        WHERE reference_id = ? AND reference_type = 'buying_history' AND type = 'direct_purchase'
        ORDER BY created_at DESC 
        LIMIT 1
      `).get(entry.id);
      
      if (transaction) {
        enhancedEntry.multi_currency_usd = transaction.amount_usd || 0;
        enhancedEntry.multi_currency_iqd = transaction.amount_iqd || 0;
      }
    }
    
    return enhancedEntry;
  });
}

function addBuyingHistory(db, { item_name, quantity, unit_price, total_price, supplier, date, currency = 'IQD' }) {
  return db.prepare('INSERT INTO buying_history (item_name, quantity, unit_price, total_price, supplier, date, currency) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(item_name, quantity, unit_price, total_price, supplier, date, currency);
}

function addDirectPurchase(db, { item_name, quantity, unit_price, supplier, date, currency = 'IQD' }) {
  const total_price = quantity * unit_price;
  const purchaseDate = date || new Date().toISOString();
  
  const transaction = db.transaction(() => {
    // Add to buying history
    const result = db.prepare('INSERT INTO buying_history (item_name, quantity, unit_price, total_price, supplier, date, currency) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(item_name, quantity, unit_price, total_price, supplier, purchaseDate, currency);
    
    // Record transaction for tracking spending
    const addTransactionStmt = db.prepare(`
      INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const usdAmount = currency === 'USD' ? total_price : 0;
    const iqdAmount = currency === 'IQD' ? total_price : 0;
    
    addTransactionStmt.run(
      'direct_purchase',
      usdAmount,
      iqdAmount,
      `Direct purchase: ${item_name} from ${supplier}`,
      result.lastInsertRowid,
      'buying_history',
      purchaseDate
    );
    
    // Deduct from balance
    if (currency === 'USD') {
      settings.updateBalance(db, 'USD', -total_price);
    } else {
      settings.updateBalance(db, 'IQD', -total_price);
    }
    
    return result;
  });
  
  return transaction();
}

function addDirectPurchaseWithItems(db, { supplier, date, items, currency = 'IQD' }) {
  const purchaseDate = date || new Date().toISOString();
  
  const transaction = db.transaction(() => {
    let totalAmount = 0;
    
    // Calculate total amount
    items.forEach(item => {
      totalAmount += item.quantity * item.unit_price;
    });
    
    // Create a single buying history entry
    const result = db.prepare(`
      INSERT INTO buying_history 
      (item_name, quantity, unit_price, total_price, supplier, date, currency, has_items) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `Purchase with ${items.length} items`, // Generic description for multi-item purchase
      items.reduce((sum, item) => sum + item.quantity, 0), // Total quantity of all items
      totalAmount / items.reduce((sum, item) => sum + item.quantity, 0), // Average unit price
      totalAmount,
      supplier,
      purchaseDate,
      currency,
      1 // has_items = true
    );
    
    const buyingHistoryId = result.lastInsertRowid;
    
    // Insert all items into buying_history_items table
    const insertItemStmt = db.prepare(`
      INSERT INTO buying_history_items 
      (buying_history_id, item_name, item_type, brand, model, ram, storage, type, quantity, unit_price, total_price, currency) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    items.forEach(item => {
      const itemTotalPrice = item.quantity * item.unit_price;
      
      insertItemStmt.run(
        buyingHistoryId,
        item.item_name,
        item.item_type || 'product',
        item.brand || null,
        item.model || null,
        item.ram || null,
        item.storage || null,
        item.type || null,
        item.quantity,
        item.unit_price,
        itemTotalPrice,
        item.currency || currency
      );
      
      // Add stock to products or accessories
      if (item.item_type === 'product') {
        // Check if product exists, if not create it
        const existingProduct = db.prepare(`
          SELECT id FROM products 
          WHERE brand = ? AND model = ? AND COALESCE(ram, '') = ? AND COALESCE(storage, '') = ?
        `).get(item.brand || '', item.model || '', item.ram || '', item.storage || '');
        
        if (existingProduct) {
          // Update existing product stock and unarchive if archived
          db.prepare(`UPDATE products SET stock = stock + ?, archived = 0 WHERE id = ?`)
            .run(item.quantity, existingProduct.id);
        } else {
          // Create new product
          db.prepare(`INSERT INTO products 
            (name, brand, model, ram, storage, buying_price, stock, currency, category, archived) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(
              item.item_name || [item.brand, item.model].filter(Boolean).join(' '),
              item.brand || '',
              item.model || '',
              item.ram || null,
              item.storage || null,
              item.unit_price,
              item.quantity,
              item.currency || currency,
              'phones',
              0
            );
        }
      } else if (item.item_type === 'accessory') {
        // Check if accessory exists, if not create it
        const existingAccessory = db.prepare(`
          SELECT id FROM accessories 
          WHERE brand = ? AND model = ? AND COALESCE(type, '') = ?
        `).get(item.brand || '', item.model || '', item.type || '');
        
        if (existingAccessory) {
          // Update existing accessory stock and unarchive if archived
          db.prepare(`UPDATE accessories SET stock = stock + ?, archived = 0 WHERE id = ?`)
            .run(item.quantity, existingAccessory.id);
        } else {
          // Create new accessory
          db.prepare(`INSERT INTO accessories 
            (name, brand, model, type, buying_price, stock, currency, archived) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(
              item.item_name || [item.brand, item.model].filter(Boolean).join(' '),
              item.brand || '',
              item.model || '',
              item.type || null,
              item.unit_price,
              item.quantity,
              item.currency || currency,
              0
            );
        }
      }
    });
    
    // Record transaction for tracking spending
    const addTransactionStmt = db.prepare(`
      INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const usdAmount = currency === 'USD' ? totalAmount : 0;
    const iqdAmount = currency === 'IQD' ? totalAmount : 0;
    
    addTransactionStmt.run(
      'direct_purchase',
      usdAmount,
      iqdAmount,
      `Direct purchase with ${items.length} items from ${supplier}`,
      buyingHistoryId,
      'buying_history',
      purchaseDate
    );
    
    // Deduct from balance
    if (currency === 'USD') {
      settings.updateBalance(db, 'USD', -totalAmount);
    } else {
      settings.updateBalance(db, 'IQD', -totalAmount);
    }
    
    return { success: true, buyingHistoryId, totalAmount };
  });
  
  return transaction();
}

function addDirectPurchaseMultiCurrency(db, { item_name, quantity, supplier, date, usdAmount, iqdAmount }) {
  const purchaseDate = date || new Date().toISOString();
  const total_usd = usdAmount || 0;
  const total_iqd = iqdAmount || 0;
  
  if (total_usd <= 0 && total_iqd <= 0) {
    throw new Error('At least one currency amount must be greater than 0');
  }
  
  const transaction = db.transaction(() => {
    // Calculate combined total in IQD for display purposes (using standard exchange rate)
    const EXCHANGE_RATE_USD_TO_IQD = 1440; // Standard rate for display
    const totalInIQD = (total_usd * EXCHANGE_RATE_USD_TO_IQD) + total_iqd;
    
    // Create a description that shows both currencies
    const currencyDesc = [];
    if (total_usd > 0) currencyDesc.push(`$${total_usd.toFixed(2)}`);
    if (total_iqd > 0) currencyDesc.push(`د.ع${total_iqd.toFixed(2)}`);
    const multiCurrencyItemName = `${item_name} (${currencyDesc.join(' + ')})`;
    
    // Add to buying history with MULTI currency indicator  
    const result = db.prepare(`
      INSERT INTO buying_history 
      (item_name, quantity, unit_price, total_price, supplier, date, currency) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      multiCurrencyItemName, 
      quantity, 
      totalInIQD / quantity, // Average unit price in IQD for display
      totalInIQD, 
      supplier, 
      purchaseDate, 
      'MULTI' // Special currency indicator
    );
    
    // Record transaction for tracking spending with both amounts
    const addTransactionStmt = db.prepare(`
      INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    addTransactionStmt.run(
      'direct_purchase',
      total_usd,
      total_iqd,
      `Multi-currency purchase: ${item_name} from ${supplier} (${currencyDesc.join(' + ')})`,
      result.lastInsertRowid,
      'buying_history',
      purchaseDate
    );
    
    // Deduct from both balances
    if (total_usd > 0) {
      settings.updateBalance(db, 'USD', -total_usd);
    }
    if (total_iqd > 0) {
      settings.updateBalance(db, 'IQD', -total_iqd);
    }
    
    return result;
  });
  
  return transaction();
}

function deleteBuyingHistory(db, id) {
  return db.prepare('DELETE FROM buying_history WHERE id = ?').run(id);
}

function updateBuyingHistory(db, { id, item_name, quantity, unit_price, total_price, supplier, date, currency = 'IQD' }) {
  return db.prepare('UPDATE buying_history SET item_name = ?, quantity = ?, unit_price = ?, total_price = ?, supplier = ?, date = ?, currency = ? WHERE id = ?')
    .run(item_name, quantity, unit_price, total_price, supplier, date, currency, id);
}

function getBuyingHistoryInDateRange(db, startDate, endDate) {
  return db.prepare('SELECT * FROM buying_history WHERE DATE(date) BETWEEN ? AND ? ORDER BY date DESC')
    .all(startDate, endDate);
}

function getTotalBuyingCostForPeriod(db, startDate, endDate) {
  const stmt = db.prepare(`
    SELECT 
      currency,
      SUM(total_price) as total_cost,
      COUNT(*) as transaction_count
    FROM buying_history 
    WHERE DATE(date) BETWEEN ? AND ?
    GROUP BY currency
  `);
  return stmt.all(startDate, endDate);
}

function getBuyingHistoryBySupplier(db, supplier) {
  return db.prepare('SELECT * FROM buying_history WHERE supplier = ? ORDER BY date DESC')
    .all(supplier);
}

function searchBuyingHistory(db, searchTerm) {
  const term = `%${searchTerm}%`;
  return db.prepare(`
    SELECT * FROM buying_history 
    WHERE item_name LIKE ? OR supplier LIKE ?
    ORDER BY date DESC
  `).all(term, term);
}

function getBuyingHistoryWithTransactions(db) {
  // Get regular buying history
  const buyingHistory = db.prepare('SELECT * FROM buying_history ORDER BY date DESC').all();
  
  // Get debt payment transactions
  const debtTransactions = db.prepare(`
    SELECT 
      t.id,
      t.type,
      t.amount_usd,
      t.amount_iqd,
      t.description,
      t.created_at as date,
      t.reference_id,
      t.reference_type,
      CASE 
        WHEN t.amount_usd > 0 THEN 'USD'
        WHEN t.amount_iqd > 0 THEN 'IQD'
        ELSE 'USD'
      END as currency,
      CASE 
        WHEN t.amount_usd > 0 THEN t.amount_usd
        WHEN t.amount_iqd > 0 THEN t.amount_iqd
        ELSE 0
      END as total_price,
      CASE 
        WHEN t.type = 'company_debt_payment' THEN 'Company Debt Payment'
        WHEN t.type = 'personal_loan_payment' THEN 'Personal Loan Payment'
        ELSE 'Transaction'
      END as supplier,
      t.description as item_name,
      1 as quantity,
      CASE 
        WHEN t.amount_usd > 0 THEN t.amount_usd
        WHEN t.amount_iqd > 0 THEN t.amount_iqd
        ELSE 0
      END as unit_price,
      'transaction' as entry_type
    FROM transactions t
    WHERE t.type IN ('company_debt_payment', 'personal_loan_payment')
    ORDER BY t.created_at DESC
  `).all();
  
  // Combine and sort by date
  const combined = [
    ...buyingHistory.map(item => ({ ...item, entry_type: 'purchase' })),
    ...debtTransactions
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return combined;
}

// Inventory helpers
function getArchivedProducts(db) {
  return db.prepare('SELECT * FROM products WHERE archived = 1').all();
}

function restoreProduct(db, id) {
  return db.prepare('UPDATE products SET archived = 0 WHERE id = ?').run(id);
}

function searchProducts(db, searchTerm) {
  const term = `%${searchTerm}%`;
  return db.prepare(`
    SELECT * FROM products 
    WHERE archived = 0 AND (
      name LIKE ? OR 
      model LIKE ? OR 
      category LIKE ?
    )
  `).all(term, term, term);
}

function getProductsByCategory(db, category) {
  return db.prepare('SELECT * FROM products WHERE category = ? AND archived = 0')
    .all(category);
}

function getLowStockProducts(db, threshold = 5) {
  return db.prepare('SELECT * FROM products WHERE stock <= ? AND archived = 0 ORDER BY stock ASC')
    .all(threshold);
}

function getLowStockAccessories(db, threshold = 5) {
  return db.prepare('SELECT * FROM accessories WHERE stock <= ? AND archived = 0 ORDER BY stock ASC')
    .all(threshold);
}

function getBuyingHistoryWithItems(db) {
  // Get regular buying history with items
  const buyingHistory = getBuyingHistory(db);
  
  // Get debt payment transactions
  const debtTransactions = db.prepare(`
    SELECT 
      t.id,
      t.type,
      t.amount_usd,
      t.amount_iqd,
      t.description,
      t.created_at as date,
      t.created_at as paid_at,
      t.reference_id,
      t.reference_type,
      CASE 
        WHEN t.amount_usd > 0 AND t.amount_iqd > 0 THEN 'MULTI'
        WHEN t.amount_usd > 0 THEN 'USD'
        WHEN t.amount_iqd > 0 THEN 'IQD'
        ELSE 'USD'
      END as currency,
      CASE 
        WHEN t.amount_usd > 0 AND t.amount_iqd > 0 THEN t.amount_usd + (t.amount_iqd / 1320)
        WHEN t.amount_usd > 0 THEN t.amount_usd
        WHEN t.amount_iqd > 0 THEN t.amount_iqd
        ELSE 0
      END as total_price,
      CASE 
        WHEN t.amount_usd > 0 AND t.amount_iqd > 0 THEN t.amount_usd + (t.amount_iqd / 1320)
        WHEN t.amount_usd > 0 THEN t.amount_usd
        WHEN t.amount_iqd > 0 THEN t.amount_iqd
        ELSE 0
      END as amount,
      t.amount_usd as multi_currency_usd,
      t.amount_iqd as multi_currency_iqd,
      CASE 
        WHEN t.type = 'company_debt_payment' THEN 'Company debt payment'
        WHEN t.type = 'personal_loan_payment' THEN 'Personal loan payment'
        ELSE 'Transaction'
      END as supplier,
      CASE 
        WHEN t.type = 'company_debt_payment' THEN 'Company debt payment'
        WHEN t.type = 'personal_loan_payment' THEN 'Personal loan payment'
        ELSE 'Transaction'
      END as company_name,
      t.description as item_name,
      1 as quantity,
      CASE 
        WHEN t.amount_usd > 0 AND t.amount_iqd > 0 THEN t.amount_usd + (t.amount_iqd / 1320)
        WHEN t.amount_usd > 0 THEN t.amount_usd
        WHEN t.amount_iqd > 0 THEN t.amount_iqd
        ELSE 0
      END as unit_price,
      'transaction' as entry_type,
      NULL as has_items
    FROM transactions t
    WHERE t.type IN ('company_debt_payment', 'personal_loan_payment')
      AND (t.amount_usd > 0 OR t.amount_iqd > 0)
    ORDER BY t.created_at DESC
  `).all();
  
  // Combine and sort by date
  const combined = [
    ...buyingHistory.map(item => ({ ...item, entry_type: 'purchase' })),
    ...debtTransactions
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return combined;
}

module.exports = {
  getBuyingHistory,
  addBuyingHistory,
  deleteBuyingHistory,
  updateBuyingHistory,
  getBuyingHistoryInDateRange,
  getTotalBuyingCostForPeriod,
  getBuyingHistoryBySupplier,
  searchBuyingHistory,
  getBuyingHistoryWithTransactions,
  getArchivedProducts,
  restoreProduct,
  searchProducts,
  getProductsByCategory,
  getLowStockProducts,
  getLowStockAccessories,
  getBuyingHistoryWithItems,
  addDirectPurchase,
  addDirectPurchaseWithItems,
  addDirectPurchaseMultiCurrency
};
