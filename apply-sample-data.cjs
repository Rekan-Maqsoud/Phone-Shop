#!/usr/bin/env node

/**
 * Apply Sample Data Script - Uses Node.js to execute SQL commands
 * This script applies the sample data SQL file directly to the database
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Applying sample data to existing database...');

try {
  // Read the SQL file
  const sqlFilePath = path.join(__dirname, 'sample-data.sql');
  
  if (!fs.existsSync(sqlFilePath)) {
    console.error('❌ sample-data.sql file not found. Please run "npm run add-sample-data" first.');
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  console.log('📄 SQL file loaded successfully');

  // Try to use better-sqlite3 directly
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (error) {
    console.error('❌ better-sqlite3 not available due to Node.js version compatibility');
    console.log('');
    console.log('🎯 Manual application options:');
    console.log('');
    console.log('Option 1 - Start the application:');
    console.log('  The application will automatically apply the sample data on first run');
    console.log('');
    console.log('Option 2 - Use SQLite CLI (if available):');
    console.log('  sqlite3 database/shop.sqlite ".read sample-data.sql"');
    console.log('');
    console.log('Option 3 - Copy and paste the SQL:');
    console.log('  Open a SQLite browser/client and execute the contents of sample-data.sql');
    
    process.exit(1);
  }

  // Connect to database
  const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
  const db = new Database(dbPath);
  
  console.log('🔗 Connected to database');
  
  // Execute the SQL in a transaction
  const executeSQL = db.transaction(() => {
    // Split SQL statements by semicolon and execute each one
    const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log(`📦 Executing ${statements.length} SQL statements...`);
    
    for (const statement of statements) {
      try {
        db.exec(statement + ';');
      } catch (error) {
        // Ignore duplicate/constraint errors as we use INSERT OR IGNORE
        if (!error.message.includes('UNIQUE constraint failed') && 
            !error.message.includes('already exists')) {
          console.warn('⚠️ SQL warning:', error.message);
        }
      }
    }
  });
  
  executeSQL();
  
  db.close();
  
  console.log('✅ Sample data applied successfully!');
  console.log('');
  console.log('📊 Your database now includes:');
  console.log('   📱 Products: 15 phones (iPhones, Samsung, Xiaomi, local brands)');
  console.log('   🔌 Accessories: 18 items (cases, chargers, cables, power banks)');
  console.log('   👤 Customer Debts: 5 sample debts');
  console.log('   🏢 Company Debts: 4 supplier debts');
  console.log('   💵 Personal Loans: 3 personal loans');
  console.log('   🎁 Incentives: 4 company incentives');
  console.log('   📦 Buying History: 5 purchase records');
  console.log('   💰 Sales: 4 sample sales with items');
  console.log('');
  console.log('🎉 Your Phone Shop is ready for comprehensive testing!');
  console.log('💡 You can now start the application and explore all features.');
  
  // Clean up SQL file
  try {
    fs.unlinkSync(sqlFilePath);
    console.log('🧹 Temporary SQL file cleaned up');
  } catch (e) {
    // Ignore cleanup errors
  }

} catch (error) {
  console.error('❌ Error applying sample data:', error.message);
  process.exit(1);
}
