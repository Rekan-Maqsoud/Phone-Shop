# Monthly Report Profit Calculation Fix

## Problem Identified
The monthly report was showing incorrect profit calculations due to several issues:

1. **Inconsistent Profit Calculation**: The component was manually calculating profit by subtracting buying costs from selling prices, which didn't account for:
   - Discounts applied to sales
   - Exchange rate conversions at the time of sale
   - Multi-currency payment scenarios

2. **Not Using Stored Values**: The database already stores pre-calculated `profit_in_sale_currency` values that account for all discounts and currency conversions, but the monthly report wasn't using them.

3. **Double Calculation**: The component was calculating both total profit and product/accessory profits separately using different methods, leading to inconsistencies.

4. **Incomplete Spending Calculation**: The spending calculation was only using transactions table and missing direct buying history entries.

## Solution Implemented

### 1. Fixed Profit Calculation (Lines 113-150 in MonthlyReport.jsx)
- **Before**: Manually calculated profit using `(sellingPrice - buyingPrice) * quantity` with complex currency conversion logic
- **After**: Uses stored `profit_in_sale_currency` values from the database which already account for:
  - All discounts (per-item and global)
  - Proper currency conversion at sale time
  - Multi-currency payment scenarios

```jsx
// FIXED: Use stored profit values from database (profit_in_sale_currency) which accounts for discounts
const storedProfit = Number(item.profit_in_sale_currency) || Number(item.profit) || 0;

// Convert profit to display currencies for proper tracking
if (sale.currency === 'USD') {
  totalProfit.USD += storedProfit;
  if (isProduct) {
    totalProductProfit.USD += storedProfit;
  }
  if (isAccessory) {
    totalAccessoryProfit.USD += storedProfit;
  }
} else {
  totalProfit.IQD += storedProfit;
  if (isProduct) {
    totalProductProfit.IQD += storedProfit;
  }
  if (isAccessory) {
    totalAccessoryProfit.IQD += storedProfit;
  }
}
```

### 2. Enhanced Spending Calculation (Lines 158-212)
- **Before**: Only used transactions table, missing direct purchases from buying_history
- **After**: Combines both buying_history and transactions for complete spending tracking:

```jsx
// First, add buying history spending for the month
if (buyingHistory && Array.isArray(buyingHistory)) {
  const monthBuyingHistory = buyingHistory.filter(purchase => {
    const purchaseDate = new Date(purchase.date || purchase.created_at);
    return purchaseDate >= startDate && purchaseDate <= endDate;
  });

  monthBuyingHistory.forEach(purchase => {
    if (purchase.currency === 'MULTI') {
      totalSpending.USD += purchase.multi_currency_usd || 0;
      totalSpending.IQD += purchase.multi_currency_iqd || 0;
    } else if (purchase.currency === 'USD') {
      totalSpending.USD += purchase.total_price || purchase.amount || 0;
    } else {
      totalSpending.IQD += purchase.total_price || purchase.amount || 0;
    }
  });
}

// Then, add transaction-based spending (company debt payments, etc.)
```

## Benefits of the Fix

1. **Accuracy**: Profit calculations now match the exact profit stored at the time of sale, accounting for all discounts and currency conversions.

2. **Consistency**: Total profit and product/accessory profit breakdowns are now calculated using the same method, ensuring consistency.

3. **Performance**: Using pre-calculated values is more efficient than recalculating profit from scratch.

4. **Maintainability**: Less complex logic, relying on database-stored values that are calculated once during sale creation.

5. **Complete Spending Tracking**: Now includes all spending sources (direct purchases and other payments) for accurate monthly spending totals.

## Data Context Integration
The fix properly uses the DataContext as requested, utilizing:
- `sales` array with embedded `items` containing `profit_in_sale_currency`
- `buyingHistory` array for spending calculations
- `transactions` array for additional spending tracking
- `debts` array to determine if sales are paid

## Testing
To verify the fix:
1. Check a month with sales that had discounts applied
2. Compare total profit with the sum of product profit + accessory profit
3. Verify that multi-currency sales show correct profit amounts
4. Confirm that spending includes both purchases and debt payments

The monthly report should now show accurate profit calculations that match the detailed profit information shown in individual sale details.
