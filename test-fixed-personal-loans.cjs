const path = require('path');
const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const createDatabase = require('./database/index.cjs');

function testFixedPersonalLoans() {
  console.log('🔧 Testing FIXED Personal Loan Functions');
  console.log('=========================================');
  
  try {
    const db = createDatabase(dbPath);
    const today = new Date().toISOString().split('T')[0];
    
    // Check initial balances
    console.log('\n📊 Initial Balances:');
    const initialBalances = db.getBalances();
    console.log(`   USD: $${initialBalances.usd_balance}`);
    console.log(`   IQD: ${initialBalances.iqd_balance} IQD`);
    
    // Test 1: Add a USD loan - should create NEGATIVE transaction and decrease USD balance
    console.log('\n🏦 Test 1: Adding $50 USD loan');
    const usdLoanResult = db.addPersonalLoan({
      person_name: 'Test Person USD',
      usd_amount: 50,
      iqd_amount: 0,
      description: 'Test USD loan'
    });
    
    console.log('   Result:', usdLoanResult.success ? 'SUCCESS ✅' : `FAILED ❌ - ${usdLoanResult.message}`);
    
    if (usdLoanResult.success) {
      // Check balance change
      const balancesAfterUSD = db.getBalances();
      console.log(`   Balance change: $${initialBalances.usd_balance} → $${balancesAfterUSD.usd_balance} (should decrease by $50)`);
      
      // Check transaction record
      const usdTransactions = db.getDatabase().prepare(
        'SELECT * FROM transactions WHERE date(created_at) = date(?) AND type = ? AND amount_usd < 0'
      ).all(today, 'personal_loan');
      
      console.log(`   USD Loan transactions today: ${usdTransactions.length}`);
      usdTransactions.forEach(t => {
        console.log(`      ${t.description}: USD ${t.amount_usd}, IQD ${t.amount_iqd}`);
      });
    }
    
    // Test 2: Add an IQD loan 
    console.log('\n🏦 Test 2: Adding 100,000 IQD loan');
    const iqdLoanResult = db.addPersonalLoan({
      person_name: 'Test Person IQD',
      usd_amount: 0,
      iqd_amount: 100000,
      description: 'Test IQD loan'
    });
    
    console.log('   Result:', iqdLoanResult.success ? 'SUCCESS ✅' : `FAILED ❌ - ${iqdLoanResult.message}`);
    
    if (iqdLoanResult.success) {
      // Check balance change
      const balancesAfterIQD = db.getBalances();
      console.log(`   IQD Balance should decrease by 100,000 IQD`);
      
      // Check transaction record
      const iqdTransactions = db.getDatabase().prepare(
        'SELECT * FROM transactions WHERE date(created_at) = date(?) AND type = ? AND amount_iqd < 0'
      ).all(today, 'personal_loan');
      
      console.log(`   IQD Loan transactions today: ${iqdTransactions.length}`);
      iqdTransactions.forEach(t => {
        console.log(`      ${t.description}: USD ${t.amount_usd}, IQD ${t.amount_iqd}`);
      });
    }
    
    // Test 3: Pay USD loan with IQD - should add IQD to balance, NOT USD
    if (usdLoanResult.success) {
      console.log('\n💰 Test 3: Paying $50 USD loan with 72,000 IQD (should add IQD balance)');
      const balanceBeforePayment = db.getBalances();
      
      const paymentResult = db.markPersonalLoanPaid(usdLoanResult.id, {
        payment_usd_amount: 0,
        payment_iqd_amount: 72000 // Approximately $50 at 1440 rate
      });
      
      console.log('   Payment result:', paymentResult.success ? 'SUCCESS ✅' : `FAILED ❌ - ${paymentResult.message}`);
      
      if (paymentResult.success) {
        const balanceAfterPayment = db.getBalances();
        console.log(`   USD: $${balanceBeforePayment.usd_balance} → $${balanceAfterPayment.usd_balance} (should NOT change)`);
        console.log(`   IQD: ${balanceBeforePayment.iqd_balance} → ${balanceAfterPayment.iqd_balance} (should INCREASE by 72,000)`);
        
        // Check payment transaction
        const paymentTransactions = db.getDatabase().prepare(
          'SELECT * FROM transactions WHERE date(created_at) = date(?) AND type = ? ORDER BY created_at DESC'
        ).all(today, 'loan_payment');
        
        console.log(`   Payment transactions today: ${paymentTransactions.length}`);
        paymentTransactions.forEach(t => {
          console.log(`      ${t.description}: USD ${t.amount_usd}, IQD ${t.amount_iqd}`);
        });
      }
    }
    
    console.log('\n=== Summary ===');
    console.log('✅ Loans given should now show as NEGATIVE transactions');
    console.log('✅ Payments should add to the ACTUAL currency paid');
    console.log('✅ Dashboard should show loan amounts correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testFixedPersonalLoans();
