// Utility to fix missing customer debt records for debt sales
const db = require('./database/index.cjs')('./database/shop.sqlite');

console.log('=== CHECKING FOR MISSING CUSTOMER DEBT RECORDS ===');

// Get all debt sales
const debtSales = db.getSales().filter(sale => sale.is_debt);
console.log(`Found ${debtSales.length} debt sales`);

// Get all customer debts
const customerDebts = db.getCustomerDebts();
console.log(`Found ${customerDebts.length} customer debt records`);

const missingDebtRecords = [];

debtSales.forEach(sale => {
  const hasDebtRecord = customerDebts.find(debt => debt.sale_id === sale.id);
  if (!hasDebtRecord) {
    missingDebtRecords.push(sale);
    console.log(`❌ Missing debt record for sale ${sale.id}: ${sale.customer_name}, ${sale.currency} ${sale.total}`);
  } else {
    console.log(`✅ Debt record exists for sale ${sale.id}`);
  }
});

if (missingDebtRecords.length > 0) {
  console.log(`\n=== FIXING ${missingDebtRecords.length} MISSING DEBT RECORDS ===`);
  
  missingDebtRecords.forEach(sale => {
    try {
      const result = db.addCustomerDebt({
        customer_name: sale.customer_name,
        amount: sale.total,
        description: `Auto-created debt record for sale #${sale.id}`,
        currency: sale.currency,
        sale_id: sale.id
      });
      console.log(`✅ Created debt record for sale ${sale.id}: ${result.lastInsertRowid}`);
    } catch (error) {
      console.error(`❌ Failed to create debt record for sale ${sale.id}:`, error.message);
    }
  });
  
  console.log('\n=== VERIFICATION ===');
  const updatedCustomerDebts = db.getCustomerDebts();
  console.log(`Customer debt records after fix: ${updatedCustomerDebts.length}`);
  
} else {
  console.log('\n✅ All debt sales have corresponding debt records!');
}

console.log('\n=== SUMMARY ===');
console.log(`Debt sales: ${debtSales.length}`);
console.log(`Customer debt records: ${customerDebts.length}`);
console.log(`Missing records found: ${missingDebtRecords.length}`);
