// Database verification script
const fs = require('fs');

console.log('=== Database Structure Verification ===\n');

// 1. Check if modular files exist
const moduleFiles = {
  'Main DB Index': './database/index.cjs',
  'Init Module': './database/modules/init.cjs',
  'Sales Module': './database/modules/sales.cjs',
  'Products Module': './database/modules/products.cjs',
  'Inventory Module': './database/modules/inventory.cjs'
};

console.log('📁 Module Files:');
for (const [name, path] of Object.entries(moduleFiles)) {
  const exists = fs.existsSync(path);
  console.log(`  ${exists ? '✅' : '❌'} ${name}: ${path}`);
}

// 2. Check if old monolithic DB was removed
console.log('\n🗑️  Old Files:');
const oldFiles = ['./database/db.cjs', './database/deleted_db.cjs'];
for (const file of oldFiles) {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '⚠️ Still exists' : '✅ Removed'}: ${file}`);
}

// 3. Check database file
console.log('\n💾 Database File:');
const dbPath = './database/shop.sqlite';
if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log(`  ✅ Database exists: ${dbPath}`);
  console.log(`  📊 Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`  🕒 Modified: ${stats.mtime.toISOString()}`);
} else {
  console.log(`  ❌ Database not found: ${dbPath}`);
}

console.log('\n=== Verification Complete ===');
console.log('If all modular files exist and old files are removed, the migration is successful!');
console.log('The multi-currency support should be active in the sales history table.');
