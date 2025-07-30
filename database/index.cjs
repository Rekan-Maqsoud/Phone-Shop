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
const incentives = require('./modules/incentives.cjs');

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

  // Legacy function for backward compatibility
  function markDebtPaid(id, paid_at) {
    return debts.markCustomerDebtPaid(db, id, { paid_at });
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

  // Incentive functions
  function getIncentives() {
    return incentives.getIncentives(db);
  }

  function addIncentive(incentiveData) {
    return incentives.addIncentive(db, incentiveData);
  }

  function removeIncentive(id) {
    return incentives.removeIncentive(db, id);
  }

  function updateIncentive(id, incentiveData) {
    return incentives.updateIncentive(db, id, incentiveData);
  }

  function getIncentivesByCompany(companyName) {
    return incentives.getIncentivesByCompany(db, companyName);
  }

  function getIncentiveTotals() {
    return incentives.getIncentiveTotals(db);
  }

  function getTotalProfitWithIncentives() {
    return incentives.getTotalProfitWithIncentives(db);
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

  function addDirectPurchaseMultiCurrency(purchaseData) {
    return inventory.addDirectPurchaseMultiCurrency(db, purchaseData);
  }

  function addDirectPurchaseMultiCurrencyWithItems(purchaseData) {
    return inventory.addDirectPurchaseMultiCurrencyWithItems(db, purchaseData);
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

  function createMonthlyReport(month, year) {
    return reports.createMonthlyReport(db, month, year);
  }

  // Settings functions
  function getSetting(key) {
    return settings.getSetting(db, key);
  }

  function setSetting(key, value) {
    return settings.setSetting(db, key, value);
  }

  // Legacy function for backward compatibility
  function saveSetting(key, value) {
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
    // CRITICAL: Validate input data before proceeding
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Invalid sale data: items array is required and cannot be empty');
    }
    
    if (!total || typeof total !== 'number' || total <= 0) {
      throw new Error('Invalid sale data: total must be a positive number');
    }
    
    if (!currency || !['USD', 'IQD'].includes(currency)) {
      throw new Error('Invalid sale data: currency must be USD or IQD');
    }
    
    // Validate each item has required fields
    for (const item of items) {
      if (!item.product_id || (!item.name && !item.item_name)) {
        throw new Error(`Invalid item data: missing product_id or name for item: ${JSON.stringify(item)}`);
      }
      
      if (!item.quantity || item.quantity <= 0) {
        throw new Error(`Invalid item data: quantity must be positive for item: ${item.name || item.item_name}`);
      }
      
      const sellingPrice = item.selling_price || item.price;
      if (sellingPrice === undefined || sellingPrice < 0) {
        throw new Error(`Invalid item data: selling price cannot be negative for item: ${item.name || item.item_name}`);
      }
    }
    
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
    
    // Use the total passed from frontend (already includes discount calculation) - no rounding to preserve decimal precision
    const saleTotal = typeof total === 'number' ? total : originalTotal;
    
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
          console.error('❌ [database] Skipping item without product_id:', item.name || item.item_name);
          throw new Error(`Sale cannot proceed: item "${item.name || item.item_name || 'Unknown'}" has no valid product_id`);
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
        
        // CRITICAL: Throw error if item doesn't exist in database
        if (!itemData) {
          throw new Error(`Sale cannot proceed: ${isAccessory ? 'accessory' : 'product'} with ID ${item.product_id} not found in database`);
        }
        
        if (itemData.stock < qty) {
          throw new Error(`Insufficient stock for ${isAccessory ? 'accessory' : 'product'}: ${itemData.name}. Available: ${itemData.stock}, Required: ${qty}`);
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
        
        // CRITICAL: Validate item exists before proceeding with sale item creation
        if (!item.product_id || !finalItemData) {
          throw new Error(`Sale cannot proceed: ${isAccessory ? 'accessory' : 'product'} "${item.name || 'Unknown'}" with ID ${item.product_id || 'N/A'} not found in database`);
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
      
      // CRITICAL: Update total profit tracking with sale profits
      if (!saleIsDebt) {
        // Calculate total profit for this sale and add to running totals
        let totalSaleProfitUSD = 0;
        let totalSaleProfitIQD = 0;
        
        for (const item of items) {
          const qty = item.quantity || 1;
          const buyingPrice = item.buying_price || 0;
          const sellingPrice = item.selling_price || item.price || 0;
          const productCurrency = item.currency || item.product_currency || 'IQD';
          
          // Apply discount to selling price
          const originalSellingPrice = sellingPrice;
          const discountedSellingPrice = originalSellingPrice * discountRatio;
          
          let profitAmount = 0;
          
          if (isMultiCurrency) {
            // For multi-currency sales, calculate profit in USD
            let sellingPriceUSD = discountedSellingPrice;
            let buyingPriceUSD = buyingPrice;
            
            if (currency === 'IQD') {
              sellingPriceUSD = discountedSellingPrice * saleIQDToUSD;
            }
            
            if (productCurrency === 'IQD') {
              buyingPriceUSD = buyingPrice * saleIQDToUSD;
            }
            
            profitAmount = (sellingPriceUSD - buyingPriceUSD) * qty;
            totalSaleProfitUSD += profitAmount;
          } else {
            // Single currency sale
            let buyingPriceInSaleCurrency = buyingPrice;
            
            if (currency !== productCurrency) {
              if (currency === 'USD' && productCurrency === 'IQD') {
                buyingPriceInSaleCurrency = buyingPrice * saleIQDToUSD;
              } else if (currency === 'IQD' && productCurrency === 'USD') {
                buyingPriceInSaleCurrency = buyingPrice * saleUSDToIQD;
              }
            }
            
            profitAmount = (discountedSellingPrice - buyingPriceInSaleCurrency) * qty;
            
            if (currency === 'USD') {
              totalSaleProfitUSD += profitAmount;
            } else {
              totalSaleProfitIQD += profitAmount;
            }
          }
        }
        
        // Update total profit settings
        if (totalSaleProfitUSD > 0) {
          settings.updateTotalProfit(db, 'USD', totalSaleProfitUSD);
        }
        if (totalSaleProfitIQD > 0) {
          settings.updateTotalProfit(db, 'IQD', totalSaleProfitIQD);
        }
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

      // CRITICAL: Reverse profit tracking for sale returns
      if (!sale.is_debt) {
        // Calculate the profit that was originally added and subtract it
        const saleItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(Number(saleId));
        let totalReturnedProfitUSD = 0;
        let totalReturnedProfitIQD = 0;

        saleItems.forEach(item => {
          const qty = item.quantity || 1;
          const buyingPrice = item.buying_price || 0;
          const sellingPrice = item.price || 0;
          const itemCurrency = item.product_currency || 'IQD';
          const saleCurrency = sale.currency || 'IQD';
          
          let profitToReverse = 0;
          
          if (sale.is_multi_currency) {
            // For multi-currency sales, profit was calculated in USD
            let sellingPriceUSD = sellingPrice;
            let buyingPriceUSD = buyingPrice;
            
            if (saleCurrency === 'IQD') {
              sellingPriceUSD = sellingPrice * (sale.exchange_rate_iqd_to_usd || 0.000694);
            }
            
            if (itemCurrency === 'IQD') {
              buyingPriceUSD = buyingPrice * (sale.exchange_rate_iqd_to_usd || 0.000694);
            }
            
            profitToReverse = (sellingPriceUSD - buyingPriceUSD) * qty;
            totalReturnedProfitUSD += profitToReverse;
          } else {
            // Single currency sale
            let buyingPriceInSaleCurrency = buyingPrice;
            
            if (saleCurrency !== itemCurrency) {
              if (saleCurrency === 'USD' && itemCurrency === 'IQD') {
                buyingPriceInSaleCurrency = buyingPrice * (sale.exchange_rate_iqd_to_usd || 0.000694);
              } else if (saleCurrency === 'IQD' && itemCurrency === 'USD') {
                buyingPriceInSaleCurrency = buyingPrice * (sale.exchange_rate_usd_to_iqd || 1440);
              }
            }
            
            profitToReverse = (sellingPrice - buyingPriceInSaleCurrency) * qty;
            
            if (saleCurrency === 'USD') {
              totalReturnedProfitUSD += profitToReverse;
            } else {
              totalReturnedProfitIQD += profitToReverse;
            }
          }
        });

        // Subtract the returned profit from total profit tracking
        if (totalReturnedProfitUSD > 0) {
          settings.updateTotalProfit(db, 'USD', -totalReturnedProfitUSD);
        }
        if (totalReturnedProfitIQD > 0) {
          settings.updateTotalProfit(db, 'IQD', -totalReturnedProfitIQD);
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

  function returnSaleItem(saleId, itemId, returnQuantity = null, options = {}) {
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

      // Calculate return value
      const returnValue = returnQty * unitPrice;
      
      // Update sale total if removing/reducing quantity
      db.prepare('UPDATE sales SET total = total - ? WHERE id = ?').run(returnValue, Number(saleId));
      
      // Get the sale to check if it's a debt sale and get currency
      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(Number(saleId));
      
      let refundUSD = 0;
      let refundIQD = 0;
      
      // Handle custom return amounts if provided
      if (options.returnAmounts && (options.returnAmounts.usd > 0 || options.returnAmounts.iqd > 0)) {
        refundUSD = Number(options.returnAmounts.usd) || 0;
        refundIQD = Number(options.returnAmounts.iqd) || 0;
      } else {
        // Default calculation based on sale currency
        if (sale && sale.is_multi_currency) {
          // Calculate proportional amounts for multi-currency sales
          const totalSaleValue = Number(sale.total) || 1; // Avoid division by zero
          const returnProportion = returnValue / totalSaleValue;
          
          const originalUSD = Number(sale.paid_amount_usd) || 0;
          const originalIQD = Number(sale.paid_amount_iqd) || 0;
          
          refundUSD = originalUSD * returnProportion;
          refundIQD = originalIQD * returnProportion;
        } else if (sale) {
          // Single currency sale
          if (sale.currency === 'USD') {
            refundUSD = returnValue;
          } else {
            refundIQD = returnValue;
          }
        }
      }
      
      // Update balances for completed sales returns (subtract from balances if it wasn't a debt sale)
      if (sale && !sale.is_debt) {
        // CRITICAL: Reverse profit tracking for partial item returns
        const buyingPrice = Number(item.buying_price) || 0;
        const sellingPrice = Number(item.price) || 0;
        const itemCurrency = item.product_currency || 'IQD';
        const saleCurrency = sale.currency || 'IQD';
        
        let profitToReverse = 0;
        
        if (sale.is_multi_currency) {
          // For multi-currency sales, profit was calculated in USD
          let sellingPriceUSD = sellingPrice;
          let buyingPriceUSD = buyingPrice;
          
          if (saleCurrency === 'IQD') {
            sellingPriceUSD = sellingPrice * (sale.exchange_rate_iqd_to_usd || 0.000694);
          }
          
          if (itemCurrency === 'IQD') {
            buyingPriceUSD = buyingPrice * (sale.exchange_rate_iqd_to_usd || 0.000694);
          }
          
          profitToReverse = (sellingPriceUSD - buyingPriceUSD) * returnQty;
          settings.updateTotalProfit(db, 'USD', -profitToReverse);
        } else {
          // Single currency sale
          let buyingPriceInSaleCurrency = buyingPrice;
          
          if (saleCurrency !== itemCurrency) {
            if (saleCurrency === 'USD' && itemCurrency === 'IQD') {
              buyingPriceInSaleCurrency = buyingPrice * (sale.exchange_rate_iqd_to_usd || 0.000694);
            } else if (saleCurrency === 'IQD' && itemCurrency === 'USD') {
              buyingPriceInSaleCurrency = buyingPrice * (sale.exchange_rate_usd_to_iqd || 1440);
            }
          }
          
          profitToReverse = (sellingPrice - buyingPriceInSaleCurrency) * returnQty;
          settings.updateTotalProfit(db, saleCurrency, -profitToReverse);
        }

        // Return money to balances
        if (refundUSD > 0) {
          updateBalance('USD', -refundUSD);
        }
        if (refundIQD > 0) {
          updateBalance('IQD', -refundIQD);
        }

        // Add transaction record for the partial return
        addTransaction({
          type: 'sale_return',
          amount_usd: -refundUSD,
          amount_iqd: -refundIQD,
          description: `Sale item return - ${item.name}${sale.customer_name ? ` - ${sale.customer_name}` : ''} (qty: ${returnQty})`,
          reference_id: Number(saleId),
          reference_type: 'sale'
        });
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
      
      return { 
        success: true, 
        message: 'Item returned successfully',
        returnedAmountUSD: refundUSD,
        returnedAmountIQD: refundIQD
      };
    });
    
    return transaction();
  }

  // Return functions for buying history
  function returnBuyingHistoryEntry(entryId, options = {}) {
    const transaction = db.transaction(() => {
      // Get the buying history entry
      const entry = db.prepare('SELECT * FROM buying_history WHERE id = ?').get(entryId);
      if (!entry) {
        throw new Error('Buying history entry not found');
      }

      let stockIssues = [];
      let successfulReturns = [];
      let refundUSD = 0;
      let refundIQD = 0;

      // Determine if this is a partial return
      const originalQuantity = entry.quantity || 1;
      const returnQuantity = Number(options.quantity) || originalQuantity;
      const isPartialReturn = returnQuantity < originalQuantity;
      const quantityRatio = Math.min(returnQuantity / originalQuantity, 1);

      // Handle custom return amounts if provided - with validation
      if (options.returnAmounts && (options.returnAmounts.usd > 0 || options.returnAmounts.iqd > 0)) {
        const requestedUSD = Number(options.returnAmounts.usd) || 0;
        const requestedIQD = Number(options.returnAmounts.iqd) || 0;
        
        // Validate return amounts don't exceed original purchase
        let maxRefundUSD = 0;
        let maxRefundIQD = 0;
        
        if (entry.currency === 'MULTI' || (entry.multi_currency_usd > 0 && entry.multi_currency_iqd > 0)) {
          // Multi-currency entry (either marked as MULTI or has both USD and IQD amounts)
          maxRefundUSD = (entry.multi_currency_usd || 0) * quantityRatio;
          maxRefundIQD = (entry.multi_currency_iqd || 0) * quantityRatio;
        } else if ((entry.multi_currency_usd || 0) > 0 || (entry.multi_currency_iqd || 0) > 0) {
          // Single currency but stored in multi-currency columns
          maxRefundUSD = (entry.multi_currency_usd || 0) * quantityRatio;
          maxRefundIQD = (entry.multi_currency_iqd || 0) * quantityRatio;
        } else {
          // Traditional single currency entry
          const originalAmount = (entry.total_price || entry.amount || 0) * quantityRatio;
          if (entry.currency === 'USD') {
            maxRefundUSD = originalAmount;
          } else {
            maxRefundIQD = originalAmount;
          }
        }
        
        // Check if requested amounts exceed available amounts
        if (requestedUSD > maxRefundUSD || requestedIQD > maxRefundIQD) {
          throw new Error(`Invalid return amount. Maximum refundable: $${maxRefundUSD.toFixed(2)} USD, ${maxRefundIQD.toFixed(0)} IQD. Requested: $${requestedUSD.toFixed(2)} USD, ${requestedIQD.toFixed(0)} IQD.`);
        }
        
        refundUSD = requestedUSD;
        refundIQD = requestedIQD;
      } else {
        // Calculate default refund amounts based on original purchase
        if (entry.currency === 'MULTI' || (entry.multi_currency_usd > 0 && entry.multi_currency_iqd > 0)) {
          // Multi-currency entry (either marked as MULTI or has both USD and IQD amounts)
          refundUSD = (entry.multi_currency_usd || 0) * quantityRatio;
          refundIQD = (entry.multi_currency_iqd || 0) * quantityRatio;
        } else if ((entry.multi_currency_usd || 0) > 0 || (entry.multi_currency_iqd || 0) > 0) {
          // Single currency but stored in multi-currency columns
          refundUSD = (entry.multi_currency_usd || 0) * quantityRatio;
          refundIQD = (entry.multi_currency_iqd || 0) * quantityRatio;
        } else {
          // Traditional single currency entry
          const returnValue = (entry.total_price || entry.amount || 0) * quantityRatio;
          if (entry.currency === 'USD') {
            refundUSD = returnValue;
          } else {
            refundIQD = returnValue;
          }
        }
      }

      // Return items to stock if this purchase has items
      if (entry.has_items) {
        const items = db.prepare('SELECT * FROM buying_history_items WHERE buying_history_id = ?').all(entry.id);
        
        for (const item of items) {
          // Calculate return quantity for this item proportionally
          const itemOriginalQty = Number(item.quantity) || 1;
          const itemReturnQty = isPartialReturn ? 
            Math.floor(itemOriginalQty * quantityRatio) : 
            itemOriginalQty;
          
          if (itemReturnQty > 0) {
            try {
              if (item.item_type === 'accessory') {
                // Add back to accessories stock
                db.prepare(`
                  UPDATE accessories 
                  SET stock = stock + ? 
                  WHERE name = ?
                `).run(itemReturnQty, item.item_name);
              } else {
                // Add back to products stock
                db.prepare(`
                  UPDATE products 
                  SET stock = stock + ? 
                  WHERE name = ? AND model = ? AND ram = ? AND storage = ?
                `).run(itemReturnQty, item.item_name, item.model || '', item.ram || '', item.storage || '');
              }
              
              successfulReturns.push({
                name: item.item_name,
                quantity: itemReturnQty,
                type: item.item_type
              });
            } catch (error) {
              stockIssues.push({
                name: item.item_name,
                error: error.message
              });
            }
          }
        }
        
        if (isPartialReturn) {
          // For partial returns, update item quantities instead of deleting
          for (const item of items) {
            const itemOriginalQty = Number(item.quantity) || 1;
            const itemReturnQty = Math.floor(itemOriginalQty * quantityRatio);
            const remainingQty = itemOriginalQty - itemReturnQty;
            
            if (remainingQty > 0) {
              db.prepare('UPDATE buying_history_items SET quantity = ? WHERE id = ?').run(remainingQty, item.id);
            } else {
              db.prepare('DELETE FROM buying_history_items WHERE id = ?').run(item.id);
            }
          }
        } else {
          // For full returns, delete all items
          db.prepare('DELETE FROM buying_history_items WHERE buying_history_id = ?').run(entry.id);
        }
      } else {
        // Simple purchase - add back to stock if product/accessory exists
        try {
          // Check if it's a product
          const product = db.prepare('SELECT id FROM products WHERE name = ?').get(entry.item_name);
          if (product) {
            db.prepare('UPDATE products SET stock = stock + ? WHERE name = ?').run(returnQuantity, entry.item_name);
            successfulReturns.push({
              name: entry.item_name,
              quantity: returnQuantity,
              type: 'product'
            });
          } else {
            // Check if it's an accessory
            const accessory = db.prepare('SELECT id FROM accessories WHERE name = ?').get(entry.item_name);
            if (accessory) {
              db.prepare('UPDATE accessories SET stock = stock + ? WHERE name = ?').run(returnQuantity, entry.item_name);
              successfulReturns.push({
                name: entry.item_name,
                quantity: returnQuantity,
                type: 'accessory'
              });
            }
          }
        } catch (error) {
          stockIssues.push({
            name: entry.item_name,
            error: error.message
          });
        }
      }

      // Refund amounts to balance
      if (refundUSD > 0) {
        settings.updateBalance(db, 'USD', refundUSD);
      }
      if (refundIQD > 0) {
        settings.updateBalance(db, 'IQD', refundIQD);
      }

      // Create a reverse transaction for tracking
      const transactionStmt = db.prepare(`
        INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const returnDescription = isPartialReturn ? 
        `Partial purchase return: ${entry.item_name || 'Multiple items'} (${returnQuantity}x)` :
        `Purchase return: ${entry.item_name || 'Multiple items'}`;
      
      transactionStmt.run(
        'purchase_return',
        refundUSD, // Positive to indicate refund/income
        refundIQD, // Positive to indicate refund/income
        returnDescription,
        entry.id,
        'buying_history',
        new Date().toISOString()
      );

      if (isPartialReturn) {
        // For partial returns, update the entry quantities and prices
        const remainingQuantity = originalQuantity - returnQuantity;
        const remainingRatio = remainingQuantity / originalQuantity;
        
        // Update the entry with remaining quantities and adjusted prices
        if (entry.currency === 'MULTI' || (entry.multi_currency_usd > 0 && entry.multi_currency_iqd > 0)) {
          // Multi-currency entry (either marked as MULTI or has both USD and IQD amounts)
          const newUSD = (entry.multi_currency_usd || 0) * remainingRatio;
          const newIQD = (entry.multi_currency_iqd || 0) * remainingRatio;
          
          db.prepare(`
            UPDATE buying_history 
            SET quantity = ?, multi_currency_usd = ?, multi_currency_iqd = ?, total_price = ?
            WHERE id = ?
          `).run(remainingQuantity, newUSD, newIQD, newUSD + (newIQD / (settings.getExchangeRate(db, 'USD', 'IQD') || 1390)), entry.id);
        } else if ((entry.multi_currency_usd || 0) > 0 || (entry.multi_currency_iqd || 0) > 0) {
          // Single currency but stored in multi-currency columns
          const newUSD = (entry.multi_currency_usd || 0) * remainingRatio;
          const newIQD = (entry.multi_currency_iqd || 0) * remainingRatio;
          const newTotalPrice = (entry.total_price || entry.amount || 0) * remainingRatio;
          
          db.prepare(`
            UPDATE buying_history 
            SET quantity = ?, multi_currency_usd = ?, multi_currency_iqd = ?, total_price = ?, amount = ?
            WHERE id = ?
          `).run(remainingQuantity, newUSD, newIQD, newTotalPrice, newTotalPrice, entry.id);
        } else {
          // Traditional single currency entry
          const newTotalPrice = (entry.total_price || entry.amount || 0) * remainingRatio;
          
          db.prepare(`
            UPDATE buying_history 
            SET quantity = ?, total_price = ?, amount = ?
            WHERE id = ?
          `).run(remainingQuantity, newTotalPrice, newTotalPrice, entry.id);
        }
      } else {
        // For full returns, delete the buying history entry
        db.prepare('DELETE FROM buying_history WHERE id = ?').run(entry.id);
      }

      return {
        success: true,
        refundedUSD: refundUSD,
        refundedIQD: refundIQD,
        successfulReturns,
        stockIssues,
        hasStockIssues: stockIssues.length > 0,
        isPartialReturn,
        remainingQuantity: isPartialReturn ? originalQuantity - returnQuantity : 0
      };
    });

    return transaction();
  }

  function returnBuyingHistoryItem(entryId, itemId, returnQuantity = null, options = {}) {
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

      // Add item back to stock (since it's a return, we give the item back)
      if (item.item_type === 'accessory') {
        db.prepare('UPDATE accessories SET stock = stock + ? WHERE name = ?').run(returnQty, item.item_name);
      } else {
        const productUpdate = db.prepare(`
          UPDATE products 
          SET stock = stock + ? 
          WHERE name = ? AND model = ? AND ram = ? AND storage = ?
        `);
        productUpdate.run(returnQty, item.item_name, item.model || '', item.ram || '', item.storage || '');
      }

      const newQuantity = currentQuantity - returnQty;
      let refundUSD = 0;
      let refundIQD = 0;
      
      // Calculate the original item cost that should be refunded
      const itemReturnValue = (item.unit_price || 0) * returnQty;
      const itemCurrency = item.currency || entry.currency || 'IQD';
      
      // Handle custom return amounts if provided
      if (options.returnAmounts && (options.returnAmounts.usd > 0 || options.returnAmounts.iqd > 0)) {
        refundUSD = Number(options.returnAmounts.usd) || 0;
        refundIQD = Number(options.returnAmounts.iqd) || 0;
      } else {
        // Default refund calculation based on original purchase
        if (entry.currency === 'MULTI') {
          // For multi-currency purchases, calculate proportional refund
          const totalOriginalUSD = entry.multi_currency_usd || 0;
          const totalOriginalIQD = entry.multi_currency_iqd || 0;
          
          // Get all items to calculate total value
          const allItems = db.prepare('SELECT * FROM buying_history_items WHERE buying_history_id = ?').all(entryId);
          const totalOriginalValue = allItems.reduce((sum, i) => sum + ((i.unit_price || 0) * (i.quantity || 1)), 0);
          
          if (totalOriginalValue > 0) {
            const returnRatio = itemReturnValue / totalOriginalValue;
            refundUSD = totalOriginalUSD * returnRatio;
            refundIQD = totalOriginalIQD * returnRatio;
          }
        } else {
          // Single currency
          if (itemCurrency === 'USD') {
            refundUSD = itemReturnValue;
          } else {
            refundIQD = itemReturnValue;
          }
        }
      }
      
      if (newQuantity <= 0) {
        // Remove the item completely
        db.prepare('DELETE FROM buying_history_items WHERE id = ?').run(itemId);
      } else {
        // Update the item quantity and total price
        const newTotalPrice = item.unit_price * newQuantity;
        db.prepare('UPDATE buying_history_items SET quantity = ?, total_price = ? WHERE id = ?').run(newQuantity, newTotalPrice, itemId);
      }
      
      // Update the buying history entry totals
      const remainingItems = db.prepare('SELECT * FROM buying_history_items WHERE buying_history_id = ?').all(entryId);
      
      if (entry.currency === 'MULTI') {
        // Update multi-currency totals
        const newUSDTotal = Math.max(0, (entry.multi_currency_usd || 0) - refundUSD);
        const newIQDTotal = Math.max(0, (entry.multi_currency_iqd || 0) - refundIQD);
        
        db.prepare('UPDATE buying_history SET multi_currency_usd = ?, multi_currency_iqd = ?, total_price = ? WHERE id = ?')
          .run(newUSDTotal, newIQDTotal, newUSDTotal + (newIQDTotal / 1440), entryId);
      } else {
        // Single currency - update total price
        const newTotal = remainingItems.reduce((sum, item) => sum + item.total_price, 0);
        db.prepare('UPDATE buying_history SET total_price = ? WHERE id = ?').run(newTotal, entryId);
      }
      
      // Add transaction record for the partial return
      const addTransactionStmt = db.prepare(`
        INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      addTransactionStmt.run(
        'buying_history_item_return',
        refundUSD,
        refundIQD,
        `Buying history item return: ${item.item_name} (${returnQty}x)`,
        entryId,
        'buying_history',
        new Date().toISOString()
      );

      // Add back to balance (refund the purchase)
      if (refundUSD > 0) {
        updateBalance('USD', refundUSD);
      }
      if (refundIQD > 0) {
        updateBalance('IQD', refundIQD);
      }
      
      // If no items left, remove the buying history entry entirely
      if (remainingItems.length === 0) {
        db.prepare('DELETE FROM buying_history WHERE id = ?').run(entryId);
      }
      
      return { 
        success: true, 
        returnedAmountUSD: refundUSD,
        returnedAmountIQD: refundIQD,
        actualReturnQty: returnQty,
        hasStockIssue: false,
        availableStock: currentQuantity
      };
    });
    
    return transaction();
  }

  // Simplified return functions for buying history - more reliable and straightforward
  function returnBuyingHistoryEntrySimplified(entryId) {
    const transaction = db.transaction(() => {
      // Get the buying history entry
      const entry = db.prepare('SELECT * FROM buying_history WHERE id = ?').get(entryId);
      if (!entry) {
        return { success: false, message: 'Purchase entry not found' };
      }

      let refundedUSD = 0;
      let refundedIQD = 0;
      let itemsReturned = 0;

      // Handle multi-currency entries
      if (entry.currency === 'MULTI') {
        refundedUSD = entry.multi_currency_usd || 0;
        refundedIQD = entry.multi_currency_iqd || 0;
      } else {
        const amount = entry.total_price || entry.amount || 0;
        if (entry.currency === 'USD') {
          refundedUSD = amount;
        } else {
          refundedIQD = amount;
        }
      }

      // Return items to stock if this purchase has items
      if (entry.has_items) {
        const items = db.prepare('SELECT * FROM buying_history_items WHERE buying_history_id = ?').all(entry.id);
        
        for (const item of items) {
          const qty = Number(item.quantity) || 1;
          
          if (item.item_type === 'accessory') {
            // Add back to accessories stock
            db.prepare(`
              UPDATE accessories 
              SET stock = stock + ? 
              WHERE name = ?
            `).run(qty, item.item_name);
          } else {
            // Add back to products stock
            db.prepare(`
              UPDATE products 
              SET stock = stock + ? 
              WHERE name = ? AND model = ? AND ram = ? AND storage = ?
            `).run(qty, item.item_name, item.model || '', item.ram || '', item.storage || '');
          }
          
          itemsReturned += qty;
        }
        
        // Delete items from buying_history_items
        db.prepare('DELETE FROM buying_history_items WHERE buying_history_id = ?').run(entry.id);
      } else {
        // Simple purchase - try to add back to stock if product/accessory exists
        const qty = Number(entry.quantity) || 1;
        
        // Check if it's a product
        const product = db.prepare('SELECT id FROM products WHERE name = ?').get(entry.item_name);
        if (product) {
          db.prepare('UPDATE products SET stock = stock + ? WHERE name = ?').run(qty, entry.item_name);
          itemsReturned += qty;
        } else {
          // Check if it's an accessory
          const accessory = db.prepare('SELECT id FROM accessories WHERE name = ?').get(entry.item_name);
          if (accessory) {
            db.prepare('UPDATE accessories SET stock = stock + ? WHERE name = ?').run(qty, entry.item_name);
            itemsReturned += qty;
          }
        }
      }

      // Refund amounts to balance
      if (refundedUSD > 0) {
        settings.updateBalance(db, 'USD', refundedUSD);
      }
      if (refundedIQD > 0) {
        settings.updateBalance(db, 'IQD', refundedIQD);
      }

      // Create a reverse transaction for tracking
      const transactionStmt = db.prepare(`
        INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      transactionStmt.run(
        'purchase_return',
        refundedUSD, // Positive to indicate refund/income
        refundedIQD, // Positive to indicate refund/income
        `Purchase return: ${entry.item_name || 'Multiple items'} from ${entry.supplier || entry.company_name}`,
        entry.id,
        'buying_history',
        new Date().toISOString()
      );

      // Delete the buying history entry
      db.prepare('DELETE FROM buying_history WHERE id = ?').run(entry.id);

      return {
        success: true,
        refundedUSD,
        refundedIQD,
        itemsReturned,
        message: 'Purchase returned successfully'
      };
    });

    return transaction();
  }

  function returnBuyingHistoryItemSimplified(entryId, itemId) {
    const transaction = db.transaction(() => {
      // Get the entry and item
      const entry = db.prepare('SELECT * FROM buying_history WHERE id = ?').get(entryId);
      if (!entry) {
        return { success: false, message: 'Purchase entry not found' };
      }

      const item = db.prepare('SELECT * FROM buying_history_items WHERE id = ? AND buying_history_id = ?').get(itemId, entryId);
      if (!item) {
        return { success: false, message: 'Item not found in purchase' };
      }

      const qty = Number(item.quantity) || 1;
      let refundedUSD = 0;
      let refundedIQD = 0;

      // Calculate refund amount based on item's currency and price
      const itemTotal = qty * (item.unit_price || 0);
      if (item.currency === 'USD') {
        refundedUSD = itemTotal;
      } else {
        refundedIQD = itemTotal;
      }

      // Return item to stock
      if (item.item_type === 'accessory') {
        db.prepare('UPDATE accessories SET stock = stock + ? WHERE name = ?').run(qty, item.item_name);
      } else {
        db.prepare(`
          UPDATE products 
          SET stock = stock + ? 
          WHERE name = ? AND model = ? AND ram = ? AND storage = ?
        `).run(qty, item.item_name, item.model || '', item.ram || '', item.storage || '');
      }

      // Refund amount to balance
      if (refundedUSD > 0) {
        settings.updateBalance(db, 'USD', refundedUSD);
      }
      if (refundedIQD > 0) {
        settings.updateBalance(db, 'IQD', refundedIQD);
      }

      // Update entry total price
      let newEntryTotal = entry.total_price || entry.amount || 0;
      if (entry.currency === 'MULTI') {
        // For multi-currency entries, update the appropriate currency total
        if (item.currency === 'USD') {
          newEntryTotal = (entry.multi_currency_usd || 0) - refundedUSD;
          db.prepare('UPDATE buying_history SET multi_currency_usd = ? WHERE id = ?').run(Math.max(0, newEntryTotal), entryId);
        } else {
          newEntryTotal = (entry.multi_currency_iqd || 0) - refundedIQD;
          db.prepare('UPDATE buying_history SET multi_currency_iqd = ? WHERE id = ?').run(Math.max(0, newEntryTotal), entryId);
        }
      } else {
        // Single currency entry
        newEntryTotal -= itemTotal;
        db.prepare('UPDATE buying_history SET total_price = ? WHERE id = ?').run(Math.max(0, newEntryTotal), entryId);
      }

      // Create a reverse transaction for tracking
      const transactionStmt = db.prepare(`
        INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      transactionStmt.run(
        'item_return',
        refundedUSD, // Positive to indicate refund/income
        refundedIQD, // Positive to indicate refund/income
        `Item return: ${item.item_name} (${qty}x) from purchase #${entryId}`,
        entryId,
        'buying_history',
        new Date().toISOString()
      );

      // Delete the item
      db.prepare('DELETE FROM buying_history_items WHERE id = ?').run(itemId);

      // Check if entry has any items left, if not, update has_items flag
      const remainingItems = db.prepare('SELECT COUNT(*) as count FROM buying_history_items WHERE buying_history_id = ?').get(entryId);
      if (remainingItems.count === 0) {
        db.prepare('UPDATE buying_history SET has_items = 0 WHERE id = ?').run(entryId);
      }

      return {
        success: true,
        refundedUSD,
        refundedIQD,
        message: 'Item returned successfully'
      };
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
    markDebtPaid, // Legacy function for backward compatibility
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
    
    // Incentives
    getIncentives,
    addIncentive,
    removeIncentive,
    updateIncentive,
    getIncentivesByCompany,
    getIncentiveTotals,
    getTotalProfitWithIncentives,
    
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
    addDirectPurchaseMultiCurrency,
    addDirectPurchaseMultiCurrencyWithItems,
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
    createMonthlyReport,
    
    // Settings
    getSetting,
    setSetting,
    saveSetting, // Legacy function for backward compatibility
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
    returnBuyingHistoryEntrySimplified,
    returnBuyingHistoryItemSimplified,
    updateBalance,
    setBalance,
    repairProductIds
  };
};
