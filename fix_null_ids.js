import Database from 'better-sqlite3';

const db = new Database('./database/shop.sqlite');

console.log('=== FIXING NULL IDS ===');

// Fix products with NULL IDs
console.log('Fixing products...');
const nullProducts = db.prepare('SELECT rowid, * FROM products WHERE id IS NULL ORDER BY rowid').all();
console.log('Products with NULL IDs:', nullProducts.length);

if (nullProducts.length > 0) {
    for (const product of nullProducts) {
        // Use rowid as the new ID
        const newId = product.rowid;
        console.log(`Fixing product ${product.name} with rowid ${product.rowid}`);
        
        // Update the id field to use rowid
        db.prepare('UPDATE products SET id = ? WHERE rowid = ?').run(newId, product.rowid);
    }
}

// Fix accessories with NULL IDs
console.log('Fixing accessories...');
const nullAccessories = db.prepare('SELECT rowid, * FROM accessories WHERE id IS NULL ORDER BY rowid').all();
console.log('Accessories with NULL IDs:', nullAccessories.length);

if (nullAccessories.length > 0) {
    for (const accessory of nullAccessories) {
        // Use rowid as the new ID
        const newId = accessory.rowid;
        console.log(`Fixing accessory ${accessory.name} with rowid ${accessory.rowid}`);
        
        // Update the id field to use rowid
        db.prepare('UPDATE accessories SET id = ? WHERE rowid = ?').run(newId, accessory.rowid);
    }
}

// Verify the fix
console.log('\n=== VERIFICATION ===');
const remainingNullProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE id IS NULL').get();
const remainingNullAccessories = db.prepare('SELECT COUNT(*) as count FROM accessories WHERE id IS NULL').get();

console.log('Products with NULL IDs after fix:', remainingNullProducts.count);
console.log('Accessories with NULL IDs after fix:', remainingNullAccessories.count);

// Show current products
console.log('\nCurrent products:');
const currentProducts = db.prepare('SELECT id, name, buying_price FROM products LIMIT 5').all();
console.table(currentProducts);

db.close();
console.log('✅ Database ID repair completed!');
