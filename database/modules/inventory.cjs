// Buying history and inventory management functions
const settings = require('./settings.cjs');

function getBuyingHistory(db) {
  return db.prepare('SELECT * FROM buying_history ORDER BY date DESC').all();
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
    const results = [];
    let totalAmount = 0;
    
    items.forEach(item => {
      const total_price = item.quantity * item.unit_price;
      totalAmount += total_price;
      
      const result = db.prepare('INSERT INTO buying_history (item_name, quantity, unit_price, total_price, supplier, date, currency) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(item.item_name, item.quantity, item.unit_price, total_price, supplier, purchaseDate, currency);
      
      results.push(result);
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
      results[0]?.lastInsertRowid || null,
      'buying_history',
      purchaseDate
    );
    
    // Deduct from balance
    if (currency === 'USD') {
      settings.updateBalance(db, 'USD', -totalAmount);
    } else {
      settings.updateBalance(db, 'IQD', -totalAmount);
    }
    
    return { success: true, results, totalAmount };
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
        WHEN t.type = 'customer_debt_payment' THEN 'Customer Debt Payment'
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
    WHERE t.type IN ('company_debt_payment', 'customer_debt_payment', 'personal_loan_payment')
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
  
  // Add items to each entry if needed
  const historyWithItems = buyingHistory.map(entry => {
    if (entry.has_items) {
      const items = db.prepare('SELECT * FROM company_debt_items WHERE debt_id = ?').all(entry.company_debt_id);
      return { ...entry, items };
    }
    return entry;
  });
  
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
      CASE 
        WHEN t.type = 'company_debt_payment' THEN 'Company debt payment'
        WHEN t.type = 'customer_debt_payment' THEN 'Customer debt payment'
        WHEN t.type = 'personal_loan_payment' THEN 'Personal loan payment'
        ELSE 'Transaction'
      END as supplier,
      CASE 
        WHEN t.type = 'company_debt_payment' THEN 'Company debt payment'
        WHEN t.type = 'customer_debt_payment' THEN 'Customer debt payment' 
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
    WHERE t.type IN ('company_debt_payment', 'customer_debt_payment', 'personal_loan_payment')
      AND (t.amount_usd > 0 OR t.amount_iqd > 0)
    ORDER BY t.created_at DESC
  `).all();
  
  // Combine and sort by date
  const combined = [
    ...historyWithItems.map(item => ({ ...item, entry_type: 'purchase' })),
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
  addDirectPurchaseWithItems
};
