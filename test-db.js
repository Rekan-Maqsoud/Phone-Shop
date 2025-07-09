// Simple test script to check database without better-sqlite3 directly
const fs = require('fs');

// Check if database file exists and basic info
const dbPath = './database/shop.sqlite';
if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log('Database file exists');
  console.log('Size:', stats.size, 'bytes');
  console.log('Modified:', stats.mtime);
} else {
  console.log('Database file not found');
}

// Check if all module files exist
const moduleFiles = [
  './database/modules/init.cjs',
  './database/modules/sales.cjs',
  './database/index.cjs'
];

moduleFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log('✓', file, 'exists');
  } else {
    console.log('✗', file, 'missing');
  }
});
