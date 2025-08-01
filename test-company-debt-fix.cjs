const db = require('./database/index.cjs')('database/shop.sqlite');

console.log('Testing company debt payment fix...\n');

// Get all company debts to see current state
const allDebts = db.getCompanyDebts();
console.log('All company debts:');
allDebts.forEach(debt => {
  console.log(`ID: ${debt.id}, Company: ${debt.company_name}, Amount: ${debt.amount} ${debt.currency}, Paid: ${debt.paid_at ? 'YES' : 'NO'}`);
  if (debt.payment_usd_amount > 0 || debt.payment_iqd_amount > 0) {
    console.log(`  Partial payments: USD ${debt.payment_usd_amount || 0}, IQD ${debt.payment_iqd_amount || 0}`);
  }
});

// Find any unpaid IQD debts
const unpaidIQDDebts = allDebts.filter(d => !d.paid_at && d.currency === 'IQD');
if (unpaidIQDDebts.length > 0) {
  console.log(`\nFound ${unpaidIQDDebts.length} unpaid IQD debt(s). Testing payment logic...`);
  
  const testDebt = unpaidIQDDebts[0];
  console.log(`\nTesting debt: ${testDebt.company_name} - ${testDebt.amount} IQD`);
  
  // Simulate full payment in IQD
  const paymentResult = db.markCompanyDebtPaid(testDebt.id, {
    payment_iqd_amount: testDebt.amount,
    payment_usd_amount: 0,
    payment_currency_used: 'IQD'
  });
  
  console.log('Payment result:', paymentResult);
  
  // Check the debt status after payment
  const updatedDebt = allDebts.find(d => d.id === testDebt.id);
  const refreshedDebt = db.getCompanyDebts().find(d => d.id === testDebt.id);
  console.log('Debt after payment:', refreshedDebt);
} else {
  console.log('\nNo unpaid IQD debts found to test.');
}

db.close();
