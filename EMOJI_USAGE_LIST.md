# Emoji Usage List - Phone Shop Project

Complete list of all emojis used in the project with their file paths and line numbers:

## Administrative & Navigation Emojis

### ⚙️ Settings/Configuration
- `.github/copilot-instructions.md:8` - Execution Rules header

### 📊 Dashboard/Analytics
- `src/pages/Admin.jsx:118` - Dashboard tab icon
- `src/pages/Admin.jsx:126` - Monthly reports tab icon
- `src/components/AdminDashboard.jsx:89` - Business overview title
- `src/components/AdminDashboard.jsx:213` - Dashboard section icon
- `src/components/AdminDashboard.jsx:337` - Sales history navigation icon

### 📦 Products
- `src/pages/Admin.jsx:119` - Products tab icon
- `src/components/BuyingHistoryTable.jsx:225` - "With Items" button
- `src/components/BuyingHistoryTable.jsx:260` - Purchased items section title
- `src/components/AdminDashboard.jsx:168` - Product stats icon
- `src/components/AdminDashboard.jsx:335` - Products navigation description
- `src/components/AddPurchaseModal.jsx:265` - Purchase items section
- `src/components/AddPurchaseModal.jsx:362` - Items section title

### 🎧 Accessories
- `src/pages/Admin.jsx:120` - Accessories tab icon
- `src/components/BuyingHistoryTable.jsx:266` - Accessory item type indicator (2 instances)
- `src/components/AdminDashboard.jsx:336` - Accessories navigation description
- `src/components/AddPurchaseModal.jsx:377` - Add accessory button
- `src/components/AddPurchaseModal.jsx:397` - Accessory item type indicator (2 instances)
- `src/components/EnhancedCompanyDebtModal.jsx:170` - Debt item type indicator
- `src/components/CashierContent.jsx:552` - Cart item type indicator
- Multiple instances in `src/utils/accessoryUtils.js:8,20` - Headphones category icons

### 📱 Mobile Devices/Products
- `src/components/BuyingHistoryTable.jsx:266` - Product item type indicator (2 instances)
- `src/components/AddPurchaseModal.jsx:370` - Add product button
- `src/components/AddPurchaseModal.jsx:397` - Product item type indicator (2 instances)
- `src/components/EnhancedCompanyDebtModal.jsx:170` - Debt item type indicator
- `src/components/CashierContent.jsx:508` - Empty cart message
- `src/components/CashierContent.jsx:552` - Cart item type indicator
- `src/utils/accessoryUtils.js:3,11,54` - Default product icon and mobile category

### 🗃️ Archived Items
- `src/pages/Admin.jsx:121` - Archived products tab icon
- `src/components/AdminDashboard.jsx:340` - Archived navigation description

## Financial & Transaction Emojis

### 💰 Money/Cash
- `src/components/BuyingHistoryTable.jsx:229` - Cash only purchases
- `src/components/AdminDashboard.jsx:138` - Revenue stats icon
- `src/components/AdminDashboard.jsx:240` - Cash sale indicator (2 instances)
- `src/components/AddPurchaseModal.jsx:248` - Cash purchase option

### 💳 Credit/Debt
- `src/pages/Admin.jsx:124` - Customer debts tab icon
- `src/components/AdminDashboard.jsx:240` - Debt sale indicator (2 instances)
- `src/components/AddPurchaseModal.jsx:309` - Customer debt option

### 💸 Company Debts
- `src/pages/Admin.jsx:125` - Company debts tab icon
- `src/components/AdminDashboard.jsx:338` - Customer debts navigation description

### 💼 Business/Buying
- `src/components/BuyingHistoryTable.jsx:153` - Buying history section title

### 🛒 Shopping/Buying History
- `src/pages/Admin.jsx:123` - Buying history tab icon
- `src/components/AdminDashboard.jsx:267` - Buying section icon

## Status & Alert Emojis

### ⚠️ Warnings
- `src/contexts/LocaleContext.jsx:77,576,1071` - Offline warnings (3 language variants)
- `src/contexts/LocaleContext.jsx:78,577,1072` - Below cost warnings (3 language variants)
- `src/components/AdminDashboard.jsx:158` - Warning stats icon
- `src/components/AdminDashboard.jsx:279` - Low stock warning icon

### ❌ Error Messages
- Multiple instances in `src/contexts/DataContext.jsx` (lines 50,74,81,88,95,102,109,116,123,131,151,161,171,181,191,201,211,221,247) - Error logging
- Multiple instances in `src/main.cjs` (lines 50,112,125) - Error logging
- `src/components/AdminDashboard.jsx:22,25` - Reload error logging

