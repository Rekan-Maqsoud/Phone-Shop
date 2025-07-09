const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'database', 'shop.sqlite'));

try {
  const settings = db.prepare("SELECT key, value FROM settings WHERE key IN ('balanceUSD', 'balanceIQD')").all();
  const balancesTable = db.prepare('SELECT * FROM balances WHERE id = 1').get();
  
  console.log('Settings table balances:', settings);
  console.log('Balances table:', balancesTable);
  
  // Check if they match
  const settingsUSD = parseFloat(settings.find(s => s.key === 'balanceUSD')?.value || '0');
  const settingsIQD = parseFloat(settings.find(s => s.key === 'balanceIQD')?.value || '0');
  
  console.log('\nComparison:');
  console.log('USD - Settings:', settingsUSD, '| Balances table:', balancesTable.usd_balance, '| Match:', settingsUSD === balancesTable.usd_balance);
  console.log('IQD - Settings:', settingsIQD, '| Balances table:', balancesTable.iqd_balance, '| Match:', settingsIQD === balancesTable.iqd_balance);
  
} finally {
  db.close();
}
