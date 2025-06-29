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
  
  // Debt functionality (backward compatibility)
  getDebts: () => ipcRenderer.invoke('getDebts'),
  addDebt: (debt) => ipcRenderer.invoke('addDebt', debt),
  markDebtPaid: (id, paid_at) => ipcRenderer.invoke('markDebtPaid', id, paid_at),
  getDebtSales: () => ipcRenderer.invoke('getDebtSales'),
  
  // Customer debt functionality
  getCustomerDebts: () => ipcRenderer.invoke('getCustomerDebts'),
  addCustomerDebt: (debt) => ipcRenderer.invoke('addCustomerDebt', debt),
  markCustomerDebtPaid: (id, paid_at) => ipcRenderer.invoke('markCustomerDebtPaid', id, paid_at),
  
  // Company debt functionality
  getCompanyDebts: () => ipcRenderer.invoke('getCompanyDebts'),
  addCompanyDebt: (debt) => ipcRenderer.invoke('addCompanyDebt', debt),
  markCompanyDebtPaid: (id, paid_at) => ipcRenderer.invoke('markCompanyDebtPaid', id, paid_at),
  
  // Monthly reports functionality
  createMonthlyReport: (month, year) => ipcRenderer.invoke('createMonthlyReport', month, year),
  getMonthlyReports: () => ipcRenderer.invoke('getMonthlyReports'),
  resetMonthlySalesAndProfit: () => ipcRenderer.invoke('resetMonthlySalesAndProfit'),
  
  // Accessory functionality
  getAccessories: () => ipcRenderer.invoke('getAccessories'),
  getAllAccessories: () => ipcRenderer.invoke('getAllAccessories'),
  addAccessory: (accessory) => ipcRenderer.invoke('addAccessory', accessory),
  editAccessory: (accessory) => ipcRenderer.invoke('editAccessory', accessory),
  deleteAccessory: (id) => ipcRenderer.invoke('deleteAccessory', id),
  
  // Backup functionality
  createBackup: () => ipcRenderer.invoke('createBackup'),
  getBackupHistory: () => ipcRenderer.invoke('getBackupHistory'),
  restoreBackup: (filePath) => ipcRenderer.invoke('restoreBackup', filePath),
  selectBackupFile: () => ipcRenderer.invoke('selectBackupFile'),
  setAutoBackup: (enabled) => ipcRenderer.invoke('setAutoBackup', enabled),
  
  // Cloud backup functionality
  readBackupFile: (filePath) => ipcRenderer.invoke('readBackupFile', filePath),
  saveCloudBackup: (backupData, fileName) => ipcRenderer.invoke('saveCloudBackup', backupData, fileName),
  restoreFromCloudBackup: (filePath) => ipcRenderer.invoke('restoreFromCloudBackup', filePath),
  
  // Event listener support for cloud auto backup
  on: (channel, listener) => ipcRenderer.on(channel, listener),
  off: (channel, listener) => ipcRenderer.removeListener(channel, listener),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),

  // Return functionality
  returnSale: (saleId) => ipcRenderer.invoke('returnSale', saleId),
  returnSaleItem: (saleId, itemId) => ipcRenderer.invoke('returnSaleItem', saleId, itemId),
});
