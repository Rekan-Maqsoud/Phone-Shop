import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Check products table structure
  const tableInfo = db.prepare("PRAGMA table_info(products)").all();
  console.log('\n📋 Products table structure:');
  tableInfo.forEach(column => {
    console.log(`  ${column.name}: ${column.type} (nullable: ${column.notnull === 0})`);
  });
  
  // Check all products
  const allProducts = db.prepare('SELECT id, name, archived FROM products').all();
  console.log('\n📦 All products in database:');
  allProducts.forEach(product => {
    console.log(`  ID: ${product.id}, Name: ${product.name}, Archived: ${product.archived}`);
  });
  
  // Check specifically for archived products
  const archivedProducts = db.prepare('SELECT * FROM products WHERE archived = 1').all();
  console.log('\n🗃️ Archived products:');
  if (archivedProducts.length > 0) {
    archivedProducts.forEach(product => {
      console.log(`  - ${product.name} (ID: ${product.id})`);
    });
  } else {
    console.log('  No archived products found');
  }
  
  // Check for products with archived as string '1'
  const archivedAsString = db.prepare("SELECT * FROM products WHERE archived = '1'").all();
  console.log('\n🔍 Products with archived as string "1":');
  if (archivedAsString.length > 0) {
    archivedAsString.forEach(product => {
      console.log(`  - ${product.name} (ID: ${product.id})`);
    });
  } else {
    console.log('  No products with archived as string "1"');
  }
  
  db.close();
  
} catch (error) {
  console.error('Error accessing database:', error.message);
}
