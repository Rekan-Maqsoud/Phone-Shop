// Electron main process

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
let db; // Will be initialized after DB path is set
const bcrypt = require('bcryptjs');
const settings = require('electron-settings');
const mainCloudBackup = require('./services/mainCloudBackup.cjs');

function getDatabasePath() {
  if (app.isPackaged) {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'shop.sqlite');
    
    // Ensure userData directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    if (!fs.existsSync(dbPath)) {
      const defaultDbPath = path.join(process.resourcesPath, 'database', 'shop.sqlite');
      try {
        console.log('📂 Looking for default DB at:', defaultDbPath);
        if (fs.existsSync(defaultDbPath)) {
          fs.copyFileSync(defaultDbPath, dbPath);
          console.log('📂 Copied default DB to userData:', dbPath);
        } else {
          console.log('⚠️ Default DB not found, creating new one...');
          // Create a basic empty database if default doesn't exist
          const dbModule = require('../database/db.cjs');
          const tempDb = dbModule(dbPath);
          tempDb.db.close();
        }
      } catch (e) {
        console.error('❌ Error setting up database:', e);
      }
    }
    
    return dbPath;
  } else {
    return path.join(__dirname, '../database/shop.sqlite');
  }
}
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  
  // Maximize the window (not fullscreen)
  win.maximize();
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

app.whenReady().then(async () => {
  try {
    console.log('🚀 App ready, initializing...');
    
    // Initialize DB after app is ready and DB path is set
    const dbPath = getDatabasePath();
    console.log('📂 Database path:', dbPath);
    
    const dbModule = require('../database/db.cjs');
    db = dbModule(dbPath); // Call the function with dbPath
    
    console.log('✅ Database initialized successfully');
    
    // Test database connection
    try {
      const testQuery = db.db.prepare('SELECT COUNT(*) as count FROM sqlite_master').get();
      console.log('✅ Database connection test passed:', testQuery);
    } catch (dbError) {
      console.error('❌ Database connection test failed:', dbError);
      dialog.showErrorBox('Database Error', 'Failed to connect to database. Please restart the application.');
    }
    
    createWindow();
    
    // Check if we need to perform monthly reset on app startup
    checkAndPerformMonthlyReset();
    
  } catch (error) {
    console.error('❌ App initialization failed:', error);
    dialog.showErrorBox('Initialization Error', `Failed to initialize application: ${error.message}`);
    app.quit();
  }
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
    // Only run if database is initialized
    if (!db) {
      console.log('Database not initialized yet, skipping monthly reset check');
      return;
    }
    
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
      if (db.resetMonthlySalesAndProfit) {
        db.resetMonthlySalesAndProfit();
        settings.setSync('lastMonthlyResetDate', `${currentYear}-${currentMonth}`);
        console.log('Monthly reset completed.');
      } else {
        console.warn('resetMonthlySalesAndProfit function not available');
      }
    }
  } catch (error) {
    console.error('Error during monthly reset check:', error);
  }
}