### ✅ Success/Completed
- Multiple instances in `BACKUP_FIXES_SUMMARY.md` (lines 1,5,12,19,26,33,41,49,91-103) - Feature completion markers
- `src/components/AdminDashboard.jsx:312` - Completion stats icon

### 🚨 Critical Alerts
- `src/components/AdminDashboard.jsx:295` - Critical low stock indicator (when stock <= 2)

### ⚡ Performance/Quick Actions
- `src/components/AdminDashboard.jsx:295` - Normal stock indicator (when stock > 2)
- `src/components/AdminDashboard.jsx:325` - Quick actions icon
- `src/components/AdminStatsSidebar.jsx:251` - Low stock indicator

## Data & Reports Emojis

### 📈 Sales/Growth
- `src/pages/Admin.jsx:122` - Sales history tab icon
- `src/components/AdminDashboard.jsx:148` - Growth stats icon

### 📋 Lists/Records
- `src/components/AdminDashboard.jsx:225` - Records section icon

### 📝 Notes/Details
- `src/components/AddPurchaseModal.jsx:292,328` - Notes sections (2 instances)

### 🔄 Reload/Refresh
- `src/components/AdminDashboard.jsx:125` - Reload application button

### 🏆 Achievement/Success
- `src/components/AdminDashboard.jsx:184` - Achievement section icon

## Search & Navigation Emojis

### 🔍 Search
- `src/components/CustomerDebtsSection.jsx:55,182` - Search input icons
- `src/components/HistorySearchFilter.jsx:222,242` - Search functionality

### 📅 Date/Calendar
- `src/components/CustomerDebtsSection.jsx:76,77,289` - Date sorting and display
- `src/components/MonthlyReportsSection.jsx:73` - Month selection

## Hardware & Technology Emojis (from accessoryUtils.js)

### 🔌 Cables/Adapters
- `src/utils/accessoryUtils.js:14` - Cable category

### 🔋 Power/Batteries
- `src/utils/accessoryUtils.js:17` - Power category

### 🔊 Audio/Speakers
- `src/utils/accessoryUtils.js:20` - Audio category

### 📐 Tools/Accessories
- `src/utils/accessoryUtils.js:23` - Tools category

### 💾 Storage/Memory
- `src/utils/accessoryUtils.js:26` - Storage category
- `src/components/BackupManager.jsx:503` - Local backups section

### 💡 Lighting/Smart
- `src/utils/accessoryUtils.js:32` - Smart/lighting category

### ⌚ Wearables
- `src/utils/accessoryUtils.js:35` - Wearable category

### 🎤 Audio Input
- `src/utils/accessoryUtils.js:38` - Microphone category

### 📷 Camera/Photography
- `src/utils/accessoryUtils.js:41` - Camera category

### 🖱️ Computer Peripherals
- `src/utils/accessoryUtils.js:47` - Computer accessories

### 🖨️ Printing
- `src/components/SalesHistoryTable.jsx:98` - Test print function

### 🔊 Sound Settings
- `src/components/SettingsModal.jsx:59` - Sound settings section

## Total Unique Emojis Found: 31
- 📱 📦 🎧 💰 💳 📊 ⚙️ 🗃️ 📈 🛒 💸 ⚠️ ❌ ✅ 💼 📝 🔄 📋 🏆 ⚡ 🚨 🔍 📅 🔌 🔋 🔊 📐 💾 💡 ⌚ 🎤 📷 🖱️ 🖨️

## Files with Emojis:
1. `src/pages/Admin.jsx` - 11 emojis
2. `src/components/AdminDashboard.jsx` - 15 emojis
3. `src/components/BuyingHistoryTable.jsx` - 6 emojis
4. `src/components/AddPurchaseModal.jsx` - 8 emojis
5. `src/utils/accessoryUtils.js` - 12 emojis
6. `src/contexts/LocaleContext.jsx` - 6 emojis
7. `src/contexts/DataContext.jsx` - 19 emojis (all error indicators)
8. `src/main.cjs` - 3 emojis (all error indicators)
9. `src/components/CustomerDebtsSection.jsx` - 5 emojis
10. `src/components/HistorySearchFilter.jsx` - 2 emojis
11. `src/components/CashierContent.jsx` - 2 emojis
12. `src/components/EnhancedCompanyDebtModal.jsx` - 1 emoji
13. `src/components/SalesHistoryTable.jsx` - 1 emoji
14. `src/components/SettingsModal.jsx` - 1 emoji
15. `src/components/AdminStatsSidebar.jsx` - 1 emoji
16. `src/components/BackupManager.jsx` - 1 emoji
17. `src/components/MonthlyReportsSection.jsx` - 1 emoji
18. `.github/copilot-instructions.md` - 1 emoji
19. `BACKUP_FIXES_SUMMARY.md` - 25 emojis (all success indicators)

This list provides a complete reference for future icon replacement efforts.
