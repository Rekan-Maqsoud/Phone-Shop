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
  // Check if product with same name, brand, model, RAM, storage, and currency already exists
  const existingProduct = db.prepare(`
    SELECT * FROM products 
    WHERE name = ? AND COALESCE(brand, '') = ? AND COALESCE(model, '') = ? 
    AND COALESCE(ram, '') = ? AND COALESCE(storage, '') = ? 
    AND currency = ? AND archived = 0
  `).get(name, brand || '', model || '', ram || '', storage || '', currency);
  
  if (existingProduct && existingProduct.id) {
    // Calculate new average buying price
    const currentStock = existingProduct.stock;
    const currentBuyingPrice = existingProduct.buying_price;
    const newStock = Number(stock) || 0;
    const newBuyingPrice = Number(buying_price) || 0;
    
    const totalStock = currentStock + newStock;
    const averageBuyingPrice = totalStock > 0 ? 
      Math.round(((currentBuyingPrice * currentStock) + (newBuyingPrice * newStock)) / totalStock) : 
      newBuyingPrice;
    
    // Update existing product with new stock and average buying price
    const result = db.prepare('UPDATE products SET buying_price=?, stock=stock+?, ram=?, storage=?, model=?, brand=?, category=?, currency=? WHERE id=?')
      .run(averageBuyingPrice, newStock, ram || existingProduct.ram, storage || existingProduct.storage, model || existingProduct.model, brand || existingProduct.brand, category, currency, existingProduct.id);
    
    return result;
  } else {
    // Create new product - force ID to be set properly
    const result = db.prepare('INSERT INTO products (id, name, buying_price, stock, archived, ram, storage, model, brand, category, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(null, name, buying_price, stock, archived, ram || null, storage || null, model || null, brand || null, category, currency);
    
    // CRITICAL: Verify the product was created with a valid ID and repair if needed
    const newProductId = result.lastInsertRowid;
    const newProduct = db.prepare('SELECT * FROM products WHERE rowid = ?').get(newProductId);
    if (!newProduct || !newProduct.id) {
      // Force repair immediately
      db.prepare('UPDATE products SET id = ? WHERE rowid = ?').run(newProductId, newProductId);
    }
    
    return result;
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
