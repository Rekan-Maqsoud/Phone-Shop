const path = require('path');
const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const createDatabase = require('./database/index.cjs');

function testPersonalLoanTransactions() {
  console.log('🧪 Testing Personal Loan Transaction Creation');
  console.log('============================================');
  
  try {
    const db = createDatabase(dbPath);
    const today = new Date().toISOString().split('T')[0];
    
    // Test 1: Add a personal loan in USD
    console.log('\n📋 Test 1: Adding USD personal loan');
    const usdLoanResult = db.addPersonalLoan({
      person_name: 'John Doe',
      usd_amount: 100,
      iqd_amount: 0,
      description: 'Test loan for transaction verification'
    });
    
    console.log('   USD loan result:', usdLoanResult.success ? 'SUCCESS ✅' : 'FAILED ❌');
    if (usdLoanResult.success) {
      console.log(`   Loan ID: ${usdLoanResult.id}`);
    }
    
    // Test 2: Add a personal loan in IQD
    console.log('\n📋 Test 2: Adding IQD personal loan');
    const iqdLoanResult = db.addPersonalLoan({
      person_name: 'Jane Smith',
      usd_amount: 0,
      iqd_amount: 50000,
      description: 'Test IQD loan'
    });
    
    console.log('   IQD loan result:', iqdLoanResult.success ? 'SUCCESS ✅' : 'FAILED ❌');
    if (iqdLoanResult.success) {
      console.log(`   Loan ID: ${iqdLoanResult.id}`);
    }
    
    // Test 3: Check if transactions were created
    console.log('\n📋 Test 3: Checking transaction records');
    const transactions = db.getDatabase().prepare(
      'SELECT * FROM transactions WHERE date(created_at) = date(?) AND type = ? ORDER BY created_at DESC'
    ).all(today, 'personal_loan');
    
    console.log(`   Personal loan transactions today: ${transactions.length}`);
    transactions.forEach((transaction, index) => {
      console.log(`   ${index + 1}. ${transaction.description}`);
      console.log(`      USD: $${transaction.amount_usd || 0}`);
      console.log(`      IQD: ${transaction.amount_iqd || 0} IQD`);
      console.log(`      Time: ${new Date(transaction.created_at).toLocaleTimeString()}`);
    });
    
    // Test 4: Make a loan payment
    if (usdLoanResult.success) {
      console.log('\n📋 Test 4: Making loan payment');
      const paymentResult = db.markPersonalLoanPaid(usdLoanResult.id, {
        payment_usd_amount: 50,
        payment_iqd_amount: 0
      });
      
      console.log('   Payment result:', paymentResult.success ? 'SUCCESS ✅' : 'FAILED ❌');
      
      // Check loan payment transactions
      const paymentTransactions = db.getDatabase().prepare(
        'SELECT * FROM transactions WHERE date(created_at) = date(?) AND type = ? ORDER BY created_at DESC'
      ).all(today, 'loan_payment');
      
      console.log(`   Loan payment transactions today: ${paymentTransactions.length}`);
      paymentTransactions.forEach((transaction, index) => {
        console.log(`   ${index + 1}. ${transaction.description}`);
        console.log(`      USD: $${transaction.amount_usd || 0}`);
        console.log(`      IQD: ${transaction.amount_iqd || 0} IQD`);
      });
    }
    
    console.log('\n=== Dashboard Impact ===');
    console.log('✓ Personal loans given should now appear in red as outgoing money');
    console.log('✓ Loan payments received should appear in green as incoming money');
    console.log('✓ Both will be included in today\'s balance calculations');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPersonalLoanTransactions();
