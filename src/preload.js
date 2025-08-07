// src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getProducts: () => ipcRenderer.invoke('getProducts'),
  getSales: () => ipcRenderer.invoke('getSales'),
  saveSale: (sale) => ipcRenderer.invoke('saveSale', sale),
  autoBackupAfterSale: () => ipcRenderer.invoke('autoBackupAfterSale'),
  runBackup: () => ipcRenderer.invoke('runBackup'),
  exportSalesCSV: () => ipcRenderer.invoke('exportSalesCSV'),
  exportInventoryCSV: () => ipcRenderer.invoke('exportInventoryCSV'),
  testPrint: () => ipcRenderer.invoke('testPrint'),
  getSaleDetails: (saleId) => ipcRenderer.invoke('getSaleDetails', saleId),
  addProduct: (product) => ipcRenderer.invoke('addProduct', product),
  editProduct: (product) => ipcRenderer.invoke('editProduct', product),
  deleteProduct: (id) => ipcRenderer.invoke('deleteProduct', id),
  getShopInfo: () => ipcRenderer.invoke('getShopInfo'),
  saveShopInfo: (info) => ipcRenderer.invoke('saveShopInfo', info),
  changeAdminPassword: (data) => ipcRenderer.invoke('changeAdminPassword', data),
  saveSetting: (data) => ipcRenderer.invoke('saveSetting', data),
  getSetting: (key) => ipcRenderer.invoke('getSetting', key),
  resetAllData: () => ipcRenderer.invoke('resetAllData'),
  checkAdminPassword: (password) => ipcRenderer.invoke('checkAdminPassword', password),
  
  // Exchange rate functionality
  getExchangeRate: (fromCurrency, toCurrency) => ipcRenderer.invoke('getExchangeRate', fromCurrency, toCurrency),
  setExchangeRate: (fromCurrency, toCurrency, rate) => ipcRenderer.invoke('setExchangeRate', fromCurrency, toCurrency, rate),
  
  // Debt functionality (backward compatibility)
  getDebts: () => ipcRenderer.invoke('getDebts'),
  addDebt: (debt) => ipcRenderer.invoke('addDebt', debt),
  markDebtPaid: (id, paid_at) => ipcRenderer.invoke('markDebtPaid', id, paid_at),
  getDebtSales: () => ipcRenderer.invoke('getDebtSales'),
  
  // Customer debt functionality
  getCustomerDebts: () => ipcRenderer.invoke('getCustomerDebts'),
  getDebtPayments: (debtType, debtId) => ipcRenderer.invoke('getDebtPayments', debtType, debtId),
  addCustomerDebt: (debt) => ipcRenderer.invoke('addCustomerDebt', debt),
  markCustomerDebtPaid: (id, paid_at, paymentData) => ipcRenderer.invoke('markCustomerDebtPaid', id, paid_at, paymentData),
  payCustomerDebtTotal: (customerName, paymentData) => ipcRenderer.invoke('payCustomerDebtTotal', customerName, paymentData),
  payCustomerDebtTotalForcedUSD: (customerName, paymentData) => ipcRenderer.invoke('payCustomerDebtTotalForcedUSD', customerName, paymentData),
  payCustomerDebtTotalForcedIQD: (customerName, paymentData) => ipcRenderer.invoke('payCustomerDebtTotalForcedIQD', customerName, paymentData),
  
  // Company debt functionality
  getCompanyDebts: () => ipcRenderer.invoke('getCompanyDebts'),
  addCompanyDebt: (debt) => ipcRenderer.invoke('addCompanyDebt', debt),
  addCompanyDebtWithItems: (data) => ipcRenderer.invoke('addCompanyDebtWithItems', data),
  getCompanyDebtItems: (debtId) => ipcRenderer.invoke('getCompanyDebtItems', debtId),
  markCompanyDebtPaid: (id, paid_at, multiCurrency) => ipcRenderer.invoke('markCompanyDebtPaid', id, paid_at, multiCurrency),
  payCompanyDebtTotal: (companyName, paymentData) => ipcRenderer.invoke('payCompanyDebtTotal', companyName, paymentData),
  payCompanyDebtTotalForcedUSD: (companyName, paymentData) => ipcRenderer.invoke('payCompanyDebtTotalForcedUSD', companyName, paymentData),
  payCompanyDebtTotalForcedIQD: (companyName, paymentData) => ipcRenderer.invoke('payCompanyDebtTotalForcedIQD', companyName, paymentData),
  
  // Incentive functionality
  getIncentives: () => ipcRenderer.invoke('getIncentives'),
  addIncentive: (incentive) => ipcRenderer.invoke('addIncentive', incentive),
  removeIncentive: (id) => ipcRenderer.invoke('removeIncentive', id),
  updateIncentive: (id, incentive) => ipcRenderer.invoke('updateIncentive', id, incentive),
  getIncentivesByCompany: (companyName) => ipcRenderer.invoke('getIncentivesByCompany', companyName),
  getIncentiveTotals: () => ipcRenderer.invoke('getIncentiveTotals'),
  getTotalProfitWithIncentives: () => ipcRenderer.invoke('getTotalProfitWithIncentives'),
  
  // Buying history functionality
  getBuyingHistory: () => ipcRenderer.invoke('getBuyingHistory'),
  getBuyingHistoryWithItems: () => ipcRenderer.invoke('getBuyingHistoryWithItems'),
  getBuyingHistoryWithTransactions: () => ipcRenderer.invoke('getBuyingHistoryWithTransactions'),
  
  // Direct purchase functionality
  addDirectPurchase: (purchaseData) => ipcRenderer.invoke('addDirectPurchase', purchaseData),
  addDirectPurchaseWithItems: (purchaseData) => ipcRenderer.invoke('addDirectPurchaseWithItems', purchaseData),
  addDirectPurchaseMultiCurrency: (purchaseData) => ipcRenderer.invoke('addDirectPurchaseMultiCurrency', purchaseData),
  addDirectPurchaseMultiCurrencyWithItems: (purchaseData) => ipcRenderer.invoke('addDirectPurchaseMultiCurrencyWithItems', purchaseData),
  
  // Returns functionality
  addReturn: (returnData) => ipcRenderer.invoke('addReturn', returnData),
  getReturns: () => ipcRenderer.invoke('getReturns'),
  getReturnsByDateRange: (startDate, endDate) => ipcRenderer.invoke('getReturnsByDateRange', startDate, endDate),
  getReturnsByProduct: (productId) => ipcRenderer.invoke('getReturnsByProduct', productId),
  getReturnsByAccessory: (accessoryId) => ipcRenderer.invoke('getReturnsByAccessory', accessoryId),
  deleteReturn: (returnId) => ipcRenderer.invoke('deleteReturn', returnId),
  
  // Monthly reports functionality
  createMonthlyReport: (month, year) => ipcRenderer.invoke('createMonthlyReport', month, year),
  getMonthlyReports: () => ipcRenderer.invoke('getMonthlyReports'),
  getMonthlyReport: (year, month) => ipcRenderer.invoke('getMonthlyReport', year, month),
  resetMonthlySalesAndProfit: () => ipcRenderer.invoke('resetMonthlySalesAndProfit'),
  
  // Accessory functionality
  getAccessories: () => ipcRenderer.invoke('getAccessories'),
  getAllAccessories: () => ipcRenderer.invoke('getAllAccessories'),
  getArchivedAccessories: () => ipcRenderer.invoke('getArchivedAccessories'),
  addAccessory: (accessory) => ipcRenderer.invoke('addAccessory', accessory),
  editAccessory: (accessory) => ipcRenderer.invoke('editAccessory', accessory),
  deleteAccessory: (id) => ipcRenderer.invoke('deleteAccessory', id),
  
  // Product archive functionality
  getAllProducts: () => ipcRenderer.invoke('getAllProducts'),
  getArchivedProducts: () => ipcRenderer.invoke('getArchivedProducts'),
  
  // New Cloud Backup functionality
  setCloudBackupSession: (sessionData) => ipcRenderer.invoke('setCloudBackupSession', sessionData),
  clearCloudBackupSession: () => ipcRenderer.invoke('clearCloudBackupSession'),
  setAutoBackup: (enabled) => ipcRenderer.invoke('setAutoBackup', enabled),
  getAutoBackup: () => ipcRenderer.invoke('getAutoBackup'),
  createCloudBackup: (description) => ipcRenderer.invoke('createCloudBackup', description),
  downloadCloudBackup: (backupId) => ipcRenderer.invoke('downloadCloudBackup', backupId),
  downloadCloudBackupFile: (backupId) => ipcRenderer.invoke('downloadCloudBackupFile', backupId),
  listCloudBackups: () => ipcRenderer.invoke('listCloudBackups'),
  deleteCloudBackup: (backupId) => ipcRenderer.invoke('deleteCloudBackup', backupId),
  restoreFromFile: (filePath) => ipcRenderer.invoke('restoreFromFile', filePath),
  selectAndRestoreBackup: () => ipcRenderer.invoke('selectAndRestoreBackup'),
  selectBackupFile: () => ipcRenderer.invoke('selectBackupFile'),
  triggerCloudBackup: () => ipcRenderer.invoke('triggerCloudBackup'),
  openBackupFolder: () => ipcRenderer.invoke('openBackupFolder'),
  createBackup: () => ipcRenderer.invoke('createBackup'),
  createLocalBackup: () => ipcRenderer.invoke('createLocalBackup'),
  readBackupFile: (filePath) => ipcRenderer.invoke('readBackupFile', filePath),
  
  // Event listener support for cloud auto backup
  on: (channel, listener) => ipcRenderer.on(channel, listener),
  off: (channel, listener) => ipcRenderer.removeListener(channel, listener),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  restartApp: () => ipcRenderer.invoke('restartApp'),

  // Return functionality
  returnSale: (saleId) => ipcRenderer.invoke('returnSale', saleId),
  returnSaleItem: (saleId, itemId, quantity) => ipcRenderer.invoke('returnSaleItem', saleId, itemId, quantity),
  // NEW: Dedicated Purchase Return
  returnPurchaseToSupplier: (entryId, options) => ipcRenderer.invoke('returnPurchaseToSupplier', entryId, options),
  
  // Buying History Return functionality
  returnBuyingHistoryEntry: (entryId, options) => ipcRenderer.invoke('returnBuyingHistoryEntry', entryId, options),
  returnBuyingHistoryItem: (entryId, itemId, quantity, options) => ipcRenderer.invoke('returnBuyingHistoryItem', entryId, itemId, quantity, options),
  
  // Balance and Dashboard functionality
  getBalances: () => ipcRenderer.invoke('getBalances'),
  getDashboardData: () => ipcRenderer.invoke('getDashboardData'),
  getMonthlyDashboardData: (month, year) => ipcRenderer.invoke('getMonthlyDashboardData', month, year),
  recalculateBalances: () => ipcRenderer.invoke('recalculateBalances'),
  getTransactions: (limit) => ipcRenderer.invoke('getTransactions', limit),
  getTransactionsByReference: (reference_type, reference_id) => ipcRenderer.invoke('getTransactionsByReference', reference_type, reference_id),
  
  // Secret admin balance management (only available via console commands)
  setBalance: (currency, amount) => ipcRenderer.invoke('setBalance', currency, amount),
  updateBalance: (currency, amount) => ipcRenderer.invoke('updateBalance', currency, amount),
  
  // Personal Loan functionality
  addPersonalLoan: (loanData) => ipcRenderer.invoke('addPersonalLoan', loanData),
  getPersonalLoans: () => ipcRenderer.invoke('getPersonalLoans'),
  markPersonalLoanPaid: (id, paymentData) => ipcRenderer.invoke('markPersonalLoanPaid', id, paymentData),
  payPersonalLoanTotal: (personName, paymentData) => ipcRenderer.invoke('payPersonalLoanTotal', personName, paymentData),
  payPersonalLoanTotalForcedUSD: (personName, paymentData) => ipcRenderer.invoke('payPersonalLoanTotalForcedUSD', personName, paymentData),
  payPersonalLoanTotalForcedIQD: (personName, paymentData) => ipcRenderer.invoke('payPersonalLoanTotalForcedIQD', personName, paymentData),
  payPersonalLoanTotalSimplifiedForcedUSD: (personName, paymentData) => ipcRenderer.invoke('payPersonalLoanTotalSimplifiedForcedUSD', personName, paymentData),
  payPersonalLoanTotalSimplifiedForcedIQD: (personName, paymentData) => ipcRenderer.invoke('payPersonalLoanTotalSimplifiedForcedIQD', personName, paymentData),
  
  // Database migration
  migrateDatabaseSchema: () => ipcRenderer.invoke('migrateDatabaseSchema'),
  
  // Discount functionality
  addDiscount: (discountData) => ipcRenderer.invoke('addDiscount', discountData),
  getDiscounts: (transaction_type, reference_id) => ipcRenderer.invoke('getDiscounts', transaction_type, reference_id),
  
  // Auto Update functionality
  checkForUpdates: (manual = false) => ipcRenderer.invoke('checkForUpdates', manual),
  downloadUpdate: () => ipcRenderer.invoke('downloadUpdate'),
  installUpdate: () => ipcRenderer.invoke('installUpdate'),
  getUpdateSettings: () => ipcRenderer.invoke('getUpdateSettings'),
  updateUpdateSettings: (settings) => ipcRenderer.invoke('updateUpdateSettings', settings),
  getAppVersion: () => ipcRenderer.invoke('getAppVersion'),
});
