// Accessories management functions

function getAccessories(db) {
  return db.prepare('SELECT * FROM accessories WHERE archived = 0').all();
}

function addAccessory(db, { name, buying_price, stock, archived = 0, brand, model, type, currency = 'IQD' }) {
  // Check if accessory with same name, brand, model, and currency already exists
  const existingAccessory = db.prepare('SELECT * FROM accessories WHERE name = ? AND brand = ? AND model = ? AND currency = ? AND archived = 0')
    .get(name, brand || null, model || null, currency);
  
  if (existingAccessory) {
    // Calculate new average buying price
    const currentStock = existingAccessory.stock;
    const currentBuyingPrice = existingAccessory.buying_price;
    const newStock = Number(stock) || 0;
    const newBuyingPrice = Number(buying_price) || 0;
    
    const totalStock = currentStock + newStock;
    const averageBuyingPrice = totalStock > 0 ? 
      Math.round(((currentBuyingPrice * currentStock) + (newBuyingPrice * newStock)) / totalStock) : 
      newBuyingPrice;
    
    // Update existing accessory with new stock and average buying price
    const result = db.prepare('UPDATE accessories SET buying_price=?, stock=stock+?, type=?, currency=? WHERE id=?')
      .run(averageBuyingPrice, newStock, type || existingAccessory.type, currency, existingAccessory.id);
    
    // Verify the accessory has a valid ID after update
    const updatedAccessory = db.prepare('SELECT id FROM accessories WHERE id = ?').get(existingAccessory.id);
    if (!updatedAccessory || !updatedAccessory.id) {
      console.error('⚠️ Accessory update resulted in NULL ID, attempting repair...');
      repairNullIds(db);
    }
    
    return result;
  } else {
    // Create new accessory
    const result = db.prepare('INSERT INTO accessories (name, buying_price, stock, archived, brand, model, type, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(name, buying_price, stock, archived, brand || null, model || null, type || null, currency);
    
    // Verify the new accessory has a valid ID
    const newAccessory = db.prepare('SELECT id FROM accessories WHERE rowid = ?').get(result.lastInsertRowid);
    if (!newAccessory || !newAccessory.id) {
      console.error('⚠️ Accessory insertion resulted in NULL ID, attempting repair...');
      repairNullIds(db);
    }
    
    return result;
  }
}

function updateAccessory(db, { id, name, buying_price, stock, archived = 0, brand, model, type, currency = 'IQD' }) {
  return db.prepare('UPDATE accessories SET name=?, buying_price=?, stock=?, archived=?, brand=?, model=?, type=?, currency=? WHERE id=?')
    .run(name, buying_price, stock, archived, brand || null, model || null, type || null, currency, id);
}

function updateAccessoryNoArchive(db, { id, name, buying_price, stock, brand, model, type }) {
  return db.prepare('UPDATE accessories SET name=?, buying_price=?, stock=?, brand=?, model=?, type=? WHERE id=?')
    .run(name, buying_price, stock, brand || null, model || null, type || null, id);
}

function addAccessoryStock(db, id, amount) {
  return db.prepare('UPDATE accessories SET stock = stock + ? WHERE id = ?').run(amount, id);
}

function deleteAccessory(db, id) {
  // Instead of deleting, archive the accessory to preserve integrity
  return db.prepare('UPDATE accessories SET archived = 1 WHERE id = ?').run(id);
}

function getArchivedAccessories(db) {
  return db.prepare('SELECT * FROM accessories WHERE archived = 1').all();
}

function restoreAccessory(db, id) {
  return db.prepare('UPDATE accessories SET archived = 0 WHERE id = ?').run(id);
}

function searchAccessories(db, searchTerm) {
  const term = `%${searchTerm}%`;
  return db.prepare(`
    SELECT * FROM accessories 
    WHERE archived = 0 AND (
      name LIKE ? OR 
      brand LIKE ? OR 
      model LIKE ? OR 
      type LIKE ?
    )
  `).all(term, term, term, term);
}

// Simple repair function to fix NULL IDs
function repairNullIds(db) {
  try {
    const nullAccessories = db.prepare('SELECT rowid, * FROM accessories WHERE id IS NULL').all();
    if (nullAccessories.length > 0) {
      console.error(`🔧 Repairing ${nullAccessories.length} accessories with NULL IDs...`);
      
      for (const accessory of nullAccessories) {
        // Use rowid as the new ID
        db.prepare('UPDATE accessories SET id = ? WHERE rowid = ?').run(accessory.rowid, accessory.rowid);
      }
    }
  } catch (error) {
    console.error('Error repairing NULL IDs:', error);
    return 0;
  }
}

module.exports = {
  getAccessories,
  addAccessory,
  updateAccessory,
  updateAccessoryNoArchive,
  addAccessoryStock,
  deleteAccessory,
  getArchivedAccessories,
  restoreAccessory,
  searchAccessories
};
