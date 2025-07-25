// Electron main process

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
let db; // Will be initialized after DB path is set
const bcrypt = require('bcryptjs');
const settings = require('electron-settings');
const CloudBackupService = require('./services/CloudBackupService.cjs');

// Initialize cloud backup service
const cloudBackupService = new CloudBackupService();

// Initialize auto backup settings
async function initializeAutoBackup() {
  try {
    // Check if auto backup is enabled in settings (default to true)
    const autoBackupEnabled = await settings.get('autoBackup');
    const enabled = autoBackupEnabled !== undefined ? autoBackupEnabled : true;
    cloudBackupService.setAutoBackup(enabled);
  } catch (error) {
    console.error('[Main] Failed to initialize auto backup:', error);
    // Default to enabled if error
    cloudBackupService.setAutoBackup(true);
  }
}

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
        if (fs.existsSync(defaultDbPath)) {
          fs.copyFileSync(defaultDbPath, dbPath);
        } else {
          // Create a basic empty database if default doesn't exist
          const dbModule = require('../database/index.cjs');
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
    icon: path.join(__dirname, '../public/web/android-chrome-512x512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  
  // Maximize the window (not fullscreen)
  win.maximize();
  
  // Check if running in dev mode
  const isDevMode = !app.isPackaged && (process.env.NODE_ENV === 'development' || process.argv.includes('--dev') || fs.existsSync(path.join(__dirname, '../vite.config.js')));
  
  const urlToLoad = isDevMode 
    ? 'http://localhost:5173/'
    : `file://${path.join(__dirname, '../dist/index.html')}`;
    
  
  win.loadURL(urlToLoad);
  
  // Add URL navigation handler to prevent file:// URL issues
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    // Block file:// URLs that aren't our main file
    if (navigationUrl.startsWith('file://') && !navigationUrl.includes('index.html')) {
      console.warn('🚫 Blocked file:// navigation to:', navigationUrl);
      event.preventDefault();
      
      // Extract potential route from the URL
      const match = navigationUrl.match(/file:\/\/\/[A-Z]:(.*)/);
      if (match) {
        const route = match[1];
        
        // Convert to hash route
        if (route === '/admin') {
          win.webContents.executeJavaScript('window.location.hash = "#/admin"');
        } else if (route === '/cashier') {
          win.webContents.executeJavaScript('window.location.hash = "#/cashier"');
        }
      }
    }
  });
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
    // Initialize DB after app is ready and DB path is set
    const dbPath = getDatabasePath();
    
    const dbModule = require('../database/index.cjs');
    db = dbModule(dbPath); // Call the factory function with dbPath
    
    // Automatically repair products with NULL IDs on startup
    try {
      const repairedCount = db.repairProductIds();
      if (repairedCount > 0) {
      }
    } catch (repairError) {
      console.error('❌ Failed to repair product IDs:', repairError);
    }
    
    // Test database connection
    try {
      const testQuery = db.db.prepare('SELECT COUNT(*) as count FROM sqlite_master').get();
    } catch (dbError) {
      console.error('❌ Database connection test failed:', dbError);
      dialog.showErrorBox('Database Error', 'Failed to connect to database. Please restart the application.');
    }
    
    // Initialize auto backup after DB is ready
    await initializeAutoBackup();
    
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
      if (db.resetMonthlySalesAndProfit) {
        db.resetMonthlySalesAndProfit();
        settings.setSync('lastMonthlyResetDate', `${currentYear}-${currentMonth}`);
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
    if (db && db.getProducts) {
      const products = db.getProducts();
      return products || [];
    } else {
      console.error('❌ Database or getProducts function not available');
      return [];
    }
  } catch (e) {
    console.error('❌ getProducts error:', e);
    return [];
  }
});
ipcMain.handle('addProduct', async (event, product) => {
  try {
    if (db.addProduct) {
      db.addProduct(product);
      // Repair any NULL IDs after adding product
      if (db.repairProductIds) {
        db.repairProductIds();
      }
      await autoBackupAfterChange('product');
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
    if (db && db.getAllAccessories) {
      const accessories = db.getAllAccessories();
      return accessories || [];
    } else {
      console.error('Database or getAllAccessories function not available');
      return [];
    }
  } catch (e) {
    console.error('getAllAccessories error:', e);
    return [];
  }
});
ipcMain.handle('addAccessory', async (event, accessory) => {
  try {
    if (db.addAccessory) {
      db.addAccessory(accessory);
      // Repair any NULL IDs after adding accessory
      if (db.repairProductIds) {
        db.repairProductIds();
      }
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
  try {
    if (db && db.saveSetting) {
      db.saveSetting(key, value);
      return { success: true };
    } else {
      console.error('❌ Database or saveSetting function not available');
      return { success: false, message: 'Database function not available' };
    }
  } catch (e) {
    console.error('❌ saveSetting error:', e);
    return { success: false, message: e.message };
  }
});
ipcMain.handle('getSetting', async (event, key) => {
  try {
    if (db && db.getSetting) {
      return db.getSetting(key);
    } else {
      console.error('❌ Database or getSetting function not available');
      return null;
    }
  } catch (e) {
    console.error('❌ getSetting error:', e);
    return null;
  }
});
// Danger zone: reset all data
ipcMain.handle('resetAllData', async () => {
  try {
    db.resetAllData();
    // Repair any NULL IDs after reset
    if (db.repairProductIds) {
      const repaired = db.repairProductIds();
    }
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
  try {
    const { dialog } = require('electron');
    const fs = require('fs').promises;
    const path = require('path');
    
    // Show file dialog to select backup file
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'SQLite Database', extensions: ['sqlite', 'db'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, message: 'Restore cancelled by user.' };
    }
    
    const backupPath = result.filePaths[0];
    const currentDbPath = path.join(__dirname, '../database/shop.sqlite');
    
    // Create backup of current database before restore
    const backupCurrentDb = currentDbPath + '.backup.' + Date.now();
    await fs.copyFile(currentDbPath, backupCurrentDb);
    
    // Restore the selected backup
    await fs.copyFile(backupPath, currentDbPath);
    
    return { 
      success: true, 
      message: 'Database restored successfully. Current database backed up to ' + path.basename(backupCurrentDb) 
    };
  } catch (error) {
    return { success: false, message: 'Restore failed: ' + error.message };
  }
});
// IPC handler for saving logo file
ipcMain.handle('saveLogoFile', async (event, file) => {
  try {
    const { dialog } = require('electron');
    const fs = require('fs').promises;
    const path = require('path');
    
    if (!file || !file.data) {
      return { success: false, message: 'No file data provided' };
    }
    
    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: file.name || 'logo.png',
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, message: 'Save cancelled by user.' };
    }
    
    // Convert base64 to buffer if needed
    let fileData = file.data;
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      const base64Data = fileData.split(',')[1];
      fileData = Buffer.from(base64Data, 'base64');
    }
    
    // Save the file
    await fs.writeFile(result.filePath, fileData);
    
    return { 
      success: true, 
      message: 'Logo saved successfully',
      path: result.filePath 
    };
  } catch (error) {
    return { success: false, message: 'Save failed: ' + error.message };
  }
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
    if (db && db.saveSale) {
      // Only call db.saveSale, which now handles all stock logic atomically
      const saleId = db.saveSale(sale);
      
      // Sales are high priority and should backup quickly - but don't let backup failure block sale
      try {
        await runAutoBackupAfterSale('sale');
      } catch (backupError) {
        console.error('⚠️ [main.cjs] Auto backup failed (non-blocking):', backupError);
        // Continue with sale success even if backup fails
      }
      
      return { success: true, id: saleId, lastInsertRowid: saleId };
    } else {
      console.error('❌ Database or saveSale function not available');
      return { success: false, message: 'Database function not available' };
    }
  } catch (e) {
    console.error('❌ [main.cjs] saveSale error:', e);
    return { success: false, message: e.message };
  }
});

