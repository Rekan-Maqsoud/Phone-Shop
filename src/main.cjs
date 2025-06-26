// Electron main process
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('../database/db.cjs');
const fs = require('fs');
const { dialog } = require('electron');
const bcrypt = require('bcryptjs');

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true, // Launch in fullscreen
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadURL(
    app.isPackaged
      ? `file://${path.join(__dirname, '../dist/index.html')}`
      : 'http://localhost:5173/'
  );
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// CSV generation function
function toCSV(rows, headers) {
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

// IPC handlers
// Product CRUD
ipcMain.handle('getProducts', async () => {
  return db.getProducts();
});
ipcMain.handle('addProduct', async (event, product) => {
  try {
    db.addProduct(product);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});
ipcMain.handle('editProduct', async (event, product) => {
  try {
    db.updateProduct(product);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});
ipcMain.handle('deleteProduct', async (event, id) => {
  try {
    db.deleteProduct(id);
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
  console.log('RESET HANDLER LOADED');
  db.db.prepare('DELETE FROM sale_items;').run();
  db.db.prepare('DELETE FROM sales;').run();
  db.db.prepare('DELETE FROM products;').run();
  // Removed: Insert 50 sample phones
  return { success: true };
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
    const items = db.db.prepare(`
      SELECT si.id, si.quantity, si.price, p.name, p.barcode
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(saleId);
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
    console.error('DEBUG: getSales error', e);
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
    // Decrement stock for each product by its quantity
    if (Array.isArray(sale.items)) {
      for (const item of sale.items) {
        const qty = Number(item.quantity) || 1;
        if (!item.isReturn) {
          // Get current stock
          let prod = null;
          if (db.getProductById) {
            prod = db.getProductById(item.product_id);
          } else {
            prod = db.db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
          }
          if (prod && typeof prod.stock === 'number') {
            const newStock = prod.stock - qty;
            db.updateProduct({ ...prod, stock: newStock });
          }
        } else {
          // If return, increase stock
          let prod = null;
          if (db.getProductById) {
            prod = db.getProductById(item.product_id);
          } else {
            prod = db.db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
          }
          if (prod && typeof prod.stock === 'number') {
            const newStock = prod.stock + qty;
            db.updateProduct({ ...prod, stock: newStock });
          }
        }
      }
    }
    const saleId = db.saveSale(sale);
    return { success: true, saleId };
  } catch (e) {
    return { success: false, message: e.message };
  }
});
// Debt handlers
ipcMain.handle('addDebt', async (event, { sale_id, customer_name }) => {
  return db.addDebt({ sale_id, customer_name });
});
ipcMain.handle('getDebts', async () => {
  return db.getDebts();
});
ipcMain.handle('markDebtPaid', async (event, id) => {
  return db.markDebtPaid(id);
});
