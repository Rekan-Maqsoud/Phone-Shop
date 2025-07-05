// Month names for filters and reports
const monthNames = {
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  ku: [
    'کانونی یەکەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران',
    'تەمموز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانونی دووەم'
  ],
  ar: [
    'يناير', 'فبراير', 'مارس', 'ابريل', 'مايو', 'يونيو',
    'يوليو', 'اغسطس', 'سبتمبر', 'اكتوبر', 'نوفمبر', 'ديسمبر'
  ]
};
import React, { createContext, useContext, useState, useMemo } from 'react';

// Move the full translations object here from Admin.jsx
const translations = {
  en: {
    // Common
    loading: 'Loading...',
    cancel: 'Cancel',
    ok: 'OK',
    select: 'Select',
    add: 'Add',
    name: 'Name',
    model: 'Model',
    ram: 'RAM',
    storage: 'Storage',
    price: 'Price',
    stock: 'Stock',
    stockLabel: 'Stock',
    quantity: 'Qty',
    total: 'Total',
    items: 'items',
    of: 'of',
    unknown: 'Unknown',
    
    // Cashier
    cashier: 'Cashier',
    backToAdmin: 'Back to Admin',
    cart: 'Cart',
    emptyCart: 'Cart is empty',
    customerName: 'Customer Name',
    enterCustomerName: 'Enter customer name',
    paymentType: 'Payment Type',
    cash: 'Cash',
    credit: 'Credit',
    processing: 'Processing...',
    addToCredit: 'Add to Credit',
    completeSale: 'Complete Sale',
    searchProducts: 'Search products...',
    
    // Product messages
    pleaseEnterProductName: 'Please enter a product name',
    productNotFoundOrInvalid: 'Product not found or invalid',
    noProducts: 'No products found.',
    multipleProductsFound: 'Multiple products found',
    
    // Stock messages
    outOfStock: 'Out of Stock',
    inStock: 'In Stock',
    lowStock: 'Low Stock (≤5)',
    allStock: 'All Stock',
    addedToCart: 'added to cart',
    
    // Filters
    allBrands: 'All Brands',
    allCategories: 'All Categories',
    phones: 'Phones',
    accessories: 'Accessories',
    noItemsFound: 'No items found',
    tryDifferentFilters: 'Try adjusting your search or filters',
    
    // Sale messages
    offlineWarning: '⚠️ You are offline! This sale will not be backed up to cloud until connection is restored.',
    warningSellingBelowCost: '⚠️ WARNING: Selling below buying price!',
    continueAnyway: 'This will result in a loss. Continue anyway?',
    cannotCompleteNegativeTotal: 'Cannot complete sale with negative total',
    pleaseEnterCustomerName: 'Please enter customer name for all sales',
    confirmDebtSale: 'Are you sure you want to record this sale as debt?',
    confirmSale: 'Are you sure you want to complete this sale?',
    customerNameRequired: 'Customer name is required for all sales.',
    
    // Sale results
    saleRecordCreationFailed: 'Sale saved but failed to create debt record: ',
    debtCreationFailed: 'Sale saved but debt creation failed: ',
    debtSaleSuccess: 'Debt sale recorded!',
    saleSuccess: 'Complete sale successful!',
    saleFailed: 'Sale failed',
    saleApiUnavailable: 'Sale API not available',
    unknownError: 'Unknown error',
    
    // Keyboard shortcuts
    completeSaleNotImplemented: 'Complete sale (not implemented)',
    
    // Missing translations
    generated: 'Generated',
    affectedItems: 'Affected Items',
    selling: 'Selling',
    cost: 'Cost',
    loss: 'Loss',
    totalLoss: 'Total Loss',
    acknowledge: 'I UNDERSTAND',
    reviewPricesBeforeProceeding: 'Please review prices before proceeding!',
    buyingHistoryDesc: 'Track all your business purchases and expenses',
    cashOnly: 'Cash Only',
    
    // Cart messages
    stockEmptyIncrement: 'Stock is empty. Do you want to increment the stock by 1?',
    stockIncremented: 'Stock incremented by 1.',
    cannotAddMoreStock: 'Cannot add more than available stock! Available: ',
    cannotAddMoreStockInCart: 'Cannot add more than available stock! Available: ',
    
    // Admin Page
    dashboard: 'Dashboard',
    products: 'Products',
    archivedProducts: 'Archived',
    salesHistory: 'Sales',
    buyingHistory: 'Buying History',
    customerDebts: 'Customer Debts',
    companyDebts: 'Company Debts',
    monthlyReports: 'Monthly Reports',
    cloudBackup: 'Cloud Backup',
    settings: 'Settings',
    logout: 'Log out',
    
    // Admin Dashboard - Today's Performance
    adminDashboard: 'Admin Dashboard',
    todaysPerformance: 'Today\'s Performance',
    sales: 'Sales',
    spending: 'Spending',
    netPerformance: 'Net Performance',
    salesWillAppearHere: 'Sales will appear here',
    thisMonth: 'This Month',
    totalProfit: 'Total Profit',
    inventoryValue: 'Inventory Value',
    debts: 'Debts',

    // Admin notifications
    lowStockAlert: 'Low stock alert',
    archiving: 'Archiving',
    unarchiving: 'Unarchiving',
    archiveUnarchiveFailed: 'Archive/unarchive failed (no response).',
    productArchived: 'Item archived!',
    productUnarchived: 'Item unarchived!',
    archiveFailed: 'Archive failed.',
    unarchiveFailed: 'Unarchive failed.',
    
    // Dashboard
    businessOverview: 'Business Overview',
    dashboardWelcome: 'Welcome to your business dashboard',
    addPurchase: 'Add Purchase',
    reloadApp: 'Reload Application Data',
    reloading: 'Reloading...',
    reload: 'Reload',
    today: 'Today',
    transactions: 'transactions',
    thisWeek: 'This Week',
    weeklyRevenue: 'Weekly Revenue',
    outstanding: 'Outstanding',
    unpaidDebts: 'unpaid debts',
    inventory: 'Inventory',
    lowStockText: 'low stock',
    allStocksHealthy: 'All stocks healthy',
    
    // Top products section
    topProducts: 'Top Products',
    bestSellers: 'Best selling items',
    revenue: 'revenue',
    sold: 'sold',
    noSalesDataYet: 'No sales data yet',
    sellItemsToSeeStats: 'Start selling items to see statistics',
    
    // Recent sales section
    recentSales: 'Recent Sales',
    latestTransactions: 'Latest transactions',
    debt: 'Debt',
    view: 'View',
    noRecentSales: 'No recent sales',
   
    // Stock alerts section
    stockAlerts: 'Stock Alerts',
    lowStockItems: 'Items running low',
    left: 'left',
    noLowStockItems: 'No items are running low',
    
    // Quick actions
    quickActions: 'Quick Actions',
    commonTasks: 'Frequently used features',
    active: 'active',
    totalCount: 'total',
    unpaid: 'unpaid',
    archived: 'archived',
    
    // Product table
    search: 'Search...',
    action: 'Action',
    noArchivedProducts: 'No archived products',
    low: 'Low',
    edit: 'Edit',
    archive: 'Archive',
    unarchive: 'Unarchive',
    
    // Quick add product
    company: 'Company',
    other: 'Other',
    ramPlaceholder: 'RAM (e.g. 8GB)',
    storagePlaceholder: 'Storage (e.g. 128GB)',
    addProduct: 'Add Product',
    missingRamStorageConfirm: 'RAM or Storage is empty. Are you sure you want to add this product?',
    
    // Admin error messages and validation
    pleaseProvideValidCompanyName: 'Please provide a valid company name',
    pleaseProvideValidAmount: 'Please provide a valid amount greater than 0',
    pleaseAddAtLeastOneItem: 'Please add at least one item',
    pleaseFillAllRequiredFields: 'Please fill in all required fields for all items',
    exportFailed: 'Export failed',
    successful: 'successful',
    testPrintSuccessful: 'Test print successful!',
    printTestFailed: 'Print test failed',
    
    // Company debt and purchase modal
    addCompanyDebt: 'Add Company Debt',
    companyName: 'Company Name',
    enterCompanyName: 'Enter company name',
    description: 'Description',
    optional: 'optional',
    enterDescription: 'Enter description',
    purchaseType: 'Purchase Type',
    simplePurchase: 'Simple Purchase',
    justAmount: 'Just specify the amount',
    purchaseWithItems: 'Purchase with Items',
    addItemsToInventory: 'Add items to inventory',
    amount: 'Amount',
    itemsList: 'Items',
    noItemsAdded: 'No items added yet',
    clickAddButtons: 'Click the buttons above to add items',
    product: 'Product',
    accessory: 'Accessory',
    buyOnCredit: 'Buy on Credit',
    payDirectly: 'Pay Directly',
    paymentStatus: 'Payment Status',
    purchaseAddedSuccessfully: 'Purchase added successfully!',
    errorAddingPurchase: 'Error adding purchase',
    
    // Accessory modal dropdowns

    selectType: 'Select Type',
    headphones: 'Headphones',
    earbuds: 'Earbuds',
    charger: 'Charger',
    cable: 'Cable',
    case: 'Case',
    screenProtector: 'Screen Protector',
    powerBank: 'Power Bank',
    wirelessCharger: 'Wireless Charger',
    speaker: 'Speaker',
    smartwatch: 'Smart Watch',
    enterNameModel: 'Enter accessory name/model',
    accessoryUpdated: 'Accessory updated',
    productUpdated: 'Product updated',
    
    // Settings modal
    confirmResetAllData: 'Are you sure you want to delete ALL products, archived, and sales history? This cannot be undone!',
    confirmReset: 'Are you sure you want to reset all data? This will delete everything and cannot be undone!',
    
    // Sound settings
    soundSettings: 'Sound Settings',
    enableSounds: 'Enable Sounds',
    volume: 'Volume',
    soundTypes: 'Sound Types',
    actionSounds: 'Action Sounds',
    systemSounds: 'System Sounds',
    modalSounds: 'Modal Sounds',
    successSounds: 'Success Sounds',
    errorSounds: 'Error Sounds',
    WarningSounds: 'Warning Sounds',
    NotificationSounds: 'Notification Sounds',
    
   
    // Cloud backup service
    cloudBackupService: 'Cloud Backup Service',
    signInToEnable: 'Sign in to enable automatic cloud backup after every data change, plus manual backup and restore capabilities',
    signInSignUp: 'Sign In / Sign Up',
    fullName: 'Full Name',
    emailAddress: 'Email Address',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    processingAuth: 'Processing...',
    signUp: 'Sign Up',
    signIn: 'Sign In',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: "Don't have an account?",
    signedInAs: 'Signed in as',
    autoCloudBackupActive: 'Auto Cloud Backup Active (Updates after every change)',
    
    // Sale details modal
    saleDetails: 'Sale Details',
    date: 'Date',
    customer: 'Customer',
    unknownCustomer: 'Unknown',
    ramSpecs: 'RAM',
    storageSpecs: 'Storage',
    sellingPrice: 'Selling Price',
    buyingPrice: 'Buying Price',
    qty: 'Qty',
    profit: 'Profit',
    returnQty: 'Return Qty',
    returnItems: 'Return',
    returnSelectedQty: 'Return selected quantity',
    productProfit: 'Product Profit',
    accessoryProfit: 'Accessory Profit',
    totalItems: 'Total Items',
    
    // Confirm modal
    confirmReturnItem: 'Are you sure you want to return this item? This will restore stock and remove the item from the sale.',
    
    // Additional admin toast messages
    debtMarkedAsPaid: 'Debt marked as paid successfully',
    errorMarkingDebtPaid: 'Error marking debt as paid',
    
    // Stock alerts
    stockWarnings: 'Stock Alerts',
    itemsLeft: 'left',
    
    // Various admin placeholders and labels
    selectRAM: 'Select or type RAM...',
    selectStorage: 'Select or type Storage...',
    noBackupMethodConfigured: 'No backup method configured',
    
    // Accessories Section
    addAccessory: 'Add Accessory',
    type: 'Type',
    brand: 'Brand',
    searchAccessories: 'Search accessories...',
    allTypes: 'All Types',
    clearFilters: 'Clear Filters',
    showing: 'Showing',
    noAccessoriesFound: 'No accessories found',
    tryDifferentSearch: 'Try different search criteria',
    noAccessories: 'No accessories yet',
    addFirstAccessory: 'Add your first accessory to get started',
    
    // Archived Items Section
    archivedItems: 'Archived Items',
    archivedAccessories: 'Archived Accessories',
    
    // Sales History Section
    confirmReturnSale: 'Are you sure you want to return this entire sale? This will restore stock and remove the sale from records.',
    returnEntry: 'Return',
    confirmReturnEntry: 'Are you sure you want to return this purchase? This will decrease stock and refund the amount.',
    returnItem: 'Return Item',
    returnQuantity: 'Return Quantity',
    refundAmount: 'Refund Amount',
    returnSuccess: 'Return processed successfully!',
    returnError: 'Failed to process return',
    availableQuantity: 'Available Quantity',
    
    // Customer Debts Section
    customerDebtsDesc: 'Track money owed to you by customers',
    searchCustomer: 'Search customers...',
    noCustomerDebts: 'No customer debts found',
    noCustomerDebtsDesc: 'All customers have paid their debts or no debt sales have been made',
    noCustomerDebtsFound: 'No customer debts found for this search',
    customers: 'Customers',
    paidOn: 'Paid on',
    markDebtAsPaidConfirm: 'Are you sure you want to mark this debt as paid?',
    
    // Company Debts Section
    transaction: 'Transaction',
    searchCompanyDebts: 'Search company debts...',
    noCompanyDebts: 'No company debts',
    noMatchingDebts: 'No matching company debts found',
    totalOwed: 'Total Owed',
    paid: 'Paid',
    noDescription: 'No description',
    created: 'Created',
    typeModelName: 'Type Model Name',
    
    // Monthly Reports Section
    noReports: 'No monthly reports yet',
    totalTransactions: 'Total Transactions',
    totalProductsSold: 'Total Products Sold',
    totalAccessoriesSold: 'Total Accessories Sold',
    totalSpent: 'Total Spent',
    
    // Settings Modal
    theme: 'Theme',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    language: 'Language',
    lowStockThreshold: 'Low Stock Threshold',
    exportSales: 'Export Sales',
    exportInventory: 'Export Inventory',
    resetAllData: 'Reset All Data',
    close: 'Close',

    // Search and Filter
    searchAndFilter: 'Search and Filter',
    searchFilterDesc: 'Search Filter Description',
    searchByName: 'Search by Name',
    searchType: 'Search by Type',
    selectPeriod: 'Select Period',
    quickSelect: 'Quick Select',
    singleDate: 'Single Date',
    weekRange: 'Week Range',
    customRange: 'Custom Range',
    yesterday: 'Yesterday',
    last7Days: 'Last 7 Days',
    lastWeek: 'Last Week',
    last30Days: 'Last 30 Days',
    LastMonth: 'Last Month',
    day: 'Day',
    week: 'Week',
    month: 'Month',
    year: 'Year',


    //Buying History Section
    noBuyingHistory: 'No buying history',
    addFirstPurchase: 'Add your first purchase to get started',
    payNow: 'Pay Now',
    payLater: 'Pay Later',
    immediatePayment: 'Immediate Payment',
    
    unitPrice: 'Unit Price',
    selectBrand: 'Select Brand',
    selectBrandFirst: 'Select brand first',
    totalAmount: 'Total Amount',


    //missing translations
    itemTotal: 'Item Total',
    
    // Cloud backup hardcoded texts
    cloudBackupManager: 'Cloud Backup Manager',
    signOut: 'Sign Out',
    createManualBackup: 'Create Manual Backup',
    createLocalBackup: 'Create Local Backup',
    refresh: 'Refresh',
    creating: 'Creating...',
    cloudBackups: 'Cloud Backups',
    backups: 'backups',
    noCloudBackupsFound: 'No cloud backups found',
    fileName: 'File Name',
    uploadDate: 'Upload Date',
    size: 'Size',
    actions: 'Actions',
    downloadBackupFile: 'Download backup file to your computer',
    download: 'Download',
    downloadAndRestore: 'Download and restore backup',
    downloadRestore: 'Download & Restore',
    deleteBackupFromCloud: 'Delete backup from cloud',
    delete: 'Delete',
    localBackups: 'Local Backups',
    localBackupsStored: 'Local backups are stored in your Documents folder under "Mobile Roma BackUp"',
    openBackupFolder: 'Open Backup Folder',
    restoreFromFile: 'Restore from File',
    
    // Company debts section
    markAsPaid: 'Mark as Paid',
    viewDetails: 'View Details',
    totalCompanyDebt: 'Total Company Debt',
    unpaidDebt: 'unpaid debt',
    paidDebt: 'paid debt',
    
    // Sales history section
    salesHistoryTitle: 'Sales History',
    
    // Customer debts section  
    totalPaid: 'Total Paid',
    totalOutstanding: 'Total Outstanding',
    paidAmount: 'Paid Amount',
    outstandingAmount: 'Outstanding',
    singleTransaction: 'transaction',
    newestFirst: 'Newest First',
    oldestFirst: 'Oldest First',
    highestAmount: 'Highest Amount',
    lowestAmount: 'Lowest Amount',
    customerAZ: 'Customer A-Z',
    customerZA: 'Customer Z-A',
    debtsPaid: 'Paid Debts',
    paidDebts: 'Paid Debts',
    markPaid: 'Mark Paid',
    itemsCount: 'items',
    
    // Purchase modal
    selectModel: 'Select or type model...',
    payLaterCreatesDebt: 'Pay later - creates company debt',
    immediatePaymentHistory: 'Immediate payment - goes to buying history',

    // Sales history hardcoded text translations
    noSales: 'No sales',
    returnSale: 'Return',
    totalProducts: 'Total Products',
    totalSales: 'Total Sales',
    totalRevenue: 'Total Revenue',

    // Missing translations
    showingResults: 'Showing Results',
    entries: 'entries',
    lastMonth: 'Last Month',
    purchasedItems: 'Purchased Items',
    companyDebtDetails: 'Company Debt Details',
    SPECIFICATIONS: 'SPECIFICATIONS',
    ITEM: 'ITEM',
    hideItems: 'Hide Items',
    status: 'Status',
    createdAt: 'Created At',
    selectDate: 'Select Date',
    withItems: 'With Items',
    viewItems: 'View Items',
    weekStartDate: 'Week Start Date',

  },
  ku: {
    // Common
    loading: 'بارکردن...',
    cancel: 'هەڵوەشاندنەوە',
    ok: 'باشە',
    select: 'هەڵبژاردن',
    add: 'زیادکردن',
    name: 'ناو',
    model: 'مۆدێل',
    ram: 'RAM',
    storage: 'بیرگە',
    price: 'نرخ',
    stock: 'کۆگا',
    stockLabel: 'کۆگا',
    quantity: 'ژمارە',
    total: 'کۆی گشتی',
    items: 'کاڵا',
    of: 'لە',
    unknown: 'نەزانراو',
    
    // Cashier
    cashier: 'کاشێر',
    backToAdmin: 'گەڕانەوە بۆ ئەدمین',
    cart: 'سەبەتە',
    emptyCart: 'سەبەتە بەتاڵە',
    customerName: 'ناوی کڕیار',
    enterCustomerName: 'ناوی کڕیار بنووسە',
    paymentType: 'جۆری پارەدان',
    cash: 'کاش',
    credit: 'قەرز',
    processing: 'پرۆسێسکردن...',
    addToCredit: 'زیادکردن بۆ قەرز',
    completeSale: 'تەواوکردنی فرۆشتن',
    searchProducts: 'گەڕان بە دوای بەرهەمەکان...',
    
    // Product messages
    pleaseEnterProductName: 'تکایە ناوی بەرهەمێک بنووسە',
    productNotFoundOrInvalid: 'بەرهەم نەدۆزرایەوە یان نادروستە',
    noProducts: 'هیچ بەرهەمێک نەدۆزرایەوە.',
    multipleProductsFound: 'چەندین بەرهەم دۆزرایەوە',
    
    // Stock messages
    outOfStock: 'لە کۆگا تەواو بووە',
    inStock: 'لە کۆگا',
    lowStock: 'کۆگا کەم (≤5)',
    allStock: 'هەموو کۆگا',
    addedToCart: 'زیادکرا بۆ سەبەتە',
    
    // Filters
    allBrands: 'هەموو جۆرەکان',
    allCategories: 'هەموو پۆلەکان',
    phones: 'تەلەفۆنەکان',
    accessories: 'ئامێرە یارمەتیدەرەکان',
    noItemsFound: 'هیچ بڕگەیەک نەدۆزرایەوە',
    tryDifferentFilters: 'هەوڵی گۆڕینی گەڕان یان فلتەرەکان بدە',
    
    // Sale messages
    offlineWarning: '⚠️ تۆ ئۆفلاینیت! ئەم فرۆشتنە پاشەکەوت ناکرێت بۆ کلاود تا ئەنتەرێت دەگەڕێندرێتەوە.',
    warningSellingBelowCost: '⚠️ ئاگاداری: فرۆشتن بە کەمتر لە نرخی کڕین!',
    continueAnyway: 'ئەمە زیانێکی لێدەکەوێت. بەردەوامبوون؟',
    cannotCompleteNegativeTotal: 'ناکرێت فرۆشتن بە کۆی منفی تەواو بکرێت',
    pleaseEnterCustomerName: 'تکایە ناوی کڕیار بنووسە بۆ هەموو فرۆشتنەکان',
    confirmDebtSale: 'دڵنیایت کە دەتەوێت ئەم فرۆشتنە وەک قەرز تۆمار بکەیت؟',
    confirmSale: 'دڵنیایت کە دەتەوێت ئەم فرۆشتنە تەواو بکەیت؟',
    customerNameRequired: 'ناوی کڕیار پێویستە بۆ هەموو فرۆشتنەکان.',
    
    // Sale results
    saleRecordCreationFailed: 'فرۆشتن پاشەکەوت کرا بەڵام دروستکردنی تۆمارەکەی قەرز شکستی هێنا: ',
    debtCreationFailed: 'فرۆشتن پاشەکەوت کرا بەڵام دروستکردنی قەرز شکستی هێنا: ',
    debtSaleSuccess: 'فرۆشتنی قەرز تۆمار کرا!',
    saleSuccess: 'فرۆشتن بە سەرکەوتوویی تەواو بوو!',
    saleFailed: 'فرۆشتن شکستی هێنا',
    saleApiUnavailable: 'API ی فرۆشتن بەردەست نیە',
    unknownError: 'هەڵەی نەناسراو',
    
    // Keyboard shortcuts
    completeSaleNotImplemented: 'تەواوکردنی فرۆشتن (جێبەجێ نەکراوە)',
    
    // Cart messages
    stockEmptyIncrement: 'کۆگا بەتاڵە. دەتەوێت کۆگا بە ١ زیاد بکەیت؟',
    stockIncremented: 'کۆگا بە ١ زیاد کرا.',
    cannotAddMoreStock: 'ناکرێت زیاتر لە کۆگای بەردەست زیاد بکەیت! بەردەست: ',
    cannotAddMoreStockInCart: 'ناکرێت زیاتر لە کۆگای بەردەست زیاد بکەیت! بەردەست: ',
    
    // Admin Page
    dashboard: 'داشبۆرد',
    products: 'بەرهەمەکان',
    archivedProducts: 'ئارشیف کراوەکان',
    salesHistory: 'مێژووی فرۆشتن',
    buyingHistory: 'مێژووی کڕین',
    customerDebts: 'قەرزی کڕیارەکان',
    companyDebts: 'قەرزی کۆمپانیاکان',
    monthlyReports: 'ڕاپۆرتی مانگانە',
    cloudBackup: 'پاشەکەوتی کلاود',
    settings: 'ڕێکخستنەکان',
    logout: 'چوونەدەرەوە',
    
    // Admin Dashboard - Today's Performance
    adminDashboard: 'داشبۆردی ئەدمین',
    todaysPerformance: 'کارکردنی ئەمڕۆ',
    sales: 'فرۆشتن',
    spending: 'خەرجی',
    netPerformance: 'کارکردنی خاوەن',
    salesWillAppearHere: 'فرۆشتنەکان لێرە دەردەکەون',
    thisMonth: 'ئەم مانگە',
    totalProfit: 'کۆی قازانج',
    inventoryValue: 'بەهای کۆگا',
    debts: 'قەرزەکان',

    // Admin notifications
    lowStockAlert: 'ئاگاداری کۆگای کەم',
    archiving: 'ئارشیف کردن',
    unarchiving: 'لە ئارشیف دەرهێنان',
    archiveUnarchiveFailed: 'ئارشیف کردن/لە ئارشیف دەرهێنان شکستی هێنا (وەڵامی نەهات).',
    productArchived: 'بڕگە ئارشیف کرا!',
    productUnarchived: 'بڕگە لە ئارشیف دەرهێنرا!',
    archiveFailed: 'ئارشیف کردن شکستی هێنا.',
    unarchiveFailed: 'لە ئارشیف دەرهێنان شکستی هێنا.',
    
    // Dashboard
    businessOverview: 'بینینی گشتی بازرگانیەکان ',
    dashboardWelcome: 'بەخێرهاتن بۆ داشبۆردی بازرگانیت',
    addPurchase: 'زیادکردنی کڕین',
    reloadApp: 'دووبارە بارکردنی زانیاری بەرنامە',
    reloading: 'دووبارە بارکردن...',
    reload: 'دووبارە بارکردن',
    today: 'ئەمڕۆ',
    transactions: 'مامەڵەکان',
    thisWeek: 'ئەم هەفتەیە',
    weeklyRevenue: 'داهاتی هەفتانە',
    outstanding: 'مایەوە',
    unpaidDebts: 'قەرزی نەدراو',
    inventory: 'کۆگا',
    lowStockText: 'کۆگای کەم',
    allStocksHealthy: 'هەموو کۆگاکان باشن',
    
    // Top products section
    topProducts: 'بەرهەمە باشەکان',
    bestSellers: 'زۆرترین فرۆشراوەکان',
    revenue: 'داهات',
    sold: 'فرۆشراو',
    noSalesDataYet: 'هێشتا زانیاری فرۆشتن نییە',
    sellItemsToSeeStats: 'فرۆشتن دەست پێ بکە بۆ بینینی ئاماری',
    
    // Recent sales section
    recentSales: 'فرۆشتنە تازەکان',
    latestTransactions: 'دوایین مامەڵەکان',
    debt: 'قەرز',
    view: 'بینین',
    noRecentSales: 'هیچ فرۆشتنی تازە نییە',
   
    // Stock alerts section
    stockAlerts: 'ئاگاداری کۆگا',
    lowStockItems: 'بڕگە کەمەکان',
    left: 'ماوە',
    noLowStockItems: 'هیچ بڕگەیەک کەم نییە',
    
    // Quick actions
    quickActions: 'کارە خێراکان',
    commonTasks: 'کارە باوەکان',
    active: 'چالاک',
    totalCount: 'کۆی گشتی',
    unpaid: 'نەدراو',
    archived: 'ئارشیف کراو',
    
    // Product table
    search: 'گەڕان...',
    action: 'کردار',
    noArchivedProducts: 'هیچ بەرهەمی ئارشیو کراو نییە',
    low: 'کەم',
    edit: 'گۆڕین',
    archive: 'ئارشیف کردن',
    unarchive: 'لە ئارشیف دەرهێنان',
    
    // Quick add product
    company: 'کۆمپانیا',
    other: 'هیتر',
    ramPlaceholder: 'RAM (نموونە: 8GB)',
    storagePlaceholder: 'بیرگە (نموونە: 128GB)',
    addProduct: 'زیادکردنی بەرهەم',
    missingRamStorageConfirm: 'RAM یان بیرگە بەتاڵە. دڵنیایت کە دەتەوێت ئەم بەرهەمە زیاد بکەیت؟',
    
    // Admin error messages and validation
    pleaseProvideValidCompanyName: 'تکایە ناوی کۆمپانیایەکی دروست بنووسە',
    pleaseProvideValidAmount: 'تکایە بڕێکی دروست لە ٠ زیاتر بنووسە',
    pleaseAddAtLeastOneItem: 'تکایە بەلایەنی کەمەوە یەک بڕگە زیاد بکە',
    pleaseFillAllRequiredFields: 'تکایە هەموو خانە پێویستەکان بۆ هەموو بڕگەکان پڕ بکەرەوە',
    exportFailed: 'ناردنە دەرەوە شکستی هێنا',
    successful: 'سەرکەوتوو',
    testPrintSuccessful: 'تاقیکردنەوەی چاپ سەرکەوتوو بوو!',
    printTestFailed: 'تاقیکردنەوەی چاپ شکستی هێنا',
    
    // Company debt and purchase modal
    addCompanyDebt: 'زیادکردنی قەرزی کۆمپانیا',
    companyName: 'ناوی کۆمپانیا',
    enterCompanyName: 'ناوی کۆمپانیا بنووسە',
    description: 'وەسف',
    optional: 'ئیختیاری',
    enterDescription: 'وەسف بنووسە',
    purchaseType: 'جۆری کڕین',
    simplePurchase: 'کڕینی ئاسایی',
    justAmount: 'تەنها بڕی پارە دیاری بکە',
    purchaseWithItems: 'کڕین لەگەڵ بڕگەکان',
    addItemsToInventory: 'بڕگەکان زیاد بکە بۆ کۆگا',
    amount: 'بڕی پارە',
    itemsList: 'بڕگەکان',
    noItemsAdded: 'هێشتا بڕگەیەک زیاد نەکراوە',
    clickAddButtons: 'لە دوگمەکانی سەرەوە کلیک بکە بۆ زیادکردنی بڕگە',
    product: 'بەرهەم',
    accessory: 'ئامێری یارمەتیدەر',
    buyOnCredit: 'کڕین بە قەرز',
    payDirectly: 'پارەدانی ڕاستەوخۆ',
    paymentStatus: 'دۆخی پارەدان',
    purchaseAddedSuccessfully: 'کڕین بە سەرکەوتوویی زیاد کرا!',
    errorAddingPurchase: 'هەڵە لە زیادکردنی کڕین',
    
    // Accessory modal dropdowns
    selectType: 'جۆر هەڵبژێرە',
    headphones: 'هێدفۆن',
    earbuds: 'هێدفۆنی بچووک',
    charger: 'بارگاوی کەرەوە',
    cable: 'کەیبڵ',
    case: 'کەیس',
    screenProtector: 'پاریزەری شاشە',
    powerBank: 'پاوەر بانک',
    wirelessCharger: 'بارگاوی کەرەوەی بێ وایەر',
    speaker: 'سپیکەر',
    smartwatch: 'کاتژمێری زیرەک',
    enterNameModel: 'ناو/مۆدێلی ئامێری یارمەتیدەر بنووسە',
    accessoryUpdated: 'ئامێری یارمەتیدەر نوێکرایەوە',
    productUpdated: 'بەرهەم نوێکرایەوە',
    
    // Settings modal
    confirmResetAllData: 'دڵنیایت کە دەتەوێت هەموو بەرهەمەکان، ئارشیو کراوەکان، و مێژووی فرۆشتن بسڕیتەوە؟ ئەمە ناگەڕێتەوە!',
    confirmReset: 'دڵنیایت کە دەتەوێت هەموو زانیاریەکان ڕیسێت بکەیت؟ ئەمە هەموو شتێک دەسڕێتەوە و ناگەڕێتەوە!',
    
    // Sound settings
    soundSettings: 'ڕێکخستنی دەنگ',
    enableSounds: 'چالاکردنی دەنگەکان',
    volume: 'ئاستی دەنگ',
    soundTypes: 'جۆرەکانی دەنگ',
    actionSounds: 'دەنگی کردارەکان',
    systemSounds: 'دەنگی سیستەم',
    modalSounds: 'دەنگی پەنجەرەکان',
    successSounds: 'دەنگی سەرکەوتن',
    errorSounds: 'دەنگی هەڵە',
    WarningSounds: 'دەنگی ئاگادارکردنەوە',
    NotificationSounds: 'دەنگی ئاگاداری',
   
    // Cloud backup service
    cloudBackupService: 'خزمەتی پاشەکەوتی کلاود',
    signInToEnable: 'چوونەژوورەوە بۆ چالاککردنی پاشەکەوتی خودکاری کلاود دوای هەر گۆڕانکارییەک، لەگەڵ دەرفەتی پاشەکەوت و گەڕاندنەوەی دەستی',
    signInSignUp: 'چوونەژوورەوە / تۆمارکردن',
    fullName: 'ناوی تەواو',
    emailAddress: 'ناونیشانی ئیمەیل',
    password: 'وشەی نهێنی',
    confirmPassword: 'پشتڕاستکردنەوەی وشەی نهێنی',
    processingAuth: 'پرۆسێسکردن...',
    signUp: 'تۆمارکردن',
    signIn: 'چوونەژوورەوە',
    alreadyHaveAccount: 'پێشتر هەژماری هەیە؟',
    dontHaveAccount: 'هەژماری نییە؟',
    signedInAs: 'چوونەژوورەوە وەک',
    autoCloudBackupActive: 'پاشەکەوتی خودکاری کلاود چالاکە (دوای هەر گۆڕانکارییەک نوێ دەبێتەوە)',
    
    // Sale details modal
    saleDetails: 'وردەکاری فرۆشتن',
    date: 'بەروار',
    customer: 'کڕیار',
    unknownCustomer: 'نەزانراو',
    ramSpecs: 'RAM',
    storageSpecs: 'بیرگە',
    sellingPrice: 'نرخی فرۆشتن',
    buyingPrice: 'نرخی کڕین',
    qty: 'ژمارە',
    profit: 'قازانج',
    returnQty: 'ژمارەی گەڕاندنەوە',
    returnItems: 'گەڕاندنەوە',
    returnSelectedQty: 'گەڕاندنەوەی ژمارە هەڵبژێردراوەکان',
    productProfit: 'قازانجی بەرهەم',
    accessoryProfit: 'قازانجی ئامێری یارمەتیدەر',
    totalItems: 'کۆی بڕگەکان',
    
    // Confirm modal
    confirmReturnItem: 'دڵنیایت کە دەتەوێت ئەم بڕگەیە بگەڕێنیتەوە؟ ئەمە کۆگا دەگەڕێنێتەوە و بڕگەکە لە فرۆشتن لادەدات.',
    
    // Additional admin toast messages
    debtMarkedAsPaid: 'قەرز بە سەرکەوتوویی وەک پارە دراو نیشان کرا',
    errorMarkingDebtPaid: 'هەڵە لە نیشان کردنی قەرز وەک پارە دراو',
    
    // Stock alerts
    stockWarnings: 'ئاگاداری کۆگا',
    itemsLeft: 'ماوە',
    
    // Various admin placeholders and labels
    selectRAM: 'RAM هەڵبژێرە یان بنووسە...',
    selectStorage: 'بیرگە هەڵبژێرە یان بنووسە...',
    noBackupMethodConfigured: 'هیچ شێوازی پاشەکەوت ڕێکخستن نەکراوە',
    
    // Accessories Section
    addAccessory: 'زیادکردنی ئامێری یارمەتیدەر',
    type: 'جۆر',
    brand: 'مارک',
    searchAccessories: 'گەڕان بە دوای ئامێری یارمەتیدەرەکان...',
    allTypes: 'هەموو جۆرەکان',
    clearFilters: 'پاککردنەوەی فلتەرەکان',
    showing: 'نیشان دان',
    noAccessoriesFound: 'هیچ ئامێری یارمەتیدەرێک نەدۆزرایەوە',
    tryDifferentSearch: 'هەوڵی پێوەری گەڕانی جیاواز بدە',
    noAccessories: 'هێشتا ئامێری یارمەتیدەر نییە',
    addFirstAccessory: 'یەکەم ئامێری یارمەتیدەرت زیاد بکە بۆ دەستپێکردن',
    
    // Archived Items Section
    archivedItems: 'بڕگە ئارشیو کراوەکان',
    archivedAccessories: 'ئامێری یارمەتیدەرە ئارشیو کراوەکان',
    
    // Sales History Section
    confirmReturnSale: 'دڵنیایت کە دەتەوێت هەموو ئەم فرۆشتنە بگەڕێنیتەوە؟ ئەمە کۆگا دەگەڕێنێتەوە و فرۆشتنەکە لە تۆمارەکان لادەدات.',
    returnEntry: 'گەڕاندنەوە',
    confirmReturnEntry: 'دڵنیایت کە دەتەوێت ئەم کڕینە بگەڕێنیتەوە؟ ئەمە کۆگا کەم دەکاتەوە و پارەکە دەگەڕێنێتەوە.',
    returnItem: 'گەڕاندنەوەی بابەت',
    returnQuantity: 'ژمارەی گەڕاندنەوە',
    refundAmount: 'بڕی گەڕاندنەوە',
    returnSuccess: 'گەڕاندنەوە بە سەرکەوتوویی تەواو بوو!',
    returnError: 'شکستی گەڕاندنەوە',
    availableQuantity: 'ژمارەی بەردەست',
    
    // Customer Debts Section
    customerDebtsDesc: 'شوێنکەوتنی پارەی کڕیارەکان پێتان',
    searchCustomer: 'گەڕان بە دوای کڕیارەکان...',
    noCustomerDebts: 'هیچ قەرزی کڕیارێک نەدۆزرایەوە',
    noCustomerDebtsDesc: 'هەموو کڕیارەکان قەرزەکانیان داوە یان هیچ فرۆشتنی قەرزی نەکراوە',
    noCustomerDebtsFound: 'هیچ قەرزی کڕیارێک نەدۆزرایەوە بۆ ئەم گەڕانە',
    customers: 'کڕیارەکان',
    paidOn: 'پارە درا لە',
    markDebtAsPaidConfirm: 'دڵنیایت کە دەتەوێت ئەم قەرزە وەک پارە دراو نیشان بکەیت؟',
    
    // Company Debts Section
    transaction: 'مامەڵە',
    searchCompanyDebts: 'گەڕان بە دوای قەرزی کۆمپانیاکان...',
    noCompanyDebts: 'هیچ قەرزی کۆمپانیایەک نییە',
    noMatchingDebts: 'هیچ قەرزی کۆمپانیایەک نەدۆزرایەوە',
    totalOwed: 'کۆی قەرز',
    paid: 'پارە درا',
    noDescription: 'وەسف نییە',
    created: 'دروست کرا',
    typeModelName: 'جۆر/ناوی مۆدێل بنووسە',
    
    // Monthly Reports Section
    noReports: 'هێشتا ڕاپۆرتی مانگانە نییە',
    totalTransactions: 'کۆی مامەڵەکان',
    totalProductsSold: 'کۆی بەرهەمە فرۆشراوەکان',
    totalAccessoriesSold: 'کۆی ئامێری یارمەتیدەرە فرۆشراوەکان',
    totalSpent: 'کۆی خەرجی',
    
    // Settings Modal
    theme: 'ڕووکار',
    system: 'سیستم',
    light: 'ڕووناک',
    dark: 'تاریک',
    language: 'زمان',
    lowStockThreshold: 'سنووری کۆگای کەم',
    exportSales: 'ناردنی فرۆشتنەکان',
    exportInventory: 'ناردنی کۆگا',
    resetAllData: 'ڕیسێت کردنی هەموو زانیاریەکان',
    close: 'داخستن',

    // Search and Filter
    searchAndFilter: 'گەڕان و فلتەرکردن',
    searchFilterDesc: 'وەسفی فلتەری گەڕان',
    searchByName: 'گەڕان بە ناو',
    searchType: 'گەڕان بە جۆر',
    selectPeriod: 'ماوە هەڵبژێرە',
    quickSelect: 'هەڵبژاردنی خێرا',
    singleDate: 'بەرواری تاک',
    weekRange: 'مەودای هەفتە',
    customRange: 'مەودای دیاریکراو',
    yesterday: 'دوێنێ',
    last7Days: 'دوایین ٧ ڕۆژ',
    lastWeek: 'هەفتەی پێشوو',
    last30Days: 'دوایین ٣٠ ڕۆژ',
    LastMonth: 'مانگی پێشوو',
    day: 'ڕۆژ',
    week: 'هەفتە',
    month: 'مانگ',
    year: 'ساڵ',

    //Buying History Section
    noBuyingHistory: 'مێژووی کڕین نییە',
    addFirstPurchase: 'یەکەم کڕینت زیاد بکە بۆ دەستپێکردن',
    payNow: 'ئێستا پارە بدە',
    payLater: 'دواتر پارە بدە',
    immediatePayment: 'پارەدانی ڕاستەوخۆ',
    
    unitPrice: 'نرخی یەکە',
    selectBrand: 'مارک هەڵبژێرە',
    selectBrandFirst: 'سەرەتا مارک هەڵبژێرە',
    totalAmount: 'کۆی پارە',

    //missing translations
    itemTotal: 'کۆی بڕگە',
    
    // Cloud backup hardcoded texts
    cloudBackupManager: 'بەڕێوەبەری پاشەکەوتی کلاود',
    signOut: 'چوونەدەرەوە',
    createManualBackup: 'دروستکردنی پاشەکەوتی دەستی',
    createLocalBackup: 'دروستکردنی پاشەکەوتی ناوخۆیی',
    refresh: 'نوێکردنەوە',
    creating: 'دروستکردن...',
    cloudBackups: 'پاشەکەوتی کلاود',
    backups: 'پاشەکەوتەکان',
    noCloudBackupsFound: 'هیچ پاشەکەوتی کلاودی نەدۆزرایەوە',
    fileName: 'ناوی فایل',
    uploadDate: 'بەرواری بارکردن',
    size: 'قەبارە',
    actions: 'کردارەکان',
    downloadBackupFile: 'داگرتنی فایلی پاشەکەوت بۆ کۆمپیوتەرەکەت',
    download: 'داگرتن',
    downloadAndRestore: 'داگرتن و گەڕاندنەوە',
    downloadRestore: 'داگرتن و گەڕاندنەوە',
    deleteBackupFromCloud: 'سڕینەوەی پاشەکەوت لە کلاود',
    delete: 'سڕینەوە',
    localBackups: 'پاشەکەوتی ناوخۆیی',
    localBackupsStored: 'پاشەکەوتی ناوخۆیی لە فۆڵدەری بەڵگەنامەکانت پاشەکەوت کراوە لە ژێر "Mobile Roma BackUp"',
    openBackupFolder: 'کردنەوەی فۆڵدەری پاشەکەوت',
    restoreFromFile: 'گەڕاندنەوە لە فایل',
    
    // Company debts section
    markAsPaid: 'نیشانکردن وەک پارە دراو',
    viewDetails: 'بینینی وردەکاری',
    totalCompanyDebt: 'کۆی قەرزی کۆمپانیا',
    unpaidDebt: 'قەرزی نەدراو',
    paidDebt: 'قەرزی دراو',
    
    // Sales history section
    salesHistoryTitle: 'مێژووی فرۆشتن',
    
    // Customer debts section  
    totalPaid: 'کۆی پارە دراو',
    totalOutstanding: 'کۆی ماوە',
    paidAmount: 'بڕی پارە دراو',
    outstandingAmount: 'بڕی ماوە',
    singleTransaction: 'مامەڵە',
    newestFirst: 'نوێترین یەکەم',
    oldestFirst: 'کۆنترین یەکەم',
    highestAmount: 'بەرزترین بڕ',
    lowestAmount: 'نزمترین بڕ',
    customerAZ: 'کڕیار A-Z',
    customerZA: 'کڕیار Z-A',
    debtsPaid: 'قەرزە دراوەکان',
    paidDebts: 'قەرزە دراوەکان',
    markPaid: 'نیشانکردنی وەک دراو',
    itemsCount: 'بڕگەکان',
    
    // Missing translations in Kurdish
    generated: 'دروستکراو',
    affectedItems: 'بڕگە کاریگەرەکان',
    selling: 'فرۆشتن',
    cost: 'تێچوون',
    loss: 'زیان',
    totalLoss: 'کۆی زیان',
    acknowledge: 'تێگەیشتم',
    reviewPricesBeforeProceeding: 'تکایە نرخەکان پێداچوونەوە بکە پێش بەردەوامبوون!',
    buyingHistoryDesc: 'شوێنکەوتنی هەموو کڕینە بازرگانییەکانت و خەرجییەکان',
    cashOnly: 'تەنها پارە نەقد',
    
    // Purchase modal
    selectModel: 'مۆدێل هەڵبژێرە یان بنووسە...',
    payLaterCreatesDebt: 'دواتر پارە بدە - قەرزی کۆمپانیا دروست دەکات',
    immediatePaymentHistory: 'پارەدانی ڕاستەوخۆ - دەچێتە مێژووی کڕین',

    // Sales history hardcoded text translations
    noSales: 'هیچ فرۆشتنێک نییە',
    returnSale: 'گەڕاندنەوە',
    totalProducts: 'کۆی بەرهەمەکان',
    totalSales: 'کۆی فرۆشتنەکان',
    totalRevenue: 'کۆی داهات',

    // Missing translations
    showingResults: 'ئەنجامەکان نیشان دەدرێن',
    entries: 'تۆمارەکان',
    lastMonth: 'مانگی پێشوو',
    purchasedItems: 'بڕگەی کڕراو',
    companyDebtDetails: 'وردەکاری قەرزی کۆمپانیا',
    SPECIFICATIONS: 'تایبەتمەندییەکان',
    ITEM: 'بڕگە',
    hideItems: 'شاردنەوەی بڕگەکان',
    status: 'دۆخ',
    createdAt: 'دروستکراوە',
    selectDate: 'بەروار هەڵبژێرە',
    withItems: 'لەگەڵ بڕگەکان',
    viewItems: 'بینینی بڕگەکان',
    weekStartDate: 'دەستپێکی هەفتە',

  },
  ar: {
    // Common
    loading: 'جاري التحميل...',
    cancel: 'إلغاء',
    ok: 'موافق',
    select: 'اختيار',
    add: 'إضافة',
    name: 'الاسم',
    model: 'الموديل',
    ram: 'RAM',
    storage: 'التخزين',
    price: 'السعر',
    stock: 'المخزون',
    stockLabel: 'المخزون',
    quantity: 'الكمية',
    total: 'المجموع',
    items: 'العناصر',
    of: 'من',
    unknown: 'غير معروف',
    
    // Cashier
    cashier: 'الكاشير',
    backToAdmin: 'العودة للإدارة',
    cart: 'السلة',
    emptyCart: 'السلة فارغة',
    customerName: 'اسم العميل',
    enterCustomerName: 'أدخل اسم العميل',
    paymentType: 'نوع الدفع',
    cash: 'نقدي',
    credit: 'آجل',
    processing: 'جاري المعالجة...',
    addToCredit: 'إضافة للآجل',
    completeSale: 'إتمام البيع',
    searchProducts: 'البحث عن المنتجات...',
    
    // Product messages
    pleaseEnterProductName: 'يرجى إدخال اسم المنتج',
    productNotFoundOrInvalid: 'المنتج غير موجود أو غير صالح',
    noProducts: 'لا توجد منتجات.',
    multipleProductsFound: 'تم العثور على عدة منتجات',
    
    // Stock messages
    outOfStock: 'نفد المخزون',
    inStock: 'متوفر',
    lowStock: 'مخزون منخفض (≤5)',
    allStock: 'جميع المخزون',
    addedToCart: 'أضيف للسلة',
    
    // Filters
    allBrands: 'جميع العلامات',
    allCategories: 'جميع الفئات',
    phones: 'الهواتف',
    accessories: 'الإكسسوارات',
    noItemsFound: 'لم يتم العثور على عناصر',
    tryDifferentFilters: 'حاول تعديل البحث أو المرشحات',
    
    // Sale messages
    offlineWarning: '⚠️ أنت غير متصل! لن يتم نسخ هذا البيع احتياطياً للسحابة حتى يتم استعادة الاتصال.',
    warningSellingBelowCost: '⚠️ تحذير: البيع بسعر أقل من سعر الشراء!',
    continueAnyway: 'سيؤدي هذا إلى خسارة. الاستمرار على أي حال؟',
    cannotCompleteNegativeTotal: 'لا يمكن إتمام البيع بمجموع سالب',
    pleaseEnterCustomerName: 'يرجى إدخال اسم العميل لجميع المبيعات',
    confirmDebtSale: 'هل أنت متأكد من أنك تريد تسجيل هذا البيع كدين؟',
    confirmSale: 'هل أنت متأكد من أنك تريد إتمام هذا البيع؟',
    customerNameRequired: 'اسم العميل مطلوب لجميع المبيعات.',
    
    // Sale results
    saleRecordCreationFailed: 'تم حفظ البيع لكن فشل في إنشاء سجل الدين: ',
    debtCreationFailed: 'تم حفظ البيع لكن فشل في إنشاء الدين: ',
    debtSaleSuccess: 'تم تسجيل البيع الآجل!',
    saleSuccess: 'تم البيع بنجاح!',
    saleFailed: 'فشل البيع',
    saleApiUnavailable: 'API البيع غير متاح',
    unknownError: 'خطأ غير معروف',
    
    // Keyboard shortcuts
    completeSaleNotImplemented: 'إتمام البيع (غير مطبق)',
    
    // Cart messages
    stockEmptyIncrement: 'المخزون فارغ. هل تريد زيادة المخزون بـ 1؟',
    stockIncremented: 'تم زيادة المخزون بـ 1.',
    cannotAddMoreStock: 'لا يمكن إضافة أكثر من المخزون المتاح! المتاح: ',
    cannotAddMoreStockInCart: 'لا يمكن إضافة أكثر من المخزون المتاح! المتاح: ',
    
    // Admin Page
    dashboard: 'لوحة التحكم',
    products: 'المنتجات',
    archivedProducts: 'المؤرشفة',
    salesHistory: 'تاريخ المبيعات',
    buyingHistory: 'تاريخ الشراء',
    customerDebts: 'ديون العملاء',
    companyDebts: 'ديون الشركات',
    monthlyReports: 'التقارير الشهرية',
    cloudBackup: 'النسخ الاحتياطي السحابي',
    settings: 'الإعدادات',
    logout: 'تسجيل الخروج',
    
    // Admin Dashboard - Today's Performance
    adminDashboard: 'لوحة تحكم الإدارة',
    todaysPerformance: 'أداء اليوم',
    sales: 'المبيعات',
    spending: 'المصروفات',
    netPerformance: 'صافي الأداء',
    salesWillAppearHere: 'ستظهر المبيعات هنا',
    thisMonth: 'هذا الشهر',
    totalProfit: 'إجمالي الربح',
    inventoryValue: 'قيمة المخزون',
    debts: 'الديون',

    // Admin notifications
    lowStockAlert: 'تنبيه مخزون منخفض',
    archiving: 'جاري الأرشفة',
    unarchiving: 'جاري إلغاء الأرشفة',
    archiveUnarchiveFailed: 'فشل الأرشفة/إلغاء الأرشفة (لا يوجد رد).',
    productArchived: 'تم أرشفة العنصر!',
    productUnarchived: 'تم إلغاء أرشفة العنصر!',
    archiveFailed: 'فشل في الأرشفة.',
    unarchiveFailed: 'فشل في إلغاء الأرشفة.',
    
    // Dashboard
    businessOverview: 'نظرة عامة على الأعمال',
    dashboardWelcome: 'مرحباً بك في لوحة تحكم أعمالك',
    addPurchase: 'إضافة مشتريات',
    reloadApp: 'إعادة تحميل بيانات التطبيق',
    reloading: 'جاري إعادة التحميل...',
    reload: 'إعادة التحميل',
    today: 'اليوم',
    transactions: 'المعاملات',
    thisWeek: 'هذا الأسبوع',
    weeklyRevenue: 'الإيرادات الأسبوعية',
    outstanding: 'المستحق',
    unpaidDebts: 'الديون غير المدفوعة',
    inventory: 'المخزون',
    lowStockText: 'مخزون منخفض',
    allStocksHealthy: 'جميع المخزونات صحية',
    
    // Top products section
    topProducts: 'أهم المنتجات',
    bestSellers: 'الأكثر مبيعاً',
    revenue: 'الإيرادات',
    sold: 'مُباع',
    noSalesDataYet: 'لا توجد بيانات مبيعات حتى الآن',
    sellItemsToSeeStats: 'ابدأ في بيع العناصر لرؤية الإحصائيات',
    
    // Recent sales section
    recentSales: 'المبيعات الأخيرة',
    latestTransactions: 'آخر المعاملات',
    debt: 'دين',
    view: 'عرض',
    noRecentSales: 'لا توجد مبيعات حديثة',
   
    // Stock alerts section
    stockAlerts: 'تنبيهات المخزون',
    lowStockItems: 'العناصر المنخفضة',
    left: 'متبقي',
    noLowStockItems: 'لا توجد عناصر منخفضة',
    
    // Quick actions
    quickActions: 'الإجراءات السريعة',
    commonTasks: 'المهام الشائعة',
    active: 'نشط',
    totalCount: 'المجموع',
    unpaid: 'غير مدفوع',
    archived: 'مؤرشف',
    
    // Product table
    search: 'البحث...',
    action: 'الإجراء',
    noArchivedProducts: 'لا توجد منتجات مؤرشفة',
    low: 'منخفض',
    edit: 'تحرير',
    archive: 'أرشفة',
    unarchive: 'إلغاء الأرشفة',
    
    // Quick add product
    company: 'الشركة',
    other: 'أخرى',
    ramPlaceholder: 'RAM (مثال: 8GB)',
    storagePlaceholder: 'التخزين (مثال: 128GB)',
    addProduct: 'إضافة منتج',
    missingRamStorageConfirm: 'RAM أو التخزين فارغ. هل أنت متأكد من أنك تريد إضافة هذا المنتج؟',
    
    // Admin error messages and validation
    pleaseProvideValidCompanyName: 'يرجى تقديم اسم شركة صالح',
    pleaseProvideValidAmount: 'يرجى تقديم مبلغ صالح أكبر من 0',
    pleaseAddAtLeastOneItem: 'يرجى إضافة عنصر واحد على الأقل',
    pleaseFillAllRequiredFields: 'يرجى ملء جميع الحقول المطلوبة لجميع العناصر',
    exportFailed: 'فشل التصدير',
    successful: 'نجح',
    testPrintSuccessful: 'اختبار الطباعة نجح!',
    printTestFailed: 'فشل اختبار الطباعة',
    
    // Company debt and purchase modal
    addCompanyDebt: 'إضافة دين شركة',
    companyName: 'اسم الشركة',
    enterCompanyName: 'أدخل اسم الشركة',
    description: 'الوصف',
    optional: 'اختياري',
    enterDescription: 'أدخل الوصف',
    purchaseType: 'نوع الشراء',
    simplePurchase: 'شراء بسيط',
    justAmount: 'فقط حدد المبلغ',
    purchaseWithItems: 'شراء مع العناصر',
    addItemsToInventory: 'إضافة العناصر للمخزون',
    amount: 'المبلغ',
    itemsList: 'العناصر',
    noItemsAdded: 'لم يتم إضافة عناصر بعد',
    clickAddButtons: 'انقر على الأزرار أعلاه لإضافة العناصر',
    product: 'منتج',
    accessory: 'إكسسوار',
    buyOnCredit: 'شراء بالآجل',
    payDirectly: 'دفع مباشر',
    paymentStatus: 'حالة الدفع',
    purchaseAddedSuccessfully: 'تمت إضافة المشتريات بنجاح!',
    errorAddingPurchase: 'خطأ في إضافة المشتريات',
    
    // Accessory modal dropdowns
    selectType: 'اختر النوع',
    headphones: 'السماعات',
    earbuds: 'السماعات الصغيرة',
    charger: 'الشاحن',
    cable: 'الكابل',
    case: 'الحافظة',
    screenProtector: 'حامي الشاشة',
    powerBank: 'البطارية المحمولة',
    wirelessCharger: 'الشاحن اللاسلكي',
    speaker: 'المكبر',
    smartwatch: 'الساعة الذكية',
    enterNameModel: 'أدخل اسم/موديل الإكسسوار',
    accessoryUpdated: 'تم تحديث الإكسسوار',
    productUpdated: 'تم تحديث المنتج',
    
    // Settings modal
    confirmResetAllData: 'هل أنت متأكد من أنك تريد حذف جميع المنتجات والمؤرشفة وتاريخ المبيعات؟ لا يمكن التراجع عن هذا!',
    confirmReset: 'هل أنت متأكد من أنك تريد إعادة تعيين جميع البيانات؟ سيؤدي هذا إلى حذف كل شيء ولا يمكن التراجع عنه!',
    
    // Sound settings
    soundSettings: 'إعدادات الصوت',
    enableSounds: 'تمكين الأصوات',
    volume: 'مستوى الصوت',
    soundTypes: 'أنواع الأصوات',
    actionSounds: 'أصوات الإجراءات',
    systemSounds: 'أصوات النظام',
    modalSounds: 'أصوات النوافذ',
    successSounds: 'أصوات النجاح',
    errorSounds: 'أصوات الخطأ',
    WarningSounds: 'أصوات التحذير',
    NotificationSounds: 'أصوات الإشعارات',
   
    // Cloud backup service
    cloudBackupService: 'خدمة النسخ الاحتياطي السحابي',
    signInToEnable: 'سجل الدخول لتمكين النسخ الاحتياطي السحابي التلقائي بعد كل تغيير في البيانات، بالإضافة إلى إمكانيات النسخ الاحتياطي والاستعادة اليدوية',
    signInSignUp: 'تسجيل الدخول / التسجيل',
    fullName: 'الاسم الكامل',
    emailAddress: 'عنوان البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    processingAuth: 'جاري المعالجة...',
    signUp: 'التسجيل',
    signIn: 'تسجيل الدخول',
    alreadyHaveAccount: 'لديك حساب بالفعل؟',
    dontHaveAccount: 'ليس لديك حساب؟',
    signedInAs: 'مسجل الدخول باسم',
    autoCloudBackupActive: 'النسخ الاحتياطي السحابي التلقائي نشط (يتم التحديث بعد كل تغيير)',
    
    // Sale details modal
    saleDetails: 'تفاصيل البيع',
    date: 'التاريخ',
    customer: 'العميل',
    unknownCustomer: 'غير معروف',
    ramSpecs: 'RAM',
    storageSpecs: 'التخزين',
    sellingPrice: 'سعر البيع',
    buyingPrice: 'سعر الشراء',
    qty: 'الكمية',
    profit: 'الربح',
    returnQty: 'كمية الإرجاع',
    returnItems: 'إرجاع',
    returnSelectedQty: 'إرجاع الكمية المحددة',
    productProfit: 'ربح المنتج',
    accessoryProfit: 'ربح الإكسسوار',
    totalItems: 'إجمالي العناصر',
    
    // Confirm modal
    confirmReturnItem: 'هل أنت متأكد من أنك تريد إرجاع هذا العنصر؟ سيتم استعادة المخزون وإزالة العنصر من البيع.',
    
    // Additional admin toast messages
    debtMarkedAsPaid: 'تم تمييز الدين كمدفوع بنجاح',
    errorMarkingDebtPaid: 'خطأ في تمييز الدين كمدفوع',
    
    // Stock alerts
    stockWarnings: 'تنبيهات المخزون',
    itemsLeft: 'متبقي',
    
    // Various admin placeholders and labels
    selectRAM: 'اختر أو اكتب RAM...',
    selectStorage: 'اختر أو اكتب التخزين...',
    noBackupMethodConfigured: 'لا يوجد طريقة نسخ احتياطي مكونة',
    
    // Accessories Section
    addAccessory: 'إضافة إكسسوار',
    type: 'النوع',
    brand: 'العلامة التجارية',
    searchAccessories: 'البحث في الإكسسوارات...',
    allTypes: 'جميع الأنواع',
    clearFilters: 'مسح المرشحات',
    showing: 'عرض',
    noAccessoriesFound: 'لم يتم العثور على إكسسوارات',
    tryDifferentSearch: 'جرب معايير بحث مختلفة',
    noAccessories: 'لا توجد إكسسوارات بعد',
    addFirstAccessory: 'أضف أول إكسسوار لك للبدء',
    
    // Archived Items Section
    archivedItems: 'العناصر المؤرشفة',
    archivedAccessories: 'الإكسسوارات المؤرشفة',
    
    // Sales History Section
    confirmReturnSale: 'هل أنت متأكد من أنك تريد إرجاع هذا البيع بالكامل؟ سيتم استعادة المخزون وإزالة البيع من السجلات.',
    returnEntry: 'إرجاع',
    confirmReturnEntry: 'هل أنت متأكد من أنك تريد إرجاع هذا الشراء؟ سيتم تقليل المخزون وإرداد المبلغ.',
    returnItem: 'إرجاع العنصر',
    returnQuantity: 'كمية الإرجاع',
    refundAmount: 'مبلغ الاسترداد',
    returnSuccess: 'تم معالجة الإرجاع بنجاح!',
    returnError: 'فشل في معالجة الإرجاع',
    availableQuantity: 'الكمية المتاحة',
    
    // Customer Debts Section
    customerDebtsDesc: 'تتبع الأموال المستحقة لك من العملاء',
    searchCustomer: 'البحث في العملاء...',
    noCustomerDebts: 'لا توجد ديون عملاء',
    noCustomerDebtsDesc: 'جميع العملاء دفعوا ديونهم أو لم يتم إجراء مبيعات آجلة',
    noCustomerDebtsFound: 'لم يتم العثور على ديون عملاء لهذا البحث',
    customers: 'العملاء',
    paidOn: 'مدفوع في',
    markDebtAsPaidConfirm: 'هل أنت متأكد من أنك تريد تمييز هذا الدين كمدفوع؟',
    
    // Company Debts Section
    transaction: 'المعاملة',
    searchCompanyDebts: 'البحث في ديون الشركات...',
    noCompanyDebts: 'لا توجد ديون شركات',
    noMatchingDebts: 'لم يتم العثور على ديون شركات مطابقة',
    totalOwed: 'إجمالي المدين',
    paid: 'مدفوع',
    noDescription: 'لا يوجد وصف',
    created: 'تم الإنشاء',
    typeModelName: 'اكتب اسم الموديل',
    
    // Monthly Reports Section
    noReports: 'لا توجد تقارير شهرية بعد',
    totalTransactions: 'إجمالي المعاملات',
    totalProductsSold: 'إجمالي المنتجات المباعة',
    totalAccessoriesSold: 'إجمالي الإكسسوارات المباعة',
    totalSpent: 'إجمالي المصروف',
    
    // Settings Modal
    theme: 'السمة',
    system: 'النظام',
    light: 'فاتح',
    dark: 'داكن',
    language: 'اللغة',
    lowStockThreshold: 'حد المخزون المنخفض',
    exportSales: 'تصدير المبيعات',
    exportInventory: 'تصدير المخزون',
    resetAllData: 'إعادة تعيين جميع البيانات',
    close: 'إغلاق',

    // Search and Filter
    searchAndFilter: 'البحث والتصفية',
    searchFilterDesc: 'وصف مرشح البحث',
    searchByName: 'البحث بالاسم',
    searchType: 'البحث بالنوع',
    selectPeriod: 'اختر الفترة',
    quickSelect: 'اختيار سريع',
    singleDate: 'تاريخ واحد',
    weekRange: 'نطاق الأسبوع',
    customRange: 'نطاق مخصص',
    yesterday: 'أمس',
    last7Days: 'آخر 7 أيام',
    lastWeek: 'الأسبوع الماضي',
    last30Days: 'آخر 30 يوم',
    LastMonth: 'الشهر الماضي',
    day: 'يوم',
    week: 'أسبوع',
    month: 'شهر',
    year: 'سنة',

    //Buying History Section
    noBuyingHistory: 'لا يوجد تاريخ شراء',
    addFirstPurchase: 'أضف أول مشترياتك للبدء',
    payNow: 'ادفع الآن',
    payLater: 'ادفع لاحقاً',
    immediatePayment: 'الدفع الفوري',
    
    unitPrice: 'سعر الوحدة',
    selectBrand: 'اختر العلامة التجارية',
    selectBrandFirst: 'اختر العلامة التجارية أولاً',
    totalAmount: 'إجمالي المبلغ',

    //missing translations
    itemTotal: 'إجمالي العنصر',
    
    // Cloud backup hardcoded texts
    cloudBackupManager: 'مدير النسخ الاحتياطي السحابي',
    signOut: 'تسجيل الخروج',
    createManualBackup: 'إنشاء نسخة احتياطية يدوية',
    createLocalBackup: 'إنشاء نسخة احتياطية محلية',
    refresh: 'تحديث',
    creating: 'جاري الإنشاء...',
    cloudBackups: 'النسخ الاحتياطي السحابية',
    backups: 'نسخ احتياطية',
    noCloudBackupsFound: 'لم يتم العثور على نسخ احتياطية سحابية',
    fileName: 'اسم الملف',
    uploadDate: 'تاريخ الرفع',
    size: 'الحجم',
    actions: 'الإجراءات',
    downloadBackupFile: 'تحميل ملف النسخة الاحتياطية إلى الكمبيوتر',
    download: 'تحميل',
    downloadAndRestore: 'تحميل واستعادة النسخة الاحتياطية',
    downloadRestore: 'تحميل واستعادة',
    deleteBackupFromCloud: 'حذف النسخة الاحتياطية من السحابة',
    delete: 'حذف',
    localBackups: 'النسخ الاحتياطية المحلية',
    localBackupsStored: 'يتم تخزين النسخ الاحتياطية المحلية في مجلد المستندات تحت "Mobile Roma BackUp"',
    openBackupFolder: 'فتح مجلد النسخ الاحتياطية',
    restoreFromFile: 'استعادة من ملف',
    
    // Company debts section
    markAsPaid: 'تمييز كمدفوع',
    viewDetails: 'عرض التفاصيل',
    totalCompanyDebt: 'إجمالي دين الشركة',
    unpaidDebt: 'دين غير مدفوع',
    paidDebt: 'دين مدفوع',
    
    // Sales history section
    salesHistoryTitle: 'تاريخ المبيعات',
    
    // Customer debts section  
    totalPaid: 'إجمالي المدفوع',
    totalOutstanding: 'إجمالي المستحق',
    paidAmount: 'المبلغ المدفوع',
    outstandingAmount: 'المبلغ المستحق',
    singleTransaction: 'معاملة',
    newestFirst: 'الأحدث أولاً',
    oldestFirst: 'الأقدم أولاً',
    highestAmount: 'أعلى مبلغ',
    lowestAmount: 'أقل مبلغ',
    customerAZ: 'العميل أ-ي',
    customerZA: 'العميل ي-أ',
    debtsPaid: 'الديون المدفوعة',
    paidDebts: 'الديون المدفوعة',
    markPaid: 'تمييز كمدفوع',
    itemsCount: 'العناصر',
    
    // Missing translations in Arabic
    generated: 'تم إنشاؤه',
    affectedItems: 'العناصر المتأثرة',
    selling: 'البيع',
    cost: 'التكلفة', 
    loss: 'الخسارة',
    totalLoss: 'إجمالي الخسارة',
    acknowledge: 'أفهم',
    reviewPricesBeforeProceeding: 'يرجى مراجعة الأسعار قبل المتابعة!',
    buyingHistoryDesc: 'تتبع جميع مشترياتك التجارية والمصروفات',
    cashOnly: 'نقداً فقط',

    // Sales history hardcoded text translations
    noSales: 'لا توجد مبيعات',
    returnSale: 'إرجاع',
    totalProducts: 'إجمالي المنتجات',
    totalSales: 'إجمالي المبيعات',
    totalRevenue: 'إجمالي الإيرادات',

    // Missing translations
    showingResults: 'عرض النتائج',
    entries: 'إدخالات',
    lastMonth: 'الشهر الماضي',
    purchasedItems: 'العناصر المشتراة',
    companyDebtDetails: 'تفاصيل دين الشركة',
    SPECIFICATIONS: 'المواصفات',
    ITEM: 'عنصر',
    hideItems: 'إخفاء العناصر',
    status: 'الحالة',
    createdAt: 'تاريخ الإنشاء',
    selectDate: 'اختر التاريخ',
    withItems: 'مع العناصر',
    viewItems: 'عرض العناصر',
    weekStartDate: 'تاريخ بدء الأسبوع',

  },
};

const LocaleContext = createContext();

function getTranslation(lang, key) {
  if (translations[lang] && translations[lang][key]) return translations[lang][key];
  if (translations['en'] && translations['en'][key]) return translations['en'][key];
  return key;
}

export function LocaleProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');
  const t = useMemo(() => {
    // Proxy to fallback to English if key missing in selected language
    return new Proxy(translations[lang] || translations['en'], {
      get(target, prop) {
        return target[prop] || translations['en'][prop] || prop;
      }
    });
  }, [lang]);
  
  const getMonthName = useMemo(() => {
    return (monthIndex) => {
      return monthNames[lang]?.[monthIndex] || monthNames['en'][monthIndex];
    };
  }, [lang]);
  
  const isRTL = lang === 'ar' || lang === 'ku';
  const notoFont = (lang === 'ar' || lang === 'ku')
    ? { fontFamily: 'Noto Sans Arabic, Noto Naskh Arabic, Noto Sans Kurdish, Noto Sans, sans-serif' }
    : {};

  // Persist language
  React.useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  return (
    <LocaleContext.Provider value={{ lang, setLang, t, isRTL, notoFont, getMonthName }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
