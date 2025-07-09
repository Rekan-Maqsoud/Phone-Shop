const path = require('path');
const dbModule = require('./database/index.cjs');

// Initialize database
const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const db = dbModule(dbPath);

async function checkAndInitializeBalances() {
  console.log('Checking balance settings...\n');
  
  // Check current balance settings
  const currentUSD = db.getSetting('balanceUSD');
  const currentIQD = db.getSetting('balanceIQD');
  
  console.log('Current USD balance:', currentUSD);
  console.log('Current IQD balance:', currentIQD);
  
  // Initialize if not set
  if (!currentUSD) {
    console.log('Initializing USD balance to 0');
    db.setSetting('balanceUSD', '0');
  }
  
  if (!currentIQD) {
    console.log('Initializing IQD balance to 0');
    db.setSetting('balanceIQD', '0');
  }
  
  // Test getBalances function
  console.log('\nTesting getBalances function:');
  const balances = db.getBalances();
  console.log('Balances:', balances);
  
  console.log('\nBalance check completed!');
}

checkAndInitializeBalances().catch(console.error);
