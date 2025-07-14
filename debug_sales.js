import Database from 'better-sqlite3';

const db = new Database('./database/shop.sqlite');

console.log('=== SALES DEBUG ===');

// Check sales table structure
console.log('Sales table schema:');
const salesSchema = db.prepare('PRAGMA table_info(sales)').all();
console.table(salesSchema);

// Check sale_items table structure
console.log('\nSale Items table schema:');
const saleItemsSchema = db.prepare('PRAGMA table_info(sale_items)').all();
console.table(saleItemsSchema);

// Check recent sales
console.log('\nRecent sales:');
const recentSales = db.prepare('SELECT * FROM sales ORDER BY created_at DESC LIMIT 5').all();
console.table(recentSales);

// Check Sale #116 specifically
console.log('\nSale #116 details:');
const sale116 = db.prepare('SELECT * FROM sales WHERE id = 116').get();
console.log(sale116);

// Check Sale #116 items
console.log('\nSale #116 items:');
const sale116Items = db.prepare('SELECT * FROM sale_items WHERE sale_id = 116').all();
console.table(sale116Items);

// Check all sale items
console.log('\nAll sale items count:');
const allSaleItemsCount = db.prepare('SELECT COUNT(*) as count FROM sale_items').get();
console.log(allSaleItemsCount);

// Check sample sale items
console.log('\nSample sale items:');
const sampleSaleItems = db.prepare('SELECT * FROM sale_items LIMIT 10').all();
console.table(sampleSaleItems);

db.close();
