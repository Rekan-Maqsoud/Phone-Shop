# Secret Admin Console Commands

## Overview
This document describes the secret admin console commands available only to administrators with access to the browser developer console.

## ⚠️ WARNING
These commands directly modify the shop balance and should only be used by authorized administrators. Regular cashiers should NOT have access to these commands.

## How to Access

1. Open the Phone Shop application
2. Navigate to the Admin panel (click Admin button)
3. Press `F12` to open the browser developer console
4. Look for the message: "🔒 Secret admin commands available. Type __showSecretCommands() for help."

## Available Commands

### Show Help
```javascript
__showSecretCommands()
```
Displays all available secret commands with examples.

### Get Current Balances
```javascript
__getShopBalances()
```
Shows the current USD and IQD balances in the shop.

### Set Specific Balance
```javascript
__setShopBalance("USD", 5000)
__setShopBalance("IQD", 1000000)
```
Sets the shop balance to a specific amount.

### Adjust Balance (Add/Subtract)
```javascript
__adjustShopBalance("USD", 100)    // Add $100
__adjustShopBalance("USD", -50)    // Subtract $50
__adjustShopBalance("IQD", 50000)  // Add 50,000 IQD
__adjustShopBalance("IQD", -25000) // Subtract 25,000 IQD
```
Adjusts the current balance by adding or subtracting an amount.

## Examples

### Setting Initial Shop Balance
```javascript
// Set starting USD balance to $10,000
__setShopBalance("USD", 10000)

// Set starting IQD balance to 5,000,000 IQD
__setShopBalance("IQD", 5000000)
```

### Correcting Balance Errors
```javascript
// If balance is incorrect, check current balance first
__getShopBalances()

// Then adjust as needed
__adjustShopBalance("USD", -100)  // Remove $100 if balance is too high
__adjustShopBalance("IQD", 50000) // Add 50,000 IQD if balance is too low
```

## Security Notes

- These commands are only available in the admin panel
- They require access to the browser developer console
- Regular users (cashiers) should not know about these commands
- All balance changes are logged and backed up automatically
- Use responsibly and keep a record of any manual balance adjustments

## Troubleshooting

If the commands don't work:
1. Make sure you're on the Admin page
2. Refresh the page and try again
3. Check that the console shows the "Secret admin commands available" message
4. Verify you're typing the commands exactly as shown (case-sensitive)

## After Database Reset

After resetting all data and adding new products, if you encounter the "Insufficient stock for product: null" error:

1. These fixes should prevent the error automatically
2. If you still see issues, check the browser console for any warning messages
3. Make sure all products have valid IDs and stock quantities
4. Use the balance commands to set proper initial shop balances
