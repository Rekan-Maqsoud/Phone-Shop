const db = require('./database/index.cjs')('./database/shop.sqlite');

console.log('=== DEBT SALES (from sales table) ===');
const debtSales = db.getSales().filter(sale => sale.is_debt);
console.log('Found debt sales:', debtSales.length);
debtSales.forEach(sale => {
  console.log(`Sale ID ${sale.id}: ${sale.customer_name}, $${sale.total} ${sale.currency}, is_debt: ${sale.is_debt}`);
});

console.log('\n=== CUSTOMER DEBTS (from customer_debts table) ===');
const customerDebts = db.getCustomerDebts();
console.log('Found customer debts:', customerDebts.length);
customerDebts.forEach(debt => {
  console.log(`Debt ID ${debt.id}: Sale ID ${debt.sale_id}, ${debt.customer_name}, Amount: ${debt.amount}, Paid: ${debt.paid}, Paid At: ${debt.paid_at}`);
});

console.log('\n=== MATCHING LOGIC TEST ===');
debtSales.forEach(sale => {
  const matchingDebt = customerDebts.find(debt => debt.sale_id === sale.id);
  const isPaid = matchingDebt && (matchingDebt.paid_at || matchingDebt.paid);
  console.log(`Sale ${sale.id} (${sale.currency} ${sale.total}): ${matchingDebt ? 'Has debt record' : 'NO DEBT RECORD'}, Paid: ${isPaid}`);
});
