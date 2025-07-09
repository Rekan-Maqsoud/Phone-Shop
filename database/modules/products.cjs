// Product management functions

function getProducts(db) {
  return db.prepare('SELECT * FROM products WHERE archived = 0').all();
}

function addProduct(db, { name, buying_price, price, stock, archived = 0, ram, storage, model, category = 'phones', currency = 'IQD' }) {
  // Check if product with same name, specs, and currency already exists
  const existingProduct = db.prepare('SELECT * FROM products WHERE name = ? AND currency = ? AND archived = 0').get(name, currency);
  
  if (existingProduct) {
    // Calculate new average buying price
    const currentStock = existingProduct.stock;
    const currentBuyingPrice = existingProduct.buying_price || existingProduct.price;
    const newStock = Number(stock) || 0;
    const newBuyingPrice = Number(price || buying_price) || 0;
    
    const totalStock = currentStock + newStock;
    const averageBuyingPrice = totalStock > 0 ? 
      Math.round(((currentBuyingPrice * currentStock) + (newBuyingPrice * newStock)) / totalStock) : 
      newBuyingPrice;
    
    // Update existing product with new stock and average buying price
    return db.prepare('UPDATE products SET price=?, buying_price=?, stock=stock+?, ram=?, storage=?, model=?, category=?, currency=? WHERE id=?')
      .run(averageBuyingPrice, averageBuyingPrice, newStock, ram || existingProduct.ram, storage || existingProduct.storage, model || existingProduct.model, category, currency, existingProduct.id);
  } else {
    // Create new product
    return db.prepare('INSERT INTO products (name, price, buying_price, stock, archived, ram, storage, model, category, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(name, price || buying_price, price || buying_price, stock, archived, ram || null, storage || null, model || null, category, currency);
  }
}

function updateProduct(db, { id, name, buying_price, price, stock, archived = 0, ram, storage, model, category = 'phones', currency = 'IQD' }) {
  return db.prepare('UPDATE products SET name=?, price=?, buying_price=?, stock=?, archived=?, ram=?, storage=?, model=?, category=?, currency=? WHERE id=?')
    .run(name, price || buying_price, price || buying_price, stock, archived, ram || null, storage || null, model || null, category, currency, id);
}

function updateProductNoArchive(db, { id, name, price, stock, ram, storage }) {
  return db.prepare('UPDATE products SET name=?, price=?, buying_price=?, stock=?, ram=?, storage=? WHERE id=?')
    .run(name, price, price, stock, ram || null, storage || null, id);
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
  addProduct,
  updateProduct,
  updateProductNoArchive,
  addStock,
  deleteProduct
};
