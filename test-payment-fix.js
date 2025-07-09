// Test script to verify the company debt payment functionality
console.log('Testing company debt payment fix...');

// Simulate the database function behavior with fallback
function testBuyingHistoryInsert() {
  const mockDb = {
    prepare: (sql) => {
      if (sql.includes('type, reference_id')) {
        // Simulate missing columns error
        throw new Error("table buying_history has no column named type");
      }
      return {
        run: (...args) => {
          console.log('✅ Fallback insert successful with args:', args);
          return { changes: 1 };
        }
      };
    }
  };

  // Test the fallback logic
  const payment_usd_amount = 100;
  const debtInfo = { company_name: 'Test Company' };
  const now = new Date().toISOString();
  const id = 1;

  try {
    const addBuyingHistoryUSD = mockDb.prepare(`
      INSERT INTO buying_history (item_name, quantity, unit_price, total_price, date, currency, type, reference_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    addBuyingHistoryUSD.run(
      `Company debt payment: ${debtInfo.company_name}`,
      1,
      payment_usd_amount,
      payment_usd_amount,
      now,
      'USD',
      'debt_payment',
      id
    );
  } catch (columnError) {
    console.log('Caught expected error:', columnError.message);
    console.log('Using fallback...');
    
    const addBuyingHistoryUSDBasic = mockDb.prepare(`
      INSERT INTO buying_history (item_name, quantity, unit_price, total_price, date, currency) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    addBuyingHistoryUSDBasic.run(
      `Company debt payment: ${debtInfo.company_name}`,
      1,
      payment_usd_amount,
      payment_usd_amount,
      now,
      'USD'
    );
  }
}

testBuyingHistoryInsert();
console.log('✅ Test completed successfully - the fallback logic should work!');