// Auto backup after data changes using new cloud backup system
async function autoBackupAfterChange(operationType = 'unknown') {
  try {
    if (cloudBackupService) {
      const dbPath = getDatabasePath();
      // Don't await - let backup run in background
      cloudBackupService.autoBackup(dbPath).catch(error => {
        console.error('Background backup failed:', error);
      });
      return { success: true };
    }
  } catch (error) {
    console.error('Auto backup trigger failed:', error);
    return { success: false, error: error.message };
  }
}

// Auto backup after data changes (simplified)
async function runAutoBackupAfterSale(operationType = 'unknown') {
  return await autoBackupAfterChange(operationType);
}

// IPC handler for backward compatibility
ipcMain.handle('autoBackupAfterSale', async () => {
  try {
    await autoBackupAfterChange('manual');
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// Debt handlers (backward compatibility)
ipcMain.handle('addDebt', async (event, { sale_id, customer_name }) => {
  try {
    if (db && db.addDebt) {
      const result = db.addDebt({ sale_id, customer_name });
      await runAutoBackupAfterSale('debt');
      return { success: true, result };
    } else {
      console.error('❌ [main.cjs] addDebt function not available');
      return { success: false, message: 'Database function not available' };
    }
  } catch (e) {
    console.error('❌ [main.cjs] addDebt error:', e);
    return { success: false, message: e.message };
  }
});
ipcMain.handle('getDebts', async () => {
  try {
    if (db && db.getDebts) {
      const result = db.getDebts();
      return result || [];
    } else {
      console.error('❌ [main.cjs] getDebts function not available');
      return [];
    }
  } catch (e) {
    console.error('❌ [main.cjs] getDebts error:', e);
    return [];
  }
});
ipcMain.handle('markDebtPaid', async (event, id, paid_at) => {
  try {
    if (db && db.markDebtPaid) {
      const result = db.markDebtPaid(id, paid_at);
      await runAutoBackupAfterSale('debt');
      return result;
    } else {
      console.error('❌ Database or markDebtPaid function not available');
      return { success: false, message: 'Database function not available' };
    }
  } catch (e) {
    console.error('❌ markDebtPaid error:', e);
    return { success: false, message: e.message };
  }
});

// Customer debt handlers
ipcMain.handle('addCustomerDebt', async (event, debtData) => {
  try {
    if (db && db.addCustomerDebt) {
      const result = db.addCustomerDebt(debtData);
      await runAutoBackupAfterSale('debt');
      return result;
    } else {
      console.error('❌ Database or addCustomerDebt function not available');
      return { success: false, message: 'Database function not available' };
    }
  } catch (error) {
    console.error('❌ addCustomerDebt error:', error);
    return { success: false, message: error.message };
  }
});
ipcMain.handle('getCustomerDebts', async () => {
  try {
    if (db && db.getCustomerDebts) {
      return db.getCustomerDebts();
    } else {
      console.error('❌ Database or getCustomerDebts function not available');
      return [];
    }
  } catch (error) {
    console.error('❌ getCustomerDebts error:', error);
    return [];
  }
});
ipcMain.handle('markCustomerDebtPaid', async (event, id, paid_at, paymentData) => {
  try {
    const result = db.markCustomerDebtPaid(id, { 
      paid_at, 
      payment_currency_used: paymentData?.payment_currency_used || paymentData?.currency || 'USD',
      payment_usd_amount: paymentData?.payment_usd_amount || paymentData?.deductUSD || paymentData?.usdAmount || 0, 
      payment_iqd_amount: paymentData?.payment_iqd_amount || paymentData?.deductIQD || paymentData?.iqdAmount || 0 
    });
    await runAutoBackupAfterSale();
    return result;
  } catch (error) {
    console.error('❌ [main.cjs] markCustomerDebtPaid error:', error);
    throw error;
  }
});

// Company debt handlers
ipcMain.handle('addCompanyDebt', async (event, { company_name, amount, description, currency = 'IQD', multi_currency = null, discount = null }) => {
  try {
    if (db && db.addCompanyDebt) {
      const result = db.addCompanyDebt({ company_name, amount, description, currency, multi_currency, discount });
      await runAutoBackupAfterSale('debt');
      return result;
    } else {
      console.error('❌ Database or addCompanyDebt function not available');
      return { success: false, message: 'Database function not available' };
    }
  } catch (error) {
    console.error('❌ addCompanyDebt error:', error);
    return { success: false, message: error.message };
  }
});
ipcMain.handle('addCompanyDebtWithItems', async (event, { company_name, description, items, currency = 'IQD', multi_currency = null, discount = null }) => {
  try {
    const result = db.addCompanyDebtWithItems({ company_name, description, items, currency, multi_currency, discount });
    await runAutoBackupAfterSale();
    return { success: true, result };
  } catch (error) {
    console.error('Error adding company debt with items:', error);
    return { success: false, message: error.message };
  }
});
ipcMain.handle('getCompanyDebts', async () => {
  try {
    if (db && db.getCompanyDebts) {
      return db.getCompanyDebts();
    } else {
      console.error('❌ Database or getCompanyDebts function not available');
      return [];
    }
  } catch (error) {
    console.error('❌ getCompanyDebts error:', error);
    return [];
  }
});
ipcMain.handle('getCompanyDebtItems', async (event, debtId) => {
  return db.getCompanyDebtItems(debtId);
});
ipcMain.handle('markCompanyDebtPaid', async (event, id, paymentData) => {
  const result = db.markCompanyDebtPaid(id, paymentData);
  await runAutoBackupAfterSale();
  return result;
});

// Incentive handlers
ipcMain.handle('getIncentives', async () => {
  try {
    if (db && db.getIncentives) {
      return db.getIncentives();
    } else {
      console.error('❌ Database or getIncentives function not available');
      return [];
    }
  } catch (error) {
    console.error('❌ getIncentives error:', error);
    return [];
  }
});

ipcMain.handle('addIncentive', async (event, { company_name, amount, description, currency = 'IQD' }) => {
  try {
    if (db && db.addIncentive) {
      const result = db.addIncentive({ company_name, amount, description, currency });
      await runAutoBackupAfterSale();
      return { success: true, data: result };
    } else {
      console.error('❌ Database or addIncentive function not available');
      return { success: false, message: 'Database not available' };
    }
  } catch (error) {
    console.error('❌ addIncentive error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('removeIncentive', async (event, id) => {
  try {
    if (db && db.removeIncentive) {
      const result = db.removeIncentive(id);
      await runAutoBackupAfterSale();
      return { success: true, data: result };
    } else {
      console.error('❌ Database or removeIncentive function not available');
      return { success: false, message: 'Database not available' };
    }
  } catch (error) {
    console.error('❌ removeIncentive error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('updateIncentive', async (event, id, incentiveData) => {
  try {
    if (db && db.updateIncentive) {
      const result = db.updateIncentive(id, incentiveData);
      await runAutoBackupAfterSale();
      return { success: true, data: result };
    } else {
      console.error('❌ Database or updateIncentive function not available');
      return { success: false, message: 'Database not available' };
    }
  } catch (error) {
    console.error('❌ updateIncentive error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('getIncentivesByCompany', async (event, companyName) => {
  try {
    if (db && db.getIncentivesByCompany) {
      return db.getIncentivesByCompany(companyName);
    } else {
      console.error('❌ Database or getIncentivesByCompany function not available');
      return [];
    }
  } catch (error) {
    console.error('❌ getIncentivesByCompany error:', error);
    return [];
  }
});

ipcMain.handle('getIncentiveTotals', async () => {
  try {
    if (db && db.getIncentiveTotals) {
      return db.getIncentiveTotals();
    } else {
      console.error('❌ Database or getIncentiveTotals function not available');
      return { USD: 0, IQD: 0 };
    }
  } catch (error) {
    console.error('❌ getIncentiveTotals error:', error);
    return { USD: 0, IQD: 0 };
  }
});

ipcMain.handle('getTotalProfitWithIncentives', async () => {
  try {
    if (db && db.getTotalProfitWithIncentives) {
      return db.getTotalProfitWithIncentives();
    } else {
      console.error('❌ Database or getTotalProfitWithIncentives function not available');
      return { USD: 0, IQD: 0 };
    }
  } catch (error) {
    console.error('❌ getTotalProfitWithIncentives error:', error);
    return { USD: 0, IQD: 0 };
  }
});

// Buying history handlers
ipcMain.handle('getBuyingHistory', async () => {
  return db.getBuyingHistory();
});
ipcMain.handle('getBuyingHistoryWithTransactions', async () => {
  return db.getBuyingHistoryWithTransactions();
});
ipcMain.handle('getBuyingHistoryWithItems', async () => {
  return db.getBuyingHistoryWithItems();
});
// Direct purchase handlers
ipcMain.handle('addDirectPurchase', async (event, purchaseData) => {
  try {
    const result = db.addDirectPurchase(purchaseData);
    await runAutoBackupAfterSale();
    return result;
  } catch (error) {
    console.error('[IPC] addDirectPurchase error:', error);
    throw error;
  }
});
ipcMain.handle('addDirectPurchaseWithItems', async (event, purchaseData) => {
  try {
    const result = db.addDirectPurchaseWithItems(purchaseData);
    await runAutoBackupAfterSale();
    return result;
  } catch (error) {
    console.error('[IPC] addDirectPurchaseWithItems error:', error);
    throw error;
  }
});

ipcMain.handle('addDirectPurchaseMultiCurrency', async (event, purchaseData) => {
  try {
    const result = db.addDirectPurchaseMultiCurrency(purchaseData);
    await runAutoBackupAfterSale();
    return result;
  } catch (error) {
    console.error('[IPC] addDirectPurchaseMultiCurrency error:', error);
    throw error;
  }
});

ipcMain.handle('addDirectPurchaseMultiCurrencyWithItems', async (event, purchaseData) => {
  try {
    const result = db.addDirectPurchaseMultiCurrencyWithItems(purchaseData);
    await runAutoBackupAfterSale();
    return result;
  } catch (error) {
    console.error('[IPC] addDirectPurchaseMultiCurrencyWithItems error:', error);
    throw error;
  }
});

// Monthly reports handlers
ipcMain.handle('createMonthlyReport', async (event, month, year) => {
  try {
    if (db && db.createMonthlyReport) {
      const result = db.createMonthlyReport(month, year);
      await runAutoBackupAfterSale('report');
      return result;
    } else {
      console.error('❌ Database or createMonthlyReport function not available');
      return { success: false, message: 'Database function not available' };
    }
  } catch (error) {
    console.error('❌ createMonthlyReport error:', error);
    return { success: false, message: error.message };
  }
});
ipcMain.handle('getMonthlyReports', async () => {
  try {
    if (db && db.getMonthlyReports) {
      return db.getMonthlyReports();
    } else {
      console.error('❌ Database or getMonthlyReports function not available');
      return [];
    }
  } catch (error) {
    console.error('❌ getMonthlyReports error:', error);
    return [];
  }
});
ipcMain.handle('getMonthlyReport', async (event, year, month) => {
  try {
    if (db && db.getMonthlyReport) {
      return db.getMonthlyReport(year, month);
    } else {
      console.error('❌ Database or getMonthlyReport function not available');
      return null;
    }
  } catch (error) {
    console.error('❌ getMonthlyReport error:', error);
    return null;
  }
});
ipcMain.handle('resetMonthlySalesAndProfit', async () => {
  try {
    if (db && db.resetMonthlySalesAndProfit) {
      const result = db.resetMonthlySalesAndProfit();
      await runAutoBackupAfterSale('reset');
      return result;
    } else {
      console.error('❌ Database or resetMonthlySalesAndProfit function not available');
      return { success: false, message: 'Database function not available' };
    }
  } catch (error) {
    console.error('❌ resetMonthlySalesAndProfit error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('getDebtSales', async () => {
  try {
    const result = db.getDebtSales ? db.getDebtSales() : [];
    return result;
  } catch (e) {
    console.error('❌ [main.cjs] getDebtSales error:', e);
    return [];
  }
});

// Balance and Transaction handlers
ipcMain.handle('getBalances', async () => {
  try {
    return db.getBalances();
  } catch (error) {
    console.error('[IPC] getBalances error:', error);
    return { usd_balance: 0, iqd_balance: 0 };
  }
});

ipcMain.handle('getTransactions', async (event, limit = 50) => {
  try {
    return db.getTransactions(limit);
  } catch (error) {
    console.error('[IPC] getTransactions error:', error);
    return [];
  }
});

// Secret balance management handlers (admin only)
ipcMain.handle('setBalance', async (event, currency, amount) => {
  try {
    const result = db.setBalance(currency, amount);
    await autoBackupAfterChange('balance');
    return result;
  } catch (error) {
    console.error('[IPC] setBalance error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updateBalance', async (event, currency, amount) => {
  try {
    const result = db.updateBalance(currency, amount);
    await autoBackupAfterChange('balance');
    return result;
  } catch (error) {
    console.error('[IPC] updateBalance error:', error);
    return { success: false, error: error.message };
  }
});

// Personal Loan handlers
ipcMain.handle('addPersonalLoan', async (event, loanData) => {
  try {
    const result = db.addPersonalLoan(loanData);
    if (result.success) {
      await runAutoBackupAfterSale();
    }
    return result;
  } catch (error) {
    console.error('[IPC] addPersonalLoan error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('getPersonalLoans', async () => {
  try {
    return db.getPersonalLoans();
  } catch (error) {
    console.error('[IPC] getPersonalLoans error:', error);
    return [];
  }
});

ipcMain.handle('markPersonalLoanPaid', async (event, id, paymentData) => {
  try {
    const result = db.markPersonalLoanPaid(id, paymentData);
    if (result.success) {
      await runAutoBackupAfterSale();
    }
    return result;
  } catch (error) {
    console.error('[IPC] markPersonalLoanPaid error:', error);
    return { success: false, message: error.message };
  }
});

// Discount handlers
ipcMain.handle('addDiscount', async (event, discountData) => {
  try {
    const result = db.addDiscount(discountData);
    await runAutoBackupAfterSale();
    return { success: true, result };
  } catch (error) {
    console.error('[IPC] addDiscount error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('getDiscounts', async (event, transaction_type, reference_id) => {
  try {
    return db.getDiscounts(transaction_type, reference_id);
  } catch (error) {
    console.error('[IPC] getDiscounts error:', error);
    return [];
  }
});

ipcMain.handle('calculateDiscountedAmount', async (event, originalAmount, discounts) => {
  try {
    return db.calculateDiscountedAmount(originalAmount, discounts);
  } catch (error) {
    console.error('[IPC] calculateDiscountedAmount error:', error);
    return originalAmount;
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
  } catch (e) {
    console.error('[updateCurrentBackup] Failed to update current backup:', e);
  }
};

// Manual backup - creates a new backup file with timestamp
ipcMain.handle('createBackup', async () => {
  try {
    const os = require('os');
    // Get default Documents folder - make it more visible
    const documentsPath = path.join(os.homedir(), 'Documents');
    const backupDir = path.join(documentsPath, 'Mobile Roma BackUp');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create backup filename with timestamp - always backup regardless of prefix
    const now = new Date();
    const nowPrefix = now.toISOString().slice(0, 19).replace(/:/g, '-'); // e.g., '2025-06-28T14-30-45'
    const backupFileName = `phone-shop-backup-${nowPrefix}.sqlite`;
    const backupPath = path.join(backupDir, backupFileName);
    
    // Copy database file - use the same path resolution as the main app
    const dbPath = getDatabasePath(); // Use the function that handles both dev and production paths
    
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Source database not found at: ${dbPath}`);
    }
    
    fs.copyFileSync(dbPath, backupPath);
    
    // Verify the backup file was created and is readable
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file was not created at: ${backupPath}`);
    }
    
    const backupStats = fs.statSync(backupPath);
    
    // Try to open the backup file to verify it's a valid SQLite database
    try {
      const testBuffer = fs.readFileSync(backupPath, { encoding: null });
      if (testBuffer.length < 16 || !testBuffer.toString('utf8', 0, 15).startsWith('SQLite format 3')) {
        throw new Error('Backup file is not a valid SQLite database');
      }
    } catch (validationError) {
      console.error('Backup file validation failed:', validationError);
      throw new Error(`Backup created but validation failed: ${validationError.message}`);
    }
    
    // Log backup in database
    db.logBackup({
      file_name: backupFileName,
      encrypted: false,
      log: `Manual backup created at ${backupPath}`
    });
    
    // Open the backup directory in explorer so user can see the file
    const { shell } = require('electron');
    shell.showItemInFolder(backupPath);
    
    return {
      success: true,
      message: `Backup created successfully! File saved at: ${backupPath}`,
      path: backupPath,
      fileName: backupFileName,
      size: backupStats.size
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
    } catch (e) {
      console.warn('[Local Restore] DB close failed (may already be closed):', e.message);
    }
    
    // Create backup of current database
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupCurrentPath);

    }
    
    // Copy backup file to current database location
    fs.copyFileSync(filePath, dbPath);
    // Reinitialize database connection
    try {
      // With the modular database, no cache clearing needed
      const dbModule = require('../database/index.cjs');
      Object.assign(db, dbModule(dbPath));
      
      // Test connection by running a simple query
      const testResult = db.getProducts();

    } catch (e) {
      console.error('[Local Restore] DB re-initialization or test query failed:', e);
      // Rollback if DB cannot be opened
      if (fs.existsSync(backupCurrentPath)) {
        fs.copyFileSync(backupCurrentPath, dbPath);
        const dbModule = require('../database/index.cjs');
        Object.assign(db, dbModule(dbPath));
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

    } catch (e) {
      console.warn('[Cloud Restore] DB close failed (may already be closed):', e.message);
    }
    // Create backup of current database
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupCurrentPath);

    }
    // Restore from backup
    fs.copyFileSync(filePath, dbPath);
    // Reinitialize database connection
    let dbModule;
    try {
      // With the modular database, no cache clearing needed
      dbModule = require('../database/index.cjs');
      Object.assign(db, dbModule(dbPath));
      // Test connection by running a simple query
      const testResult = db.getProducts();
    } catch (e) {
      console.error('[Restore] DB re-initialization or test query failed:', e);
      // Rollback if DB cannot be opened
      if (fs.existsSync(backupCurrentPath)) {
        fs.copyFileSync(backupCurrentPath, dbPath);
        dbModule = require('../database/index.cjs');
        Object.assign(db, dbModule(dbPath));
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

// Buying History Return handlers
ipcMain.handle('returnBuyingHistoryEntry', async (event, entryId) => {
  try {
    const result = db.returnBuyingHistoryEntry(entryId);
    await runAutoBackupAfterSale();
    return { success: true, returnedAmount: result.returnedAmount };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('returnBuyingHistoryItem', async (event, entryId, itemId, quantity = null) => {
  try {
    const result = db.returnBuyingHistoryItem(entryId, itemId, quantity);
    await runAutoBackupAfterSale();
    return { success: true, returnedAmount: result.returnedAmount, newTotal: result.newTotal };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// Simplified return functions for buying history
ipcMain.handle('returnBuyingHistoryEntrySimplified', async (event, entryId) => {
  try {
    const result = db.returnBuyingHistoryEntrySimplified(entryId);
    await runAutoBackupAfterSale();
    return result;
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('returnBuyingHistoryItemSimplified', async (event, entryId, itemId) => {
  try {
    const result = db.returnBuyingHistoryItemSimplified(entryId, itemId);
    await runAutoBackupAfterSale();
    return result;
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

ipcMain.handle('restartApp', async () => {
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 500);
  return { success: true };
});

// New Cloud Backup Service IPC Handlers
ipcMain.handle('setCloudBackupSession', async (event, sessionData) => {
  try {
    const result = await cloudBackupService.setSession(sessionData);
    return { success: result };
  } catch (error) {
    console.error('[IPC] setCloudBackupSession error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('clearCloudBackupSession', async () => {
  try {
    await cloudBackupService.clearSession();
    return { success: true };
  } catch (error) {
    console.error('[IPC] clearCloudBackupSession error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('setAutoBackup', async (event, enabled) => {
  try {
    cloudBackupService.setAutoBackup(enabled);
    // Save setting persistently
    await settings.set('autoBackup', enabled);
    return { success: true };
  } catch (error) {
    console.error('[IPC] setAutoBackup error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('createCloudBackup', async (event, description = '') => {
  try {
    const dbPath = getDatabasePath();
    const result = await cloudBackupService.createBackup(dbPath, description);
    return result;
  } catch (error) {
    console.error('[IPC] createCloudBackup error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('downloadCloudBackup', async (event, backupId) => {
  try {
    const os = require('os');
    const documentsPath = path.join(os.homedir(), 'Documents');
    const restoreDir = path.join(documentsPath, 'Mobile Roma BackUp', 'Downloaded');
    
    // Create restore directory if it doesn't exist
    if (!fs.existsSync(restoreDir)) {
      fs.mkdirSync(restoreDir, { recursive: true });
    }
    
    const downloadPath = path.join(restoreDir, `backup-${backupId}-${Date.now()}.sqlite`);
    const result = await cloudBackupService.downloadBackup(backupId, downloadPath);
    
    if (result.success) {
      result.downloadPath = downloadPath;
    }
    
    return result;
  } catch (error) {
    console.error('[IPC] downloadCloudBackup error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('listCloudBackups', async () => {
  try {
    const result = await cloudBackupService.listBackups();
    return result;
  } catch (error) {
    console.error('[IPC] listCloudBackups error:', error);
    return { success: false, message: error.message, backups: [] };
  }
});

ipcMain.handle('deleteCloudBackup', async (event, backupId) => {
  try {
    const result = await cloudBackupService.deleteBackup(backupId);
    return result;
  } catch (error) {
    console.error('[IPC] deleteCloudBackup error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('restoreFromFile', async (event, filePath) => {
  const dbPath = getDatabasePath();
  const backupCurrentPath = dbPath + '.bak';
  
  try {

    if (!fs.existsSync(filePath)) {
      console.error('[IPC] Backup file not found:', filePath);
      return { success: false, message: 'Backup file not found' };
    }
    
    // Verify backup file is valid SQLite by checking header
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    
    if (!buffer.toString('utf8', 0, 15).startsWith('SQLite format 3')) {
      console.error('[IPC] Invalid SQLite file:', filePath);
      return { success: false, message: 'Selected file is not a valid SQLite database backup' };
    }
    
    // Backup current database
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupCurrentPath);
    }
    
    // Replace database with backup
    fs.copyFileSync(filePath, dbPath);

    // Replace database with backup
    fs.copyFileSync(filePath, dbPath);

    // Reinitialize database connection
    try {
      // With the modular database, no cache clearing needed
      const dbModule = require('../database/index.cjs');
      Object.assign(db, dbModule(dbPath));
      
      // Test connection by running a simple query
      const testResult = db.getProducts();

    } catch (e) {
      console.error('[IPC] DB re-initialization or test query failed:', e);
      // Rollback if DB cannot be opened
      if (fs.existsSync(backupCurrentPath)) {
        fs.copyFileSync(backupCurrentPath, dbPath);
        const dbModule = require('../database/index.cjs');
        Object.assign(db, dbModule(dbPath));
      }
      throw new Error('Restored DB is invalid or corrupt. Rolled back to previous database.');
    }
    
    return { 
      success: true, 
      message: 'Database restored successfully. Please restart the application to ensure all changes take effect.',
      requiresRestart: true
    };
  } catch (e) {
    console.error('[IPC] Restore failed:', e);
    return { success: false, message: e.message };
  }
});

// Trigger cloud backup manually
ipcMain.handle('triggerCloudBackup', async () => {
  try {
    const result = await autoBackupAfterChange('manual');
    return result;
  } catch (error) {
    console.error('[IPC] triggerCloudBackup error:', error);
    return { success: false, message: error.message };
  }
});

// Local backup creation - maps to the existing createBackup handler
ipcMain.handle('createLocalBackup', async () => {
  try {
    const os = require('os');
    const documentsPath = path.join(os.homedir(), 'Documents');
    const backupDir = path.join(documentsPath, 'Mobile Roma BackUp');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create backup filename with timestamp
    const now = new Date();
    const nowPrefix = now.toISOString().slice(0, 19).replace(/:/g, '-');
    const backupFileName = `phone-shop-backup-${nowPrefix}.sqlite`;
    const backupPath = path.join(backupDir, backupFileName);
    
    // Copy database file
    const dbPath = getDatabasePath();
    
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Source database not found at: ${dbPath}`);
    }
    
    fs.copyFileSync(dbPath, backupPath);
    
    // Verify the backup file was created and is readable
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file was not created at: ${backupPath}`);
    }
    
    const backupStats = fs.statSync(backupPath);
    
    // Validate SQLite file
    try {
      const testBuffer = fs.readFileSync(backupPath, { encoding: null });
      if (testBuffer.length < 16 || !testBuffer.toString('utf8', 0, 15).startsWith('SQLite format 3')) {
        throw new Error('Backup file is not a valid SQLite database');
      }
    } catch (validationError) {
      console.error('Local backup file validation failed:', validationError);
      throw new Error(`Backup created but validation failed: ${validationError.message}`);
    }
    
    // Log backup in database
    if (db && db.logBackup) {
      db.logBackup({
        file_name: backupFileName,
        encrypted: false,
        log: `Local backup created at ${backupPath}`
      });
    }
    
    return {
      success: true,
      message: `Local backup created successfully! File saved at: ${backupPath}`,
      path: backupPath,
      fileName: backupFileName,
      size: backupStats.size
    };
  } catch (error) {
    console.error('[IPC] createLocalBackup error:', error);
    return { success: false, message: error.message };
  }
});

// Open backup folder in system explorer
ipcMain.handle('openBackupFolder', async () => {
  try {
    const { shell } = require('electron');
    const os = require('os');
    const documentsPath = path.join(os.homedir(), 'Documents');
    const backupDir = path.join(documentsPath, 'Mobile Roma BackUp');
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Open the backup directory in system explorer
    await shell.openPath(backupDir);
    
    return { success: true, message: 'Backup folder opened successfully' };
  } catch (error) {
    console.error('[IPC] openBackupFolder error:', error);
    return { success: false, message: error.message };
  }
});

// Initialize auto backup settings on startup
initializeAutoBackup();

ipcMain.handle('getAutoBackup', async () => {
  try {
    const autoBackupEnabled = await settings.get('autoBackup');
    const enabled = autoBackupEnabled !== undefined ? autoBackupEnabled : true;
    return { success: true, enabled };
  } catch (error) {
    console.error('[IPC] getAutoBackup error:', error);
    return { success: false, message: error.message };
  }
});

// IPC handler for repairing database
ipcMain.handle('repairProductIds', async () => {
  try {
    if (db && db.repairProductIds) {
      const repairedCount = db.repairProductIds();
      return { success: true, repairedCount };
    } else {
      return { success: false, message: 'Database or repair function not available' };
    }
  } catch (e) {
    console.error('❌ repairProductIds error:', e);
    return { success: false, message: e.message };
  }
});

// Exchange rate handlers
ipcMain.handle('setExchangeRate', async (event, fromCurrency, toCurrency, rate) => {
  try {
    if (db && db.setExchangeRate) {
      const result = db.setExchangeRate(fromCurrency, toCurrency, rate);
      return result;
    } else {
      console.error('❌ Database or setExchangeRate function not available');
      return null;
    }
  } catch (e) {
    console.error('❌ setExchangeRate error:', e);
    return null;
  }
});

ipcMain.handle('getExchangeRate', async (event, fromCurrency, toCurrency) => {
  try {
    if (db && db.getExchangeRate) {
      const rate = db.getExchangeRate(fromCurrency, toCurrency);
      return rate;
    } else {
      console.error('❌ Database or getExchangeRate function not available');
      return null;
    }
  } catch (e) {
    console.error('❌ getExchangeRate error:', e);
    return null;
  }
});
