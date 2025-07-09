// Main database module that brings together all submodules
const { initializeDatabase, runMigrations, resetAllData: initResetAllData } = require('./modules/init.cjs');
const products = require('./modules/products.cjs');
const accessories = require('./modules/accessories.cjs');
const sales = require('./modules/sales.cjs');
const debts = require('./modules/debts.cjs');
const inventory = require('./modules/inventory.cjs');
const reports = require('./modules/reports.cjs');
const settings = require('./modules/settings.cjs');
const transactions = require('./modules/transactions.cjs');

// Export as a factory function that takes dbPath
module.exports = function(dbPath) {
  // Initialize database instance
  const db = initializeDatabase(dbPath);
  runMigrations(db);

  // Product functions
  function getProducts() {
    return products.getProducts(db);
  }

  function addProduct(productData) {
    return products.addProduct(db, productData);
  }

  function updateProduct(productData) {
    return products.updateProduct(db, productData);
  }

  function updateProductNoArchive(productData) {
    return products.updateProductNoArchive(db, productData);
  }

  function addStock(id, amount) {
    return products.addStock(db, id, amount);
  }

  function deleteProduct(id) {
    return products.deleteProduct(db, id);
  }

  // Accessory functions
  function getAccessories() {
    return accessories.getAccessories(db);
  }

  function addAccessory(accessoryData) {
    return accessories.addAccessory(db, accessoryData);
  }

  function updateAccessory(accessoryData) {
    return accessories.updateAccessory(db, accessoryData);
  }

  function updateAccessoryNoArchive(accessoryData) {
    return accessories.updateAccessoryNoArchive(db, accessoryData);
  }

  function addAccessoryStock(id, amount) {
    return accessories.addAccessoryStock(db, id, amount);
  }

  function deleteAccessory(id) {
    return accessories.deleteAccessory(db, id);
  }

  function getArchivedAccessories() {
    return accessories.getArchivedAccessories(db);
  }

  function restoreAccessory(id) {
    return accessories.restoreAccessory(db, id);
  }

  function searchAccessories(searchTerm) {
    return accessories.searchAccessories(db, searchTerm);
  }

  function getAllAccessories() {
    return accessories.getAccessories(db);
  }

  // Sales functions
  function getSales() {
    return sales.getSales(db);
  }

  function getSaleById(id) {
    return sales.getSaleById(db, id);
  }

  function getSaleItems(saleId) {
    return sales.getSaleItems(db, saleId);
  }

  function addSale(saleData) {
    return sales.addSale(db, saleData);
  }

  function addSaleItem(saleItemData) {
    return sales.addSaleItem(db, saleItemData);
  }

  function deleteSale(id) {
    return sales.deleteSale(db, id);
  }

  function getSalesInDateRange(startDate, endDate) {
    return sales.getSalesInDateRange(db, startDate, endDate);
  }

  function getTotalSalesForPeriod(startDate, endDate) {
    return sales.getTotalSalesForPeriod(db, startDate, endDate);
  }

  function getSalesReport(startDate, endDate) {
    return sales.getSalesReport(db, startDate, endDate);
  }

  // Debt functions
  function getCustomerDebts() {
    return debts.getCustomerDebts(db);
  }

  function addCustomerDebt(debtData) {
    return debts.addCustomerDebt(db, debtData);
  }

  function payCustomerDebt(id) {
    return debts.payCustomerDebt(db, id);
  }

  function deleteCustomerDebt(id) {
    return debts.deleteCustomerDebt(db, id);
  }

  function getCompanyDebts() {
    return debts.getCompanyDebts(db);
  }

  function addCompanyDebt(debtData) {
    return debts.addCompanyDebt(db, debtData);
  }

  function addCompanyDebtWithItems(debtData) {
    return debts.addCompanyDebtWithItems(db, debtData);
  }

  function payCompanyDebt(id) {
    return debts.payCompanyDebt(db, id);
  }

  function markCompanyDebtPaid(id, paymentData) {
    return debts.markCompanyDebtPaid(db, id, paymentData);
  }

  function markCustomerDebtPaid(id, paymentData) {
    return debts.markCustomerDebtPaid(db, id, paymentData);
  }

  function markPersonalLoanPaid(id, paymentData) {
    return debts.markPersonalLoanPaid(db, id, paymentData);
  }

  function deleteCompanyDebt(id) {
    return debts.deleteCompanyDebt(db, id);
  }

  function getCompanyDebtItems(debtId) {
    return debts.getCompanyDebtItems(db, debtId);
  }

  function addCompanyDebtItem(itemData) {
    return debts.addCompanyDebtItem(db, itemData);
  }

  function deleteCompanyDebtItem(id) {
    return debts.deleteCompanyDebtItem(db, id);
  }

  function updateCompanyDebtItem(itemData) {
    return debts.updateCompanyDebtItem(db, itemData);
  }

  function getPersonalLoans() {
    return debts.getPersonalLoans(db);
  }

  function addPersonalLoan(loanData) {
    return debts.addPersonalLoan(db, loanData);
  }

  function payPersonalLoan(id) {
    return debts.payPersonalLoan(db, id);
  }

  function deletePersonalLoan(id) {
    return debts.deletePersonalLoan(db, id);
  }

  function getTotalDebts() {
    return debts.getTotalDebts(db);
  }

  // Inventory functions
  function getBuyingHistory() {
    return inventory.getBuyingHistory(db);
  }

  function getBuyingHistoryWithItems() {
    return inventory.getBuyingHistoryWithItems(db);
  }

  function addBuyingHistory(historyData) {
    return inventory.addBuyingHistory(db, historyData);
  }

  function addDirectPurchase(purchaseData) {
    return inventory.addDirectPurchase(db, purchaseData);
  }

  function addDirectPurchaseWithItems(purchaseData) {
    return inventory.addDirectPurchaseWithItems(db, purchaseData);
  }

  function deleteBuyingHistory(id) {
    return inventory.deleteBuyingHistory(db, id);
  }

  function updateBuyingHistory(historyData) {
    return inventory.updateBuyingHistory(db, historyData);
  }

  function getBuyingHistoryInDateRange(startDate, endDate) {
    return inventory.getBuyingHistoryInDateRange(db, startDate, endDate);
  }

  function getTotalBuyingCostForPeriod(startDate, endDate) {
    return inventory.getTotalBuyingCostForPeriod(db, startDate, endDate);
  }

  function getBuyingHistoryBySupplier(supplier) {
    return inventory.getBuyingHistoryBySupplier(db, supplier);
  }

  function searchBuyingHistory(searchTerm) {
    return inventory.searchBuyingHistory(db, searchTerm);
  }

  function getBuyingHistoryWithTransactions() {
    return inventory.getBuyingHistoryWithTransactions(db);
  }

  function getArchivedProducts() {
    return inventory.getArchivedProducts(db);
  }

  function restoreProduct(id) {
    return inventory.restoreProduct(db, id);
  }

  function searchProducts(searchTerm) {
    return inventory.searchProducts(db, searchTerm);
  }

  function getProductsByCategory(category) {
    return inventory.getProductsByCategory(db, category);
  }

  function getLowStockProducts(threshold) {
    return inventory.getLowStockProducts(db, threshold);
  }

  function getLowStockAccessories(threshold) {
    return inventory.getLowStockAccessories(db, threshold);
  }

  // Transaction functions
  function getTransactions(limit = 50) {
    return transactions.getTransactions(db, limit);
  }

  function addTransaction(transactionData) {
    return transactions.addTransaction(db, transactionData);
  }

  function getTransactionsByType(type, limit = 50) {
    return transactions.getTransactionsByType(db, type, limit);
  }

  function getTransactionsByDateRange(startDate, endDate) {
    return transactions.getTransactionsByDateRange(db, startDate, endDate);
  }

  function getTransactionsByReference(reference_type, reference_id) {
    return transactions.getTransactionsByReference(db, reference_type, reference_id);
  }

  function deleteTransaction(id) {
    return transactions.deleteTransaction(db, id);
  }

  function getTotalTransactionsByType(type, startDate = null, endDate = null) {
    return transactions.getTotalTransactionsByType(db, type, startDate, endDate);
  }

  // Reports functions
  function getMonthlyReport(year, month) {
    return reports.getMonthlyReport(db, year, month);
  }

  function getYearlyReport(year) {
    return reports.getYearlyReport(db, year);
  }

  function getTopSellingProducts(limit, startDate, endDate) {
    return reports.getTopSellingProducts(db, limit, startDate, endDate);
  }

  function getProfitAnalysis(startDate, endDate) {
    return reports.getProfitAnalysis(db, startDate, endDate);
  }

  function getInventoryValue() {
    return reports.getInventoryValue(db);
  }

  function getCustomerAnalysis(startDate, endDate) {
    return reports.getCustomerAnalysis(db, startDate, endDate);
  }

  function getDashboardStats() {
    return reports.getDashboardStats(db);
  }

  function getMonthlyReports() {
    return reports.getMonthlyReports(db);
  }

  // Settings functions
  function getSetting(key) {
    return settings.getSetting(db, key);
  }

  function setSetting(key, value) {
    return settings.setSetting(db, key, value);
  }

  function deleteSetting(key) {
    return settings.deleteSetting(db, key);
  }

  function getAllSettings() {
    return settings.getAllSettings(db);
  }

  function getExchangeRate(fromCurrency, toCurrency) {
    return settings.getExchangeRate(db, fromCurrency, toCurrency);
  }

  function setExchangeRate(fromCurrency, toCurrency, rate) {
    return settings.setExchangeRate(db, fromCurrency, toCurrency, rate);
  }

  function getDefaultCurrency() {
    return settings.getDefaultCurrency(db);
  }

  function setDefaultCurrency(currency) {
    return settings.setDefaultCurrency(db, currency);
  }

  function getStoreSettings() {
    return settings.getStoreSettings(db);
  }

  function getBalances() {
    return settings.getBalances(db);
  }

  function updateStoreSettings(settingsData) {
    return settings.updateStoreSettings(db, settingsData);
  }

  function createBackup(backupPath) {
    return settings.createBackup(db, backupPath);
  }

  function restoreBackup(backupPath) {
    return settings.restoreBackup(db, backupPath);
  }

  function optimizeDatabase() {
    return settings.optimizeDatabase(db);
  }

  function getDatabaseInfo() {
    return settings.getDatabaseInfo(db);
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
      return reports.getMonthlyReport(db, prevYear, prevMonth);
    }
    
    return true;
  }

  function resetAllData() {
    return initResetAllData(db);
  }

  function logBackup({ file_name, encrypted, log }) {
    // Only allow one log entry for current backup (replace if exists)
    if (file_name === 'phone-shop-current-backup.sqlite') {
      db.prepare('DELETE FROM backups WHERE file_name = ?').run(file_name);
    }
    return db.prepare('INSERT INTO backups (file_name, encrypted, log) VALUES (?, ?, ?)')
      .run(file_name, encrypted ? 1 : 0, log);
  }

  function getBackups() {
    // Only show the current backup and manual backups
    const backups = db.prepare('SELECT * FROM backups ORDER BY created_at DESC').all();
    // Filter: keep only the latest current backup and all manual backups
    const manualBackups = backups.filter(b => b.file_name && b.file_name.startsWith('phone-shop-backup-'));
    const currentBackup = backups.find(b => b.file_name === 'phone-shop-current-backup.sqlite');
    return [currentBackup, ...manualBackups].filter(Boolean);
  }

  function saveSale({ items, total, created_at, is_debt, customer_name, currency = 'IQD', discount = null, multi_currency = null }) {
    // Use provided total and created_at if available, else calculate
    let saleTotal = typeof total === 'number' ? total : items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    
    // Apply discount to total if provided
    if (discount && discount.discount_value > 0) {
      if (discount.discount_type === 'percentage') {
        saleTotal = saleTotal * (1 - discount.discount_value / 100);
      } else {
        saleTotal = Math.max(0, saleTotal - discount.discount_value);
      }
      saleTotal = Math.round(saleTotal); // Round to nearest integer for currency
    }
    
    const saleCreatedAt = created_at || new Date().toISOString();
    const saleIsDebt = is_debt ? 1 : 0;
    
    // Handle multi-currency payments
    let paidAmountUSD = 0;
    let paidAmountIQD = 0;
    let isMultiCurrency = 0;
    
    if (multi_currency && (multi_currency.usdAmount > 0 || multi_currency.iqdAmount > 0)) {
      paidAmountUSD = multi_currency.usdAmount || 0;
      paidAmountIQD = multi_currency.iqdAmount || 0;
      isMultiCurrency = (paidAmountUSD > 0 && paidAmountIQD > 0) ? 1 : 0;
    } else {
      // Single currency payment
      if (currency === 'USD') {
        paidAmountUSD = saleTotal;
      } else {
        paidAmountIQD = saleTotal;
      }
    }

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
      const sale = db.prepare('INSERT INTO sales (total, created_at, is_debt, customer_name, currency, paid_amount_usd, paid_amount_iqd, is_multi_currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(saleTotal, saleCreatedAt, saleIsDebt, customer_name || null, currency, paidAmountUSD, paidAmountIQD, isMultiCurrency);
      const saleId = sale.lastInsertRowid;
      
      // Update balances for completed sales (not for debt sales)
      if (!saleIsDebt) {
        if (paidAmountUSD > 0) {
          updateBalance('USD', paidAmountUSD);
        }
        if (paidAmountIQD > 0) {
          updateBalance('IQD', paidAmountIQD);
        }
      }

      // Insert sale items (new schema: support is_accessory and name)
      const insertItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

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
          itemData ? itemData.name : item.name,
          currency
        );
      }
      
      return saleId;
    });
    return transaction();
  }

  // Return functions
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

      // Update balances for completed sales returns (subtract from balances if it wasn't a debt sale)
      if (!sale.is_debt) {
        if (sale.paid_amount_usd > 0) {
          updateBalance('USD', -sale.paid_amount_usd);
        }
        if (sale.paid_amount_iqd > 0) {
          updateBalance('IQD', -sale.paid_amount_iqd);
        }
        // For older sales without multi-currency fields, use the total with currency
        else if (!sale.paid_amount_usd && !sale.paid_amount_iqd) {
          if (sale.currency === 'USD') {
            updateBalance('USD', -sale.total);
          } else {
            updateBalance('IQD', -sale.total);
          }
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

      // Update sale total if removing/reducing quantity
      const returnValue = returnQty * unitPrice;
      db.prepare('UPDATE sales SET total = total - ? WHERE id = ?').run(returnValue, saleId);
      
      // Check if sale has any items left, if not, delete it
      const remainingItems = db.prepare('SELECT COUNT(*) as count FROM sale_items WHERE sale_id = ?').get(saleId);
      if (remainingItems.count === 0) {
        // Remove debt if exists before deleting sale
        db.prepare('DELETE FROM customer_debts WHERE sale_id = ?').run(saleId);
        db.prepare('DELETE FROM sales WHERE id = ?').run(saleId);
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

      // If entry has items, restore stock by decreasing it (opposite of sales returns)
      if (entry.has_items && entry.company_debt_id) {
        const items = db.prepare('SELECT * FROM company_debt_items WHERE debt_id = ?').all(entry.company_debt_id);
        
        for (const item of items) {
          const qty = Number(item.quantity) || 1;
          if (item.item_type === 'accessory') {
            // Decrease accessory stock
            db.prepare('UPDATE accessories SET stock = stock - ? WHERE name = ?').run(qty, item.item_name);
          } else {
            // Decrease product stock
            const productUpdate = db.prepare(`
              UPDATE products 
              SET stock = stock - ? 
              WHERE name = ? AND model = ? AND ram = ? AND storage = ?
            `);
            productUpdate.run(qty, item.item_name, item.model || '', item.ram || '', item.storage || '');
          }
        }
      }

      // Add transaction record for the return
      const addTransactionStmt = db.prepare(`
        INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const entryAmount = entry.total_price || entry.amount || 0;
      const currency = entry.currency || 'USD';
      const usdAmount = currency === 'USD' ? entryAmount : 0;
      const iqdAmount = currency === 'IQD' ? entryAmount : 0;
      
      addTransactionStmt.run(
        'buying_history_return',
        usdAmount,
        iqdAmount,
        `Buying history return: ${entry.item_name || entry.description || 'Purchase return'}`,
        entryId,
        'buying_history',
        new Date().toISOString()
      );

      // Add back to balance (refund the purchase)
      if (currency === 'USD') {
        updateBalance('USD', entryAmount);
      } else {
        updateBalance('IQD', entryAmount);
      }

      // Delete the buying history entry
      db.prepare('DELETE FROM buying_history WHERE id = ?').run(entryId);
      
      return { success: true, returnedAmount: entryAmount };
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
      
      // Add transaction record for the partial return
      const addTransactionStmt = db.prepare(`
        INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const currency = entry.currency || 'USD';
      const usdAmount = currency === 'USD' ? returnedAmount : 0;
      const iqdAmount = currency === 'IQD' ? returnedAmount : 0;
      
      addTransactionStmt.run(
        'buying_history_return',
        usdAmount,
        iqdAmount,
        `Buying history item return: ${item.item_name} (qty: ${returnQty})`,
        entryId,
        'buying_history',
        new Date().toISOString()
      );

      // Add back to balance (refund the returned items)
      if (currency === 'USD') {
        updateBalance('USD', returnedAmount);
      } else {
        updateBalance('IQD', returnedAmount);
      }
      
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

  function updateBalance(currency, amount) {
    return settings.updateBalance(db, currency, amount);
  }

  function setBalance(currency, amount) {
    return settings.setBalance(db, currency, amount);
  }

  // Return the API object
  return {
    // Database instance
    db,
    
    // Products
    getProducts,
    addProduct,
    updateProduct,
    updateProductNoArchive,
    addStock,
    deleteProduct,
    
    // Accessories
    getAccessories,
    addAccessory,
    updateAccessory,
    updateAccessoryNoArchive,
    addAccessoryStock,
    deleteAccessory,
    getArchivedAccessories,
    restoreAccessory,
    searchAccessories,
    getAllAccessories,
    
    // Sales
    getSales,
    getSaleById,
    getSaleItems,
    addSale,
    addSaleItem,
    deleteSale,
    getSalesInDateRange,
    getTotalSalesForPeriod,
    getSalesReport,
    
    // Debts
    getCustomerDebts,
    addCustomerDebt,
    payCustomerDebt,
    deleteCustomerDebt,
    getCompanyDebts,
    addCompanyDebt,
    addCompanyDebtWithItems,
    payCompanyDebt,
    markCompanyDebtPaid,
    markCustomerDebtPaid,
    markPersonalLoanPaid,
    deleteCompanyDebt,
    getCompanyDebtItems,
    addCompanyDebtItem,
    deleteCompanyDebtItem,
    updateCompanyDebtItem,
    getPersonalLoans,
    addPersonalLoan,
    payPersonalLoan,
    deletePersonalLoan,
    getTotalDebts,
    
    // Inventory
    getBuyingHistory,
    getBuyingHistoryWithItems,
    addBuyingHistory,
    addDirectPurchase,
    addDirectPurchaseWithItems,
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
    
    // Transactions
    getTransactions,
    addTransaction,
    getTransactionsByType,
    getTransactionsByDateRange,
    getTransactionsByReference,
    deleteTransaction,
    getTotalTransactionsByType,
    
    // Reports
    getMonthlyReport,
    getYearlyReport,
    getTopSellingProducts,
    getProfitAnalysis,
    getInventoryValue,
    getCustomerAnalysis,
    getDashboardStats,
    getMonthlyReports,
    
    // Settings
    getSetting,
    setSetting,
    deleteSetting,
    getAllSettings,
    getExchangeRate,
    setExchangeRate,
    getDefaultCurrency,
    setDefaultCurrency,
    getStoreSettings,
    getBalances,
    updateStoreSettings,
    createBackup,
    restoreBackup,
    optimizeDatabase,
    getDatabaseInfo,
    resetMonthlySalesAndProfit,
    resetAllData,
    logBackup,
    getBackups,
    saveSale,
    returnSale,
    returnSaleItem,
    returnBuyingHistoryEntry,
    returnBuyingHistoryItem,
    updateBalance,
    setBalance
  };
};
