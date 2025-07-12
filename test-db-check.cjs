const Database = require('better-sqlite3');

try {
  const db = new Database('./database/shop.sqlite');
  
  console.log('=== Checking Recent Sale Items ===');
  const sales = db.prepare('SELECT * FROM sale_items ORDER BY id DESC LIMIT 5').all();
  
  sales.forEach(item => {
    console.log(`ID: ${item.id}`);
    console.log(`Name: ${item.name}`);
    console.log(`Price (selling_price): ${item.price}`);
    console.log(`Buying Price: ${item.buying_price}`);
    console.log(`Profit: ${item.profit}`);
    console.log(`Currency: ${item.currency}`);
    console.log(`Product Currency: ${item.product_currency}`);
    console.log('---');
  });
  
  db.close();
} catch (error) {
  console.error('Database check failed:', error.message);
}
