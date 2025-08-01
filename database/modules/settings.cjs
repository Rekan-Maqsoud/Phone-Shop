// Settings and configuration management functions
function getSetting(db, key) {
  const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return result ? result.value : null;
}
function setSetting(db, key, value) {
  return db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run(key, value);
}
function deleteSetting(db, key) {
  return db.prepare('DELETE FROM settings WHERE key = ?').run(key);
}
function getAllSettings(db) {
  return db.prepare('SELECT * FROM settings').all();
}
// Currency exchange rates
function getExchangeRate(db, fromCurrency, toCurrency) {
  const key = `exchange_${fromCurrency}_${toCurrency}`;
  const rate = getSetting(db, key);
  if (!rate) {
    // If rate doesn't exist, try to calculate from inverse rate
    const inverseKey = `exchange_${toCurrency}_${fromCurrency}`;
    const inverseRate = getSetting(db, inverseKey);
    if (inverseRate) {
      return 1 / parseFloat(inverseRate);
    }
    // Get current rate from database - if not found, use working default
    const currentUSDToIQD = getSetting(db, 'exchange_USD_IQD');
    const currentIQDToUSD = getSetting(db, 'exchange_IQD_USD');
    
    if (fromCurrency === 'USD' && toCurrency === 'IQD') {
      if (currentUSDToIQD) {
        return parseFloat(currentUSDToIQD);
      }
      console.log('Using default USD to IQD rate: 1400');
      return 1400; // Working default that matches frontend
    }
    if (fromCurrency === 'IQD' && toCurrency === 'USD') {
      if (currentIQDToUSD) {
        return parseFloat(currentIQDToUSD);
      }
      console.log('Using default IQD to USD rate: 1/1400');
      return (1/1400); // Working default that matches frontend
    }
  }
  return rate ? parseFloat(rate) : 1;
}
function setExchangeRate(db, fromCurrency, toCurrency, rate) {
  const key = `exchange_${fromCurrency}_${toCurrency}`;
  // Use a transaction to ensure both rates are saved atomically
  const transaction = db.transaction(() => {
    // Save the direct rate
    setSetting(db, key, rate.toString());
    // Save the inverse rate for the opposite direction
    const inverseKey = `exchange_${toCurrency}_${fromCurrency}`;
    const inverseRate = 1 / rate;
    setSetting(db, inverseKey, inverseRate.toString());
  });
  return transaction();
}
// App configuration helpers
function getDefaultCurrency(db) {
  return getSetting(db, 'default_currency') || 'IQD';
}
function setDefaultCurrency(db, currency) {
  return setSetting(db, 'default_currency', currency);
}
function getStoreSettings(db) {
  return {
    storeName: getSetting(db, 'store_name') || 'Mobile Roma',
    storeAddress: getSetting(db, 'store_address') || '',
    storePhone: getSetting(db, 'store_phone') || '',
    defaultCurrency: getDefaultCurrency(db),
    lowStockThreshold: parseInt(getSetting(db, 'low_stock_threshold') || '5'),
    enableNotifications: getSetting(db, 'enable_notifications') === 'true'
  };
}
function getBalances(db) {
  const usdBalance = getSetting(db, 'balanceUSD');
  const iqdBalance = getSetting(db, 'balanceIQD');
  return {
    usd_balance: usdBalance ? parseFloat(usdBalance) : 0,
    iqd_balance: iqdBalance ? parseFloat(iqdBalance) : 0
  };
}

function getTotalProfit(db) {
  const usdProfit = getSetting(db, 'totalProfitUSD');
  const iqdProfit = getSetting(db, 'totalProfitIQD');
  return {
    usd_profit: usdProfit ? parseFloat(usdProfit) : 0,
    iqd_profit: iqdProfit ? parseFloat(iqdProfit) : 0
  };
}

