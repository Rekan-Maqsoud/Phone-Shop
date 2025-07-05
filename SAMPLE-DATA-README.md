# Sample Data Script

This script adds realistic sample data to your Mobile Roma application database.

## What it adds:

- **6 Products**: iPhone 15 Pro, Samsung Galaxy S24, iPhone 14, Google Pixel 8, OnePlus 12, Samsung Galaxy A54
- **8 Accessories**: AirPods Pro, Galaxy Buds2, iPhone Case, USB-C Charger, Wireless Charger, Power Bank, Screen Protector, Bluetooth Speaker
- **3 Sales Records**: Recent sales with different customers and items
- **3 Company Debt Records**: Both paid and unpaid company debts
- **3 Buying History Records**: Past purchases from suppliers

## How to use:

1. Make sure your application has been run at least once to create the database
2. Run the script using one of these methods:

### Method 1: Using npm script
```bash
npm run add-sample-data
```

### Method 2: Direct node execution
```bash
node add-sample-data.cjs
```

## Important Notes:

- The script will safely skip any items that already exist (no duplicates)
- You can run it multiple times without issues
- All sample data includes realistic prices, stock levels, and timestamps
- Sales records are created with dates from the past few days
- The script will show you exactly what was added

## Sample Data Details:

### Products:
- Mix of high-end and mid-range smartphones
- Realistic pricing (buying vs selling prices)
- Various RAM/Storage configurations
- Appropriate stock levels

### Accessories:
- Popular accessory types (earbuds, cases, chargers, etc.)
- Branded items from well-known manufacturers
- Profitable margins

### Sales:
- Customer names and realistic purchase combinations
- Recent timestamps to show up in reports
- Mix of single and multiple item sales

This sample data will help you:
- Test all features with realistic data
- See how reports and analytics look with actual content
- Demonstrate the application to others
- Get familiar with the interface using real-world examples
