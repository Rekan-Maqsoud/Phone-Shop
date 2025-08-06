# Fix for Duplicate Buying History Entries - SOLVED

## Problem Identified:
When using "Pay IQD" or "Pay USD" buttons, the system was creating duplicate entries in buying_history table and doubling the spending amount.

## Root Cause:
**Two functions were both adding buying history entries:**

1. **General `payCompanyDebtTotal`** function - Added TOTAL summary entries
2. **Forced payment functions** (`payCompanyDebtTotalForcedUSD` and `payCompanyDebtTotalForcedIQD`) - Added individual entries for EACH debt

When using forced payment buttons (Pay USD/Pay IQD), only the forced functions were called, but they were adding individual entries per debt instead of total entries.

## Solution Applied:

### ✅ **Removed Individual Per-Debt Entries**
- Removed individual `INSERT INTO buying_history` statements from forced payment functions
- These were creating multiple entries for each debt paid

### ✅ **Added Proper Total Entries**
- Added single total buying history entries to forced payment functions
- Now matches the behavior of the general payment function
- Entries are labeled clearly (e.g., "IQD debt payment (forced)" vs "USD debt payment (forced)")

## Code Changes:

### Before (PROBLEMATIC):
```javascript
// In forced payment functions - per debt entry
if (paymentFromIQDBalance > 0) {
  db.prepare(`INSERT INTO buying_history...`).run(
    `IQD Debt Payment - ${iqdDebt.description}`, // Individual debt entry
    1, paymentFromIQDBalance, 'IQD', now,
    iqdDebt.company_name, paymentFromIQDBalance
  );
}
```

### After (FIXED):
```javascript
// In forced payment functions - single total entry
if (totalPaidFromIQD > 0) {
  db.prepare(`INSERT INTO buying_history...`).run(
    `IQD debt payment (forced) - ${companyName}`, // Total entry
    companyName, 1, totalPaidFromIQD, 'IQD', totalPaidFromIQD, now,
    'IQD debt payment', null
  );
}
```

## Result:
✅ **"Pay IQD" button now creates only ONE buying history entry with the total amount**
✅ **"Pay USD" button now creates only ONE buying history entry with the total amount**  
✅ **No more duplicate entries or double spending amounts**
✅ **Consistent behavior across all payment methods**

## Files Modified:
- `database/modules/debts.cjs` - `payCompanyDebtTotalForcedUSD` function
- `database/modules/debts.cjs` - `payCompanyDebtTotalForcedIQD` function

The duplicate spending issue is now completely resolved!
