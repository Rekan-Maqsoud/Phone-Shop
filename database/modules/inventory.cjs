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
    
    // For MULTI currency entries OR entries with multi-currency column data, prioritize column values, fallback to transaction data
    if (entry.currency === 'MULTI' || entry.multi_currency_usd !== null || entry.multi_currency_iqd !== null) {
      // First try to use the direct column values
      if (entry.multi_currency_usd !== null || entry.multi_currency_iqd !== null) {
        enhancedEntry.multi_currency_usd = entry.multi_currency_usd || 0;
        enhancedEntry.multi_currency_iqd = entry.multi_currency_iqd || 0;
      } else if (entry.currency === 'MULTI') {
        // Fallback to transaction data for older MULTI entries
        const transaction = db.prepare(`
          SELECT amount_usd, amount_iqd 
          FROM transactions 
          WHERE reference_id = ? AND reference_type = 'buying_history' AND type = 'direct_purchase'
          ORDER BY created_at DESC 
          LIMIT 1
        `).get(entry.id);
        
        if (transaction) {
          // Convert negative transaction amounts (spending) to positive display amounts
          enhancedEntry.multi_currency_usd = Math.abs(transaction.amount_usd || 0);
          enhancedEntry.multi_currency_iqd = Math.abs(transaction.amount_iqd || 0);
        }
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
      -usdAmount, // Negative to indicate spending
      -iqdAmount, // Negative to indicate spending
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

function addDirectPurchaseWithItems(db, { supplier, date, items, currency = 'IQD', totalAmount = null }) {
  const purchaseDate = date || new Date().toISOString();
  
  const transaction = db.transaction(() => {
    // Use provided totalAmount or calculate from items
    let finalTotalAmount = totalAmount;
    if (finalTotalAmount === null) {
      finalTotalAmount = 0;
      items.forEach(item => {
        finalTotalAmount += item.quantity * item.unit_price;
      });
    }
    
    // Check for mixed-currency scenario (item values in different currency than payment)
    const itemCurrencies = [...new Set(items.map(item => item.currency || 'IQD'))];
    const hasMixedCurrencies = itemCurrencies.length > 1;
    const hasPaymentCurrencyMismatch = itemCurrencies.some(itemCurrency => itemCurrency !== currency);
    const isMixedCurrencyPurchase = hasMixedCurrencies || hasPaymentCurrencyMismatch;
    
    // Calculate totals by original item currency
    const usdItemsTotal = items
      .filter(item => (item.currency || 'IQD') === 'USD')
      .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    
    const iqdItemsTotal = items
      .filter(item => (item.currency || 'IQD') === 'IQD')
      .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    
    // Determine if we need to use multi-currency columns
    const shouldUseMultiCurrencyColumns = isMixedCurrencyPurchase && (usdItemsTotal > 0 || iqdItemsTotal > 0);
    
    let result;
    if (shouldUseMultiCurrencyColumns) {
      // Create entry with multi-currency columns populated
      result = db.prepare(`
        INSERT INTO buying_history 
        (item_name, quantity, unit_price, total_price, supplier, date, currency, has_items, multi_currency_usd, multi_currency_iqd) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `Purchase with ${items.length} items`, // Generic description for multi-item purchase
        items.reduce((sum, item) => sum + item.quantity, 0), // Total quantity of all items
        finalTotalAmount / items.reduce((sum, item) => sum + item.quantity, 0), // Average unit price
        finalTotalAmount,
        supplier,
        purchaseDate,
        currency,
        1, // has_items = true
        usdItemsTotal, // Store original USD item values
        iqdItemsTotal  // Store original IQD item values
      );
    } else {
      // Standard single-currency entry
      result = db.prepare(`
        INSERT INTO buying_history 
        (item_name, quantity, unit_price, total_price, supplier, date, currency, has_items) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `Purchase with ${items.length} items`, // Generic description for multi-item purchase
        items.reduce((sum, item) => sum + item.quantity, 0), // Total quantity of all items
        finalTotalAmount / items.reduce((sum, item) => sum + item.quantity, 0), // Average unit price
        finalTotalAmount,
        supplier,
        purchaseDate,
        currency,
        1 // has_items = true
      );
    }
    
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
      
      // Add stock to products or accessories using proper merging logic
      if (item.item_type === 'product') {
        // Use the products module's addProduct function which handles price averaging
        const { addProduct } = require('./products.cjs');
        
        // For returns (negative quantities), we need to handle them differently
        if (item.quantity < 0) {
          
          // Find the product to update
          const existingProducts = db.prepare('SELECT * FROM products WHERE archived = 0').all();
          const matchingProduct = existingProducts.find(p => 
            (p.brand || '').toLowerCase() === (item.brand || '').toLowerCase() &&
            (p.model || '').toLowerCase() === (item.model || '').toLowerCase() &&
            (p.ram || '').toLowerCase() === (item.ram || '').toLowerCase() &&
            (p.storage || '').toLowerCase() === (item.storage || '').toLowerCase()
          );
          
          if (matchingProduct) {
            const currentStock = Number(matchingProduct.stock) || 0;
            const currentPrice = Number(matchingProduct.buying_price) || 0;
            const returnQuantity = Math.abs(item.quantity); // Make positive for calculation
            const returnPrice = item.unit_price;
            
            // Calculate new stock (decrease by return quantity)
            const newStock = Math.max(0, currentStock - returnQuantity);
            
            // Calculate new price using return formula
            let newPrice = currentPrice;
            if (newStock > 0) {
              const oldTotal = currentStock * currentPrice;
              const returnValue = returnQuantity * returnPrice;
              newPrice = (oldTotal - returnValue) / newStock;
              
              // Round appropriately based on currency
              if ((item.currency || currency).toUpperCase() === 'USD') {
                newPrice = Math.round(newPrice * 100) / 100;
              } else {
                newPrice = Math.round(newPrice);
              }
              
              newPrice = Math.max(0, newPrice);
            }
            
            // Update the product directly
            db.prepare('UPDATE products SET stock = ?, buying_price = ? WHERE id = ?')
              .run(newStock, newPrice, matchingProduct.id);
          }
        } else {
          // Normal purchase - add stock
          const productData = {
            name: item.item_name || [item.brand, item.model].filter(Boolean).join(' '),
            brand: item.brand || '',
            model: item.model || '',
            ram: item.ram || null,
            storage: item.storage || null,
            buying_price: item.unit_price,
            stock: item.quantity,
            currency: item.currency || currency,
            category: 'phones',
            archived: 0
          };
          
          try {
            const result = addProduct(db, productData);
            
          } catch (error) {
            console.error('❌ [inventory.cjs] Error adding product:', error);
            throw error;
          }
        }
      } else if (item.item_type === 'accessory') {
        // Use the accessories module's addAccessory function which handles price averaging
        const { addAccessory } = require('./accessories.cjs');
        
        // For returns (negative quantities), handle them differently
        if (item.quantity < 0) {
          
          // Find the accessory to update
          const existingAccessories = db.prepare('SELECT * FROM accessories WHERE archived = 0').all();
          const matchingAccessory = existingAccessories.find(a => 
            (a.brand || '').toLowerCase() === (item.brand || '').toLowerCase() &&
            (a.model || '').toLowerCase() === (item.model || '').toLowerCase() &&
            (a.type || '').toLowerCase() === (item.type || '').toLowerCase()
          );
          
          if (matchingAccessory) {
            const currentStock = Number(matchingAccessory.stock) || 0;
            const currentPrice = Number(matchingAccessory.buying_price) || 0;
            const returnQuantity = Math.abs(item.quantity); // Make positive for calculation
            const returnPrice = item.unit_price;
            
            // Calculate new stock (decrease by return quantity)
            const newStock = Math.max(0, currentStock - returnQuantity);
            
            // Calculate new price using return formula
            let newPrice = currentPrice;
            if (newStock > 0) {
              const oldTotal = currentStock * currentPrice;
              const returnValue = returnQuantity * returnPrice;
              newPrice = (oldTotal - returnValue) / newStock;
              
              // Round appropriately based on currency
              if ((item.currency || currency).toUpperCase() === 'USD') {
                newPrice = Math.round(newPrice * 100) / 100;
              } else {
                newPrice = Math.round(newPrice);
              }
              
              newPrice = Math.max(0, newPrice);
            }
            
            
            // Update the accessory directly
            db.prepare('UPDATE accessories SET stock = ?, buying_price = ? WHERE id = ?')
              .run(newStock, newPrice, matchingAccessory.id);
          }
        } else {
          // Normal purchase - add stock
          const accessoryData = {
            name: item.item_name || [item.brand, item.model].filter(Boolean).join(' '),
            brand: item.brand || '',
            model: item.model || '',
            type: item.type || null,
            buying_price: item.unit_price,
            stock: item.quantity,
            currency: item.currency || currency,
            archived: 0
          };
          
          try {
            const result = addAccessory(db, accessoryData);
          } catch (error) {
            console.error('❌ [inventory.cjs] Error adding accessory:', error);
            throw error;
          }
        }
      }
    });
    
    // Record transaction for tracking spending
    const addTransactionStmt = db.prepare(`
      INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    let transactionUsdAmount, transactionIqdAmount;
    
    if (shouldUseMultiCurrencyColumns) {
      // For mixed-currency purchases, record the actual payment amounts based on payment currency
      if (currency === 'USD') {
        transactionUsdAmount = finalTotalAmount;
        transactionIqdAmount = 0;
      } else {
        transactionUsdAmount = 0;
        transactionIqdAmount = finalTotalAmount;
      }
    } else {
      // Standard single-currency transaction
      transactionUsdAmount = currency === 'USD' ? finalTotalAmount : 0;
      transactionIqdAmount = currency === 'IQD' ? finalTotalAmount : 0;
    }
    
    addTransactionStmt.run(
      'direct_purchase',
      -transactionUsdAmount, // Negative to indicate spending
      -transactionIqdAmount, // Negative to indicate spending
      `Direct purchase with ${items.length} items from ${supplier}${shouldUseMultiCurrencyColumns ? ' (mixed-currency)' : ''}`,
      buyingHistoryId,
      'buying_history',
      purchaseDate
    );
    
    // Deduct from balance based on payment currency
    if (currency === 'USD') {
      settings.updateBalance(db, 'USD', -finalTotalAmount);
    } else {
      settings.updateBalance(db, 'IQD', -finalTotalAmount);
    }
    
    return { success: true, buyingHistoryId, totalAmount: finalTotalAmount };
  });
  
  return transaction();
}

function addDirectPurchaseMultiCurrencyWithItems(db, { supplier, date, items, usdAmount, iqdAmount }) {
  const purchaseDate = date || new Date().toISOString();
  const total_usd = usdAmount || 0;
  const total_iqd = iqdAmount || 0;
  
  if (total_usd <= 0 && total_iqd <= 0) {
    throw new Error('At least one currency amount must be greater than 0');
  }
  
  const transaction = db.transaction(() => {
    // Get current exchange rate for calculations
    const { getExchangeRate } = require('./settings.cjs');
    const EXCHANGE_RATE_USD_TO_IQD = getExchangeRate(db, 'USD', 'IQD');
    const totalInIQD = (total_usd * EXCHANGE_RATE_USD_TO_IQD) + total_iqd;
    
    const totalQuantity = items.reduce((sum, item) => sum + parseInt(item.quantity), 0);
    const itemNames = items.map(item => item.item_name || `${item.brand} ${item.model}`).join(', ');
    const multiCurrencyItemName = `Purchase with ${items.length} items: ${itemNames}`;
    
    // Create a single buying history entry for the multi-currency purchase
    const result = db.prepare(`
      INSERT INTO buying_history 
      (item_name, quantity, unit_price, total_price, supplier, date, currency, has_items, multi_currency_usd, multi_currency_iqd) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      multiCurrencyItemName,
      totalQuantity,
      totalInIQD / totalQuantity, // Average unit price in IQD for display
      totalInIQD,
      supplier,
      purchaseDate,
      'MULTI', // Special currency indicator
      1, // has_items = true
      total_usd, // Store actual USD amount
      total_iqd  // Store actual IQD amount
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
        item.item_name || `${item.brand} ${item.model}`,
        item.item_type || 'product',
        item.brand || null,
        item.model || null,
        item.ram || null,
        item.storage || null,
        item.type || null,
        item.quantity,
        item.unit_price,
        itemTotalPrice,
        item.currency || 'IQD'
      );
      
      // Add stock to products or accessories using proper merging logic
      if (item.item_type === 'product') {
        // Use the products module's addProduct function which handles price averaging
        const { addProduct } = require('./products.cjs');
        
        // For returns (negative quantities), we need to handle them differently
        if (item.quantity < 0) {
          
          // Find the product to update
          const existingProducts = db.prepare('SELECT * FROM products WHERE archived = 0').all();
          const matchingProduct = existingProducts.find(p => 
            (p.brand || '').toLowerCase() === (item.brand || '').toLowerCase() &&
            (p.model || '').toLowerCase() === (item.model || '').toLowerCase() &&
            (p.ram || '').toLowerCase() === (item.ram || '').toLowerCase() &&
            (p.storage || '').toLowerCase() === (item.storage || '').toLowerCase()
          );
          
          if (matchingProduct) {
            const currentStock = Number(matchingProduct.stock) || 0;
            const currentPrice = Number(matchingProduct.buying_price) || 0;
            const returnQuantity = Math.abs(item.quantity); // Make positive for calculation
            const returnPrice = item.unit_price;
            
            // Calculate new stock (decrease by return quantity)
            const newStock = Math.max(0, currentStock - returnQuantity);
            
            // Calculate new price using return formula
            let newPrice = currentPrice;
            if (newStock > 0) {
              const oldTotal = currentStock * currentPrice;
              const returnValue = returnQuantity * returnPrice;
              newPrice = (oldTotal - returnValue) / newStock;
              
              // Round appropriately based on currency
              if ((item.currency || 'IQD').toUpperCase() === 'USD') {
                newPrice = Math.round(newPrice * 100) / 100;
              } else {
                newPrice = Math.round(newPrice);
              }
              
              newPrice = Math.max(0, newPrice);
            }
     
            
            // Update the product directly
            db.prepare('UPDATE products SET stock = ?, buying_price = ? WHERE id = ?')
              .run(newStock, newPrice, matchingProduct.id);
          }
        } else {
          // Normal purchase - add stock
          const productData = {
            name: item.item_name || [item.brand, item.model].filter(Boolean).join(' '),
            brand: item.brand || '',
            model: item.model || '',
            ram: item.ram || null,
            storage: item.storage || null,
            buying_price: item.unit_price,
            stock: item.quantity,
            currency: item.currency || 'IQD',
            category: 'phones',
            archived: 0
          };
          
          try {
            const result = addProduct(db, productData);
      
          } catch (error) {
            console.error('❌ [inventory.cjs] Error adding product:', error);
            throw error;
          }
        }
      } else if (item.item_type === 'accessory') {
        // Use the accessories module's addAccessory function which handles price averaging
        const { addAccessory } = require('./accessories.cjs');
        
        // For returns (negative quantities), handle them differently
        if (item.quantity < 0) {
  
          
          // Find the accessory to update
          const existingAccessories = db.prepare('SELECT * FROM accessories WHERE archived = 0').all();
          const matchingAccessory = existingAccessories.find(a => 
            (a.brand || '').toLowerCase() === (item.brand || '').toLowerCase() &&
            (a.model || '').toLowerCase() === (item.model || '').toLowerCase() &&
            (a.type || '').toLowerCase() === (item.type || '').toLowerCase()
          );
          
          if (matchingAccessory) {
            const currentStock = Number(matchingAccessory.stock) || 0;
            const currentPrice = Number(matchingAccessory.buying_price) || 0;
            const returnQuantity = Math.abs(item.quantity); // Make positive for calculation
            const returnPrice = item.unit_price;
            
            // Calculate new stock (decrease by return quantity)
            const newStock = Math.max(0, currentStock - returnQuantity);
            
            // Calculate new price using return formula
            let newPrice = currentPrice;
            if (newStock > 0) {
              const oldTotal = currentStock * currentPrice;
              const returnValue = returnQuantity * returnPrice;
              newPrice = (oldTotal - returnValue) / newStock;
              
              // Round appropriately based on currency
              if ((item.currency || 'IQD').toUpperCase() === 'USD') {
                newPrice = Math.round(newPrice * 100) / 100;
              } else {
                newPrice = Math.round(newPrice);
              }
              
              newPrice = Math.max(0, newPrice);
            }
            
            // Update the accessory directly
            db.prepare('UPDATE accessories SET stock = ?, buying_price = ? WHERE id = ?')
              .run(newStock, newPrice, matchingAccessory.id);
          }
        } else {
          // Normal purchase - add stock
          const accessoryData = {
            name: item.item_name || [item.brand, item.model].filter(Boolean).join(' '),
            brand: item.brand || '',
            model: item.model || '',
            type: item.type || null,
            buying_price: item.unit_price,
            stock: item.quantity,
            currency: item.currency || 'IQD',
            archived: 0
          };
          
          try {
            const result = addAccessory(db, accessoryData);
          
          } catch (error) {
            console.error('❌ [inventory.cjs] Error adding accessory:', error);
            throw error;
          }
        }
      }
    });
    
    // Record transaction for tracking spending with both amounts - use negative values to indicate spending
    const addTransactionStmt = db.prepare(`
      INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    addTransactionStmt.run(
      'direct_purchase',
      -total_usd, // Negative to indicate spending
      -total_iqd, // Negative to indicate spending
      `Multi-currency purchase with ${items.length} items from ${supplier}`,
      buyingHistoryId,
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
    
    return { success: true, buyingHistoryId, totalAmount: { usd: total_usd, iqd: total_iqd } };
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
    // Get current exchange rate for calculations
    const { getExchangeRate } = require('./settings.cjs');
    const EXCHANGE_RATE_USD_TO_IQD = getExchangeRate(db, 'USD', 'IQD');
    const totalInIQD = (total_usd * EXCHANGE_RATE_USD_TO_IQD) + total_iqd;
    
    // Create a clean item name without currency amounts (currency amounts will be displayed in the Amount column)
    const multiCurrencyItemName = `Multi-currency purchase: ${item_name}`;
    
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
      -total_usd, // Negative to indicate spending
      -total_iqd, // Negative to indicate spending
      `Multi-currency purchase: ${item_name} from ${supplier}`,
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
  
  // Get debt payment transactions that are NOT already recorded in buying_history
  // We only include transactions that don't have a corresponding buying_history entry
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
      -- Only include transactions that don't have a matching buying_history entry
      AND NOT EXISTS (
        SELECT 1 FROM buying_history bh 
        WHERE bh.type = 'debt_payment' 
        AND bh.reference_id = t.reference_id 
        AND DATE(bh.date) = DATE(t.created_at)
      )
    ORDER BY t.created_at DESC
  `).all();
  
  // Combine and sort by date
  const combined = [
    ...buyingHistory.map(item => ({ ...item, entry_type: 'purchase' })),
    ...debtTransactions
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return combined;
}

// Returns functionality
function addReturn(db, { product_id, accessory_id, item_name, item_type = 'product', brand, model, ram, storage, quantity, return_price, original_price, supplier, reason, date, currency = 'IQD', buying_history_id }) {
  const returnDate = date || new Date().toISOString();
  
  const transaction = db.transaction(() => {
    // Insert return record
    const result = db.prepare(`
      INSERT INTO returns 
      (product_id, accessory_id, item_name, item_type, brand, model, ram, storage, quantity, return_price, original_price, supplier, reason, date, currency, buying_history_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      product_id || null,
      accessory_id || null,
      item_name,
      item_type,
      brand || null,
      model || null,
      ram || null,
      storage || null,
      quantity,
      return_price,
      original_price,
      supplier || null,
      reason || null,
      returnDate,
      currency,
      buying_history_id || null
    );
    
    // Update product/accessory stock and recalculate price
    if (item_type === 'product' && product_id) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
      if (product) {
        const currentStock = Number(product.stock) || 0;
        const currentPrice = Number(product.buying_price) || 0;
        
        // Calculate new stock (decrease by return quantity)
        const newStock = Math.max(0, currentStock - quantity);
        
        // Calculate new price using the formula: (old_total - return_value) / new_quantity
        let newPrice = currentPrice;
        if (newStock > 0) {
          const oldTotal = currentStock * currentPrice;
          const returnValue = quantity * return_price;
          newPrice = (oldTotal - returnValue) / newStock;
          
          // Round appropriately based on currency
          if (currency.toUpperCase() === 'USD') {
            newPrice = Math.round(newPrice * 100) / 100; // 2 decimal places for USD
          } else {
            newPrice = Math.round(newPrice); // Whole numbers for IQD
          }
          
          // Ensure price doesn't go negative
          newPrice = Math.max(0, newPrice);
        }
        
        // Update product
        db.prepare('UPDATE products SET stock = ?, buying_price = ? WHERE id = ?')
          .run(newStock, newPrice, product_id);
      }
    } else if (item_type === 'accessory' && accessory_id) {
      const accessory = db.prepare('SELECT * FROM accessories WHERE id = ?').get(accessory_id);
      if (accessory) {
        const currentStock = Number(accessory.stock) || 0;
        const currentPrice = Number(accessory.buying_price) || 0;
        
        // Calculate new stock (decrease by return quantity)
        const newStock = Math.max(0, currentStock - quantity);
        
        // Calculate new price using the formula: (old_total - return_value) / new_quantity
        let newPrice = currentPrice;
        if (newStock > 0) {
          const oldTotal = currentStock * currentPrice;
          const returnValue = quantity * return_price;
          newPrice = (oldTotal - returnValue) / newStock;
          
          // Round appropriately based on currency
          if (currency.toUpperCase() === 'USD') {
            newPrice = Math.round(newPrice * 100) / 100; // 2 decimal places for USD
          } else {
            newPrice = Math.round(newPrice); // Whole numbers for IQD
          }
          
          // Ensure price doesn't go negative
          newPrice = Math.max(0, newPrice);
        }
        
        // Update accessory
        db.prepare('UPDATE accessories SET stock = ?, buying_price = ? WHERE id = ?')
          .run(newStock, newPrice, accessory_id);
      }
    }
    
    // Record transaction for accounting (return adds money back)
    const addTransactionStmt = db.prepare(`
      INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const usdAmount = currency === 'USD' ? return_price * quantity : 0;
    const iqdAmount = currency === 'IQD' ? return_price * quantity : 0;
    
    addTransactionStmt.run(
      'return',
      usdAmount, // Positive to indicate money received back
      iqdAmount, // Positive to indicate money received back
      `Return: ${item_name} (${quantity} units) ${reason ? '- ' + reason : ''}`,
      result.lastInsertRowid,
      'returns',
      returnDate
    );
    
    // Add money back to balance
    if (currency === 'USD') {
      settings.updateBalance(db, 'USD', return_price * quantity);
    } else {
      settings.updateBalance(db, 'IQD', return_price * quantity);
    }
    
    return { success: true, returnId: result.lastInsertRowid, returnValue: return_price * quantity };
  });
  
  return transaction();
}

function getReturns(db) {
  return db.prepare('SELECT * FROM returns ORDER BY date DESC').all();
}

function getReturnsByDateRange(db, startDate, endDate) {
  return db.prepare('SELECT * FROM returns WHERE DATE(date) BETWEEN ? AND ? ORDER BY date DESC')
    .all(startDate, endDate);
}

function getReturnsByProduct(db, product_id) {
  return db.prepare('SELECT * FROM returns WHERE product_id = ? ORDER BY date DESC')
    .all(product_id);
}

function getReturnsByAccessory(db, accessory_id) {
  return db.prepare('SELECT * FROM returns WHERE accessory_id = ? ORDER BY date DESC')
    .all(accessory_id);
}

function deleteReturn(db, id) {
  return db.prepare('DELETE FROM returns WHERE id = ?').run(id);
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
  addDirectPurchaseMultiCurrency,
  addDirectPurchaseMultiCurrencyWithItems,
  // Returns functionality
  addReturn,
  getReturns,
  getReturnsByDateRange,
  getReturnsByProduct,
  getReturnsByAccessory,
  deleteReturn
};
