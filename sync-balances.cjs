const path = require('path');
const Database = require('better-sqlite3');

// Open database directly
const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const db = new Database(dbPath);

async function syncBalances() {
  console.log('=== BALANCE SYNC AND ANALYSIS ===\n');
  
  // Current state
  console.log('1. CURRENT STATE:');
  const settingsBalances = db.prepare("SELECT key, value FROM settings WHERE key IN ('balanceUSD', 'balanceIQD')").all();
  console.log('Settings balances:', settingsBalances);
  
  const balancesTable = db.prepare("SELECT * FROM balances WHERE id = 1").get();
  console.log('Balances table:', balancesTable);
  
  // Calculate expected balances from all transactions
  console.log('\n2. CALCULATING EXPECTED BALANCES FROM TRANSACTIONS:');
  const transactions = db.prepare("SELECT * FROM transactions ORDER BY created_at").all();
  
  let expectedUSD = 0;
  let expectedIQD = 0;
  
  console.log('Processing transactions:');
  transactions.forEach((trans, index) => {
    const usdAmount = parseFloat(trans.amount_usd) || 0;
    const iqdAmount = parseFloat(trans.amount_iqd) || 0;
    
    // Add money coming in
    if (['sale', 'customer_debt_payment', 'company_debt_payment', 'buying_history_return', 'cash_entry_in'].includes(trans.type)) {
      expectedUSD += usdAmount;
      expectedIQD += iqdAmount;
      console.log(`  ${index + 1}. ${trans.type}: +$${usdAmount} USD, +${iqdAmount} IQD`);
    }
    // Subtract money going out
    else if (['purchase', 'direct_purchase', 'cash_entry_out', 'expense'].includes(trans.type)) {
      expectedUSD -= usdAmount;
      expectedIQD -= iqdAmount;
      console.log(`  ${index + 1}. ${trans.type}: -$${usdAmount} USD, -${iqdAmount} IQD`);
    }
    else {
      console.log(`  ${index + 1}. ${trans.type}: $${usdAmount} USD, ${iqdAmount} IQD (unknown direction)`);
    }
  });
  
  console.log(`\nExpected final balances:`);
  console.log(`USD: $${expectedUSD}`);
  console.log(`IQD: ${expectedIQD}`);
  
  // Update both balance systems to match calculated values
  console.log('\n3. UPDATING BOTH BALANCE SYSTEMS:');
  
  try {
    // Update settings table
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('balanceUSD', ?)").run(expectedUSD.toString());
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('balanceIQD', ?)").run(expectedIQD.toString());
    console.log('✓ Updated settings table');
    
    // Update balances table
    db.prepare("UPDATE balances SET usd_balance = ?, iqd_balance = ?, last_updated = CURRENT_TIMESTAMP WHERE id = 1").run(expectedUSD, expectedIQD);
    console.log('✓ Updated balances table');
    
    // Verify updates
    console.log('\n4. VERIFICATION:');
    const newSettingsBalances = db.prepare("SELECT key, value FROM settings WHERE key IN ('balanceUSD', 'balanceIQD')").all();
    console.log('New settings balances:', newSettingsBalances);
    
    const newBalancesTable = db.prepare("SELECT * FROM balances WHERE id = 1").get();
    console.log('New balances table:', newBalancesTable);
    
  } catch (error) {
    console.error('Error updating balances:', error);
  } finally {
    db.close();
  }
}

syncBalances().catch(console.error);
