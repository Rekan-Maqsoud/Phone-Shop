const path = require('path');
const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const createDatabase = require('./database/index.cjs');

function quickPersonalLoanTest() {
  console.log('🧪 Quick Personal Loan Test - After Fixes');
  console.log('==========================================');
  
  try {
    const db = createDatabase(dbPath);
    
    // Clean up any test transactions first
    console.log('🧹 Cleaning up test data...');
    db.getDatabase().prepare("DELETE FROM transactions WHERE description LIKE '%Test%'").run();
    db.getDatabase().prepare("DELETE FROM personal_loans WHERE person_name LIKE '%Test%'").run();
    
    const initialBalances = db.getBalances();
    console.log(`\n💰 Initial balances: USD $${initialBalances.usd_balance}, IQD ${initialBalances.iqd_balance}`);
    
    // Test: Give $30 loan
    console.log('\n🏦 Creating $30 loan...');
    const loanResult = db.addPersonalLoan({
      person_name: 'Test User',
      usd_amount: 30,
      iqd_amount: 0,
      description: 'Quick test loan'
    });
    
    if (loanResult.success) {
      console.log('✅ Loan created successfully');
      
      // Check balance
      const balanceAfterLoan = db.getBalances();
      console.log(`💸 Balance after loan: USD $${balanceAfterLoan.usd_balance} (decreased by $${initialBalances.usd_balance - balanceAfterLoan.usd_balance})`);
      
      // Check transaction
      const loanTransactions = db.getDatabase().prepare(`
        SELECT type, amount_usd, amount_iqd, description 
        FROM transactions 
        WHERE type = 'personal_loan' AND description LIKE '%Test%'
        ORDER BY created_at DESC LIMIT 1
      `).all();
      
      console.log('\n📝 Loan transaction created:');
      loanTransactions.forEach(t => {
        console.log(`   Type: ${t.type}`);
        console.log(`   USD: ${t.amount_usd} (should be negative)`);
        console.log(`   IQD: ${t.amount_iqd}`);
        console.log(`   Description: ${t.description}`);
      });
      
      // Test payment with IQD
      console.log('\n💰 Paying loan with 43,200 IQD (equivalent to $30)...');
      const paymentResult = db.markPersonalLoanPaid(loanResult.id, {
        payment_usd_amount: 0,
        payment_iqd_amount: 43200
      });
      
      if (paymentResult.success) {
        console.log('✅ Payment successful');
        
        const balanceAfterPayment = db.getBalances();
        console.log(`💰 Balance after payment:`);
        console.log(`   USD: $${balanceAfterPayment.usd_balance} (should be same as after loan: $${balanceAfterLoan.usd_balance})`);
        console.log(`   IQD: ${balanceAfterPayment.iqd_balance} (should increase by 43,200 from: ${balanceAfterLoan.iqd_balance})`);
        
        const iqdIncrease = balanceAfterPayment.iqd_balance - balanceAfterLoan.iqd_balance;
        console.log(`   IQD increase: ${iqdIncrease} (should be 43,200)`);
        
        // Check payment transaction
        const paymentTransactions = db.getDatabase().prepare(`
          SELECT type, amount_usd, amount_iqd, description 
          FROM transactions 
          WHERE type = 'loan_payment' AND description LIKE '%Test%'
          ORDER BY created_at DESC LIMIT 1
        `).all();
        
        console.log('\n📝 Payment transaction created:');
        paymentTransactions.forEach(t => {
          console.log(`   Type: ${t.type}`);
          console.log(`   USD: ${t.amount_usd} (should be 0)`);
          console.log(`   IQD: ${t.amount_iqd} (should be 43200)`);
          console.log(`   Description: ${t.description}`);
        });
        
        console.log('\n🎯 Test Results:');
        console.log(`   ✅ Loan transaction amount: ${loanTransactions[0]?.amount_usd < 0 ? 'NEGATIVE (correct)' : 'POSITIVE (wrong)'}`);
        console.log(`   ✅ Payment currency: ${iqdIncrease === 43200 ? 'IQD BALANCE INCREASED (correct)' : 'WRONG CURRENCY UPDATED'}`);
        console.log(`   ✅ USD balance unchanged: ${balanceAfterPayment.usd_balance === balanceAfterLoan.usd_balance ? 'YES (correct)' : 'NO (wrong)'}`);
        
      } else {
        console.log('❌ Payment failed:', paymentResult.message);
      }
      
    } else {
      console.log('❌ Loan creation failed:', loanResult.message);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error.stack);
  }
}

quickPersonalLoanTest();
