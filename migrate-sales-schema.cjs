const createDb = require('./database/index.cjs');

async function migrateSalesSchema() {
  console.log('🔧 Starting sales schema migration...\n');
  
  try {
    const db = createDb();
    
    // Check if new columns exist
    const salesColumns = db.db.prepare("PRAGMA table_info(sales)").all();
    const saleItemsColumns = db.db.prepare("PRAGMA table_info(sale_items)").all();
    
    console.log('📊 Current sales table columns:', salesColumns.map(c => c.name).join(', '));
    console.log('📊 Current sale_items table columns:', saleItemsColumns.map(c => c.name).join(', '));
    
    // Add exchange rate columns to sales table if they don't exist
    const hasExchangeRateUSD = salesColumns.some(col => col.name === 'exchange_rate_usd_to_iqd');
    const hasExchangeRateIQD = salesColumns.some(col => col.name === 'exchange_rate_iqd_to_usd');
    
    if (!hasExchangeRateUSD) {
      console.log('➕ Adding exchange_rate_usd_to_iqd column to sales table...');
      db.db.prepare('ALTER TABLE sales ADD COLUMN exchange_rate_usd_to_iqd INTEGER DEFAULT 1440').run();
    }
    
    if (!hasExchangeRateIQD) {
      console.log('➕ Adding exchange_rate_iqd_to_usd column to sales table...');
      db.db.prepare('ALTER TABLE sales ADD COLUMN exchange_rate_iqd_to_usd REAL DEFAULT 0.000694').run();
    }
    
    // Add currency tracking columns to sale_items table if they don't exist
    const hasProductCurrency = saleItemsColumns.some(col => col.name === 'product_currency');
    const hasProfitInSaleCurrency = saleItemsColumns.some(col => col.name === 'profit_in_sale_currency');
    const hasBuyingPriceInSaleCurrency = saleItemsColumns.some(col => col.name === 'buying_price_in_sale_currency');
    
    if (!hasProductCurrency) {
      console.log('➕ Adding product_currency column to sale_items table...');
      db.db.prepare('ALTER TABLE sale_items ADD COLUMN product_currency TEXT DEFAULT "IQD"').run();
    }
    
    if (!hasProfitInSaleCurrency) {
      console.log('➕ Adding profit_in_sale_currency column to sale_items table...');
      db.db.prepare('ALTER TABLE sale_items ADD COLUMN profit_in_sale_currency INTEGER DEFAULT 0').run();
    }
    
    if (!hasBuyingPriceInSaleCurrency) {
      console.log('➕ Adding buying_price_in_sale_currency column to sale_items table...');
      db.db.prepare('ALTER TABLE sale_items ADD COLUMN buying_price_in_sale_currency INTEGER DEFAULT 0').run();
    }
    
    // Update existing sale_items with product currency information
    console.log('🔄 Updating existing sale items with product currency information...');
    
    // Get all sale items that need product currency updates
    const itemsToUpdate = db.db.prepare(`
      SELECT si.id, si.product_id, si.is_accessory, si.product_currency,
             p.currency as product_table_currency,
             a.currency as accessory_table_currency
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id AND si.is_accessory = 0
      LEFT JOIN accessories a ON si.product_id = a.id AND si.is_accessory = 1
      WHERE si.product_currency IS NULL OR si.product_currency = ''
    `).all();
    
    console.log(`📝 Found ${itemsToUpdate.length} sale items to update with product currency...`);
    
    const updateStmt = db.db.prepare('UPDATE sale_items SET product_currency = ? WHERE id = ?');
    
    for (const item of itemsToUpdate) {
      const productCurrency = item.is_accessory 
        ? (item.accessory_table_currency || 'IQD')
        : (item.product_table_currency || 'IQD');
      
      updateStmt.run(productCurrency, item.id);
    }
    
    // Update profit calculations for existing sales
    console.log('💰 Recalculating profits for existing sales...');
    
    const salesWithItems = db.db.prepare(`
      SELECT s.id, s.currency, s.exchange_rate_usd_to_iqd, s.exchange_rate_iqd_to_usd,
             si.id as item_id, si.quantity, si.buying_price, si.price as selling_price,
             si.product_currency, si.profit_in_sale_currency
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      WHERE si.profit_in_sale_currency IS NULL OR si.profit_in_sale_currency = 0
    `).all();
    
    console.log(`🧮 Found ${salesWithItems.length} sale items to recalculate profits...`);
    
    const updateProfitStmt = db.db.prepare(`
      UPDATE sale_items 
      SET profit_in_sale_currency = ?, buying_price_in_sale_currency = ? 
      WHERE id = ?
    `);
    
    for (const item of salesWithItems) {
      const quantity = item.quantity || 1;
      const buyingPrice = item.buying_price || 0;
      const sellingPrice = item.selling_price || 0;
      const productCurrency = item.product_currency || 'IQD';
      const saleCurrency = item.currency || 'IQD';
      
      // Use stored exchange rates or defaults
      const usdToIqd = item.exchange_rate_usd_to_iqd || 1440;
      const iqdToUsd = item.exchange_rate_iqd_to_usd || 0.000694;
      
      // Convert buying price to sale currency
      let buyingPriceInSaleCurrency = buyingPrice;
      if (saleCurrency !== productCurrency) {
        if (saleCurrency === 'USD' && productCurrency === 'IQD') {
          buyingPriceInSaleCurrency = buyingPrice * iqdToUsd;
        } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
          buyingPriceInSaleCurrency = buyingPrice * usdToIqd;
        }
      }
      
      const profitInSaleCurrency = (sellingPrice - buyingPriceInSaleCurrency) * quantity;
      
      updateProfitStmt.run(
        Math.round(profitInSaleCurrency), 
        Math.round(buyingPriceInSaleCurrency),
        item.item_id
      );
    }
    
    console.log('✅ Sales schema migration completed successfully!\n');
    
    // Verify the migration
    const updatedSalesColumns = db.db.prepare("PRAGMA table_info(sales)").all();
    const updatedSaleItemsColumns = db.db.prepare("PRAGMA table_info(sale_items)").all();
    
    console.log('📊 Updated sales table columns:', updatedSalesColumns.map(c => c.name).join(', '));
    console.log('📊 Updated sale_items table columns:', updatedSaleItemsColumns.map(c => c.name).join(', '));
    
    // Show some sample data
    const sampleSales = db.db.prepare(`
      SELECT s.id, s.currency, s.exchange_rate_usd_to_iqd,
             si.name, si.product_currency, si.profit_in_sale_currency
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      LIMIT 5
    `).all();
    
    console.log('\n📋 Sample migrated data:');
    sampleSales.forEach(sale => {
      console.log(`  Sale #${sale.id} (${sale.currency}): ${sale.name} - Product: ${sale.product_currency}, Profit: ${sale.profit_in_sale_currency}, Rate: ${sale.exchange_rate_usd_to_iqd}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateSalesSchema().catch(console.error);
}

module.exports = migrateSalesSchema;
