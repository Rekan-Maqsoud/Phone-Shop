// Test script to verify that buying history returns properly affect spending calculations
const path = require('path');

// Mock the database path for testing
const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const createDatabase = require('./database');

const testReturnSpending = async () => {
  try {
    console.log('🧪 Testing Return Spending Calculations...\n');

    const db = createDatabase(dbPath);

    // Get current date for today's calculations
    const today = new Date().toISOString().split('T')[0];
    
    console.log('📅 Today:', today);

    // 1. Check current transactions
    console.log('\n1. Current transactions for today:');
    const todaysTransactions = db.prepare(`
      SELECT type, amount_usd, amount_iqd, description, created_at 
      FROM transactions 
      WHERE DATE(created_at) = ?
      ORDER BY created_at DESC
    `).all(today);
    
    console.log(`Found ${todaysTransactions.length} transactions today:`);
    todaysTransactions.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.type}: USD ${t.amount_usd}, IQD ${t.amount_iqd} - ${t.description}`);
    });

    // 2. Calculate spending amounts based on transactions (similar to dashboard logic)
    console.log('\n2. Calculating spending from transactions:');
    
    // Outgoing transactions (negative amounts)
    const outgoingUSD = todaysTransactions
      .filter(t => t.amount_usd < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount_usd), 0);
    
    const outgoingIQD = todaysTransactions
      .filter(t => t.amount_iqd < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount_iqd), 0);

    // Return transactions (positive amounts that reduce spending)
    const returnsUSD = todaysTransactions
      .filter(t => t.type === 'buying_history_return' && t.amount_usd > 0)
      .reduce((sum, t) => sum + t.amount_usd, 0);
    
    const returnsIQD = todaysTransactions
      .filter(t => t.type === 'buying_history_return' && t.amount_iqd > 0)
      .reduce((sum, t) => sum + t.amount_iqd, 0);

    console.log(`  Outgoing USD: ${outgoingUSD}`);
    console.log(`  Outgoing IQD: ${outgoingIQD}`);
    console.log(`  Returns USD: ${returnsUSD}`);
    console.log(`  Returns IQD: ${returnsIQD}`);
    
    // Net spending (outgoing minus returns)
    const netSpendingUSD = outgoingUSD - returnsUSD;
    const netSpendingIQD = outgoingIQD - returnsIQD;
    
    console.log(`  Net Spending USD: ${netSpendingUSD}`);
    console.log(`  Net Spending IQD: ${netSpendingIQD}`);

    // 3. Check buying history entries for today
    console.log('\n3. Current buying history entries:');
    const todaysBuyingHistory = db.prepare(`
      SELECT id, item_name, total_price, currency, date 
      FROM buying_history 
      WHERE DATE(date) = ?
      ORDER BY date DESC
    `).all(today);
    
    console.log(`Found ${todaysBuyingHistory.length} buying history entries today:`);
    todaysBuyingHistory.forEach((entry, i) => {
      console.log(`  ${i + 1}. ${entry.item_name}: ${entry.total_price} ${entry.currency} (ID: ${entry.id})`);
    });

    console.log('\n✅ Test completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`- Outgoing transactions: USD ${outgoingUSD}, IQD ${outgoingIQD}`);
    console.log(`- Return transactions: USD ${returnsUSD}, IQD ${returnsIQD}`);
    console.log(`- Net spending effect: USD ${netSpendingUSD}, IQD ${netSpendingIQD}`);
    console.log(`- Active buying history entries: ${todaysBuyingHistory.length}`);

    db.close();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testReturnSpending();
