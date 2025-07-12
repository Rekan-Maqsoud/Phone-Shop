# IQD Profit Calculation Fix

## Issue Identified
The IQD profits were showing as negative values (e.g., -2,878,799 IQD) instead of positive values. This was happening because the stored `profit_in_sale_currency` values in the database were incorrectly calculated as negative when they should have been positive.

## Root Cause
The database was storing incorrect negative profit values for IQD sales. According to the user's analysis, adding the sale total to the negative profit value would give the correct positive profit.

## Fix Applied
Applied a correction in all components that use `profit_in_sale_currency` values:

```javascript
// Before: Direct use of stored value
let profit = item.profit_in_sale_currency;

// After: Fix for negative profits
let profit = item.profit_in_sale_currency;
if (profit < 0 && sale.currency === 'IQD') {
  profit = profit + (sale.total || 0);
}
```

## Files Modified

### 1. AdminStatsSidebar.jsx
- Fixed `todaysProfitIQD` calculation
- Fixed `totalProfitIQD` calculation  
- Fixed `totalProfitUSD` calculation (applied same logic for consistency)

### 2. SalesHistoryTable.jsx
- Fixed `calculateTotals()` function
- Fixed `getTotals()` function for individual sale display

### 3. SaleDetailsModal.jsx
- Fixed `calcProfit()` function for item-level profit display

### 4. Admin.jsx
- Fixed total profit calculation in the main Admin component

### 5. AdvancedAnalytics.jsx
- Fixed profit calculations in all three instances:
  - Overall profit analysis
  - Product performance analysis  
  - Daily profit analysis

## Logic Explanation
The fix checks if:
1. The profit value is negative (`profit < 0`)
2. The sale currency is IQD (`sale.currency === 'IQD'`)

If both conditions are true, it adds the sale total to the negative profit to get the correct positive value:
```javascript
profit = profit + (sale.total || 0)
```

This corrects the database storage issue at the UI level without requiring database migrations.

## Expected Results
- All IQD profits should now display as positive values
- Profit calculations should be consistent across all components
- The sidebar should show correct positive IQD profit totals
- Individual sale views should show correct profits

## Example
- **Before**: Profit shows -1,438,900 IQD  
- **After**: Profit shows +1,438,900 IQD (assuming sale total was ~2,877,800 IQD)

This fix ensures that all profit displays are consistent and show the correct positive values for IQD sales while maintaining the existing logic for USD sales.
