# Sales Profit Calculation Fix Summary

## Issue Description
The sales history was showing incorrect profit calculations and currency displays when USD items were sold with IQD currency. Specifically:

1. **Currency Display Problem**: When a USD item (buying price: $1000) was sold with IQD payment, the buying price was incorrectly displayed as 1000 IQD instead of $1000 USD.

2. **Profit Calculation Issues**: Profits were not consistent across different payment methods for the same item, even though they should be the same (e.g., $100 profit).

3. **Multi-currency Display**: The system wasn't properly handling multi-currency payments and displaying the currencies correctly.

## Root Cause
The main issues were:

1. **UI Logic Errors**: The frontend components were recalculating profits instead of using the stored `profit_in_sale_currency` values that were correctly calculated at sale time.

2. **Currency Display Logic**: The buying price was being displayed in the sale currency instead of the product's original currency.

3. **Fallback Calculations**: Components were falling back to manual profit calculations with incorrect exchange rate logic.

## Fixes Applied

### 1. SalesHistoryTable.jsx
**File**: `src/components/SalesHistoryTable.jsx`

**Changes Made**:
- **Fixed `getTotals()` function**: Now properly separates buying prices by currency (USD/IQD) instead of mixing them
- **Updated profit calculation**: Uses stored `profit_in_sale_currency` values instead of recalculating
- **Improved display logic**: Shows buying prices in their original currencies with proper mixed currency display
- **Fixed `calculateTotals()` function**: Uses stored profit values instead of manual calculations

**Key Changes**:
```javascript
// Before: Mixed currency calculation that converted everything
totalBuyingOriginal += buyingPrice * qty;

// After: Separate currency tracking
if (productCurrency === 'USD') {
  totalBuyingUSD += buyingPrice * qty;
} else {
  totalBuyingIQD += buyingPrice * qty;
}

// Before: Manual profit calculation
let profitCalculated = 0;
// ... complex fallback logic

// After: Use stored profit values
if (item.profit_in_sale_currency !== undefined && item.profit_in_sale_currency !== null) {
  totalProfit += item.profit_in_sale_currency;
}
```

### 2. SaleDetailsModal.jsx
**File**: `src/components/SaleDetailsModal.jsx`

**Changes Made**:
- **Simplified `calcProfit()` function**: Always uses stored `profit_in_sale_currency` when available
- **Fixed `formatBuyingPrice()` function**: Always displays buying price in the product's original currency
- **Removed currency mismatch detection**: Eliminated complex heuristics that were causing confusion

**Key Changes**:
```javascript
// Before: Complex currency mismatch detection
if (productCurrency === 'IQD' && sale.currency === 'IQD' && buyingPrice > 0 && item.selling_price > 0) {
  const priceRatio = item.selling_price / buyingPrice;
  if (priceRatio > 1000) {
    productCurrency = 'USD'; // This was causing issues
  }
}

// After: Simple and direct
const formatBuyingPrice = (item) => {
  const productCurrency = item.product_currency || 'IQD';
  const buyingPrice = item.buying_price || 0;
  return formatCurrency(buyingPrice, productCurrency);
};
```

### 3. Database Logic Verification
**File**: `database/index.cjs`

**Verified Correct Implementation**:
- The `saveSale()` function correctly calculates `profit_in_sale_currency` at sale time
- Proper currency conversion using historical exchange rates
- Correct storage of both original and converted values

**The database already had correct logic**:
```javascript
// Correct profit calculation in sale currency
if (currency !== productCurrency) {
  if (currency === 'IQD' && productCurrency === 'USD') {
    buyingPriceInSaleCurrency = buyingPrice * currentUSDToIQD;
  }
}
profitInSaleCurrency = (sellingPrice - buyingPriceInSaleCurrency) * qty;
```

## Expected Results After Fix

### 1. Consistent Profit Display
- All sales of the same item with the same profit margin will show identical profit amounts
- Profit is always displayed in the currency the customer paid

### 2. Correct Currency Display
- **Buying Price**: Always shown in the product's original currency (e.g., $1000 USD)
- **Selling Price**: Always shown in the currency the customer paid (e.g., 1,584,000 IQD)
- **Profit**: Always shown in the currency the customer paid

### 3. Multi-Currency Support
- Proper display of mixed payments (e.g., "$500.00 + د.ع720,000")
- Correct profit calculations for multi-currency transactions

### 4. Example Scenario
For a USD item with buying price $1000 and selling price equivalent to $1100:

**Before Fix**:
- USD sale: Buying: $1000, Selling: $1100, Profit: $100 ✓
- IQD sale: Buying: 1000 IQD, Selling: 1,584,000 IQD, Profit: 1,583,000 IQD ✗

**After Fix**:
- USD sale: Buying: $1000 USD, Selling: $1100 USD, Profit: $100 USD ✓  
- IQD sale: Buying: $1000 USD, Selling: 1,584,000 IQD, Profit: 144,000 IQD ✓

## Database Schema
The database already had the correct structure with these key fields:
- `sale_items.profit_in_sale_currency`: Profit calculated in the currency customer paid
- `sale_items.product_currency`: Original currency of the product
- `sale_items.buying_price_in_sale_currency`: Buying price converted to sale currency
- `sales.exchange_rate_usd_to_iqd`: Historical exchange rate at time of sale

## Testing Recommendation
After applying these fixes:
1. Test selling USD items with IQD payments
2. Test selling IQD items with USD payments  
3. Test multi-currency payments
4. Verify the totals in the sales history match expected values
5. Check that the View modal shows correct currency displays