// IPC handlers
// Product CRUD
ipcMain.handle('getProducts', async () => {
  try {
    return db.getProducts ? db.getProducts() : [];
  } catch (e) {
    console.error('getProducts error:', e);
    return [];
  }
});
ipcMain.handle('addProduct', async (event, product) => {
  try {
    if (db.addProduct) {
      db.addProduct(product);
      console.log('[main.cjs] addProduct: calling runAutoBackupAfterSale');
      await runAutoBackupAfterSale('product');
      return { success: true };
    } else {
      return { success: false, message: 'Database function not available' };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
});
ipcMain.handle('editProduct', async (event, product) => {
  try {
    if (db.updateProduct) {
      db.updateProduct(product);
      console.log('[main.cjs] editProduct: calling runAutoBackupAfterSale');
      // Pass archive type for archived products
      const operationType = product.archived ? 'archive' : 'product';
      await runAutoBackupAfterSale(operationType);
      return { success: true };
    } else {
      return { success: false, message: 'Database function not available' };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
});
ipcMain.handle('deleteProduct', async (event, id) => {
  try {
    if (db.deleteProduct) {
      db.deleteProduct(id);
      console.log('[main.cjs] deleteProduct: calling runAutoBackupAfterSale');
      await runAutoBackupAfterSale('archive');
      return { success: true };
    } else {
      return { success: false, message: 'Database function not available' };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
});
// Accessory CRUD
ipcMain.handle('getAccessories', async () => {
  try {
    return db.getAccessories ? db.getAccessories() : [];
  } catch (e) {
    console.error('getAccessories error:', e);
    return [];
  }
});
ipcMain.handle('getAllAccessories', async () => {
  try {
    return db.getAllAccessories ? db.getAllAccessories() : [];
  } catch (e) {
    console.error('getAllAccessories error:', e);
    return [];
  }
});
ipcMain.handle('addAccessory', async (event, accessory) => {
  try {
    if (db.addAccessory) {
      db.addAccessory(accessory);
      await runAutoBackupAfterSale('accessory');
      return { success: true };
    } else {
      return { success: false, message: 'Database function not available' };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
});
ipcMain.handle('editAccessory', async (event, accessory) => {
  try {
    if (db.updateAccessory) {
      db.updateAccessory(accessory);
      // Pass archive type for archived accessories
      const operationType = accessory.archived ? 'archive' : 'accessory';
      await runAutoBackupAfterSale(operationType);
      return { success: true };
    } else {
      return { success: false, message: 'Database function not available' };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
});
ipcMain.handle('deleteAccessory', async (event, id) => {
  try {
    if (db.deleteAccessory) {
      db.deleteAccessory(id);
      await runAutoBackupAfterSale('archive');
      return { success: true };
    } else {
      return { success: false, message: 'Database function not available' };
    }
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
    return db.getSales ? db.getSales() : [];
  } catch (e) {
    console.error('getSales error:', e);
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
  console.log('[main.cjs] saveSale IPC handler called');
  try {
    if (db.saveSale) {
      // Only call db.saveSale, which now handles all stock logic atomically
      const saleId = db.saveSale(sale);
      console.log('[main.cjs] db.saveSale returned, calling runAutoBackupAfterSale');
      // Sales are high priority and should backup quickly
      await runAutoBackupAfterSale('sale');
      console.log('[main.cjs] runAutoBackupAfterSale finished');
      return { success: true, id: saleId, lastInsertRowid: saleId };
    } else {
      return { success: false, message: 'Database function not available' };
    }
  } catch (e) {
    console.error('[main.cjs] saveSale error:', e);
    return { success: false, message: e.message };
  }
});

// Unified backup logic - handles both local and cloud backups automatically
// Simple debounced backup system to prevent excessive backup operations
let backupTimeout = null;
let lastBackupTime = 0;
const BACKUP_COOLDOWN = 2000; // Minimum 2 seconds between backups

async function runAutoBackupAfterSale(operationType = 'unknown') {
  const now = Date.now();
  
  // For archiving operations, use a longer delay to batch multiple operations
  const isArchiveOperation = operationType === 'archive' || operationType.includes('archive');
  const isSaleOperation = operationType === 'sale';
  
  let delay;
  if (isSaleOperation) {
    delay = 1000; // 1s for sales (most critical)
  } else if (isArchiveOperation) {
    delay = 8000; // 8s for archive operations (reduced from 10s)
  } else {
    delay = 3000; // 3s for other operations
  }
  
  console.log(`[runAutoBackupAfterSale] Scheduled backup for ${operationType} (delay: ${delay}ms)`);
  
  // Clear existing timeout to debounce
  if (backupTimeout) {
    clearTimeout(backupTimeout);
  }
  
  // If it's been a while since last backup, reduce delay significantly
  const timeSinceLastBackup = now - lastBackupTime;
  const actualDelay = timeSinceLastBackup > 30000 ? Math.min(delay, 1500) : delay;
  
  backupTimeout = setTimeout(async () => {
    try {
      console.log('[runAutoBackupAfterSale] Executing backup...');
      await updateCurrentBackup();
      lastBackupTime = Date.now();
      console.log('[runAutoBackupAfterSale] Local backup completed');
      
      // Only trigger cloud backup for critical operations to reduce load
      if (isSaleOperation || (!isArchiveOperation && Math.random() > 0.5)) {
        const allWindows = BrowserWindow.getAllWindows();
        console.log(`[runAutoBackupAfterSale] Triggering cloud backup for ${allWindows.length} windows`);
        allWindows.forEach(window => {
          window.webContents.send('trigger-unified-auto-backup');
        });
      } else {
        console.log('[runAutoBackupAfterSale] Skipped cloud backup for low-priority operation');
      }
      
      backupTimeout = null;
    } catch (error) {
      console.warn('[runAutoBackupAfterSale] Backup failed:', error);
      backupTimeout = null;
    }
  }, actualDelay);
}

// Use the extracted function in the IPC handler
ipcMain.handle('autoBackupAfterSale', async () => {
  try {
    await runAutoBackupAfterSale();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// Debt handlers (backward compatibility)
ipcMain.handle('addDebt', async (event, { sale_id, customer_name }) => {
  try {
    if (db.addDebt) {
      const result = db.addDebt({ sale_id, customer_name });
      await runAutoBackupAfterSale('debt');
      return result;
    } else {
      return { success: false, message: 'Database function not available' };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
});
ipcMain.handle('getDebts', async () => {
  try {
    return db.getDebts ? db.getDebts() : [];
  } catch (e) {
    console.error('getDebts error:', e);
    return [];
  }
});
ipcMain.handle('markDebtPaid', async (event, id, paid_at) => {
  try {
    if (db.markDebtPaid) {
      const result = db.markDebtPaid(id, paid_at);
      await runAutoBackupAfterSale('debt');
      return result;
    } else {
      return { success: false, message: 'Database function not available' };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// Customer debt handlers
ipcMain.handle('addCustomerDebt', async (event, { sale_id, customer_name }) => {
  const result = db.addCustomerDebt({ sale_id, customer_name });
  await runAutoBackupAfterSale();
  return result;
});
ipcMain.handle('getCustomerDebts', async () => {
  return db.getCustomerDebts();
});
ipcMain.handle('markCustomerDebtPaid', async (event, id, paid_at) => {
  const result = db.markCustomerDebtPaid(id, paid_at);
  await runAutoBackupAfterSale();
  return result;
});

// Company debt handlers
ipcMain.handle('addCompanyDebt', async (event, { company_name, amount, description }) => {
  const result = db.addCompanyDebt({ company_name, amount, description });
  await runAutoBackupAfterSale();
  return result;
});
ipcMain.handle('addCompanyDebtWithItems', async (event, { company_name, description, items }) => {
  try {
    const result = db.addCompanyDebtWithItems({ company_name, description, items });
    await runAutoBackupAfterSale();
    return { success: true, result };
  } catch (error) {
    console.error('Error adding company debt with items:', error);
    return { success: false, message: error.message };
  }
});
ipcMain.handle('getCompanyDebts', async () => {
  return db.getCompanyDebts();
});
ipcMain.handle('getCompanyDebtItems', async (event, debtId) => {
  return db.getCompanyDebtItems(debtId);
});
ipcMain.handle('markCompanyDebtPaid', async (event, id, paid_at) => {
  const result = db.markCompanyDebtPaid(id, paid_at);
  await runAutoBackupAfterSale();
  return result;
});

// Buying history handlers
ipcMain.handle('getBuyingHistory', async () => {
  return db.getBuyingHistory();
});
ipcMain.handle('getBuyingHistoryWithItems', async () => {
  return db.getBuyingHistoryWithItems();
});
// Direct purchase handlers
ipcMain.handle('addDirectPurchase', async (event, purchaseData) => {
  console.log('[IPC] addDirectPurchase handler called with:', purchaseData);
  try {
    const result = db.addDirectPurchase(purchaseData);
    console.log('[IPC] addDirectPurchase result:', result);
    await runAutoBackupAfterSale();
    return result;
  } catch (error) {
    console.error('[IPC] addDirectPurchase error:', error);
    throw error;
  }
});
ipcMain.handle('addDirectPurchaseWithItems', async (event, purchaseData) => {
  console.log('[IPC] addDirectPurchaseWithItems handler called with:', purchaseData);
  try {
    const result = db.addDirectPurchaseWithItems(purchaseData);
    console.log('[IPC] addDirectPurchaseWithItems result:', result);
    await runAutoBackupAfterSale();
    return result;
  } catch (error) {
    console.error('[IPC] addDirectPurchaseWithItems error:', error);
    throw error;
  }
});

// Monthly reports handlers
ipcMain.handle('createMonthlyReport', async (event, month, year) => {
  const result = db.createMonthlyReport(month, year);
  await runAutoBackupAfterSale();
  return result;
});
ipcMain.handle('getMonthlyReports', async () => {
  return db.getMonthlyReports();
});
ipcMain.handle('resetMonthlySalesAndProfit', async () => {
  const result = db.resetMonthlySalesAndProfit();
  await runAutoBackupAfterSale();
  return result;
});

ipcMain.handle('getDebtSales', async () => {
  try {
    return db.getDebtSales ? db.getDebtSales() : [];
  } catch (e) {
    console.error('getDebtSales error:', e);
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
    const backupDir = path.join(documentsPath, 'Mobile Roma BackUp');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      
    }
    const currentBackupFileName = 'phone-shop-current-backup.sqlite';
    const backupPath = path.join(backupDir, currentBackupFileName);
    const dbPath = getDatabasePath();
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
    }
    currentBackupPath = backupPath;
 
    return backupPath;
  } catch (e) {
    console.error('[initializeCurrentBackup] Failed to initialize current backup:', e);
    return null;
  }
};

// Update current backup after any change
const updateCurrentBackup = async () => {
  try {
    if (!currentBackupPath) {
      console.log('[updateCurrentBackup] currentBackupPath not set, initializing...');
      initializeCurrentBackup();
      return;
    }
    const dbPath = getDatabasePath();
    fs.copyFileSync(dbPath, currentBackupPath);
    if (db && db.logBackup) {
      db.logBackup({
        file_name: 'phone-shop-current-backup.sqlite',
        encrypted: false,
        log: `Current backup updated at ${new Date().toISOString()}`
      });
    }
    console.log('[updateCurrentBackup] Backup file copied to', currentBackupPath);
  } catch (e) {
    console.error('[updateCurrentBackup] Failed to update current backup:', e);
  }
};

// Manual backup - creates a new backup file with timestamp
ipcMain.handle('createBackup', async () => {
  try {
    const os = require('os');
    // Get default Documents folder
    const documentsPath = path.join(os.homedir(), 'Documents');
    const backupDir = path.join(documentsPath, 'Mobile Roma BackUp');
    
    console.log('Creating backup directory:', backupDir);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('Backup directory created');
    }
    
    // Create backup filename with timestamp - always backup regardless of prefix
    const now = new Date();
    const nowPrefix = now.toISOString().slice(0, 19).replace(/:/g, '-'); // e.g., '2025-06-28T14-30-45'
    const backupFileName = `phone-shop-backup-${nowPrefix}.sqlite`;
    const backupPath = path.join(backupDir, backupFileName);
    
    console.log('Creating backup at:', backupPath);
    
    // Copy database file
    const dbPath = path.join(__dirname, '../database/shop.sqlite');
    console.log('Source database path:', dbPath);
    
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Source database not found at: ${dbPath}`);
    }
    
    fs.copyFileSync(dbPath, backupPath);
    console.log('Database file copied successfully');
    
    // Verify the backup file was created
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file was not created at: ${backupPath}`);
    }
    
    const backupStats = fs.statSync(backupPath);
    console.log(`Backup file created successfully. Size: ${backupStats.size} bytes`);
    
    // Log backup in database
    db.logBackup({
      file_name: backupFileName,
      encrypted: false,
      log: `Manual backup created at ${backupPath}`
    });
    
    return {
      success: true,
      message: `Backup created successfully at ${backupPath}`,
      path: backupPath,
      fileName: backupFileName
    };
  } catch (e) {
    console.error('Error creating backup:', e);
    return { 
      success: false, 
      message: `Failed to create backup: ${e.message}`,
      error: e.message 
    };
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
  const dbPath = path.join(__dirname, '../database/shop.sqlite');
  const backupCurrentPath = dbPath + '.bak';
  
  try {
    console.log('[Local Restore] Starting restore from:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.error('[Local Restore] Backup file not found:', filePath);
      return { success: false, message: 'Backup file not found' };
    }
    
    // Verify backup file is valid SQLite by checking header
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    
    if (!buffer.toString('utf8', 0, 15).startsWith('SQLite format 3')) {
      console.error('[Local Restore] Invalid SQLite file:', filePath);
      return { success: false, message: 'Selected file is not a valid SQLite database backup' };
    }
    
    // Close database connection
    try {
      db.db.close();
      console.log('[Local Restore] Closed DB connection');
    } catch (e) {
      console.warn('[Local Restore] DB close failed (may already be closed):', e.message);
    }
    
    // Create backup of current database
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupCurrentPath);
      console.log('[Local Restore] Backed up current DB to', backupCurrentPath);
    }
    
    // Copy backup file to current database location
    fs.copyFileSync(filePath, dbPath);
    console.log('[Local Restore] Copied backup file to DB path:', dbPath);
    
    // Reinitialize database connection
    try {
      // Clear require cache for db.cjs to force reload
      delete require.cache[require.resolve('../database/db.cjs')];
      const dbModule = require('../database/db.cjs');
      Object.assign(db, dbModule);
      
      // Test connection by running a simple query
      const testResult = db.getProducts();
      console.log('[Local Restore] DB connection re-initialized and test query succeeded, got', testResult.length, 'products');
    } catch (e) {
      console.error('[Local Restore] DB re-initialization or test query failed:', e);
      // Rollback if DB cannot be opened
      if (fs.existsSync(backupCurrentPath)) {
        fs.copyFileSync(backupCurrentPath, dbPath);
        delete require.cache[require.resolve('../database/db.cjs')];
        const dbModule = require('../database/db.cjs');
        Object.assign(db, dbModule);
        console.log('[Local Restore] Rolled back to previous DB');
      }
      throw new Error('Restored DB is invalid or corrupt. Rolled back to previous database.');
    }
    
    // Log the restore
    db.logBackup({
      file_name: path.basename(filePath),
      encrypted: false,
      log: `Database restored from local backup: ${filePath}`
    });
    
    return { 
      success: true, 
      message: 'Database restored successfully. Please restart the application to ensure all changes take effect.',
      requiresRestart: true
    };
  } catch (e) {
    console.error('[Local Restore] Restore failed:', e);
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
    const restoreDir = path.join(documentsPath, 'Mobile Roma BackUp', 'Downloaded');
    
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
    console.log('[Cloud Restore] Starting restore from:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.error('[Cloud Restore] Backup file not found:', filePath);
      throw new Error('Backup file not found');
    }
    
    // Verify backup file is valid SQLite by checking header
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    
    if (!buffer.toString('utf8', 0, 15).startsWith('SQLite format 3')) {
      console.error('[Cloud Restore] Invalid SQLite file:', filePath);
      throw new Error('Downloaded file is not a valid SQLite database backup');
    }
    
    // Close database connection
    try {
      db.db.close();
      console.log('[Cloud Restore] Closed DB connection');
    } catch (e) {
      console.warn('[Cloud Restore] DB close failed (may already be closed):', e.message);
    }
    // Create backup of current database
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupCurrentPath);
      console.log('[Cloud Restore] Backed up current DB to', backupCurrentPath);
    }
    // Restore from backup
    fs.copyFileSync(filePath, dbPath);
    console.log('[Cloud Restore] Copied backup file to DB path:', dbPath);
    // Reinitialize database connection
    let dbModule;
    try {
      // Clear require cache for db.cjs to force reload
      delete require.cache[require.resolve('../database/db.cjs')];
      dbModule = require('../database/db.cjs');
      Object.assign(db, dbModule);
      // Test connection by running a simple query
      const testResult = db.getProducts();
      console.log('[Cloud Restore] DB connection re-initialized and test query succeeded, got', testResult.length, 'products');
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
    await runAutoBackupAfterSale();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('returnSaleItem', async (event, saleId, itemId, quantity = null) => {
  try {
    const result = db.returnSaleItem(saleId, itemId, quantity);
    await runAutoBackupAfterSale();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// Get current backup path for unified backup system
ipcMain.handle('getCurrentBackupPath', async () => {
  try {
    if (!currentBackupPath) {
      initializeCurrentBackup();
    }
    return { success: true, path: currentBackupPath };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('getCloudBackups', async () => {
  try {
    const result = await mainCloudBackup.getBackups();
    return result;
  } catch (error) {
    console.error('Error getting cloud backups:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('setCloudSession', async (event, sessionData) => {
  try {
    const result = await mainCloudBackup.setSession(sessionData);
    return { success: true };
  } catch (error) {
    console.error('Error setting cloud session:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clearCloudSession', async () => {
  try {
    await mainCloudBackup.clearSession();
    return { success: true };
  } catch (error) {
    console.error('Error clearing cloud session:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('getCloudStorageUsage', async () => {
  try {
    const result = await mainCloudBackup.getStorageUsage();
    return result;
  } catch (error) {
    console.error('Error getting cloud storage usage:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('downloadCloudBackup', async (event, backupId, fileName) => {
  try {
    const path = require('path');
    const os = require('os');
    
    // Download the backup to downloads folder
    const downloadPath = path.join(os.homedir(), 'Downloads', fileName || `backup-${backupId}.sqlite`);
    
    const result = await mainCloudBackup.downloadBackup(backupId, downloadPath);
    
    if (result.success) {
      return {
        success: true,
        path: downloadPath,
        message: 'Backup downloaded successfully'
      };
    } else {
      return {
        success: false,
        message: result.error || 'Failed to download backup'
      };
    }
  } catch (error) {
    console.error('Error downloading cloud backup:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('restartApp', async () => {
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 500);
  return { success: true };
});
