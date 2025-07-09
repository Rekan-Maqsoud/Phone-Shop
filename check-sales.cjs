const path = require('path');
const dbModule = require('./database/index.cjs');

// Initialize database
const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const db = dbModule(dbPath);

async function checkSales() {
  console.log('Checking recent sales...\n');
  
  // Check recent sales
  const sales = db.getSales().slice(-10);
  console.log('Recent sales:');
  console.log(JSON.stringify(sales, null, 2));
  
  // Check specific sales that should affect balance
  const nonDebtSales = sales.filter(sale => !sale.is_debt);
  console.log('\nNon-debt sales (should affect balance):');
  console.log(JSON.stringify(nonDebtSales, null, 2));
  
  // Calculate expected balance from sales
  let expectedUSD = 0;
  let expectedIQD = 0;
  
  nonDebtSales.forEach(sale => {
    if (sale.paid_amount_usd) {
      expectedUSD += parseFloat(sale.paid_amount_usd);
    }
    if (sale.paid_amount_iqd) {
      expectedIQD += parseFloat(sale.paid_amount_iqd);
    }
  });
  
  console.log(`\nExpected balances from sales:`);
  console.log(`USD: ${expectedUSD}`);
  console.log(`IQD: ${expectedIQD}`);
  
  // Check current balances
  const balances = db.getBalances();
  console.log(`\nActual balances:`);
  console.log(`USD: ${balances.usd_balance}`);
  console.log(`IQD: ${balances.iqd_balance}`);
}

checkSales().catch(console.error);
