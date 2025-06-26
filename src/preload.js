// src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getProducts: () => ipcRenderer.invoke('getProducts'),
  getSales: () => ipcRenderer.invoke('getSales'),
  saveSale: (sale) => ipcRenderer.invoke('saveSale', sale),
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
  getDebts: () => ipcRenderer.invoke('getDebts'),
  addDebt: (debt) => ipcRenderer.invoke('addDebt', debt),
  markDebtPaid: (id) => ipcRenderer.invoke('markDebtPaid', id),
});
