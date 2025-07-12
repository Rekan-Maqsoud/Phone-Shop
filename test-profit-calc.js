const Database = require('better-sqlite3');
const path = require('path');

// Simple test to check profit calculation 
function testProfitCalculation() {
  const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
  const db = new Database(dbPath);
  
  console.log('=== Checking Sales Profit Calculation ===\n');
  
  // Get latest 3 sales
  const sales = db.prepare(`
    SELECT 
      s.id, 
      s.currency, 
      s.total,
      s.created_at,
      s.exchange_rate_usd_to_iqd,
      s.exchange_rate_iqd_to_usd
    FROM sales s 
    ORDER BY s.created_at DESC 
    LIMIT 3
  `).all();
  
  sales.forEach(sale => {
    console.log(`Sale ${sale.id} (${sale.currency}): Total ${sale.total}, Date: ${sale.created_at}`);
    console.log(`Exchange rates: USD->IQD: ${sale.exchange_rate_usd_to_iqd}, IQD->USD: ${sale.exchange_rate_iqd_to_usd}`);
    
    // Get sale items
    const items = db.prepare(`
      SELECT 
        si.name,
        si.quantity,
        si.buying_price,
        si.price as selling_price,
        si.profit as legacy_profit,
        si.product_currency,
        si.profit_in_sale_currency,
        si.buying_price_in_sale_currency
      FROM sale_items si 
      WHERE si.sale_id = ?
    `).all(sale.id);
    
    items.forEach(item => {
      console.log(`  Item: ${item.name}`);
      console.log(`    Quantity: ${item.quantity}`);
      console.log(`    Buying Price: ${item.buying_price} ${item.product_currency || 'IQD'}`);
      console.log(`    Selling Price: ${item.selling_price} ${sale.currency}`);
      console.log(`    Legacy Profit: ${item.legacy_profit}`);
      console.log(`    Profit in Sale Currency: ${item.profit_in_sale_currency} ${sale.currency}`);
      console.log(`    Buying Price in Sale Currency: ${item.buying_price_in_sale_currency} ${sale.currency}`);
      console.log('');
    });
    
    console.log('---\n');
  });
  
  db.close();
}

testProfitCalculation();
