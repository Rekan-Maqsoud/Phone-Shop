#!/usr/bin/env node

/**
 * Direct Database Sample Data Applicator
 * Uses a different approach to apply sample data directly to the database
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Applying sample data directly to your database...');

try {
  // First generate the SQL file
  console.log('📝 Generating fresh sample data...');
  require('./add-sample-data.cjs');
  
  // Wait a moment for the file to be written
  setTimeout(() => {
    try {
      const sqlFilePath = path.join(__dirname, 'sample-data.sql');
      
      if (!fs.existsSync(sqlFilePath)) {
        console.error('❌ SQL file not found after generation');
        process.exit(1);
      }
      
      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
      
      // Try different methods to apply the SQL
      console.log('🔄 Attempting to apply sample data...');
      
      // Method 1: Try using child_process with different sqlite commands
      const { exec, spawn } = require('child_process');
      
      // Try sqlite3 command
      exec(`sqlite3 "${dbPath}" ".read sample-data.sql"`, { cwd: __dirname }, (error, stdout, stderr) => {
        if (!error) {
          console.log('✅ Sample data applied successfully via sqlite3!');
          cleanupAndFinish();
          return;
        }
        
        // Method 2: Try with full path
        exec(`"${dbPath}" < "${sqlFilePath}"`, (error2, stdout2, stderr2) => {
          if (!error2) {
            console.log('✅ Sample data applied successfully!');
            cleanupAndFinish();
            return;
          }
          
          // Method 3: Direct file approach
          console.log('📄 SQLite command not available. Using manual application...');
          console.log('');
          console.log('🎯 Please apply the sample data manually:');
          console.log('');
          console.log('Option 1 - Copy this SQL and execute it in a SQLite browser:');
          console.log(`The file "sample-data.sql" contains all the SQL statements.`);
          console.log('');
          console.log('Option 2 - Use DB Browser for SQLite:');
          console.log('1. Open database/shop.sqlite in DB Browser for SQLite');
          console.log('2. Go to Execute SQL tab');
          console.log('3. Copy and paste the contents of sample-data.sql');
          console.log('4. Click Execute All');
          console.log('');
          console.log('Option 3 - Restart your application:');
          console.log('The app may auto-apply sample data on startup.');
          
          // Don't clean up the SQL file so user can use it manually
          console.log('');
          console.log('📄 sample-data.sql file is ready for manual application');
        });
      });
      
    } catch (err) {
      console.error('❌ Error applying sample data:', err.message);
    }
  }, 1000);
  
} catch (error) {
  console.error('❌ Error generating sample data:', error.message);
}

function cleanupAndFinish() {
  try {
    const sqlFilePath = path.join(__dirname, 'sample-data.sql');
    fs.unlinkSync(sqlFilePath);
    console.log('🧹 Temporary files cleaned up');
  } catch (e) {
    // Ignore cleanup errors
  }
  
  console.log('');
  console.log('📊 Sample data now includes:');
  console.log('   📱 Products: 15 phones with realistic pricing');
  console.log('   🔌 Accessories: 18 items across all categories');
  console.log('   💰 Historical Sales: 20+ sales across different months/years');
  console.log('   📈 Monthly Reports: Data from July 2023 to present');
  console.log('   👤 Customer Debts: 5 sample debts');
  console.log('   🏢 Company Debts: 4 supplier debts');
  console.log('   💵 Personal Loans: 3 personal loans');
  console.log('   🎁 Incentives: 4 company bonuses');
  console.log('   📦 Buying History: 5 purchase records');
  console.log('');
  console.log('✅ Your Phone Shop now has comprehensive sample data!');
  console.log('🎉 Perfect for testing monthly reports and analytics!');
}
