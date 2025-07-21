# Sample Data Guide for Phone Shop Management System

## Overview

The `add-sample-data.cjs` script creates comprehensive sample data for all sections of the Phone Shop application. Due to Node.js version compatibility issues with better-sqlite3, the script generates a SQL file that can be manually applied.

## How to Use Sample Data

### Option 1: Start the Application (Recommended)
1. Start your Phone Shop application: `npm run dev` or `npm run electron`
2. The application will automatically create and initialize the database
3. Sample data may be included during initialization

### Option 2: Manual SQL Application
1. Generate the SQL file: `npm run add-sample-data`
2. Apply using SQLite command line (if available):
   ```
   sqlite3 database/shop.sqlite ".read sample-data.sql"
   ```

### Option 3: Database Browser
1. Generate the SQL file: `npm run add-sample-data`
2. Open `database/shop.sqlite` with a SQLite browser (DB Browser for SQLite, etc.)
3. Execute the contents of `sample-data.sql`

## Sample Data Includes

### 📱 Products (15 items)
- **iPhones**: iPhone 15 Pro Max, iPhone 15 Pro, iPhone 14, iPhone 13
- **Samsung Galaxy**: S24 Ultra, S24, A54, A34
- **Xiaomi**: Xiaomi 14 Pro, Redmi Note 13 Pro, Redmi 13C
- **Local Brands**: Oppo A78, Vivo Y27, Realme C67, Honor X9b

### 🔌 Accessories (18 items)
- **Cases**: iPhone/Samsung/Universal cases
- **Screen Protectors**: Brand-specific and universal tempered glass
- **Chargers**: Apple MagSafe, Samsung fast chargers, generic USB-C
- **Cables**: Lightning, USB-C, Micro USB cables
- **Power Banks**: Anker, Samsung, Xiaomi power banks
- **Audio**: AirPods Pro 2, Galaxy Buds 2 Pro, wired earphones

### 💰 Financial Data
- **Customer Debts**: 5 sample customer payment plans and installments
- **Company Debts**: 4 supplier debts for inventory purchases
- **Personal Loans**: 3 personal loans with different amounts
- **Incentives**: 4 company bonuses and promotional incentives

### 📦 Business Records
- **Buying History**: 5 bulk purchase records from various suppliers
- **Sales History**: 4 complete sales with multiple items each
- **Shop Settings**: Initial balances, exchange rates, shop information

### 🏪 Shop Configuration
- **Name**: Mobile Roma
- **Location**: Erbil, Kurdistan Region, Iraq
- **Contact**: +964 750 123 4567
- **Initial Balances**: $5,000 USD + 7,200,000 IQD
- **Exchange Rates**: 1 USD = 1440 IQD

## Currency Support

The sample data includes both:
- **USD pricing** for premium phones and international accessories
- **IQD pricing** for local phones and generic accessories

## Features Demonstrated

All major application features are represented:
- ✅ Product inventory management
- ✅ Accessory catalog
- ✅ Customer debt tracking
- ✅ Company debt management
- ✅ Personal loan records
- ✅ Sales history with profit tracking
- ✅ Multi-currency support
- ✅ Buying/inventory history
- ✅ Incentive management

## Troubleshooting

### Node.js Version Issues
If you encounter better-sqlite3 compilation errors:
1. The script will generate `sample-data.sql` regardless
2. Use manual application methods above
3. Consider updating Node.js or rebuilding dependencies

### Database Not Found
- Ensure the application has been run at least once to create the database
- Check that `database/shop.sqlite` exists
- If missing, start the application first

### Duplicate Data
- The SQL uses `INSERT OR IGNORE` to prevent duplicates
- Safe to run multiple times
- Existing data won't be overwritten

## Clean Start

To start fresh with only sample data:
1. Delete `database/shop.sqlite`
2. Run `npm run add-sample-data`
3. Apply the generated SQL file
4. Start the application

---

**Note**: This sample data is designed for testing and demonstration purposes. It provides a realistic dataset to explore all features of the Phone Shop Management System.
