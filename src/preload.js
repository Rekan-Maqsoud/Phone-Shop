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
  addCustomerDebt: (debt) => ipcRenderer.invoke('addCustomerDebt', debt),
  markCustomerDebtPaid: (id, paid_at, paymentData) => ipcRenderer.invoke('markCustomerDebtPaid', id, paid_at, paymentData),
  
  // Company debt functionality
  getCompanyDebts: () => ipcRenderer.invoke('getCompanyDebts'),
  addCompanyDebt: (debt) => ipcRenderer.invoke('addCompanyDebt', debt),
  addCompanyDebtWithItems: (data) => ipcRenderer.invoke('addCompanyDebtWithItems', data),
  getCompanyDebtItems: (debtId) => ipcRenderer.invoke('getCompanyDebtItems', debtId),
  markCompanyDebtPaid: (id, paid_at, multiCurrency) => ipcRenderer.invoke('markCompanyDebtPaid', id, paid_at, multiCurrency),
  
  // Incentive functionality
  getIncentives: () => ipcRenderer.invoke('getIncentives'),
  addIncentive: (incentive) => ipcRenderer.invoke('addIncentive', incentive),
  removeIncentive: (id) => ipcRenderer.invoke('removeIncentive', id),
  updateIncentive: (id, incentive) => ipcRenderer.invoke('updateIncentive', id, incentive),
  getIncentivesByCompany: (companyName) => ipcRenderer.invoke('getIncentivesByCompany', companyName),
  getIncentiveTotals: () => ipcRenderer.invoke('getIncentiveTotals'),
  
  // Buying history functionality
  getBuyingHistory: () => ipcRenderer.invoke('getBuyingHistory'),
  getBuyingHistoryWithItems: () => ipcRenderer.invoke('getBuyingHistoryWithItems'),
  getBuyingHistoryWithTransactions: () => ipcRenderer.invoke('getBuyingHistoryWithTransactions'),
  
  // Direct purchase functionality
  addDirectPurchase: (purchaseData) => ipcRenderer.invoke('addDirectPurchase', purchaseData),
  addDirectPurchaseWithItems: (purchaseData) => ipcRenderer.invoke('addDirectPurchaseWithItems', purchaseData),
  addDirectPurchaseMultiCurrency: (purchaseData) => ipcRenderer.invoke('addDirectPurchaseMultiCurrency', purchaseData),
  
  // Monthly reports functionality
  createMonthlyReport: (month, year) => ipcRenderer.invoke('createMonthlyReport', month, year),
  getMonthlyReports: () => ipcRenderer.invoke('getMonthlyReports'),
  getMonthlyReport: (year, month) => ipcRenderer.invoke('getMonthlyReport', year, month),
  resetMonthlySalesAndProfit: () => ipcRenderer.invoke('resetMonthlySalesAndProfit'),
  
  // Accessory functionality
  getAccessories: () => ipcRenderer.invoke('getAccessories'),
  getAllAccessories: () => ipcRenderer.invoke('getAllAccessories'),
  addAccessory: (accessory) => ipcRenderer.invoke('addAccessory', accessory),
  editAccessory: (accessory) => ipcRenderer.invoke('editAccessory', accessory),
  deleteAccessory: (id) => ipcRenderer.invoke('deleteAccessory', id),
  
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
  // Buying History Return functionality
  returnBuyingHistoryEntry: (entryId) => ipcRenderer.invoke('returnBuyingHistoryEntry', entryId),
  returnBuyingHistoryItem: (entryId, itemId, quantity) => ipcRenderer.invoke('returnBuyingHistoryItem', entryId, itemId, quantity),
  
  // Balance and Dashboard functionality
  getBalances: () => ipcRenderer.invoke('getBalances'),
  getDashboardData: () => ipcRenderer.invoke('getDashboardData'),
  getMonthlyDashboardData: (month, year) => ipcRenderer.invoke('getMonthlyDashboardData', month, year),
  recalculateBalances: () => ipcRenderer.invoke('recalculateBalances'),
  getTransactions: (limit) => ipcRenderer.invoke('getTransactions', limit),
  
  // Secret admin balance management (only available via console commands)
  setBalance: (currency, amount) => ipcRenderer.invoke('setBalance', currency, amount),
  updateBalance: (currency, amount) => ipcRenderer.invoke('updateBalance', currency, amount),
  
  // Personal Loan functionality
  addPersonalLoan: (loanData) => ipcRenderer.invoke('addPersonalLoan', loanData),
  getPersonalLoans: () => ipcRenderer.invoke('getPersonalLoans'),
  markPersonalLoanPaid: (id, paymentData) => ipcRenderer.invoke('markPersonalLoanPaid', id, paymentData),
  
  // Discount functionality
  addDiscount: (discountData) => ipcRenderer.invoke('addDiscount', discountData),
  getDiscounts: (transaction_type, reference_id) => ipcRenderer.invoke('getDiscounts', transaction_type, reference_id),
});
