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
    
    // Settings modal
    confirmResetAllData: 'Are you sure you want to delete ALL products, archived, and sales history? This cannot be undone!',
   
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


    

  },
  ku: {
  },
  ar: {
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
  const isRTL = lang === 'ar' || lang === 'ku';
  const notoFont = (lang === 'ar' || lang === 'ku')
    ? { fontFamily: 'Noto Sans Arabic, Noto Naskh Arabic, Noto Sans Kurdish, Noto Sans, sans-serif' }
    : {};

  // Persist language
  React.useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  return (
    <LocaleContext.Provider value={{ lang, setLang, t, isRTL, notoFont }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
