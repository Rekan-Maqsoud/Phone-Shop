const path = require('path');
const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const createDatabase = require('./database/index.cjs');

function debugPersonalLoanTransactions() {
  console.log('🔍 Debug Personal Loan Transactions');
  console.log('===================================');
  
  try {
    const db = createDatabase(dbPath);
    const today = new Date().toISOString().split('T')[0];
    
    // Check today's personal loan transactions
    console.log('\n📊 Checking today\'s personal loan transactions...');
    const personalLoanTransactions = db.getDatabase().prepare(`
      SELECT type, amount_usd, amount_iqd, description, created_at, reference_type
      FROM transactions 
      WHERE date(created_at) = date(?) AND type = ?
      ORDER BY created_at DESC
    `).all(today, 'personal_loan');
    
    console.log(`Found ${personalLoanTransactions.length} personal loan transactions today:`);
    personalLoanTransactions.forEach((t, index) => {
      console.log(`${index + 1}. ${t.description}`);
      console.log(`   USD: ${t.amount_usd} (negative = loan given)`);
      console.log(`   IQD: ${t.amount_iqd} (negative = loan given)`);
      console.log(`   Time: ${new Date(t.created_at).toLocaleTimeString()}`);
      console.log(`   Reference: ${t.reference_type}`);
    });
    
    // Check loan payment transactions
    console.log('\n💰 Checking loan payment transactions...');
    const paymentTransactions = db.getDatabase().prepare(`
      SELECT type, amount_usd, amount_iqd, description, created_at, reference_type
      FROM transactions 
      WHERE date(created_at) = date(?) AND type = ?
      ORDER BY created_at DESC
    `).all(today, 'loan_payment');
    
    console.log(`Found ${paymentTransactions.length} loan payment transactions today:`);
    paymentTransactions.forEach((t, index) => {
      console.log(`${index + 1}. ${t.description}`);
      console.log(`   USD: ${t.amount_usd} (positive = payment received)`);
      console.log(`   IQD: ${t.amount_iqd} (positive = payment received)`);
      console.log(`   Time: ${new Date(t.created_at).toLocaleTimeString()}`);
    });
    
    // Simulate dashboard calculation
    console.log('\n🖥️ Dashboard Calculation Simulation:');
    
    const todaysPersonalLoanPaymentsUSD = personalLoanTransactions
      .filter(t => t.amount_usd < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount_usd), 0);
      
    const todaysPersonalLoanPaymentsIQD = personalLoanTransactions
      .filter(t => t.amount_iqd < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount_iqd), 0);
      
    const todaysPersonalDebtPaymentsUSD = paymentTransactions
      .filter(t => t.amount_usd > 0)
      .reduce((sum, t) => sum + t.amount_usd, 0);
      
    const todaysPersonalDebtPaymentsIQD = paymentTransactions
      .filter(t => t.amount_iqd > 0)
      .reduce((sum, t) => sum + t.amount_iqd, 0);
    
    console.log(`Loans Given (should show in red):`);
    console.log(`   USD: $${todaysPersonalLoanPaymentsUSD}`);
    console.log(`   IQD: ${todaysPersonalLoanPaymentsIQD} IQD`);
    
    console.log(`Payments Received (should show in green):`);
    console.log(`   USD: $${todaysPersonalDebtPaymentsUSD}`);
    console.log(`   IQD: ${todaysPersonalDebtPaymentsIQD} IQD`);
    
    // Check if any loans exist
    console.log('\n🏦 Personal Loans Status:');
    const allLoans = db.getPersonalLoans();
    console.log(`Total personal loans in system: ${allLoans.length}`);
    
    const todaysLoans = allLoans.filter(loan => {
      const loanDate = new Date(loan.created_at);
      return loanDate.toDateString() === new Date().toDateString();
    });
    
    console.log(`Loans created today: ${todaysLoans.length}`);
    todaysLoans.forEach((loan, index) => {
      console.log(`${index + 1}. ${loan.person_name}: $${loan.usd_amount || 0} + ${loan.iqd_amount || 0} IQD`);
      console.log(`   Description: ${loan.description}`);
      console.log(`   Paid: ${loan.paid_at ? 'YES' : 'NO'}`);
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugPersonalLoanTransactions();