function updateTotalProfit(db, currency, amount) {
  const profitKey = currency === 'USD' ? 'totalProfitUSD' : 'totalProfitIQD';
  const currentProfit = getSetting(db, profitKey) || '0';
  const newProfit = parseFloat(currentProfit) + amount;
  setSetting(db, profitKey, newProfit.toString());
}
function updateStoreSettings(db, settings) {
  const updates = [];
  if (settings.storeName !== undefined) {
    updates.push(() => setSetting(db, 'store_name', settings.storeName));
  }
  if (settings.storeAddress !== undefined) {
    updates.push(() => setSetting(db, 'store_address', settings.storeAddress));
  }
  if (settings.storePhone !== undefined) {
    updates.push(() => setSetting(db, 'store_phone', settings.storePhone));
  }
  if (settings.defaultCurrency !== undefined) {
    updates.push(() => setDefaultCurrency(db, settings.defaultCurrency));
  }
  if (settings.lowStockThreshold !== undefined) {
    updates.push(() => setSetting(db, 'low_stock_threshold', settings.lowStockThreshold.toString()));
  }
  if (settings.enableNotifications !== undefined) {
    updates.push(() => setSetting(db, 'enable_notifications', settings.enableNotifications.toString()));
  }
  const transaction = db.transaction(() => {
    updates.forEach(update => update());
  });
  return transaction();
}
// Backup and restore helpers
function createBackup(db, backupPath) {
  const backup = db.backup(backupPath);
  return new Promise((resolve, reject) => {
    backup.complete().then(() => {
      resolve(backupPath);
    }).catch(reject);
  });
}
function restoreBackup(db, backupPath) {
  const restore = db.backup(backupPath, { restore: true });
  return new Promise((resolve, reject) => {
    restore.complete().then(() => {
      resolve(true);
    }).catch(reject);
  });
}
// Database maintenance
function optimizeDatabase(db) {
  db.exec('VACUUM');
  db.exec('ANALYZE');
  return true;
}
function getDatabaseInfo(db) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const info = {};
  tables.forEach(table => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    info[table.name] = count.count;
  });
  return {
    tables: info,
    totalTables: tables.length,
    dbSize: db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get()
  };
}
function updateBalance(db, currency, amount) {
  // Update both balance systems simultaneously
  const balanceKey = currency === 'USD' ? 'balanceUSD' : 'balanceIQD';
  const balanceColumn = currency === 'USD' ? 'usd_balance' : 'iqd_balance';
  // Get current balance before update
  const currentBalance = getSetting(db, balanceKey);
  const transaction = db.transaction(() => {
    // Update settings table
    db.prepare(`
      UPDATE settings 
      SET value = CAST((COALESCE(CAST(value AS REAL), 0) + ?) AS TEXT) 
      WHERE key = ?
    `).run(amount, balanceKey);
    // Update balances table
    db.prepare(`
      UPDATE balances 
      SET ${balanceColumn} = ${balanceColumn} + ?, 
          last_updated = CURRENT_TIMESTAMP 
      WHERE id = 1
    `).run(amount);
  });
  const result = transaction();
  // Get new balance after update
  const newBalance = getSetting(db, balanceKey);
  return result;
}
function setBalance(db, currency, amount) {
  // Set both balance systems to specific amounts
  const balanceKey = currency === 'USD' ? 'balanceUSD' : 'balanceIQD';
  const balanceColumn = currency === 'USD' ? 'usd_balance' : 'iqd_balance';
  const transaction = db.transaction(() => {
    // Update settings table
    setSetting(db, balanceKey, amount.toString());
    // Update balances table
    db.prepare(`
      UPDATE balances 
      SET ${balanceColumn} = ?, 
          last_updated = CURRENT_TIMESTAMP 
      WHERE id = 1
    `).run(amount);
  });
  return transaction();
}
module.exports = {
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
  getTotalProfit,
  updateTotalProfit,
  updateStoreSettings,
  createBackup,
  restoreBackup,
  optimizeDatabase,
  getDatabaseInfo,
  updateBalance,
  setBalance
};
