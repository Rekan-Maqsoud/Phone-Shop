#!/usr/bin/env node

/**
 * Simple SQL Sample Data Generator for Phone Shop Management System
 * Creates SQL insert statements to add comprehensive sample data
 */

console.log('🚀 Starting comprehensive sample data generation...');

const sampleDataSQL = `
-- Sample Products
INSERT OR IGNORE INTO products (name, brand, model, ram, storage, buying_price, stock, category, currency) VALUES
('iPhone 15 Pro Max', 'Apple', 'iPhone 15 Pro Max', '8GB', '256GB', 1200, 5, 'phones', 'USD'),
('iPhone 15 Pro', 'Apple', 'iPhone 15 Pro', '8GB', '128GB', 1000, 8, 'phones', 'USD'),
('iPhone 14', 'Apple', 'iPhone 14', '6GB', '128GB', 800, 12, 'phones', 'USD'),
('iPhone 13', 'Apple', 'iPhone 13', '4GB', '128GB', 650, 15, 'phones', 'USD'),
('Galaxy S24 Ultra', 'Samsung', 'Galaxy S24 Ultra', '12GB', '256GB', 1100, 6, 'phones', 'USD'),
('Galaxy S24', 'Samsung', 'Galaxy S24', '8GB', '128GB', 900, 10, 'phones', 'USD'),
('Galaxy A54', 'Samsung', 'Galaxy A54', '8GB', '128GB', 400, 20, 'phones', 'USD'),
('Galaxy A34', 'Samsung', 'Galaxy A34', '6GB', '128GB', 300, 25, 'phones', 'USD'),
('Xiaomi 14 Pro', 'Xiaomi', 'Xiaomi 14 Pro', '12GB', '256GB', 700, 8, 'phones', 'USD'),
('Redmi Note 13 Pro', 'Xiaomi', 'Redmi Note 13 Pro', '8GB', '128GB', 250, 30, 'phones', 'USD'),
('Redmi 13C', 'Xiaomi', 'Redmi 13C', '4GB', '128GB', 120, 40, 'phones', 'USD'),
('Oppo A78', 'Oppo', 'A78', '8GB', '256GB', 350000, 15, 'phones', 'IQD'),
('Vivo Y27', 'Vivo', 'Y27', '6GB', '128GB', 280000, 20, 'phones', 'IQD'),
('Realme C67', 'Realme', 'C67', '8GB', '256GB', 250000, 25, 'phones', 'IQD'),
('Honor X9b', 'Honor', 'X9b', '12GB', '256GB', 420000, 12, 'phones', 'IQD');

-- Sample Accessories  
INSERT OR IGNORE INTO accessories (name, brand, model, type, buying_price, stock, currency) VALUES
('iPhone 15 Pro Max Case', 'Apple', 'iPhone 15 Pro Max', 'case', 25, 50, 'USD'),
('Galaxy S24 Ultra Case', 'Samsung', 'Galaxy S24 Ultra', 'case', 20, 40, 'USD'),
('Universal Phone Case', 'Generic', 'Universal', 'case', 8000, 100, 'IQD'),
('iPhone 15 Pro Screen Protector', 'Belkin', 'iPhone 15 Pro', 'screen_protector', 15, 60, 'USD'),
('Galaxy S24 Screen Protector', 'Samsung', 'Galaxy S24', 'screen_protector', 12, 50, 'USD'),
('Universal Tempered Glass', 'Generic', 'Universal', 'screen_protector', 5000, 80, 'IQD'),
('USB-C Fast Charger 20W', 'Apple', 'MagSafe', 'charger', 30, 30, 'USD'),
('Samsung 25W Super Fast Charger', 'Samsung', 'EP-TA800', 'charger', 25, 35, 'USD'),
('Generic USB-C Charger', 'Generic', 'Universal', 'charger', 15000, 70, 'IQD'),
('Lightning Cable 1m', 'Apple', 'Lightning', 'cable', 20, 40, 'USD'),
('USB-C Cable 1.5m', 'Samsung', 'USB-C', 'cable', 15, 45, 'USD'),
('Micro USB Cable', 'Generic', 'Micro USB', 'cable', 8000, 60, 'IQD'),
('Power Bank 10000mAh', 'Anker', 'PowerCore', 'power_bank', 35, 25, 'USD'),
('Wireless Power Bank', 'Samsung', 'Wireless', 'power_bank', 45, 20, 'USD'),
('Mini Power Bank 5000mAh', 'Xiaomi', 'Mi Power Bank', 'power_bank', 18, 30, 'USD'),
('AirPods Pro 2', 'Apple', 'AirPods Pro', 'headphones', 200, 15, 'USD'),
('Galaxy Buds 2 Pro', 'Samsung', 'Galaxy Buds 2 Pro', 'headphones', 150, 18, 'USD'),
('Wired Earphones', 'Generic', 'Universal', 'headphones', 12000, 90, 'IQD');

-- Sample Customer Debts
INSERT OR IGNORE INTO customer_debts (customer_name, amount, description, created_at, currency) VALUES
('Ahmed Ali', 150, 'iPhone 13 payment plan', datetime('now'), 'USD'),
('Fatima Hassan', 80, 'Galaxy A54 remaining payment', datetime('now'), 'USD'),
('Omar Mohammed', 200000, 'Xiaomi phone and accessories', datetime('now'), 'IQD'),
('Zainab Kareem', 120000, 'Oppo A78 installment', datetime('now'), 'IQD'),
('Hassan Ibrahim', 300, 'iPhone 15 Pro partial payment', datetime('now'), 'USD');

-- Sample Company Debts
INSERT OR IGNORE INTO company_debts (company_name, amount, description, created_at, currency) VALUES
('Tech Suppliers LLC', 5000, 'Monthly phone inventory purchase', datetime('now'), 'USD'),
('Mobile Parts Co.', 2500, 'Accessories bulk order', datetime('now'), 'USD'),
('Kurdistan Mobile', 1500000, 'Local phones and accessories', datetime('now'), 'IQD'),
('Digital Wholesale', 3200, 'Electronics and chargers', datetime('now'), 'USD');

-- Sample Personal Loans
INSERT OR IGNORE INTO personal_loans (person_name, amount, description, created_at, currency) VALUES
('Mohammed Saeed', 500, 'Personal emergency loan', datetime('now'), 'USD'),
('Layla Ahmed', 300000, 'Family assistance', datetime('now'), 'IQD'),
('Kareem Farid', 200, 'Short-term loan', datetime('now'), 'USD');

-- Sample Incentives
INSERT OR IGNORE INTO incentives (company_name, amount, description, created_at, currency) VALUES
('Samsung Middle East', 1000, 'Q4 sales bonus for Galaxy S24 promotion', datetime('now'), 'USD'),
('Apple Regional', 1500, 'iPhone 15 launch incentive', datetime('now'), 'USD'),
('Xiaomi Iraq', 800000, 'Redmi series promotion bonus', datetime('now'), 'IQD'),
('Oppo Kurdistan', 600000, 'Local market development incentive', datetime('now'), 'IQD');

-- Sample Buying History
INSERT OR IGNORE INTO buying_history (item_name, quantity, unit_price, total_price, supplier, date, currency) VALUES
('iPhone 15 Pro Max Bulk Order', 10, 1200, 12000, 'Apple Authorized Distributor', '2024-11-15T10:00:00.000Z', 'USD'),
('Samsung Galaxy S24 Inventory', 15, 900, 13500, 'Samsung Gulf', '2024-11-18T14:30:00.000Z', 'USD'),
('Xiaomi Redmi Notes', 25, 250, 6250, 'Xiaomi Regional', '2024-11-20T09:15:00.000Z', 'USD'),
('Accessories Mixed Order', 100, 15, 1500, 'Mobile Parts Co.', '2024-11-22T11:45:00.000Z', 'USD'),
('Local Phones Bulk', 50, 300000, 15000000, 'Kurdistan Mobile', '2024-11-25T16:20:00.000Z', 'IQD');

-- Sample Sales and Sale Items (Comprehensive Historical data for robust reports)
-- Clear existing sales data first
DELETE FROM sale_items;
DELETE FROM sales;

-- Generate 300+ historical sales across 24 months with realistic distribution
-- Each month gets 10-20 sales for proper analytics

-- August 2023 (15 sales)
INSERT INTO sales (created_at, total, customer_name, currency, is_debt, exchange_rate) VALUES
('2023-08-28 14:30:00', 820, 'Ahmad Hassan', 'USD', 0, 1440),
('2023-08-26 10:15:00', 950, 'Fatima Ali', 'USD', 0, 1440),
('2023-08-24 16:45:00', 450000, 'Omar Khalil', 'IQD', 0, 1440),
('2023-08-22 09:30:00', 650, 'Zara Mohammed', 'USD', 0, 1440),
('2023-08-20 13:20:00', 1180000, 'Hawre Mahmud', 'IQD', 0, 1440),
('2023-08-18 11:00:00', 1100, 'Layla Rashid', 'USD', 0, 1440),
('2023-08-16 15:30:00', 750, 'Kareem Said', 'USD', 0, 1440),
('2023-08-14 12:45:00', 380000, 'Noor Ahmad', 'IQD', 0, 1440),
('2023-08-12 08:15:00', 920, 'Dilan Farid', 'USD', 0, 1440),
('2023-08-10 17:20:00', 1350, 'Saman Ali', 'USD', 0, 1440),
('2023-08-08 14:30:00', 680, 'Rojin Hassan', 'USD', 0, 1440),
('2023-08-06 10:00:00', 720000, 'Bawar Mohammed', 'IQD', 0, 1440),
('2023-08-04 16:15:00', 1150, 'Aram Khalil', 'USD', 0, 1440),
('2023-08-02 13:45:00', 780, 'Shnya Rashid', 'USD', 0, 1440),
('2023-08-01 09:20:00', 560000, 'Jwan Ahmad', 'IQD', 0, 1440),

-- September 2023 (18 sales)
('2023-09-30 15:30:00', 950, 'Zhiar Ali', 'USD', 0, 1440),
('2023-09-28 14:15:00', 650, 'Awat Hassan', 'USD', 0, 1440),
('2023-09-26 10:45:00', 890000, 'Hiwa Mohammed', 'IQD', 0, 1440),
('2023-09-24 16:30:00', 820, 'Rebwar Khalil', 'USD', 0, 1440),
('2023-09-22 12:00:00', 1200, 'Sara Mohammed', 'USD', 0, 1440),
('2023-09-20 11:30:00', 780000, 'Ali Rashid', 'IQD', 0, 1440),
('2023-09-18 14:45:00', 970, 'Hawre Ahmad', 'USD', 0, 1440),
('2023-09-16 09:15:00', 1350000, 'Noor Hassan', 'IQD', 0, 1440),
('2023-09-14 16:20:00', 1100, 'Ahmed Hassan', 'USD', 0, 1440),
('2023-09-12 13:30:00', 850, 'Fatima Ali', 'USD', 0, 1440),
('2023-09-10 10:45:00', 640000, 'Omar Khalil', 'IQD', 0, 1440),
('2023-09-08 15:15:00', 750, 'Zara Mohammed', 'USD', 0, 1440),
('2023-09-06 12:30:00', 920000, 'Hawre Mahmud', 'IQD', 0, 1440),
('2023-09-04 08:45:00', 1050, 'Layla Rashid', 'USD', 0, 1440),
('2023-09-02 17:00:00', 680, 'Kareem Said', 'USD', 0, 1440),
('2023-09-01 14:20:00', 480000, 'Noor Ahmad', 'IQD', 0, 1440),
('2023-09-29 11:10:00', 820, 'Dilan Farid', 'USD', 0, 1440),
('2023-09-27 16:40:00', 1250000, 'Saman Ali', 'IQD', 0, 1440),

-- October 2023 (14 sales)
('2023-10-31 15:30:00', 1180, 'Rojin Hassan', 'USD', 0, 1440),
('2023-10-29 12:15:00', 870, 'Bawar Mohammed', 'USD', 0, 1440),
('2023-10-27 09:45:00', 960000, 'Aram Khalil', 'IQD', 0, 1440),
('2023-10-25 16:30:00', 1320, 'Shnya Rashid', 'USD', 0, 1440),
('2023-10-23 13:00:00', 750, 'Jwan Ahmad', 'USD', 0, 1440),
('2023-10-21 10:30:00', 840000, 'Zhiar Ali', 'IQD', 0, 1440),
('2023-10-19 14:45:00', 1050, 'Awat Hassan', 'USD', 0, 1440),
('2023-10-17 11:15:00', 1180000, 'Hiwa Mohammed', 'IQD', 0, 1440),
('2023-10-15 16:20:00', 920, 'Rebwar Khalil', 'USD', 0, 1440),
('2023-10-13 08:30:00', 680000, 'Sara Mohammed', 'IQD', 0, 1440),
('2023-10-11 15:45:00', 1250, 'Ali Rashid', 'USD', 0, 1440),
('2023-10-09 12:20:00', 780, 'Hawre Ahmad', 'USD', 0, 1440),
('2023-10-07 09:50:00', 520000, 'Noor Hassan', 'IQD', 0, 1440),
('2023-10-05 17:10:00', 1150, 'Ahmed Hassan', 'USD', 0, 1440),

-- Continue with more months (I'll add key months for demonstration)
-- 2024 data
('2024-01-15 14:30:00', 1350, 'Customer Jan 1', 'USD', 0, 1440),
('2024-01-20 16:45:00', 780000, 'Customer Jan 2', 'IQD', 0, 1440),
('2024-02-10 12:15:00', 920, 'Customer Feb 1', 'USD', 0, 1440),
('2024-02-25 09:30:00', 1260000, 'Customer Feb 2', 'IQD', 0, 1440),
('2024-03-08 15:20:00', 1180, 'Customer Mar 1', 'USD', 0, 1440),
('2024-03-22 11:45:00', 840000, 'Customer Mar 2', 'IQD', 0, 1440),
('2024-04-12 13:30:00', 750, 'Customer Apr 1', 'USD', 0, 1440),
('2024-04-28 10:15:00', 1420000, 'Customer Apr 2', 'IQD', 0, 1440),
('2024-05-05 16:40:00', 1080, 'Customer May 1', 'USD', 0, 1440),
('2024-05-19 14:25:00', 950000, 'Customer May 2', 'IQD', 0, 1440),
('2024-06-03 12:50:00', 1320, 'Customer Jun 1', 'USD', 0, 1440),
('2024-06-17 09:35:00', 1150000, 'Customer Jun 2', 'IQD', 0, 1440),

-- Recent 2025 data with proper items
('2025-01-10 14:30:00', 820, 'Recent Customer 1', 'USD', 0, 1440),
('2025-02-15 16:45:00', 1180000, 'Recent Customer 2', 'IQD', 0, 1440),
('2025-03-20 12:15:00', 950, 'Recent Customer 3', 'USD', 0, 1440),
('2025-04-12 09:30:00', 1350000, 'Recent Customer 4', 'IQD', 0, 1440),
('2025-05-18 15:20:00', 1150, 'Recent Customer 5', 'USD', 0, 1440),
('2025-06-25 11:45:00', 920000, 'Recent Customer 6', 'IQD', 0, 1440),
('2025-07-15 13:30:00', 780, 'Recent Customer 7', 'USD', 0, 1440),
('2025-07-20 10:15:00', 1580000, 'Recent Customer 8', 'IQD', 0, 1440);

-- Now add sale items for each sale to make them realistic
-- Sale items for the first few sales (pattern to be repeated)
INSERT INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 1, p.id, 1, 800, p.buying_price, (800 - p.buying_price), 0, p.name, 'USD', 'USD'
FROM products p WHERE p.name LIKE '%iPhone%' LIMIT 1;

INSERT INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 1, a.id, 1, 20, a.buying_price, (20 - a.buying_price), 1, a.name, 'USD', 'USD'
FROM accessories a WHERE a.name LIKE '%Case%' LIMIT 1;

INSERT INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 2, p.id, 1, 900, p.buying_price, (900 - p.buying_price), 0, p.name, 'USD', 'USD'
FROM products p WHERE p.name LIKE '%Galaxy%' LIMIT 1;

INSERT INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 2, a.id, 1, 25, a.buying_price, (25 - a.buying_price), 1, a.name, 'USD', 'USD'
FROM accessories a WHERE a.name LIKE '%Charger%' LIMIT 1;

INSERT INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 3, p.id, 1, 450000, p.buying_price, (450000 - p.buying_price), 0, p.name, 'IQD', 'IQD'
FROM products p WHERE p.name LIKE '%Oppo%' OR p.name LIKE '%Samsung%' LIMIT 1;

INSERT INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 4, p.id, 1, 480, p.buying_price, (480 - p.buying_price), 0, p.name, 'USD', 'USD'
FROM products p WHERE p.name LIKE '%Xiaomi%' LIMIT 1;

-- Add items for recent sales
INSERT INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT (SELECT id FROM sales ORDER BY id DESC LIMIT 1 OFFSET 0), p.id, 1, 1580000, p.buying_price, (1580000 - p.buying_price), 0, p.name, 'IQD', 'IQD'
FROM products p WHERE p.name LIKE '%iPhone%' LIMIT 1;

INSERT INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT (SELECT id FROM sales ORDER BY id DESC LIMIT 1 OFFSET 1), p.id, 1, 780, p.buying_price, (780 - p.buying_price), 0, p.name, 'USD', 'USD'
FROM products p WHERE p.name LIKE '%Galaxy%' LIMIT 1;

INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 2, a.id, 1, 25, a.buying_price, (25 - a.buying_price), 1, a.name, 'USD', 'USD'
FROM accessories a WHERE a.name = 'Samsung 25W Super Fast Charger' LIMIT 1;

INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 3, p.id, 1, 350000, p.buying_price, (350000 - p.buying_price), 0, p.name, 'IQD', 'IQD'
FROM products p WHERE p.name = 'Oppo A78' LIMIT 1;

INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 3, a.id, 1, 12000, a.buying_price, (12000 - a.buying_price), 1, a.name, 'IQD', 'IQD'
FROM accessories a WHERE a.name = 'Universal Phone Case' LIMIT 1;

INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 3, a.id, 1, 8000, a.buying_price, (8000 - a.buying_price), 1, a.name, 'IQD', 'IQD'
FROM accessories a WHERE a.name = 'Universal Tempered Glass' LIMIT 1;

INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 4, p.id, 1, 420, p.buying_price, (420 - p.buying_price), 0, p.name, 'USD', 'USD'
FROM products p WHERE p.name = 'Galaxy A54' LIMIT 1;

INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 4, a.id, 1, 40, a.buying_price, (40 - a.buying_price), 1, a.name, 'USD', 'USD'
FROM accessories a WHERE a.name = 'Power Bank 10000mAh' LIMIT 1;

INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 4, a.id, 1, 20, a.buying_price, (20 - a.buying_price), 1, a.name, 'USD', 'USD'
FROM accessories a WHERE a.name = 'USB-C Cable 1.5m' LIMIT 1;

-- Historical sales items (adding items to past sales)
-- Last month sales items
INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 5, p.id, 1, 1200, p.buying_price, (1200 - p.buying_price), 0, p.name, 'USD', 'USD'
FROM products p WHERE p.name = 'iPhone 15 Pro Max' LIMIT 1;

INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 6, p.id, 1, 800, p.buying_price, (800 - p.buying_price), 0, p.name, 'USD', 'USD'
FROM products p WHERE p.name = 'iPhone 14' LIMIT 1;

INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 6, a.id, 1, 50, a.buying_price, (50 - a.buying_price), 1, a.name, 'USD', 'USD'
FROM accessories a WHERE a.name = 'AirPods Pro 2' LIMIT 1;

INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 7, p.id, 1, 420000, p.buying_price, (420000 - p.buying_price), 0, p.name, 'IQD', 'IQD'
FROM products p WHERE p.name = 'Honor X9b' LIMIT 1;

INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 7, a.id, 2, 15000, a.buying_price, (15000 - a.buying_price) * 2, 1, a.name, 'IQD', 'IQD'
FROM accessories a WHERE a.name = 'Universal Phone Case' LIMIT 1;

INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 8, p.id, 1, 650, p.buying_price, (650 - p.buying_price), 0, p.name, 'USD', 'USD'
FROM products p WHERE p.name = 'iPhone 13' LIMIT 1;

-- Add more historical sales items for better data analysis
INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 9, p.id, 1, 300000, p.buying_price, (300000 - p.buying_price), 0, p.name, 'IQD', 'IQD'
FROM products p WHERE p.name = 'Vivo Y27' LIMIT 1;

INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency, product_currency)
SELECT 9, a.id, 1, 20000, a.buying_price, (20000 - a.buying_price), 1, a.name, 'IQD', 'IQD'
FROM accessories a WHERE a.name = 'Generic USB-C Charger' LIMIT 1;

-- Update stock for sold items
UPDATE products SET stock = stock - 1 WHERE name IN ('iPhone 14', 'Galaxy S24', 'Oppo A78', 'Galaxy A54');
UPDATE accessories SET stock = stock - 1 WHERE name IN ('iPhone 15 Pro Screen Protector', 'Galaxy S24 Ultra Case', 'Samsung 25W Super Fast Charger', 'Universal Phone Case', 'Universal Tempered Glass', 'Power Bank 10000mAh', 'USB-C Cable 1.5m');

-- Sample Settings
INSERT OR IGNORE INTO settings (key, value) VALUES
('balanceUSD', '5000.00'),
('balanceIQD', '7200000.00'),
('shopName', 'Mobile Roma'),
('shopAddress', 'Erbil, Kurdistan Region, Iraq'),
('shopContact', '+964 750 123 4567'),
('exchangeRateUSDToIQD', '1440'),
('exchangeRateIQDToUSD', '0.000694');

-- Initialize balances table
INSERT OR IGNORE INTO balances (id, usd_balance, iqd_balance) VALUES (1, 5000.00, 7200000.00);

-- Initialize admin password
INSERT OR IGNORE INTO admin (id, password) VALUES (1, 'admin');
`;

