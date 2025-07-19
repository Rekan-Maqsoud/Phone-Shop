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

  function getDebtSales() {
    return sales.getDebtSales(db);
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

  // Legacy addDebt function for backward compatibility with frontend
  function addDebt({ sale_id, customer_name }) {
    // Get the sale details to create the debt record
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(sale_id);
    if (!sale) {
      throw new Error('Sale not found');
    }
    
    const result = debts.addCustomerDebt(db, {
      customer_name: customer_name,
      amount: sale.total,
      description: `Debt for sale #${sale_id}`,
      currency: sale.currency || 'IQD',
      sale_id: sale_id
    });
    
    return result;
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

  /**
   * CLEAN SALE SAVING SYSTEM
   * 
   * Features this should support:
   * 1. Save current exchange rates with each sale for historical accuracy
   * 2. Calculate profit correctly after all discounts
   * 3. Handle both per-item and global discounts
   * 4. Multi-currency conversion done properly
   * 5. Store all discount information for historical view
   */
  function saveSale({ items, total, created_at, is_debt, customer_name, currency = 'IQD', discount = null, multi_currency = null }) {
    // Repair any null IDs before attempting to save the sale
    const repairedCount = repairProductIds();
    
    // Get current exchange rates - initialize if missing
    let currentUSDToIQD = getExchangeRate('USD', 'IQD');
    let currentIQDToUSD = getExchangeRate('IQD', 'USD');
    
    // Initialize default rates if none exist
    if (!currentUSDToIQD || currentUSDToIQD <= 0) {
      currentUSDToIQD = 1440;
      setExchangeRate('USD', 'IQD', currentUSDToIQD);
    }
    
    if (!currentIQDToUSD || currentIQDToUSD <= 0) {
      currentIQDToUSD = 1 / currentUSDToIQD;
      setExchangeRate('IQD', 'USD', currentIQDToUSD);
    }
    
    // Calculate original total from items (for reference only)
    const originalTotal = typeof total === 'number' ? total : items.reduce((sum, i) => {
      const sellingPrice = typeof i.selling_price === 'number' ? i.selling_price : (typeof i.price === 'number' ? i.price : 0);
      return sum + sellingPrice * i.quantity;
    }, 0);
    
    // Use the total passed from frontend (already includes discount calculation)
    const saleTotal = Math.round(total);
    
    // Calculate discount ratio to apply to individual items for proper display
    // This ensures individual item prices reflect the discount correctly
    let discountRatio = 1;
    if (discount && discount.discount_value > 0 && originalTotal > 0) {
      discountRatio = saleTotal / originalTotal;
    }
    
    const saleCreatedAt = created_at || new Date().toISOString();
    const saleIsDebt = is_debt ? 1 : 0;
    
    // Store current exchange rates at time of sale
    const saleUSDToIQD = currentUSDToIQD;
    const saleIQDToUSD = currentIQDToUSD;
    
    // Handle multi-currency payments - store actual paid amounts in both currencies
    let isMultiCurrency = 0;
    let paidAmountUSD = 0;
    let paidAmountIQD = 0;
    
    // For multi-currency sales, use the actual amounts paid in each currency
    if (multi_currency && (multi_currency.usdAmount > 0 || multi_currency.iqdAmount > 0)) {
      isMultiCurrency = 1;
      paidAmountUSD = multi_currency.usdAmount || 0;
      paidAmountIQD = multi_currency.iqdAmount || 0;
    } else {
      // Single currency payment
      if (currency === 'USD') {
        paidAmountUSD = saleTotal;
        paidAmountIQD = 0;
      } else {
        paidAmountUSD = 0;
        paidAmountIQD = saleTotal;
      }
    }

    const transaction = db.transaction(() => {
      // --- STOCK CHECK & UPDATE FOR ALL SALES (INCLUDING DEBT) ---
      for (const item of items) {
        // Use itemType from frontend to determine if product or accessory
        // Default to 'product' if itemType is not set or use uniqueId pattern as fallback
        let isAccessory = item.itemType === 'accessory';
        if (!item.itemType && item.uniqueId && item.uniqueId.startsWith('accessory_')) {
          isAccessory = true;
        }
        
        // Validate that the item has a valid product_id and itemType
        if (!item.product_id) {
          console.warn('⚠️ [database] Skipping item without product_id:', item.name);
          continue; // Skip invalid items
        }
        
        let product = null;
        let accessory = null;
        
        if (isAccessory) {
          accessory = db.prepare('SELECT stock, name, buying_price, currency FROM accessories WHERE id = ?').get(item.product_id);
        } else {
          product = db.prepare('SELECT stock, name, buying_price, currency FROM products WHERE id = ?').get(item.product_id);
        }
        
        const itemData = isAccessory ? accessory : product;
        const qty = Number(item.quantity) || 1;
        
        // Skip validation if itemData is null (this can happen after database resets)
        if (!itemData) {
          continue;
        }
        
        if (itemData.stock < qty) {
          throw new Error(`Insufficient stock for ${isAccessory ? 'accessory' : 'product'}: ${itemData.name}`);
        }
        
        // Decrement stock for all sales (normal and debt) - only if item exists
        if (itemData) {
          if (isAccessory) {
            db.prepare('UPDATE accessories SET stock = stock - ? WHERE id = ?').run(qty, item.product_id);
          } else {
            db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(qty, item.product_id);
          }
        }
      }
      // --- END STOCK CHECK & UPDATE ---

      // Create the sale record with exchange rates and actual paid amounts
      const sale = db.prepare('INSERT INTO sales (total, created_at, is_debt, customer_name, currency, is_multi_currency, exchange_rate_usd_to_iqd, exchange_rate_iqd_to_usd, paid_amount_usd, paid_amount_iqd) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(saleTotal, saleCreatedAt, saleIsDebt, customer_name || null, currency, isMultiCurrency, saleUSDToIQD, saleIQDToUSD, paidAmountUSD, paidAmountIQD);
      const saleId = sale.lastInsertRowid;
      
      // Update balances for completed sales (not for debt sales)
      if (!saleIsDebt) {
        // For multi-currency sales with proper change handling
        if (isMultiCurrency) {
          // Add what customer actually gave us to balances
          const receivedUSD = multi_currency.netBalanceUSD || 0;
          const receivedIQD = multi_currency.netBalanceIQD || 0;
          
          // Add what we received from customer
          if (receivedUSD > 0) {
            updateBalance('USD', receivedUSD);
          }
          if (receivedIQD > 0) {
            updateBalance('IQD', receivedIQD);
          }
          
          // Subtract change given from balances
          if (multi_currency.changeGivenUSD && multi_currency.changeGivenUSD > 0) {
            updateBalance('USD', -multi_currency.changeGivenUSD);
          }
          if (multi_currency.changeGivenIQD && multi_currency.changeGivenIQD > 0) {
            updateBalance('IQD', -multi_currency.changeGivenIQD);
          }
        } else {
          // Single currency sale - use the sale total amount for balance updates
          const netAmount = multi_currency ? 
            (currency === 'USD' ? multi_currency.netBalanceUSD : multi_currency.netBalanceIQD) : 
            saleTotal;
            
          if (currency === 'USD') {
            updateBalance('USD', netAmount || saleTotal);
          } else if (currency === 'IQD') {
            updateBalance('IQD', netAmount || saleTotal);
          }
        }

        // Add transaction record for the sale - use net amounts for transactions
        const transactionUSDAmount = isMultiCurrency ? 
          (multi_currency.netBalanceUSD || paidAmountUSD) : 
          (currency === 'USD' ? saleTotal : 0);
        const transactionIQDAmount = isMultiCurrency ? 
          (multi_currency.netBalanceIQD || paidAmountIQD) : 
          (currency === 'IQD' ? saleTotal : 0);
          
        addTransaction({
          type: 'sale',
          amount_usd: transactionUSDAmount,
          amount_iqd: transactionIQDAmount,
          description: `Sale${customer_name ? ` - ${customer_name}` : ''}${discount ? ` (${discount.discount_type}: ${discount.discount_value}${discount.discount_type === 'percentage' ? '%' : ''})` : ''}${isMultiCurrency ? ' (Multi-currency)' : ''}${multi_currency && (multi_currency.changeGivenUSD > 0 || multi_currency.changeGivenIQD > 0) ? ' (Change given)' : ''}`,
          reference_id: saleId,
          reference_type: 'sale'
        });
      }

      // Insert sale items with proper currency conversion and profit calculation
      const insertItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency, profit_in_sale_currency, buying_price_in_sale_currency, discount_percent, original_selling_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

      for (const item of items) {
        // Use itemType from frontend to determine if product or accessory
        // Default to 'product' if itemType is not set or use uniqueId pattern as fallback
        let isAccessory = item.itemType === 'accessory';
        if (!item.itemType && item.uniqueId && item.uniqueId.startsWith('accessory_')) {
          isAccessory = true;
        }
        
        let product = null;
        let accessory = null;
        
        if (isAccessory) {
          accessory = db.prepare('SELECT id, buying_price, name, currency FROM accessories WHERE id = ?').get(item.product_id);
        } else {
          product = db.prepare('SELECT id, buying_price, name, currency FROM products WHERE id = ?').get(item.product_id);
        }
        
        const itemData = isAccessory ? accessory : product;
        
        // If item lookup failed by ID, try to find by name as fallback
        if (!itemData && item.name) {
          if (isAccessory) {
            accessory = db.prepare('SELECT id, buying_price, name, currency FROM accessories WHERE name = ? AND archived = 0 LIMIT 1').get(item.name);
          } else {
            product = db.prepare('SELECT id, buying_price, name, currency FROM products WHERE name = ? AND archived = 0 LIMIT 1').get(item.name);
          }
          const fallbackItemData = isAccessory ? accessory : product;
          if (fallbackItemData) {
            // Update the item's product_id for this sale
            item.product_id = fallbackItemData.id;
          }
        }
        
        const finalItemData = isAccessory ? accessory : product;
        
        // Skip items that don't have valid product_id or don't exist in database
        if (!item.product_id || !finalItemData) {
          continue;
        }
        
        const qty = Number(item.quantity) || 1;
        const buyingPrice = finalItemData ? Number(finalItemData.buying_price) || 0 : 0;
        const originalSellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.price === 'number' ? item.price : 0);
        
        // Apply both global discount and per-item discount
        let finalSellingPrice = originalSellingPrice;
        
        // Apply per-item discount first (if any)
        if (item.discount_percent && item.discount_percent > 0) {
          const itemDiscountRatio = 1 - (item.discount_percent / 100);
          finalSellingPrice = originalSellingPrice * itemDiscountRatio;
        }
        
        // Apply global discount on top (if any)
        const discountedSellingPrice = finalSellingPrice * discountRatio;
        
        const productCurrency = finalItemData ? (finalItemData.currency || 'IQD') : 'IQD';
        
        // Calculate profit correctly considering currency conversion and discount
        let profitInSaleCurrency = 0;
        let buyingPriceInSaleCurrency = buyingPrice;
        
        // For multi-currency sales, calculate profit in USD (as base currency)
        if (isMultiCurrency) {
          // Convert everything to USD for consistent profit calculation
          let sellingPriceUSD = discountedSellingPrice;
          let buyingPriceUSD = buyingPrice;
          
          if (currency === 'IQD') {
            sellingPriceUSD = discountedSellingPrice * saleIQDToUSD;
          }
          
          if (productCurrency === 'IQD') {
            buyingPriceUSD = buyingPrice * saleIQDToUSD;
          }
          
          profitInSaleCurrency = (sellingPriceUSD - buyingPriceUSD) * qty;
          buyingPriceInSaleCurrency = buyingPriceUSD;
        } else {
          // Single currency sale - convert buying price to sale currency for profit calculation
          if (currency !== productCurrency) {
            if (currency === 'USD' && productCurrency === 'IQD') {
              // Selling USD, product bought in IQD
              buyingPriceInSaleCurrency = buyingPrice * saleIQDToUSD;
            } else if (currency === 'IQD' && productCurrency === 'USD') {
              // Selling IQD, product bought in USD
              buyingPriceInSaleCurrency = buyingPrice * saleUSDToIQD;
            }
          }
          
          profitInSaleCurrency = (discountedSellingPrice - buyingPriceInSaleCurrency) * qty;
        }
        
        // Calculate final profit in the sale currency after discount is applied
        const finalProfit = (discountedSellingPrice - buyingPriceInSaleCurrency) * qty;
        
        // Insert with correct fields - store the discounted selling price for accurate display
        // Using REAL columns for precise decimal storage (no rounding needed)
        insertItem.run(
          saleId,
          item.product_id, // store the ID for both products and accessories
          qty,
          discountedSellingPrice, // Store the discounted selling price for accurate display (no rounding)
          buyingPrice,
          finalProfit, // Use the correctly calculated profit after discount (no rounding)
          isAccessory ? 1 : 0,
          finalItemData ? finalItemData.name : item.name,
          currency,
          productCurrency,
          profitInSaleCurrency,
          buyingPriceInSaleCurrency,
          item.discount_percent || 0, // Store per-item discount percentage
          originalSellingPrice // Store the original selling price before any discounts
        );
      }
      
      return saleId;
    });
    return transaction();
  }

  // Return functions
  function returnSale(saleId) {
    const transaction = db.transaction(() => {
      // Debug logging
      if (!saleId || isNaN(Number(saleId))) {
        throw new Error('Invalid sale ID provided');
      }

      // Get the sale
      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(Number(saleId));
      if (!sale) {
        throw new Error('Sale not found');
      }

      // Get all sale items
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(Number(saleId));
      
      // Restore stock for each item and unarchive if needed
      for (const item of items) {
        const qty = Number(item.quantity) || 1;
        if (item.is_accessory) {
          // Check if accessory exists before updating
          const accessory = db.prepare('SELECT id FROM accessories WHERE id = ?').get(item.product_id);
          if (accessory) {
            db.prepare('UPDATE accessories SET stock = stock + ?, archived = 0 WHERE id = ?').run(qty, item.product_id);
          }
        } else {
          // Check if product exists before updating
          const product = db.prepare('SELECT id FROM products WHERE id = ?').get(item.product_id);
          if (product) {
            db.prepare('UPDATE products SET stock = stock + ?, archived = 0 WHERE id = ?').run(qty, item.product_id);
          }
        }
      }

      // Update balances for completed sales returns (subtract from balances if it wasn't a debt sale)
      if (!sale.is_debt) {
        // Regular sale return - subtract from balances
        // Check if this was a multi-currency sale
        if (sale.is_multi_currency) {
          // For multi-currency sales, subtract the actual amounts that were paid
          const paidUSD = Number(sale.paid_amount_usd) || 0;
          const paidIQD = Number(sale.paid_amount_iqd) || 0;
          
          if (paidUSD > 0) {
            updateBalance('USD', -paidUSD);
          }
          if (paidIQD > 0) {
            updateBalance('IQD', -paidIQD);
          }
          
          // Add transaction record for the multi-currency sale return
          addTransaction({
            type: 'sale_return',
            amount_usd: -paidUSD,
            amount_iqd: -paidIQD,
            description: `Sale return${sale.customer_name ? ` - ${sale.customer_name}` : ''} (Multi-currency)`,
            reference_id: Number(saleId),
            reference_type: 'sale'
          });
        } else {
          // Single currency sale return
          const saleTotal = Number(sale.total) || 0;
          
          if (sale.currency === 'USD') {
            updateBalance('USD', -saleTotal);
          } else if (sale.currency === 'IQD') {
            updateBalance('IQD', -saleTotal);
          } else {
            // For legacy sales or unknown currency, use USD as fallback
            updateBalance('USD', -saleTotal);
          }

          // Add transaction record for the single currency sale return
          const usdAmount = sale.currency === 'USD' ? -saleTotal : 0;
          const iqdAmount = sale.currency === 'IQD' ? -saleTotal : 0;
          
          addTransaction({
            type: 'sale_return',
            amount_usd: usdAmount,
            amount_iqd: iqdAmount,
            description: `Sale return${sale.customer_name ? ` - ${sale.customer_name}` : ''}`,
            reference_id: Number(saleId),
            reference_type: 'sale'
          });
        }
      } else {
        // Debt sale return - if the debt was paid, we need to subtract the payment amounts from balances
        // to restore the original state as if the sale never happened
        if (sale.paid_amount_usd > 0 || sale.paid_amount_iqd > 0) {
          const paidUSD = Number(sale.paid_amount_usd) || 0;
          const paidIQD = Number(sale.paid_amount_iqd) || 0;
          
          // Subtract the amounts that were added to balances when debt was paid
          if (paidUSD > 0) {
            updateBalance('USD', -paidUSD);
          }
          if (paidIQD > 0) {
            updateBalance('IQD', -paidIQD);
          }
          
          // Add transaction record for the debt sale return
          addTransaction({
            type: 'debt_sale_return',
            amount_usd: -paidUSD,
            amount_iqd: -paidIQD,
            description: `Debt sale return${sale.customer_name ? ` - ${sale.customer_name}` : ''} (Balance restoration)`,
            reference_id: Number(saleId),
            reference_type: 'sale'
          });
        }
      }

      // Delete in correct order to avoid foreign key constraint issues
      // 1. Delete sale items first
      const deletedItems = db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(Number(saleId));
      
      // 2. If this was a debt sale, remove the debt record
      const deletedDebts = db.prepare('DELETE FROM customer_debts WHERE sale_id = ?').run(Number(saleId));
      
      // 3. Finally delete the sale
      const deletedSale = db.prepare('DELETE FROM sales WHERE id = ?').run(Number(saleId));
      
      return { success: true, message: 'Sale returned successfully' };
    });
    
    return transaction();
  }

  function returnSaleItem(saleId, itemId, returnQuantity = null) {
    const transaction = db.transaction(() => {
      // Validate parameters
      if (!saleId || isNaN(Number(saleId))) {
        throw new Error('Invalid sale ID provided');
      }
      if (!itemId || isNaN(Number(itemId))) {
        throw new Error('Invalid item ID provided');
      }

      // Get the sale item
      const item = db.prepare('SELECT * FROM sale_items WHERE id = ? AND sale_id = ?').get(Number(itemId), Number(saleId));
      if (!item) {
        throw new Error('Sale item not found');
      }

      const currentQuantity = Number(item.quantity) || 1;
      const returnQty = returnQuantity !== null ? Math.min(Number(returnQuantity), currentQuantity) : currentQuantity;
      
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
      const unitPrice = Number(item.price) || 0;
      
      if (newQuantity <= 0) {
        // Remove the item completely from sale
        db.prepare('DELETE FROM sale_items WHERE id = ?').run(Number(itemId));
      } else {
        // Update the item quantity - keeping unit price per item, not total price
        db.prepare('UPDATE sale_items SET quantity = ? WHERE id = ?').run(newQuantity, Number(itemId));
      }

      // Update sale total if removing/reducing quantity
      const returnValue = returnQty * unitPrice;
      db.prepare('UPDATE sales SET total = total - ? WHERE id = ?').run(returnValue, Number(saleId));
      
      // Get the sale to check if it's a debt sale and get currency
      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(Number(saleId));
      
      // Update balances for completed sales returns (subtract from balances if it wasn't a debt sale)
      if (sale && !sale.is_debt) {
        // Calculate the proportion of the return value for multi-currency sales
        if (sale.is_multi_currency) {
          const totalSaleValue = Number(sale.total) || 1; // Avoid division by zero
          const returnProportion = returnValue / totalSaleValue;
          
          const originalUSD = Number(sale.paid_amount_usd) || 0;
          const originalIQD = Number(sale.paid_amount_iqd) || 0;
          
          const returnUSD = originalUSD * returnProportion;
          const returnIQD = originalIQD * returnProportion;
          
          if (returnUSD > 0) {
            updateBalance('USD', -returnUSD);
          }
          if (returnIQD > 0) {
            updateBalance('IQD', -returnIQD);
          }

          // Add transaction record for the partial multi-currency sale return
          addTransaction({
            type: 'sale_return',
            amount_usd: -returnUSD,
            amount_iqd: -returnIQD,
            description: `Partial sale return - ${item.name}${sale.customer_name ? ` - ${sale.customer_name}` : ''} (qty: ${returnQty}) (Multi-currency)`,
            reference_id: Number(saleId),
            reference_type: 'sale'
          });
        } else {
          // Single currency partial return
          if (sale.currency === 'USD') {
            updateBalance('USD', -returnValue);
          } else if (sale.currency === 'IQD') {
            updateBalance('IQD', -returnValue);
          } else {
            // For legacy sales or mixed currency, use USD as default
            updateBalance('USD', -returnValue);
          }

          // Add transaction record for the partial sale return
          const usdAmount = sale.currency === 'USD' ? -returnValue : 0;
          const iqdAmount = sale.currency === 'IQD' ? -returnValue : 0;
          
          addTransaction({
            type: 'sale_return',
            amount_usd: usdAmount,
            amount_iqd: iqdAmount,
            description: `Partial sale return - ${item.name}${sale.customer_name ? ` - ${sale.customer_name}` : ''} (qty: ${returnQty})`,
            reference_id: Number(saleId),
            reference_type: 'sale'
          });
        }
      } else if (sale && sale.is_debt) {
        // For debt sales, reduce the debt amount by the return value
        const updateDebtStmt = db.prepare('UPDATE customer_debts SET amount = amount - ? WHERE sale_id = ?');
        const debtUpdateResult = updateDebtStmt.run(returnValue, Number(saleId));
        
        // Add transaction record for debt reduction
        addTransaction({
          type: 'debt_return',
          amount_usd: sale.currency === 'USD' ? -returnValue : 0,
          amount_iqd: sale.currency === 'IQD' ? -returnValue : 0,
          description: `Debt reduction from item return - ${item.name}${sale.customer_name ? ` - ${sale.customer_name}` : ''} (qty: ${returnQty})`,
          reference_id: Number(saleId),
          reference_type: 'sale'
        });
      }
      
      // Check if sale has any items left, if not, delete it
      const remainingItems = db.prepare('SELECT COUNT(*) as count FROM sale_items WHERE sale_id = ?').get(Number(saleId));
      if (remainingItems.count === 0) {
        // Remove debt if exists before deleting sale
        db.prepare('DELETE FROM customer_debts WHERE sale_id = ?').run(Number(saleId));
        db.prepare('DELETE FROM sales WHERE id = ?').run(Number(saleId));
      } else if (sale && sale.is_debt) {
        // For debt sales with remaining items, check if debt amount is now zero or negative
        const updatedDebt = db.prepare('SELECT amount FROM customer_debts WHERE sale_id = ?').get(Number(saleId));
        if (updatedDebt && updatedDebt.amount <= 0) {
          // Mark debt as paid if amount is zero or negative
          const now = new Date().toISOString();
          db.prepare('UPDATE customer_debts SET paid_at = ?, payment_currency_used = ? WHERE sale_id = ?')
            .run(now, sale.currency, Number(saleId));
        }
      }
      
      return { success: true, message: 'Item returned successfully' };
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

      // Check if this is a purchase with items (check has_items flag first, then fallback to reference_id)
      if (entry.has_items) {
        // New style - items stored in buying_history_items table
        const items = db.prepare('SELECT * FROM buying_history_items WHERE buying_history_id = ?').all(entry.id);
        
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
        
        // Delete all items from buying_history_items table
        db.prepare('DELETE FROM buying_history_items WHERE buying_history_id = ?').run(entry.id);
      } else if (entry.reference_id && entry.type === 'company_purchase') {
        // Old style - items stored in company_debt_items table
        const companyDebt = db.prepare('SELECT * FROM company_debts WHERE id = ?').get(entry.reference_id);
        if (companyDebt && companyDebt.has_items) {
          const items = db.prepare('SELECT * FROM company_debt_items WHERE debt_id = ?').all(entry.reference_id);
          
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
      } else {
        // Simple purchase - restore stock by decreasing it (since it was increased when purchased)
        // Only if the entry corresponds to a real product (not just a general expense)
        const productExists = db.prepare('SELECT 1 FROM products WHERE name = ?').get(entry.item_name);
        const accessoryExists = db.prepare('SELECT 1 FROM accessories WHERE name = ?').get(entry.item_name);
        
        if (productExists) {
          db.prepare('UPDATE products SET stock = stock - ? WHERE name = ?').run(entry.quantity, entry.item_name);
        } else if (accessoryExists) {
          db.prepare('UPDATE accessories SET stock = stock - ? WHERE name = ?').run(entry.quantity, entry.item_name);
        }
      }

      // Add transaction record for the return
      const addTransactionStmt = db.prepare(`
        INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const entryAmount = entry.total_price || entry.amount || 0;
      const currency = entry.currency || 'IQD';
      const usdAmount = currency === 'USD' ? entryAmount : 0;
      const iqdAmount = currency === 'IQD' ? entryAmount : 0;
      
      addTransactionStmt.run(
        'buying_history_return',
        usdAmount,
        iqdAmount,
        `Buying history return: ${entry.item_name || 'Purchase return'}`,
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

      // Check if this is a purchase with items
      if (!entry.has_items) {
        throw new Error('Buying history entry has no items');
      }

      // Get the specific item from buying_history_items table
      const item = db.prepare('SELECT * FROM buying_history_items WHERE id = ? AND buying_history_id = ?').get(itemId, entryId);
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
        db.prepare('DELETE FROM buying_history_items WHERE id = ?').run(itemId);
      } else {
        // Update the item quantity and total price
        const newTotalPrice = item.unit_price * newQuantity;
        db.prepare('UPDATE buying_history_items SET quantity = ?, total_price = ? WHERE id = ?').run(newQuantity, newTotalPrice, itemId);
      }
      
      // Recalculate buying history entry total
      const remainingItems = db.prepare('SELECT * FROM buying_history_items WHERE buying_history_id = ?').all(entryId);
      const newTotal = remainingItems.reduce((sum, item) => sum + item.total_price, 0);
      
      // Add transaction record for the partial return
      const addTransactionStmt = db.prepare(`
        INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const currency = entry.currency || 'IQD';
      const usdAmount = currency === 'USD' ? returnedAmount : 0;
      const iqdAmount = currency === 'IQD' ? returnedAmount : 0;
      
      addTransactionStmt.run(
        'buying_history_item_return',
        usdAmount,
        iqdAmount,
        `Buying history item return: ${item.item_name} (${returnQty}x)`,
        entryId,
        'buying_history',
        new Date().toISOString()
      );

      // Add back to balance (refund the purchase)
      if (currency === 'USD') {
        updateBalance('USD', returnedAmount);
      } else {
        updateBalance('IQD', returnedAmount);
      }
      
      // Update the buying history entry total
      if (newTotal > 0) {
        db.prepare('UPDATE buying_history SET total_price = ? WHERE id = ?').run(newTotal, entryId);
      } else {
        // If no items left, remove the buying history entry entirely
        db.prepare('DELETE FROM buying_history WHERE id = ?').run(entryId);
      }
      
      return { success: true, returnedAmount: returnedAmount };
    });
    
    return transaction();
  }

  function updateBalance(currency, amount) {
    return settings.updateBalance(db, currency, amount);
  }

  function setBalance(currency, amount) {
    return settings.setBalance(db, currency, amount);
  }

  function repairProductIds() {
    const transaction = db.transaction(() => {
      let totalRepaired = 0;
      
      // Find products with NULL IDs
      const nullIdProducts = db.prepare('SELECT rowid, * FROM products WHERE id IS NULL').all();
      
      if (nullIdProducts.length > 0) {
        // Delete products with NULL IDs
        db.prepare('DELETE FROM products WHERE id IS NULL').run();
        
        // Re-insert them with proper auto-increment IDs
        const insertStmt = db.prepare(`INSERT INTO products (name, buying_price, stock, archived, ram, storage, model, category, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
        for (const product of nullIdProducts) {
          insertStmt.run(
            product.name || 'Unknown Product',
            product.buying_price || 0,
            product.stock || 0,
            product.archived || 0,
            product.ram || '',
            product.storage || '',
            product.model || '',
            product.category || 'phones',
            product.currency || 'IQD'
          );
        }
        
        totalRepaired += nullIdProducts.length;
      }
      
      // Find accessories with NULL IDs
      const nullIdAccessories = db.prepare('SELECT rowid, * FROM accessories WHERE id IS NULL').all();
      
      if (nullIdAccessories.length > 0) {
        // Delete accessories with NULL IDs
        db.prepare('DELETE FROM accessories WHERE id IS NULL').run();
        
        // Re-insert them with proper auto-increment IDs
        const insertStmt = db.prepare(`INSERT INTO accessories (name, buying_price, stock, archived, type, color, brand, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
        
        for (const accessory of nullIdAccessories) {
          insertStmt.run(
            accessory.name || 'Unknown Accessory',
            accessory.buying_price || 0,
            accessory.stock || 0,
            accessory.archived || 0,
            accessory.type || 'other',
            accessory.color || '',
            accessory.brand || '',
            accessory.currency || 'IQD'
          );
        }
        
        totalRepaired += nullIdAccessories.length;
      }
      
      return totalRepaired;
    });
    
    return transaction();
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
    getDebtSales,
    addSale,
    addDebt,
    addSaleItem,
    deleteSale,
    getSalesInDateRange,
    getTotalSalesForPeriod,
    getSalesReport,
    
    // Debts
    getCustomerDebts,
    getDebts: getCustomerDebts, // Alias for backward compatibility
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
    setBalance,
    repairProductIds
  };
};
