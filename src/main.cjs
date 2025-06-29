// Electron main process

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('../database/db.cjs');
const bcrypt = require('bcryptjs');
const settings = require('electron-settings');
const mainCloudBackup = require('./services/mainCloudBackup.cjs');
function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true, // Launch in fullscreen
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const urlToLoad = app.isPackaged
    ? `file://${path.join(__dirname, '../dist/index.html')}`
    : 'http://localhost:5173/';
  win.loadURL(urlToLoad);
  // Set a secure Content Security Policy
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const isDev = !app.isPackaged;
    let headers = { ...details.responseHeaders };
    // Remove any existing CSP header from Vite dev server in dev mode
    if (isDev) {
      delete headers['content-security-policy'];
      delete headers['Content-Security-Policy'];
    }
    callback({
      responseHeaders: {
        ...headers,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self' http://localhost:5173 ws://localhost:5173; script-src 'self' 'unsafe-inline' http://localhost:5173; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src *;"
            : "default-src 'self' file: data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src https://cloud.appwrite.io https://appwrite.io https://*.appwrite.io https:; media-src 'self' data: blob:;"
        ]
      }
    });
  });
}

app.whenReady().then(() => {
  createWindow();
  
  // Check if we need to perform monthly reset on app startup
  checkAndPerformMonthlyReset();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// CSV generation function
function toCSV(rows, headers) {
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

// Check and perform monthly reset if needed
function checkAndPerformMonthlyReset() {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    
    // Check if app has been opened in a new month by storing last check date
    const lastResetDate = settings.getSync('lastMonthlyResetDate');
    
    if (!lastResetDate) {
      // First time running, just store current date
      settings.setSync('lastMonthlyResetDate', `${currentYear}-${currentMonth}`);
      return;
    }
    
    const [lastYear, lastMonth] = lastResetDate.split('-').map(Number);
    
    // If we're in a new month, perform reset
    if (currentYear > lastYear || (currentYear === lastYear && currentMonth > lastMonth)) {
      console.log('Performing monthly reset...');
      db.resetMonthlySalesAndProfit();
      settings.setSync('lastMonthlyResetDate', `${currentYear}-${currentMonth}`);
      console.log('Monthly reset completed.');
    }
  } catch (error) {
    console.error('Error during monthly reset check:', error);
  }
}

// IPC handlers
// Product CRUD
ipcMain.handle('getProducts', async () => {
  return db.getProducts();
});
ipcMain.handle('addProduct', async (event, product) => {
  try {
    db.addProduct(product);
    await updateCurrentBackup();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});
ipcMain.handle('editProduct', async (event, product) => {
  try {
    db.updateProduct(product);
    await updateCurrentBackup();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});
ipcMain.handle('deleteProduct', async (event, id) => {
  try {
    db.deleteProduct(id);
    await updateCurrentBackup();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});
// Accessory CRUD
ipcMain.handle('getAccessories', async () => {
  return db.getAccessories();
});
ipcMain.handle('getAllAccessories', async () => {
  return db.getAllAccessories();
});
ipcMain.handle('addAccessory', async (event, accessory) => {
  try {
    db.addAccessory(accessory);
    await updateCurrentBackup();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});
ipcMain.handle('editAccessory', async (event, accessory) => {
  try {
    db.updateAccessory(accessory);
    await updateCurrentBackup();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});
ipcMain.handle('deleteAccessory', async (event, id) => {
  try {
    db.deleteAccessory(id);
    await updateCurrentBackup();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});
// Shop Info
ipcMain.handle('getShopInfo', async () => {
  return db.db.prepare('SELECT * FROM shop_info WHERE id=1').get() || {};
});
ipcMain.handle('saveShopInfo', async (event, info) => {
  db.db.prepare('INSERT OR REPLACE INTO shop_info (id, name, address, contact, logo_path) VALUES (1, ?, ?, ?, ?)')
    .run(info.name, info.address, info.contact, info.logo_path || null);
  return { success: true };
});
// Admin password
ipcMain.handle('changeAdminPassword', async (event, { current, next }) => {
  const row = db.db.prepare('SELECT password FROM admin WHERE id=1').get();
  if (!row || row.password !== current) return { success: false, message: 'Current password incorrect.' };
  db.db.prepare('UPDATE admin SET password=? WHERE id=1').run(next);
  return { success: true };
});
// Settings
ipcMain.handle('saveSetting', async (event, { key, value }) => {
  db.saveSetting(key, value);
  return { success: true };
});
ipcMain.handle('getSetting', async (event, key) => {
  return db.getSetting(key);
});
// Danger zone: reset all data
ipcMain.handle('resetAllData', async () => {
  try {
    db.resetAllData();
    return { success: true, message: 'All data reset successfully.' };
  } catch (e) {
    return { success: false, message: e.message };
  }
});
ipcMain.handle('exportSalesCSV', async () => {
  const sales = db.getSales();
  if (!sales.length) return { success: false, message: 'No sales data.' };
  const headers = ['id', 'created_at', 'total'];
  const csv = toCSV(sales, headers);
  const { filePath } = await dialog.showSaveDialog({
    title: 'Export Sales CSV',
    defaultPath: 'sales.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (!filePath) return { success: false, message: 'Cancelled.' };
  fs.writeFileSync(filePath, csv);
  return { success: true, filePath };
});
ipcMain.handle('exportInventoryCSV', async () => {
  const products = db.getProducts();
  if (!products.length) return { success: false, message: 'No inventory data.' };
  const headers = ['id', 'name', 'price', 'stock'];
  const csv = toCSV(products, headers);
  const { filePath } = await dialog.showSaveDialog({
    title: 'Export Inventory CSV',
    defaultPath: 'inventory.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (!filePath) return { success: false, message: 'Cancelled.' };
  fs.writeFileSync(filePath, csv);
  return { success: true, filePath };
});
ipcMain.handle('testPrint', async () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return { success: false, message: 'No window.' };
  // Print a simple test receipt
  win.webContents.print({ printBackground: true }, (success, errorType) => {});
  return { success: true };
});
ipcMain.handle('getSaleDetails', async (event, saleId) => {
  try {
    const sale = db.db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
    if (!sale) return { success: false, message: 'Sale not found.' };
    // Fetch all sale items, joining with products or accessories as needed
    const items = db.db.prepare(`
      SELECT 
        si.id, si.quantity, si.price, si.buying_price, si.profit, si.is_accessory, si.name as item_name, 
        p.name as product_name, p.barcode as product_barcode, 
        a.name as accessory_name, a.barcode as accessory_barcode
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id AND si.is_accessory = 0
      LEFT JOIN accessories a ON si.product_id = a.id AND si.is_accessory = 1
      WHERE si.sale_id = ?
    `).all(saleId).map(item => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      buying_price: item.buying_price,
      profit: item.profit,
      is_accessory: !!item.is_accessory,
      name: item.is_accessory ? (item.accessory_name || item.item_name) : (item.product_name || item.item_name),
      barcode: item.is_accessory ? item.accessory_barcode : item.product_barcode
    }));
    return { success: true, sale: { id: sale.id, date: sale.created_at, total: sale.total, items } };
  } catch (e) {
    return { success: false, message: e.message };
  }
});
// IPC handler for getting all sales
ipcMain.handle('getSales', async () => {
  try {
    const sales = db.getSales();
    return sales;
  } catch (e) {
    return [];
  }
});
// IPC handler for restore backup
ipcMain.handle('runRestore', async () => {
  // TODO: Implement restore logic (e.g., select file, restore DB)
  return { success: false, message: 'Restore not implemented yet.' };
});
// IPC handler for saving logo file
ipcMain.handle('saveLogoFile', async (event, file) => {
  // TODO: Implement file save logic (use fs, dialog, etc.)
  return null;
});
// IPC handler for admin password check
ipcMain.handle('checkAdminPassword', async (event, password) => {
  try {
    const row = db.getAdmin ? db.getAdmin() : db.db.prepare('SELECT * FROM admin WHERE id = 1').get();
    if (!row) return { success: false, message: 'No admin user found' };
    if (row.password === password) {
      return { success: true };
    } else {
      return { success: false, message: 'Incorrect password' };
    }
  } catch (e) {
    return { success: false, message: 'DB error' };
  }
});
// IPC handler for saving sale (use db.saveSale)
ipcMain.handle('saveSale', async (event, sale) => {
  try {
    // Only call db.saveSale, which now handles all stock logic atomically
    const saleId = db.saveSale(sale);
    
    // Update backup after sale
    await updateCurrentBackup();
    
    return { success: true, id: saleId, lastInsertRowid: saleId };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// Auto backup after sale (instant backup)
ipcMain.handle('autoBackupAfterSale', async () => {
  try {
    await updateCurrentBackup();
    // Also trigger cloud auto backup if enabled
    try {
      const autoCloudBackup = settings.getSync('autoCloudBackup');
      if (autoCloudBackup === 'true') {
        // Find the latest backup file path
        const backupDir = path.join(__dirname, '../database');
        const files = fs.readdirSync(backupDir)
          .filter(f => f.endsWith('.sqlite'))
          .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
          .sort((a, b) => b.time - a.time);
        if (files.length > 0) {
          const latestBackupPath = path.join(backupDir, files[0].name);
          try {
            await mainCloudBackup.uploadBackupToCloud(latestBackupPath);
            console.log('Cloud auto backup completed after sale.');
          } catch (cloudErr) {
            console.warn('Cloud auto backup failed:', cloudErr);
          }
        }
      }
    } catch (cloudError) {
      console.warn('Cloud auto backup check failed:', cloudError);
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// Debt handlers (backward compatibility)
ipcMain.handle('addDebt', async (event, { sale_id, customer_name }) => {
  const result = db.addDebt({ sale_id, customer_name });
  await updateCurrentBackup();
  return result;
});
ipcMain.handle('getDebts', async () => {
  return db.getDebts();
});
ipcMain.handle('markDebtPaid', async (event, id, paid_at) => {
  const result = db.markDebtPaid(id, paid_at);
  await updateCurrentBackup();
  return result;
});

// Customer debt handlers
ipcMain.handle('addCustomerDebt', async (event, { sale_id, customer_name }) => {
  const result = db.addCustomerDebt({ sale_id, customer_name });
  await updateCurrentBackup();
  return result;
});
ipcMain.handle('getCustomerDebts', async () => {
  return db.getCustomerDebts();
});
ipcMain.handle('markCustomerDebtPaid', async (event, id, paid_at) => {
  const result = db.markCustomerDebtPaid(id, paid_at);
  await updateCurrentBackup();
  return result;
});

// Company debt handlers
ipcMain.handle('addCompanyDebt', async (event, { company_name, amount, description }) => {
  const result = db.addCompanyDebt({ company_name, amount, description });
  await updateCurrentBackup();
  return result;
});
ipcMain.handle('getCompanyDebts', async () => {
  return db.getCompanyDebts();
});
ipcMain.handle('markCompanyDebtPaid', async (event, id, paid_at) => {
  const result = db.markCompanyDebtPaid(id, paid_at);
  await updateCurrentBackup();
  return result;
});

// Monthly reports handlers
ipcMain.handle('createMonthlyReport', async (event, month, year) => {
  const result = db.createMonthlyReport(month, year);
  await updateCurrentBackup();
  return result;
});
ipcMain.handle('getMonthlyReports', async () => {
  return db.getMonthlyReports();
});
ipcMain.handle('resetMonthlySalesAndProfit', async () => {
  const result = db.resetMonthlySalesAndProfit();
  await updateCurrentBackup();
  return result;
});

ipcMain.handle('getDebtSales', async () => {
  try {
    const sales = db.getDebtSales();
    return sales;
  } catch (e) {
    return [];
  }
});
// Backup functionality
// New instant backup system - updates current backup after every change
let currentBackupPath = null;

// Initialize or get current backup file
const initializeCurrentBackup = () => {
  try {
    const os = require('os');
    const documentsPath = path.join(os.homedir(), 'Documents');
    const backupDir = path.join(documentsPath, 'Phone Shop Backups');
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Use a fixed filename for current backup
    const currentBackupFileName = 'phone-shop-current-backup.sqlite';
    const backupPath = path.join(backupDir, currentBackupFileName);
    
    // Copy database file to current backup
    const dbPath = path.join(__dirname, '../database/shop.sqlite');
    fs.copyFileSync(dbPath, backupPath);
    
    currentBackupPath = backupPath;
    return backupPath;
  } catch (e) {
    console.error('Failed to initialize current backup:', e);
    return null;
  }
};

// Update current backup after any change
const updateCurrentBackup = async () => {
  try {
    if (!currentBackupPath) {
      initializeCurrentBackup();
      return;
    }
    
    const dbPath = path.join(__dirname, '../database/shop.sqlite');
    fs.copyFileSync(dbPath, currentBackupPath);
    
    // Update backup log
    db.logBackup({
      file_name: 'phone-shop-current-backup.sqlite',
      encrypted: false,
      log: `Current backup updated at ${new Date().toISOString()}`
    });
  } catch (e) {
    console.error('Failed to update current backup:', e);
  }
};

// Manual backup - creates a new backup file with timestamp
ipcMain.handle('createBackup', async () => {
  try {
    const os = require('os');
    // Get default Documents folder
    const documentsPath = path.join(os.homedir(), 'Documents');
    const backupDir = path.join(documentsPath, 'Phone Shop Backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create backup filename with timestamp - always backup regardless of prefix
    const now = new Date();
    const nowPrefix = now.toISOString().slice(0, 19).replace(/:/g, '-'); // e.g., '2025-06-28T14-30-45'
    const backupFileName = `phone-shop-backup-${nowPrefix}.sqlite`;
    const backupPath = path.join(backupDir, backupFileName);
    
    // Copy database file
    const dbPath = path.join(__dirname, '../database/shop.sqlite');
    fs.copyFileSync(dbPath, backupPath);
    
    // Log backup in database
    db.logBackup({
      file_name: backupFileName,
      encrypted: false,
      log: `Manual backup created at ${backupPath}`
    });
    
    return {
      success: true,
      message: 'Backup created successfully',
      path: backupPath,
      fileName: backupFileName
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// Initialize current backup on startup
initializeCurrentBackup();

ipcMain.handle('getBackupHistory', async () => {
  try {
    const backups = db.getBackups();
    return backups;
  } catch (e) {
    return [];
  }
});

ipcMain.handle('restoreBackup', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, message: 'Backup file not found' };
    }
    
    // Copy backup file to current database location
    const dbPath = path.join(__dirname, '../database/shop.sqlite');
    fs.copyFileSync(filePath, dbPath);
    
    return { success: true, message: 'Database restored successfully' };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('selectBackupFile', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'SQLite Database', extensions: ['sqlite', 'db'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, message: 'User canceled' };
    }
    
    return { success: true, filePath: result.filePaths[0] };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// Removed auto backup functionality - replaced with instant backup on every change
// Cloud backup functionality
ipcMain.handle('readBackupFile', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('Backup file not found');
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    return fileBuffer;
  } catch (e) {
    console.error('Failed to read backup file:', e);
    return null;
  }
});

ipcMain.handle('saveCloudBackup', async (event, backupData, fileName) => {
  try {
    const os = require('os');
    const documentsPath = path.join(os.homedir(), 'Documents');
    const restoreDir = path.join(documentsPath, 'Phone Shop Backups', 'Downloaded');
    
    // Create restore directory if it doesn't exist
    if (!fs.existsSync(restoreDir)) {
      fs.mkdirSync(restoreDir, { recursive: true });
    }
    
    const restorePath = path.join(restoreDir, fileName);
    fs.writeFileSync(restorePath, backupData);
    
    return { 
      success: true, 
      message: 'Cloud backup downloaded successfully', 
      path: restorePath 
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('restoreFromCloudBackup', async (event, filePath) => {
  let dbPath = path.join(__dirname, '../database/shop.sqlite');
  let backupCurrentPath = dbPath + '.bak';
  try {
    if (!fs.existsSync(filePath)) {
      console.error('[Restore] Backup file not found:', filePath);
      throw new Error('Backup file not found');
    }
    // Close database connection
    try {
      db.db.close();
      console.log('[Restore] Closed DB connection');
    } catch (e) {
      console.warn('[Restore] DB close failed (may already be closed):', e.message);
    }
    // Create backup of current database
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupCurrentPath);
      console.log('[Restore] Backed up current DB to', backupCurrentPath);
    }
    // Restore from backup
    fs.copyFileSync(filePath, dbPath);
    console.log('[Restore] Copied backup file to DB path:', dbPath);
    // Reinitialize database connection
    let dbModule;
    try {
      // Clear require cache for db.cjs to force reload
      delete require.cache[require.resolve('../database/db.cjs')];
      dbModule = require('../database/db.cjs');
      Object.assign(db, dbModule);
      // Test connection by running a simple query
      db.getProducts();
      console.log('[Restore] DB connection re-initialized and test query succeeded');
    } catch (e) {
      console.error('[Restore] DB re-initialization or test query failed:', e);
      // Rollback if DB cannot be opened
      if (fs.existsSync(backupCurrentPath)) {
        fs.copyFileSync(backupCurrentPath, dbPath);
        delete require.cache[require.resolve('../database/db.cjs')];
        dbModule = require('../database/db.cjs');
        Object.assign(db, dbModule);
        console.log('[Restore] Rolled back to previous DB');
      }
      throw new Error('Restored DB is invalid or corrupt. Rolled back to previous database.');
    }
    // Log the restore
    db.logBackup({
      file_name: path.basename(filePath),
      encrypted: false,
      log: `Database restored from cloud backup: ${filePath}`
    });
    // Force restart the app to ensure all DB connections are fresh
    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 500);
    return {
      success: true,
      message: 'Database restored successfully from cloud backup. The app will now restart.',
      requiresRestart: true
    };
  } catch (e) {
    console.error('[Restore] Restore failed:', e);
    return { success: false, message: e.message };
  }
});

// Return handlers
ipcMain.handle('returnSale', async (event, saleId) => {
  try {
    const result = db.returnSale(saleId);
    await updateCurrentBackup();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('returnSaleItem', async (event, saleId, itemId) => {
  try {
    const result = db.returnSaleItem(saleId, itemId);
    await updateCurrentBackup();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// Cloud backup trigger handler
ipcMain.on('trigger-cloud-auto-backup', (event) => {
  console.debug('[Main] Received trigger-cloud-auto-backup event');
  // Send message to all renderer processes to handle cloud backup
  const allWindows = BrowserWindow.getAllWindows();
  allWindows.forEach(window => {
    window.webContents.send('trigger-cloud-auto-backup');
  });
});
