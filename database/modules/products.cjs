// Product management functions

function getProducts(db) {
  return db.prepare('SELECT * FROM products WHERE archived = 0').all();
}

function getArchivedProducts(db) {
  return db.prepare('SELECT * FROM products WHERE archived = 1').all();
}

function getAllProducts(db) {
  return db.prepare('SELECT * FROM products').all();
}

function addProduct(db, { name, buying_price, stock, archived = 0, ram, storage, model, brand, category = 'phones', currency = 'IQD' }) {
  console.log('🔍 [products.cjs] addProduct called with:', { name, brand, model, ram, storage, currency, buying_price, stock });
  
  // Normalize values for consistent comparison
  const normalizedName = (name || '').toString().trim();
  const normalizedBrand = (brand || '').toString().trim();
  const normalizedModel = (model || '').toString().trim();
  const normalizedRam = (ram || '').toString().trim();
  const normalizedStorage = (storage || '').toString().trim();
  const normalizedCurrency = (currency || 'IQD').toString().trim();
  
  // Check if product with same specifications already exists
  // First, try to match by core identifying attributes (brand, model, ram, storage, currency)
  const existingProduct = db.prepare(`
    SELECT * FROM products 
    WHERE LOWER(TRIM(COALESCE(brand, ''))) = LOWER(?) 
    AND LOWER(TRIM(COALESCE(model, ''))) = LOWER(?) 
    AND LOWER(TRIM(COALESCE(ram, ''))) = LOWER(?) 
    AND LOWER(TRIM(COALESCE(storage, ''))) = LOWER(?) 
    AND LOWER(TRIM(COALESCE(currency, 'IQD'))) = LOWER(?) 
    AND archived = 0
  `).get(
    normalizedBrand, 
    normalizedModel, 
    normalizedRam, 
    normalizedStorage, 
    normalizedCurrency
  );
  
  console.log('🔍 [products.cjs] Existing product search result:', existingProduct);
  
  if (existingProduct && existingProduct.id) {
    console.log('🔄 [products.cjs] Merging with existing product ID:', existingProduct.id);
    
    // Calculate new weighted average buying price
    const currentStock = Number(existingProduct.stock) || 0;
    const currentBuyingPrice = Number(existingProduct.buying_price) || 0;
    const newStock = Number(stock) || 0;
    const newBuyingPrice = Number(buying_price) || 0;
    
    const totalStock = currentStock + newStock;
    let averageBuyingPrice;
    
    if (totalStock > 0) {
      averageBuyingPrice = ((currentBuyingPrice * currentStock) + (newBuyingPrice * newStock)) / totalStock;
      // Round appropriately based on currency
      if (normalizedCurrency.toUpperCase() === 'USD') {
        averageBuyingPrice = Math.round(averageBuyingPrice * 100) / 100; // 2 decimal places for USD
      } else {
        averageBuyingPrice = Math.round(averageBuyingPrice); // Whole numbers for IQD
      }
    } else {
      averageBuyingPrice = newBuyingPrice;
    }
    
    console.log('🔢 [products.cjs] Price calculation:', {
      currentStock,
      currentBuyingPrice,
      newStock,
      newBuyingPrice,
      totalStock,
      averageBuyingPrice
    });
    
    // Update existing product with new stock and average buying price
    const result = db.prepare('UPDATE products SET buying_price=?, stock=? WHERE id=?')
      .run(averageBuyingPrice, totalStock, existingProduct.id);
    
    console.log('✅ [products.cjs] Product merged successfully:', { id: existingProduct.id, newStock: totalStock, newPrice: averageBuyingPrice });
    return { ...result, merged: true, productId: existingProduct.id };
  } else {
    console.log('➕ [products.cjs] Creating new product');
    
    // Create new product - force ID to be set properly
    const result = db.prepare('INSERT INTO products (name, buying_price, stock, archived, ram, storage, model, brand, category, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(normalizedName, buying_price, stock, archived, normalizedRam || null, normalizedStorage || null, normalizedModel || null, normalizedBrand || null, category, normalizedCurrency);
    
    // CRITICAL: Verify the product was created with a valid ID and repair if needed
    const newProductId = result.lastInsertRowid;
    const newProduct = db.prepare('SELECT * FROM products WHERE rowid = ?').get(newProductId);
    if (!newProduct || !newProduct.id) {
      console.log('⚠️ [products.cjs] Repairing product ID...');
      // Force repair immediately
      db.prepare('UPDATE products SET id = ? WHERE rowid = ?').run(newProductId, newProductId);
    }
    
    console.log('✅ [products.cjs] New product created:', { id: newProductId });
    return { ...result, merged: false, productId: newProductId };
  }
}

// Function to ensure product IDs are properly set after operations
function ensureValidProductId(db, productId) {
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  if (!product || !product.id) {
    console.error('⚠️ Product has NULL ID, attempting repair...');
    // Try to find by rowid and fix
    const productByRowid = db.prepare('SELECT rowid, * FROM products WHERE rowid = ? AND id IS NULL').get(productId);
    if (productByRowid) {
      db.prepare('UPDATE products SET id = ? WHERE rowid = ?').run(productByRowid.rowid, productByRowid.rowid);
      return productByRowid.rowid;
    }
  }
  return productId;
}

function updateProduct(db, { id, name, buying_price, stock, archived = 0, ram, storage, model, brand, category = 'phones', currency = 'IQD' }) {
  try {
    // Validate required fields
    if (!id) {
      throw new Error('Product ID is required for update');
    }
    if (!name || name.trim() === '') {
      throw new Error('Product name is required');
    }
    
    // Log the update operation
    console.log('🔄 [products.cjs] Updating product:', { 
      id, name, buying_price, stock, archived, ram, storage, model, brand, category, currency 
    });
    
    // Check if product exists first
    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
    if (!existing) {
      throw new Error(`Product with ID ${id} not found`);
    }
    
    const result = db.prepare('UPDATE products SET name=?, buying_price=?, stock=?, archived=?, ram=?, storage=?, model=?, brand=?, category=?, currency=? WHERE id=?')
      .run(name, buying_price, stock, archived, ram || null, storage || null, model || null, brand || null, category, currency, id);
    
    console.log('✅ [products.cjs] Product updated successfully:', { id, changes: result.changes });
    
    // Verify the update
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    console.log('🔍 [products.cjs] Updated product verification:', updated);
    
    return result;
  } catch (error) {
    console.error('❌ [products.cjs] updateProduct error:', error);
    throw error;
  }
}

function updateProductNoArchive(db, { id, name, buying_price, stock, ram, storage, brand }) {
  return db.prepare('UPDATE products SET name=?, buying_price=?, stock=?, ram=?, storage=?, brand=? WHERE id=?')
    .run(name, buying_price, stock, ram || null, storage || null, brand || null, id);
}

function addStock(db, id, amount) {
  return db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(amount, id);
}

function deleteProduct(db, id) {
  // Instead of deleting, archive the product to preserve foreign key integrity
  return db.prepare('UPDATE products SET archived = 1 WHERE id = ?').run(id);
}

module.exports = {
  getProducts,
  getArchivedProducts,
  getAllProducts,
  addProduct,
  updateProduct,
  updateProductNoArchive,
  addStock,
  deleteProduct,
  ensureValidProductId
};
