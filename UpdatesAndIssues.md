
updates from programmer after testing 

## FIXED ISSUES ✅

1- ✅ **Purchase returns fixed** - Fixed database return functions to work with actual table structure and handle both simple purchases and items with proper stock management.

2- ✅ **Loan payments fixed** - Fixed parameter mismatch in IPC handler for `markPersonalLoanPaid` function. The function now properly accepts payment data object.

4- ✅ **UnderCost warning cleaned up** - Removed debug console logs that were cluttering the output while keeping functionality intact.

5- ✅ **Customer debt returns fixed** - Fixed the blank sale refresh issue by simplifying the return flow and properly closing the modal after successful returns.

6- ✅ **Purchase modal currency totals fixed** - Improved currency conversion logic in AddPurchaseModal to show accurate combined totals.

## REMAINING ISSUES ⚠️

3- **Sales history table numbers** - The sales history table and sale details still need review for correct number display. 

**Note**: Issue #3 requires more specific information about which exact numbers are wrong and what they should show instead. The current implementation shows:
- Buying Price: Total buying cost for all items (in their original currencies)
- Selling Price: Individual item prices with discounts applied
- Total: Final payment amount (what customer actually paid)
- Profit: Calculated as selling minus buying price (accounting for exchange rates)

Please specify which of these calculations are incorrect and what the expected values should be.

**Lines in SalesHistoryTable.jsx that control display:**
- Line 124-200: `getSaleDetails()` function calculates all displayed values
- Line 287-297: Table row displays buying price, selling price, total, and profit
- Line 12-66: `calculateTotals()` function for summary statistics 

