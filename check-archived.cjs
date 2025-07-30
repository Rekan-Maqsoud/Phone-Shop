const dbFactory = require('./database/index.cjs');

async function checkArchivedProducts() {
  try {
    const dbPath = './database/shop.sqlite';
    const db = dbFactory(dbPath);
    
    console.log('🔍 Checking database for archived products...');
    
    // Get all products first
    const allProducts = db.getAllProducts();
    console.log(`\n📦 Total products in database: ${allProducts.length}`);
    
    if (allProducts.length > 0) {
      console.log('\n📋 All products with archive status:');
      allProducts.forEach(product => {
        console.log(`  - ${product.name} (ID: ${product.id}, Archived: ${product.archived})`);
      });
    }
    
    // Get only archived products
    const archivedProducts = db.getArchivedProducts();
    console.log(`\n🗃️ Archived products: ${archivedProducts.length}`);
    
    if (archivedProducts.length > 0) {
      archivedProducts.forEach(product => {
        console.log(`  - ${product.name} (ID: ${product.id})`);
      });
    } else {
      console.log('  No archived products found');
    }
    
    // Get active products
    const activeProducts = db.getProducts();
    console.log(`\n✅ Active products: ${activeProducts.length}`);
    
    if (activeProducts.length > 0) {
      activeProducts.forEach(product => {
        console.log(`  - ${product.name} (ID: ${product.id})`);
      });
    }
    
    // Check accessories too
    const allAccessories = db.getAllAccessories ? db.getAllAccessories() : [];
    const archivedAccessories = db.getArchivedAccessories ? db.getArchivedAccessories() : [];
    
    console.log(`\n🔧 Total accessories: ${allAccessories.length}`);
    console.log(`🗃️ Archived accessories: ${archivedAccessories.length}`);
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

checkArchivedProducts();
