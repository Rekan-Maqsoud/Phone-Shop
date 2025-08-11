# ZMC Debt Migration Fix - Implementation Summary

## What was fixed:

The ZMC company debt migration has been completely updated and enhanced to properly fix the double discount issue when users update their app.

## Changes made:

### 1. Enhanced Migration Logic (`database/modules/init.cjs`)
- **Multi-strategy search**: The migration now uses 3 different search strategies to find the ZMC debt:
  1. Exact company name match (`zmc`, `znc`, `z.m.c`, `z m c`) with amount 1421000
  2. Search by amount 1421000 only (for unpaid debts)  
  3. Search for similar amounts (1420000-1422000 IQD range)

- **Better error handling**: Includes comprehensive logging and debugging information
- **Safer updates**: Uses parameterized queries and proper transaction handling
- **Flexible matching**: Handles variations in company name formatting and whitespace

### 2. Migration runs automatically:
- When users update the app, the migration runs during database initialization
- The migration is idempotent (safe to run multiple times)
- Includes detailed logging so you can see what happened

### 3. Debugging tools created:
- `reset-zmc-migration.cjs` - Resets migration flag for testing
- `test-zmc-migration.cjs` - Tests the migration logic
- `check-all-debts.cjs` - Displays all company debts for debugging

## What happens when user updates:

1. User opens the updated app
2. Database initialization runs (`runMigrations` function)
3. Migration checks if ZMC debt fix was already applied
4. If not applied, searches for ZMC debt using multiple strategies:
   - Looks for company name "ZMC" with amount 1421000 IQD
   - If not found, searches any unpaid debt with amount 1421000 IQD
   - If still not found, searches for similar amounts (1420000-1422000 range)
5. When found, updates the debt amount from 1421000 to 1443000 IQD
6. Also updates related debt items proportionally if they exist
7. Marks migration as completed so it won't run again

## Migration Details:

**Target**: Change ZMC company debt from 1421000 IQD to 1443000 IQD  
**Reason**: Fix double discount that was incorrectly applied  
**Safety**: Only affects unpaid debts, includes comprehensive logging  
**Fallback**: If exact debt not found, shows all unpaid debts for manual review

## Console Output Example:
```
🔧 Fixing ZMC debt: ID 123, Company: ZMC, Amount: 1421000 IQD
✅ Successfully updated ZMC debt from 1421000 to 1443000 (difference: +22000 IQD)
✅ ZMC debt fix migration completed
```

## If Migration Doesn't Find Debt:
The migration will show debugging information:
```
ℹ️ No ZMC debt found matching search criteria
📋 Recent unpaid debts in database:
   ID: 1, Company: ABC Corp, Amount: 500000 IQD, Date: 2025-08-10...
   ID: 2, Company: XYZ Ltd, Amount: 750000 IQD, Date: 2025-08-09...
```

This allows manual verification and correction if needed.

## Files Modified:
- `database/modules/init.cjs` - Enhanced ZMC debt migration logic
- `database/reset-zmc-migration.cjs` - Reset tool for testing
- `database/test-zmc-migration.cjs` - Migration test tool
- `database/check-all-debts.cjs` - Debugging tool

The migration is now production-ready and will automatically fix the ZMC debt issue when your user updates the app.
