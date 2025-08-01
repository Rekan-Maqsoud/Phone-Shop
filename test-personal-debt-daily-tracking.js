const db = require('./database/index.cjs')('database/shop.sqlite');

console.log('🧪 Testing Personal Debt Daily Tracking...\n');

// Get today's date for testing
const today = new Date().toISOString().split('T')[0];

try {
  // Test 1: Add a personal loan
  console.log('📋 Test 1: Adding personal loan');
  const personalLoanResult = db.addPersonalLoan({
    person_name: 'Test Person - Daily Track',
    usd_amount: 100,
    iqd_amount: 0,
    description: 'Test loan for daily tracking'
  });
  
  console.log('   Personal loan added:', personalLoanResult.success ? 'SUCCESS ✅' : 'FAILED ❌');
  
  if (personalLoanResult.success) {
    const loanId = personalLoanResult.id;
    console.log(`   Loan ID: ${loanId}`);
    
    // Test 2: Make a partial payment on the loan
    console.log('\n📋 Test 2: Making partial loan payment ($30)');
    const partialPaymentResult = db.markPersonalLoanPaid(loanId, {
      payment_usd_amount: 30,
      payment_iqd_amount: 0
    });
    
    console.log('   Partial payment result:', partialPaymentResult.success ? 'SUCCESS ✅' : 'FAILED ❌');
    
    // Test 3: Check today's transactions for loan payments
    console.log('\n📋 Test 3: Checking today\'s loan payment transactions');
    const todayTransactions = db.getTransactions(50).filter(t => {
      if (!t.created_at) return false;
      const transactionDate = new Date(t.created_at).toISOString().split('T')[0];
      return transactionDate === today && t.type === 'loan_payment';
    });
    
    console.log(`   Found ${todayTransactions.length} loan payment transactions today`);
    todayTransactions.forEach((t, index) => {
      console.log(`   Transaction ${index + 1}:`);
      console.log(`     Type: ${t.type}`);
      console.log(`     USD Amount: $${t.amount_usd || 0}`);
      console.log(`     IQD Amount: ${t.amount_iqd || 0} IQD`);
      console.log(`     Description: ${t.description}`);
      console.log(`     Time: ${new Date(t.created_at).toLocaleTimeString()}`);
    });
    
    // Test 4: Check remaining loan amount
    console.log('\n📋 Test 4: Checking remaining loan amount');
    const personalLoans = db.getPersonalLoans();
    const testLoan = personalLoans.find(l => l.id === loanId);
    
    if (testLoan) {
      console.log('   Loan details:');
      console.log(`     Original USD: $${testLoan.usd_amount || 0}`);
      console.log(`     Original IQD: ${testLoan.iqd_amount || 0} IQD`);
      console.log(`     Paid USD: $${testLoan.payment_usd_amount || 0}`);
      console.log(`     Paid IQD: ${testLoan.payment_iqd_amount || 0} IQD`);
      console.log(`     Remaining USD: $${(testLoan.usd_amount || 0) - (testLoan.payment_usd_amount || 0)}`);
      console.log(`     Remaining IQD: ${(testLoan.iqd_amount || 0) - (testLoan.payment_iqd_amount || 0)} IQD`);
      console.log(`     Fully Paid: ${testLoan.paid_at ? 'YES' : 'NO'}`);
    }
    
    // Test 5: Make final payment to complete the loan
    console.log('\n📋 Test 5: Making final loan payment ($70)');
    const finalPaymentResult = db.markPersonalLoanPaid(loanId, {
      payment_usd_amount: 70,
      payment_iqd_amount: 0
    });
    
    console.log('   Final payment result:', finalPaymentResult.success ? 'SUCCESS ✅' : 'FAILED ❌');
    
    // Test 6: Verify loan is marked as paid
    const updatedLoan = db.getPersonalLoans().find(l => l.id === loanId);
    if (updatedLoan) {
      console.log(`   Loan status: ${updatedLoan.paid_at ? 'FULLY PAID ✅' : 'STILL OUTSTANDING ❌'}`);
      if (updatedLoan.paid_at) {
        console.log(`   Paid at: ${new Date(updatedLoan.paid_at).toLocaleString()}`);
      }
    }
    
    // Test 7: Check final transaction count
    console.log('\n📋 Test 7: Final transaction count check');
    const finalTransactions = db.getTransactions(50).filter(t => {
      if (!t.created_at) return false;
      const transactionDate = new Date(t.created_at).toISOString().split('T')[0];
      return transactionDate === today && t.type === 'loan_payment';
    });
    
    console.log(`   Total loan payment transactions today: ${finalTransactions.length}`);
    const totalUSDReceived = finalTransactions.reduce((sum, t) => sum + (t.amount_usd || 0), 0);
    const totalIQDReceived = finalTransactions.reduce((sum, t) => sum + (t.amount_iqd || 0), 0);
    console.log(`   Total USD received from loan payments: $${totalUSDReceived}`);
    console.log(`   Total IQD received from loan payments: ${totalIQDReceived} IQD`);
    
    // Cleanup - delete the test loan
    console.log('\n🧹 Cleaning up test data...');
    const deleteResult = db.deletePersonalLoan(loanId);
    console.log('   Test loan deleted:', deleteResult.success ? 'SUCCESS ✅' : 'FAILED ❌');
  }
  
  console.log('\n✅ Personal debt daily tracking test completed!');
  
} catch (error) {
  console.error('❌ Error during testing:', error);
} finally {
  db.close();
}
