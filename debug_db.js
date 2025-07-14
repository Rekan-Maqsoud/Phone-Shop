import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
const db = new Database(dbPath);

console.log('=== DATABASE DEBUG ===');

// Check products table schema
const schema = db.prepare("PRAGMA table_info(products)").all();
console.log('Products table schema:');
console.table(schema);

// Check actual products data
const products = db.prepare('SELECT id, name, buying_price, stock FROM products LIMIT 5').all();
console.log('\nProducts in database:');
console.table(products);

// Check if there are any products with NULL IDs
const nullIdProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE id IS NULL').get();
console.log('\nProducts with NULL IDs:', nullIdProducts.count);

// Check the SQLite version and integrity
const version = db.prepare('SELECT sqlite_version()').get();
console.log('\nSQLite version:', version);

const integrity = db.prepare('PRAGMA integrity_check').get();
console.log('Database integrity:', integrity);

db.close();
