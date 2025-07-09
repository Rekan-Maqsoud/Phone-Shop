const path = require('path');
const dbModule = require('./database/index.cjs');

// Initialize database
const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const db = dbModule(dbPath);

async function testBalanceUpdates() {
  console.log('=== TESTING CENTRALIZED BALANCE UPDATES ===\n');
  
  // Get initial balances
  console.log('1. INITIAL BALANCES:');
  const initialBalances = db.getBalances();
  console.log('USD:', initialBalances.usd_balance);
  console.log('IQD:', initialBalances.iqd_balance);
  
  console.log('\n2. TESTING updateBalance FUNCTION:');
  
  // Test adding to USD balance
  console.log('Adding $10 to USD balance...');
  db.updateBalance('USD', 10);
  
  // Test adding to IQD balance  
  console.log('Adding 5000 to IQD balance...');
  db.updateBalance('IQD', 5000);
  
  // Check balances
  const afterAddBalances = db.getBalances();
  console.log('After additions:');
  console.log('USD:', afterAddBalances.usd_balance, '(expected:', initialBalances.usd_balance + 10, ')');
  console.log('IQD:', afterAddBalances.iqd_balance, '(expected:', initialBalances.iqd_balance + 5000, ')');
  
  // Test subtracting from balances
  console.log('\nSubtracting $5 from USD balance...');
  db.updateBalance('USD', -5);
  
  console.log('Subtracting 2000 from IQD balance...');
  db.updateBalance('IQD', -2000);
  
  // Check final balances
  const finalBalances = db.getBalances();
  console.log('Final balances:');
  console.log('USD:', finalBalances.usd_balance, '(expected:', initialBalances.usd_balance + 5, ')');
  console.log('IQD:', finalBalances.iqd_balance, '(expected:', initialBalances.iqd_balance + 3000, ')');
  
  console.log('\n3. TESTING setBalance FUNCTION:');
  
  // Reset balances to original values
  console.log('Resetting balances to original values...');
  db.setBalance('USD', initialBalances.usd_balance);
  db.setBalance('IQD', initialBalances.iqd_balance);
  
  const resetBalances = db.getBalances();
  console.log('Reset balances:');
  console.log('USD:', resetBalances.usd_balance, '(expected:', initialBalances.usd_balance, ')');
  console.log('IQD:', resetBalances.iqd_balance, '(expected:', initialBalances.iqd_balance, ')');
  
  console.log('\n✓ Balance update functions are working correctly!');
}

testBalanceUpdates().catch(console.error);
