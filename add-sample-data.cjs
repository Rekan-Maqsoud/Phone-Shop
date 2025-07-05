const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Path to the database
const dbPath = path.join(__dirname, 'database', 'shop.sqlite');

// Check if database file exists
if (!fs.existsSync(dbPath)) {
  console.error('Database file not found at:', dbPath);
  console.error('Please ensure the application has been run at least once to create the database.');
  process.exit(1);
}

// Connect to the database
const db = new Database(dbPath);

// Sample data
const sampleProducts = [
  {
    name: 'iPhone 15 Pro',
    brand: 'Apple',
    model: 'iPhone 15 Pro',
    price: 999.99,
    buying_price: 850.00,
    stock: 15,
    ram: '8GB',
    storage: '128GB',
    archived: 0
  },
  {
    name: 'Samsung Galaxy S24',
    brand: 'Samsung',
    model: 'Galaxy S24',
    price: 799.99,
    buying_price: 680.00,
    stock: 12,
    ram: '8GB',
    storage: '256GB',
    archived: 0
  },
  {
    name: 'iPhone 14',
    brand: 'Apple',
    model: 'iPhone 14',
    price: 699.99,
    buying_price: 599.00,
    stock: 8,
    ram: '6GB',
    storage: '128GB',
    archived: 0
  },
  {
    name: 'Google Pixel 8',
    brand: 'Google',
    model: 'Pixel 8',
    price: 599.99,
    buying_price: 520.00,
    stock: 6,
    ram: '8GB',
    storage: '128GB',
    archived: 0
  },
  {
    name: 'OnePlus 12',
    brand: 'OnePlus',
    model: 'OnePlus 12',
    price: 749.99,
    buying_price: 640.00,
    stock: 10,
    ram: '12GB',
    storage: '256GB',
    archived: 0
  },
  {
    name: 'Samsung Galaxy A54',
    brand: 'Samsung',
    model: 'Galaxy A54',
    price: 349.99,
    buying_price: 290.00,
    stock: 20,
    ram: '6GB',
    storage: '128GB',
    archived: 0
  }
];

const sampleAccessories = [
  {
    name: 'AirPods Pro',
    brand: 'Apple',
    model: 'AirPods Pro',
    type: 'earbuds',
    price: 199.99,
    buying_price: 170.00,
    stock: 25
  },
  {
    name: 'Samsung Galaxy Buds2',
    brand: 'Samsung',
    model: 'Galaxy Buds2',
    type: 'earbuds',
    price: 149.99,
    buying_price: 125.00,
    stock: 18
  },
  {
    name: 'iPhone 15 Case',
    brand: 'Apple',
    model: 'Silicone Case',
    type: 'case',
    price: 49.99,
    buying_price: 25.00,
    stock: 30
  },
  {
    name: 'USB-C Fast Charger',
    brand: 'Anker',
    model: 'PowerPort III',
    type: 'charger',
    price: 29.99,
    buying_price: 18.00,
    stock: 40
  },
  {
    name: 'Wireless Charger Pad',
    brand: 'Samsung',
    model: 'Wireless Charger',
    type: 'wireless-charger',
    price: 39.99,
    buying_price: 22.00,
    stock: 15
  },
  {
    name: 'Power Bank 10000mAh',
    brand: 'Anker',
    model: 'PowerCore 10000',
    type: 'power-bank',
    price: 59.99,
    buying_price: 35.00,
    stock: 12
  },
  {
    name: 'Screen Protector',
    brand: 'ZAGG',
    model: 'InvisibleShield',
    type: 'screen-protector',
    price: 24.99,
    buying_price: 12.00,
    stock: 50
  },
  {
    name: 'Bluetooth Speaker',
    brand: 'JBL',
    model: 'Clip 4',
    type: 'speaker',
    price: 79.99,
    buying_price: 55.00,
    stock: 8
  }
];

const sampleSales = [
  {
    customer_name: 'John Smith',
    items: JSON.stringify([
      {
        id: 1,
        name: 'iPhone 15 Pro',
        price: 999.99,
        buying_price: 850.00,
        quantity: 1,
        ram: '8GB',
        storage: '128GB',
        type: 'product'
      },
      {
        id: 1,
        name: 'AirPods Pro',
        price: 199.99,
        buying_price: 170.00,
        quantity: 1,
        type: 'accessory'
      }
    ]),
    total: 1199.98,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString() // 2 days ago
  },
  {
    customer_name: 'Sarah Johnson',
    items: JSON.stringify([
      {
        id: 2,
        name: 'Samsung Galaxy S24',
        price: 799.99,
        buying_price: 680.00,
        quantity: 1,
        ram: '8GB',
        storage: '256GB',
        type: 'product'
      },
      {
        id: 3,
        name: 'iPhone 15 Case',
        price: 49.99,
        buying_price: 25.00,
        quantity: 1,
        type: 'accessory'
      }
    ]),
    total: 849.98,
    created_at: new Date(Date.now() - 86400000 * 1).toISOString() // 1 day ago
  },
  {
    customer_name: 'Mike Davis',
    items: JSON.stringify([
      {
        id: 6,
        name: 'Samsung Galaxy A54',
        price: 349.99,
        buying_price: 290.00,
        quantity: 2,
        ram: '6GB',
        storage: '128GB',
        type: 'product'
      }
    ]),
    total: 699.98,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString() // 3 days ago
  }
];