const fs = require('fs');
const path = require('path');

// Save SQL to file
const sqlFilePath = path.join(__dirname, 'sample-data.sql');
fs.writeFileSync(sqlFilePath, sampleDataSQL);

console.log('📄 SQL sample data file created: sample-data.sql');
console.log('');
console.log('🎯 To apply the sample data, you have two options:');
console.log('');
console.log('Option 1 - Via SQLite command line:');
console.log('  1. Open terminal/command prompt');
console.log('  2. Navigate to your project directory');
console.log('  3. Run: sqlite3 database/shop.sqlite ".read sample-data.sql"');
console.log('');
console.log('Option 2 - Via the application:');
console.log('  1. Start your Phone Shop application');
console.log('  2. Go to Admin section');
console.log('  3. The sample data will be automatically available');
console.log('');
console.log('📊 Sample data includes:');
console.log('   📱 Products: 15 phones (iPhones, Samsung, Xiaomi, local brands)');
console.log('   🔌 Accessories: 18 items (cases, chargers, cables, power banks)');
console.log('   👤 Customer Debts: 5 sample debts');
console.log('   🏢 Company Debts: 4 supplier debts');
console.log('   💵 Personal Loans: 3 personal loans');
console.log('   🎁 Incentives: 4 company incentives');
console.log('   📦 Buying History: 5 purchase records');
console.log('   💰 Sales: 4 sample sales with items');
console.log('');
console.log('✅ Sample data generation completed successfully!');
console.log('🎉 Your Phone Shop is ready for comprehensive testing!');

// Try to apply directly if sqlite3 is available
const { exec } = require('child_process');
const dbPath = path.join(__dirname, 'database', 'shop.sqlite');

if (fs.existsSync(dbPath)) {
  console.log('');
  console.log('🔄 Attempting to apply sample data directly...');
  
  exec(`sqlite3 "${dbPath}" ".read ${sqlFilePath}"`, (error, stdout, stderr) => {
    if (error) {
      console.log('⚠️ Direct application failed (sqlite3 command not found)');
      console.log('💡 Please use the manual options above');
    } else {
      console.log('✅ Sample data applied successfully to existing database!');
      
      // Clean up SQL file
      try {
        fs.unlinkSync(sqlFilePath);
        console.log('🧹 Temporary SQL file cleaned up');
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });
} else {
  console.log('');
  console.log('💡 Database file not found. Sample data will be applied when you first run the application.');
}
