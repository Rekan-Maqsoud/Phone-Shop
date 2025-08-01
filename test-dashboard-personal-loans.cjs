const createDatabase = require('./database/index.cjs');
const dbPath = 'database/shop.sqlite';

console.log('=== Testing Personal Loans Given in Daily Dashboard ===\n');

async function testPersonalLoansDashboard() {
  const db = createDatabase(dbPath);
  
  try {
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`Testing for date: ${today}`);
    
    // Check existing personal loans today
    const existingLoans = db.getDatabase().prepare(
      'SELECT * FROM personal_loans WHERE date(created_at) = date(?) ORDER BY created_at DESC'
    ).all(today);
    
    console.log(`\nExisting personal loans today: ${existingLoans.length}`);
    if (existingLoans.length > 0) {
      existingLoans.forEach((loan, index) => {
        console.log(`  ${index + 1}. ${loan.person_name}: ${loan.amount} ${loan.currency} (${loan.description || 'No description'})`);
      });
    }
    
    // Test adding a new personal loan
    console.log('\n--- Adding a test personal loan ---');
    const testLoan = {
      personName: 'John Doe',
      amount: 100,
      currency: 'USD',
      description: 'Test loan for dashboard verification'
    };
    
    const loanId = db.addPersonalLoan(
      testLoan.personName,
      testLoan.amount,
      testLoan.currency,
      testLoan.description
    );
    
    console.log(`✓ Added personal loan: ID ${loanId}, ${testLoan.personName}, ${testLoan.amount} ${testLoan.currency}`);
    
    // Get transactions to check if the loan shows up
    const transactions = db.getDatabase().prepare(
      'SELECT * FROM transactions WHERE date(created_at) = date(?) AND type = ? ORDER BY created_at DESC'
    ).all(today, 'personal_loan_given');
    
    console.log(`\nPersonal loan transactions today: ${transactions.length}`);
    if (transactions.length > 0) {
      transactions.forEach((transaction, index) => {
        console.log(`  ${index + 1}. ${transaction.amount} ${transaction.currency} - ${transaction.description}`);
      });
    }
    
    // Calculate today's spending metrics (simplified)
    const personalLoanPaymentsUSD = transactions
      .filter(t => t.currency === 'USD')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const personalLoanPaymentsIQD = transactions
      .filter(t => t.currency === 'IQD')
      .reduce((sum, t) => sum + t.amount, 0);
    
    console.log(`\n=== Dashboard Impact ===`);
    console.log(`Personal Loans Given (USD): $${personalLoanPaymentsUSD}`);
    console.log(`Personal Loans Given (IQD): ${personalLoanPaymentsIQD} IQD`);
    
    if (personalLoanPaymentsUSD > 0 || personalLoanPaymentsIQD > 0) {
      console.log('✓ Personal loans given should now appear in the dashboard as outflows!');
    } else {
      console.log('⚠ No personal loan outflows detected for today');
    }
    
    // Clean up test loan (optional)
    console.log('\n--- Cleaning up test data ---');
    db.getDatabase().prepare('DELETE FROM personal_loans WHERE id = ?').run(loanId);
    db.getDatabase().prepare('DELETE FROM transactions WHERE id = (SELECT MAX(id) FROM transactions WHERE type = ?)').run('personal_loan_given');
    console.log('✓ Test data cleaned up');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPersonalLoansDashboard();