const sampleCompanyDebts = [
  {
    company_name: 'TechSupply Co.',
    amount: 15000.00,
    description: 'Monthly phone inventory purchase',
    status: 'unpaid',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString() // 7 days ago
  },
  {
    company_name: 'AccessoryWorld',
    amount: 5500.00,
    description: 'Bulk accessory order - cases, chargers, and earbuds',
    status: 'paid',
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(), // 14 days ago
    paid_at: new Date(Date.now() - 86400000 * 5).toISOString() // 5 days ago
  },
  {
    company_name: 'ElectroHub',
    amount: 8200.00,
    description: 'Premium smartphone collection',
    status: 'unpaid',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString() // 4 days ago
  }
];

const sampleBuyingHistory = [
  {
    company_name: 'MobileDistributor Inc.',
    amount: 12500.00,
    description: 'iPhone and Samsung devices bulk purchase',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString() // 10 days ago
  },
  {
    company_name: 'AccessoryWorld',
    amount: 5500.00,
    description: 'Bulk accessory order - cases, chargers, and earbuds',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString() // 5 days ago
  },
  {
    company_name: 'TechGoods Ltd.',
    amount: 3200.00,
    description: 'Power banks and wireless chargers',
    created_at: new Date(Date.now() - 86400000 * 8).toISOString() // 8 days ago
  }
];

try {
  console.log('Starting sample data insertion...');

  // Insert sample products
  console.log('Inserting products...');
  const insertProduct = db.prepare(`
    INSERT INTO products (name, brand, model, price, buying_price, stock, ram, storage, archived)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const product of sampleProducts) {
    try {
      insertProduct.run(
        product.name,
        product.brand,
        product.model,
        product.price,
        product.buying_price,
        product.stock,
        product.ram,
        product.storage,
        product.archived
      );
      console.log(`✓ Added product: ${product.name}`);
    } catch (error) {
      console.log(`- Product ${product.name} may already exist, skipping...`);
    }
  }

  // Insert sample accessories
  console.log('\nInserting accessories...');
  const insertAccessory = db.prepare(`
    INSERT INTO accessories (name, brand, model, type, price, buying_price, stock)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const accessory of sampleAccessories) {
    try {
      insertAccessory.run(
        accessory.name,
        accessory.brand,
        accessory.model,
        accessory.type,
        accessory.price,
        accessory.buying_price,
        accessory.stock
      );
      console.log(`✓ Added accessory: ${accessory.name}`);
    } catch (error) {
      console.log(`- Accessory ${accessory.name} may already exist, skipping...`);
    }
  }

  // Insert sample sales
  console.log('\nInserting sales...');
  const insertSale = db.prepare(`
    INSERT INTO sales (customer_name, items, total, created_at)
    VALUES (?, ?, ?, ?)
  `);

  for (const sale of sampleSales) {
    try {
      insertSale.run(
        sale.customer_name,
        sale.items,
        sale.total,
        sale.created_at
      );
      console.log(`✓ Added sale for: ${sale.customer_name}`);
    } catch (error) {
      console.log(`- Sale for ${sale.customer_name} may already exist, skipping...`);
    }
  }

  // Insert sample company debts
  console.log('\nInserting company debts...');
  const insertCompanyDebt = db.prepare(`
    INSERT INTO company_debts (company_name, amount, description, status, created_at, paid_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const debt of sampleCompanyDebts) {
    try {
      insertCompanyDebt.run(
        debt.company_name,
        debt.amount,
        debt.description,
        debt.status,
        debt.created_at,
        debt.paid_at || null
      );
      console.log(`✓ Added company debt: ${debt.company_name} - $${debt.amount}`);
    } catch (error) {
      console.log(`- Company debt for ${debt.company_name} may already exist, skipping...`);
    }
  }

  // Insert sample buying history
  console.log('\nInserting buying history...');
  const insertBuyingHistory = db.prepare(`
    INSERT INTO buying_history (company_name, amount, description, created_at)
    VALUES (?, ?, ?, ?)
  `);

  for (const purchase of sampleBuyingHistory) {
    try {
      insertBuyingHistory.run(
        purchase.company_name,
        purchase.amount,
        purchase.description,
        purchase.created_at
      );
      console.log(`✓ Added buying history: ${purchase.company_name} - $${purchase.amount}`);
    } catch (error) {
      console.log(`- Buying history for ${purchase.company_name} may already exist, skipping...`);
    }
  }

  console.log('\n🎉 Sample data insertion completed successfully!');
  console.log('\nSummary of added data:');
  console.log(`- ${sampleProducts.length} products`);
  console.log(`- ${sampleAccessories.length} accessories`);
  console.log(`- ${sampleSales.length} sales records`);
  console.log(`- ${sampleCompanyDebts.length} company debt records`);
  console.log(`- ${sampleBuyingHistory.length} buying history records`);
  console.log('\nYou can now run the application to see the sample data!');

} catch (error) {
  console.error('Error inserting sample data:', error);
  process.exit(1);
} finally {
  db.close();
}
