// Simple test script to verify the incentives module works
const path = require('path');
const createDB = require('./database/index.cjs');

// Initialize database
const dbPath = path.join(__dirname, 'database', 'test.sqlite');
const db = createDB(dbPath);

console.log('Testing incentives module...');

try {
  // Test getting incentives (should be empty initially)
  const incentives = db.getIncentives();
  console.log('✅ getIncentives works:', incentives.length, 'incentives found');

  // Test adding an incentive
  const result = db.addIncentive({
    company_name: 'Test Company',
    amount: 100,
    description: 'Test incentive',
    currency: 'USD'
  });
  console.log('✅ addIncentive works:', result);

  // Test getting incentives again
  const newIncentives = db.getIncentives();
  console.log('✅ After adding incentive:', newIncentives.length, 'incentives found');

  // Test getting totals
  const totals = db.getIncentiveTotals();
  console.log('✅ getIncentiveTotals works:', totals);

  console.log('\n🎉 All incentives functions work correctly!');
} catch (error) {
  console.error('❌ Error testing incentives:', error);
}
