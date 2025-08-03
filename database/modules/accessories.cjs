// Accessories management functions

function getAccessories(db) {
  return db.prepare('SELECT * FROM accessories WHERE archived = 0').all();
}

function getAllAccessories(db) {
  return db.prepare('SELECT * FROM accessories').all();
}

function addAccessory(db, { name, buying_price, stock, archived = 0, brand, model, type, currency = 'IQD' }) {
  console.log('🔍 [accessories.cjs] addAccessory called with:', { name, brand, model, type, currency, buying_price, stock });
  
  // Normalize values for consistent comparison
  const normalizedName = (name || '').toString().trim();
  const normalizedBrand = (brand || '').toString().trim();
  const normalizedModel = (model || '').toString().trim();
  const normalizedType = (type || '').toString().trim();
  const normalizedCurrency = (currency || 'IQD').toString().trim();
  
  // Check if accessory with same specifications already exists
  const existingAccessory = db.prepare(`
    SELECT * FROM accessories 
    WHERE LOWER(TRIM(COALESCE(name, ''))) = LOWER(?) 
    AND LOWER(TRIM(COALESCE(brand, ''))) = LOWER(?) 
    AND LOWER(TRIM(COALESCE(model, ''))) = LOWER(?) 
    AND LOWER(TRIM(COALESCE(type, ''))) = LOWER(?) 
    AND LOWER(TRIM(COALESCE(currency, 'IQD'))) = LOWER(?) 
    AND archived = 0
  `).get(
    normalizedName, 
    normalizedBrand, 
    normalizedModel, 
    normalizedType, 
    normalizedCurrency
  );
  
  console.log('🔍 [accessories.cjs] Existing accessory search result:', existingAccessory);
  
  if (existingAccessory && existingAccessory.id) {
    console.log('🔄 [accessories.cjs] Merging with existing accessory ID:', existingAccessory.id);
    
    // Calculate new weighted average buying price
    const currentStock = Number(existingAccessory.stock) || 0;
    const currentBuyingPrice = Number(existingAccessory.buying_price) || 0;
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
    
    console.log('🔢 [accessories.cjs] Price calculation:', {
      currentStock,
      currentBuyingPrice,
      newStock,
      newBuyingPrice,
      totalStock,
      averageBuyingPrice
    });
    
    // Update existing accessory with new stock and average buying price
    const result = db.prepare('UPDATE accessories SET buying_price=?, stock=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(averageBuyingPrice, totalStock, existingAccessory.id);
    
    // Verify the accessory has a valid ID after update
    const updatedAccessory = db.prepare('SELECT id FROM accessories WHERE id = ?').get(existingAccessory.id);
    if (!updatedAccessory || !updatedAccessory.id) {
      console.error('⚠️ Accessory update resulted in NULL ID, attempting repair...');
      repairNullIds(db);
    }
    
    console.log('✅ [accessories.cjs] Accessory merged successfully:', { id: existingAccessory.id, newStock: totalStock, newPrice: averageBuyingPrice });
    return { ...result, merged: true, accessoryId: existingAccessory.id };
  } else {
    console.log('➕ [accessories.cjs] Creating new accessory');
    
    // Create new accessory
    const result = db.prepare('INSERT INTO accessories (name, buying_price, stock, archived, brand, model, type, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)')
      .run(normalizedName, buying_price, stock, archived, normalizedBrand || null, normalizedModel || null, normalizedType || null, normalizedCurrency);
    
    // Verify the new accessory has a valid ID
    const newAccessory = db.prepare('SELECT id FROM accessories WHERE rowid = ?').get(result.lastInsertRowid);
    if (!newAccessory || !newAccessory.id) {
      console.error('⚠️ Accessory insertion resulted in NULL ID, attempting repair...');
      repairNullIds(db);
    }
    
    const newAccessoryId = result.lastInsertRowid;
    console.log('✅ [accessories.cjs] New accessory created:', { id: newAccessoryId });
    return { ...result, merged: false, accessoryId: newAccessoryId };
  }
}

function updateAccessory(db, { id, name, buying_price, stock, archived = 0, brand, model, type, currency = 'IQD' }) {
  try {
    // Validate required fields
    if (!id) {
      throw new Error('Accessory ID is required for update');
    }
    if (!name || name.trim() === '') {
      throw new Error('Accessory name is required');
    }
    
    // Log the update operation
    console.log('🔄 [accessories.cjs] Updating accessory:', { 
      id, name, buying_price, stock, archived, brand, model, type, currency 
    });
    
    // Check if accessory exists first
    const existing = db.prepare('SELECT id FROM accessories WHERE id = ?').get(id);
    if (!existing) {
      throw new Error(`Accessory with ID ${id} not found`);
    }
    
    const result = db.prepare('UPDATE accessories SET name=?, buying_price=?, stock=?, archived=?, brand=?, model=?, type=?, currency=? WHERE id=?')
      .run(name, buying_price, stock, archived, brand || null, model || null, type || null, currency, id);
    
    console.log('✅ [accessories.cjs] Accessory updated successfully:', { id, changes: result.changes });
    
    // Verify the update
    const updated = db.prepare('SELECT * FROM accessories WHERE id = ?').get(id);
    console.log('🔍 [accessories.cjs] Updated accessory verification:', updated);
    
    return result;
  } catch (error) {
    console.error('❌ [accessories.cjs] updateAccessory error:', error);
    throw error;
  }
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
  getAllAccessories,
  addAccessory,
  updateAccessory,
  updateAccessoryNoArchive,
  addAccessoryStock,
  deleteAccessory,
  getArchivedAccessories,
  restoreAccessory,
  searchAccessories
};
