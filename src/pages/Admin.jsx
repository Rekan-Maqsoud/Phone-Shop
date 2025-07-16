import React, { useEffect, useState, useLayoutEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useLocale } from '../contexts/LocaleContext';
import { useData } from '../contexts/DataContext';
import { triggerCloudBackupAsync } from '../utils/cloudBackupEnhanced';
import { playNavigationSound, playActionSound, playModalOpenSound, playModalCloseSound, playSuccessSound, playErrorSound } from '../utils/sounds';
import { EXCHANGE_RATES, loadExchangeRatesFromDB } from '../utils/exchangeRates';
import useAdmin from '../components/useAdmin';
import CustomerDebtsSection from '../components/CustomerDebtsSection';
import CompanyDebtsSection from '../components/CompanyDebtsSection';
import AccessoriesSection from '../components/AccessoriesSection';
import MultiCurrencyDashboard from '../components/MultiCurrencyDashboard';
import PersonalLoansSection from '../components/PersonalLoansSection';
import ArchivedItemsSection from '../components/ArchivedItemsSection';
import ProductsSection from '../components/ProductsSection';
import SalesHistorySection from '../components/SalesHistorySection';
import BuyingHistorySection from '../components/BuyingHistorySection';
import AdminModals from '../components/AdminModals';
import ToastUnified from '../components/ToastUnified';
import AdvancedAnalytics from '../components/AdvancedAnalytics';

export default function Admin() {
  const admin = useAdmin();
  const { sales, debts, products, refreshAllData } = useData(); // Get data directly from DataContext
  const { t, lang, isRTL, notoFont, setLang } = useLocale();
  const navigate = useNavigate();
  const [section, setSection] = useState('multiCurrencyDashboard'); // Start with multi-currency dashboard
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const { theme, setTheme, setAppTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [debtSearch, setDebtSearch] = useState('');
  const [showPaidDebts, setShowPaidDebts] = useState(false);
  const [showBackupManager, setShowBackupManager] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [isCompanyDebtMode, setIsCompanyDebtMode] = useState(false); // Track if modal is for company debt
  const [showEnhancedCompanyDebtModal, setShowEnhancedCompanyDebtModal] = useState(false);
  const [selectedCompanyDebt, setSelectedCompanyDebt] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, message: '', onConfirm: null });

  // Helper function for showing confirm modals - use memoized callback
  const showConfirm = useCallback((message, onConfirm) => {
    playModalOpenSound();
    setConfirm({ open: true, message, onConfirm });
  }, []);

  // Ensure theme is set before first paint
  useLayoutEffect(() => {
    setAppTheme(theme);
  }, [theme]);

  // Update language on change
  useEffect(() => {
    if (admin.setLang) admin.setLang(lang);
    localStorage.setItem('lang', lang);
  }, [lang, admin.setLang]);
  
  // Load exchange rates from database on mount
  useEffect(() => {
    loadExchangeRatesFromDB().catch(console.error);
  }, []);
  
  // Data is automatically fetched by DataContext, no need for manual fetchAllData
  
  // Low stock notification - memoized to prevent infinite re-renders
  const lowStockNotificationProducts = useMemo(() => {
    if (!admin.notificationsEnabled || !products.length) return [];
    return products.filter(p => p.stock < admin.lowStockThreshold);
  }, [products, admin.notificationsEnabled, admin.lowStockThreshold]);

  useEffect(() => {
    if (lowStockNotificationProducts.length > 0) {
      admin.setToast(`${t.lowStockAlert}: ${lowStockNotificationProducts.map(p => p.name).join(', ')}`);
    }
  }, [lowStockNotificationProducts, admin.setToast, t]);

  // Calculate total profit (for main page use, most calculations moved to AdminStatsSidebar) - memoized
  const totalProfit = useMemo(() => {
    return sales.reduce((sum, sale) => {
      if (!sale.items) return sum;
      // For debt sales, check if the debt is paid by looking up in debts array
      if (sale.is_debt) {
        const debt = debts?.find(d => d.sale_id === sale.id);
        if (!debt || (!debt.paid_at && !debt.paid)) return sum; // Skip unpaid debts - check both fields
      }
      return sum + sale.items.reduce((itemSum, item) => {
        const quantity = item.quantity || 1;
        const buyingPrice = item.buying_price || 0;
        const sellingPrice = item.selling_price || item.buying_price || 0;
        const productCurrency = item.product_currency || 'IQD';
        const saleCurrency = sale.currency || 'USD';
        
        // CRITICAL FIX: selling_price is stored in product's original currency
        // Need to convert both prices to sale currency for proper profit calculation
        let sellingPriceInSaleCurrency = sellingPrice;
        let buyingPriceInSaleCurrency = buyingPrice;
        
        // Get exchange rates from sale or use current rates
        const saleExchangeRates = sale.exchange_rates || {
          usd_to_iqd: EXCHANGE_RATES.USD_TO_IQD,
          iqd_to_usd: 0.000694
        };
        
        // Convert selling price to sale currency if needed
        if (productCurrency !== saleCurrency) {
          if (saleCurrency === 'USD' && productCurrency === 'IQD') {
            sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.iqd_to_usd;
          } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
            sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.usd_to_iqd;
          }
        }
        
        // Convert buying price to sale currency if needed
        if (productCurrency !== saleCurrency) {
          if (saleCurrency === 'USD' && productCurrency === 'IQD') {
            // Convert IQD buying price to USD
            buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.iqd_to_usd;
          } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
            // Convert USD buying price to IQD
            buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.usd_to_iqd;
          }
        }
        
        const profit = (sellingPriceInSaleCurrency - buyingPriceInSaleCurrency) * quantity;
        return itemSum + profit;
      }, 0);
    }, 0);
  }, [sales, debts]);

  // Recent activity and low stock products - memoized
  const criticalStockProducts = useMemo(() => products.filter(p => p.stock <= 2 && !p.archived), [products]);
  const lowStockProducts = useMemo(() => products.filter(p => p.stock > 2 && p.stock < admin.lowStockThreshold && !p.archived), [products, admin.lowStockThreshold]);

  // Memoize nav items for performance with keyboard shortcuts
  const navItems = useMemo(() => [
    { key: 'multiCurrencyDashboard', label: t.multiCurrencyDashboard || 'Multi-Currency Dashboard', icon: '💱', shortcut: '1' },
    { key: 'advancedAnalytics', label: t.advancedAnalytics || 'Advanced Analytics', icon: '📈', shortcut: '2' },
    { key: 'active', label: t.products, icon: '📦', shortcut: '3' },
    { key: 'accessories', label: t.accessories, icon: '🎧', shortcut: '4' },
    { key: 'archived', label: t.archivedProducts, icon: '🗃️', shortcut: '5' },
    { key: 'history', label: t.salesHistory, icon: '�', shortcut: '6' },
    { key: 'buyingHistory', label: t.buyingHistory, icon: '🛒', shortcut: '7' },
    { key: 'customerDebts', label: t.customerDebts, icon: '💳', shortcut: '8' },
    { key: 'companyDebts', label: t.companyDebts, icon: '💸', shortcut: '9' },
    { key: 'personalLoans', label: t.personalLoans || 'Personal Loans', icon: '🤝', shortcut: '0' },
    { key: 'backup', label: t.cloudBackup, icon: '☁️', action: () => setShowBackupManager(true) },
    { key: 'settings', label: t.settings, icon: '⚙️' },
    { key: 'logout', label: t.logout, icon: '🚪', action: () => navigate('/cashier'), isLogout: true },
  ], [t, navigate]);

  // Keyboard navigation for sections with number shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle keys if a modal is open
      if (admin.productModal || admin.saleDetailsModal || showSettingsModal || showBackupManager) {
        return;
      }
      
      // Don't handle keys if user is typing in an input field
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.contentEditable === 'true'
      )) {
        return;
      }
      
      // Handle number keys for navigation (only with Ctrl modifier)
      const numberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
      if (numberKeys.includes(e.key) && e.ctrlKey) {
        e.preventDefault();
        const navItem = navItems.find(item => item.shortcut === e.key);
        if (navItem && !navItem.action) {
          setSection(navItem.key);
          playNavigationSound();
        }
        return;
      }
      
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const sectionKeys = navItems.filter(item => !item.action).map(item => item.key);
        const currentIndex = sectionKeys.indexOf(section);
        
        if (e.key === 'ArrowUp') {
          const newIndex = currentIndex > 0 ? currentIndex - 1 : sectionKeys.length - 1;
          setSection(sectionKeys[newIndex]);
          playNavigationSound();
        } else if (e.key === 'ArrowDown') {
          const newIndex = currentIndex < sectionKeys.length - 1 ? currentIndex + 1 : 0;
          setSection(sectionKeys[newIndex]);
          playNavigationSound();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [section, navItems, admin.productModal, admin.saleDetailsModal, showSettingsModal, showBackupManager]);

  // UseCallback for nav click handler - optimize dependencies
  const handleNavClick = useCallback((item) => {
    if (item.key === 'settings') {
      playModalOpenSound();
      setShowSettingsModal(true);
    } else if (item.action) {
      playActionSound();
      item.action();
    } else {
      playNavigationSound();
      setSection(item.key);
    }
  }, []);

  // Unified archive/unarchive handler - optimize dependencies
  const handleArchiveToggle = useCallback(async (item, archive) => {
    const isAccessory = item.hasOwnProperty('brand') || item.hasOwnProperty('type'); // Simple check for accessory
    const itemType = isAccessory ? 'accessory' : 'product';
    const apiCall = isAccessory ? window.api?.editAccessory : window.api?.editProduct;
    
    admin.setToast(archive ? `${t.archiving}: ${item.name}` : `${t.unarchiving}: ${item.name}`);
    setLoading(true);
    
    try {
      const updated = {
        ...item,
        archived: archive ? 1 : 0,
        stock: archive ? 0 : item.stock
      };
      
      const res = await apiCall?.(updated); 
      if (!res || !res.success) {
        playErrorSound();
        admin.setToast(res?.message || t.archiveUnarchiveFailed);
      } else {
        playSuccessSound();
        admin.setToast(archive ? t.productArchived : t.productUnarchived);
        
        // Optimized: Update state locally instead of refetching all data
        if (isAccessory) {
          admin.setAccessories(prev => prev.map(a => a.id === item.id ? updated : a));
        } else {
          admin.setProducts(prev => prev.map(p => p.id === item.id ? updated : p));
        }
      }
    } catch (e) {
      console.error('Archive toggle error:', e);
      playErrorSound();
      admin.setToast(archive ? t.archiveFailed : t.unarchiveFailed);
    } finally {
      setLoading(false);
    }
  }, [admin.setToast, admin.setAccessories, admin.setProducts, t, setLoading]);

  // Helper to open product modal for editing
  const handleEditProduct = useCallback((product) => {
    admin.setEditProduct(product);
    admin.setShowProductModal(true);
  }, [admin.setEditProduct, admin.setShowProductModal]);

  // Toast notification (unified, auto-dismiss)
  useEffect(() => {
    if (admin.toast && admin.toast.msg) {
      const timer = setTimeout(() => {
        admin.setToast(null);
      }, admin.toast.duration || 3000);
      return () => clearTimeout(timer);
    }
  }, [admin.toast, admin.setToast]);

  // Helper functions to manage company debt mode
  const openAddPurchaseModal = useCallback(() => {
    setIsCompanyDebtMode(false);
    setShowAddPurchase(true);
  }, []);

  const openAddCompanyDebtModal = useCallback(() => {
    setIsCompanyDebtMode(true);
    setShowAddPurchase(true);
  }, []);

  const closeAddPurchaseModal = useCallback(() => {
    setShowAddPurchase(false);
    setIsCompanyDebtMode(false);
  }, []);

  // Expose refresh function globally for console commands
  useEffect(() => {
    window.adminRefreshBalances = async () => {
      try {
        await refreshAllData();
  
      } catch (error) {
        console.error('❌ Error refreshing admin balances:', error);
      }
    };
    
    // Cleanup
    return () => {
      delete window.adminRefreshBalances;
    };
  }, [refreshAllData]);

  // --- Redesigned UI with Small Sidebar ---
  return (
    <div
      className={`w-screen h-screen min-h-screen min-w-0 flex flex-row gap-0 justify-center items-stretch p-0 overflow-hidden bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#c7d2fe] dark:from-[#1e293b] dark:via-[#0f172a] dark:to-[#0e7490] ${isRTL ? 'rtl' : ''}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={notoFont}
      {...(loading ? { 'aria-busy': true } : {})}
    >
      {/* Sidebar Navigation */}
      <div className="w-64 flex flex-col bg-white/10 dark:bg-gray-900/20 backdrop-blur-md border-r border-white/10 dark:border-gray-700/30">
        {/* Keyboard shortcuts hint */}
        <div className="px-4 py-3 border-b border-white/10 dark:border-gray-700/30">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center font-mono">Keyboard Shortcuts: Ctrl+1-9, Ctrl+0</div>
        </div>
        
        <div className="flex-1 flex flex-col py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavClick(item)}
              className={`group relative flex items-center justify-start gap-3 p-3 mx-3 rounded-xl transition-all duration-200 ${
                section === item.key
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/20 dark:hover:bg-gray-700/30'
              } ${item.isLogout ? 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : ''}`}
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium truncate">{item.label}</div>
                {item.shortcut && (
                  <div className={`text-xs font-mono ${
                    section === item.key ? 'text-white/70' : 'text-gray-500 dark:text-gray-500'
                  }`}>
                    Press {item.shortcut}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col gap-6 w-full min-w-0 h-full max-w-full mx-0 p-8 overflow-auto items-center justify-start bg-transparent relative z-0">
        {/* Section content in glassy card */}
        <div className="w-full max-w-6xl mx-auto bg-white/80 dark:bg-gray-800/80 rounded-3xl shadow-2xl border border-white/20 p-8 flex flex-col gap-8">
          {/* Section content */}
          <div className="flex-1 min-h-0">
            {/* Multi-Currency Dashboard Section */}
            {section === 'multiCurrencyDashboard' && (
              <MultiCurrencyDashboard 
                t={t}
                admin={admin}
              />
            )}

            {/* Advanced Analytics Section */}
            {section === 'advancedAnalytics' && (
              <AdvancedAnalytics 
                t={t}
                admin={admin}
              />
            )}

            {/* Products Section */}
            {section === 'active' && (
              <ProductsSection 
                t={t}
                admin={admin}
                handleEditProduct={handleEditProduct}
                handleArchiveToggle={handleArchiveToggle}
                loading={loading}
              />
            )}

            {/* Accessories Section */}
            {section === 'accessories' && (
              <AccessoriesSection 
                t={t}
                admin={admin}
                handleArchiveToggle={handleArchiveToggle}
                loading={loading}
              />
            )}

            {/* Archived Items Section */}
            {section === 'archived' && (
              <ArchivedItemsSection 
                t={t}
                admin={admin}
                handleArchiveToggle={handleArchiveToggle}
              />
            )}
            {section === 'history' && (
              <SalesHistorySection 
                t={t}
                admin={admin}
                showConfirm={showConfirm}
                setConfirm={setConfirm}
                setLoading={setLoading}
                triggerCloudBackup={triggerCloudBackupAsync}
              />
            )}
            {section === 'buyingHistory' && (
              <BuyingHistorySection 
                t={t}
                admin={admin}
                openAddPurchaseModal={openAddPurchaseModal}
              />
            )}
            {section === 'customerDebts' && (
              <CustomerDebtsSection 
                t={t}
                admin={admin}
                debtSearch={debtSearch}
                setDebtSearch={setDebtSearch}
                showPaidDebts={showPaidDebts}
                setShowPaidDebts={setShowPaidDebts}
                showConfirm={showConfirm}
                triggerCloudBackup={triggerCloudBackupAsync}
              />
            )}

            {section === 'companyDebts' && (
              <CompanyDebtsSection 
                t={t}
                admin={admin}
                openAddCompanyDebtModal={openAddCompanyDebtModal}
                setSelectedCompanyDebt={setSelectedCompanyDebt}
                setShowEnhancedCompanyDebtModal={setShowEnhancedCompanyDebtModal}
                showConfirm={showConfirm}
                setConfirm={setConfirm}
                triggerCloudBackup={triggerCloudBackupAsync}
              />
            )}

            {/* Advanced Analytics Section */}
            {section === 'advancedAnalytics' && (
              <AdvancedAnalytics 
                t={t}
                admin={admin}
              />
            )}

            {/* Personal Loans Section */}
            {section === 'personalLoans' && (
              <PersonalLoansSection 
                t={t}
                admin={admin}
              />
            )}
          </div>
        </div>
      </main>

      {/* All Modals */}
      <AdminModals 
        showSettingsModal={showSettingsModal}
        setShowSettingsModal={setShowSettingsModal}
        theme={theme}
        setTheme={setTheme}
        lang={lang}
        setLang={setLang}
        admin={admin}
        t={t}
        loading={loading}
        showConfirm={showConfirm}
        setConfirm={setConfirm}
        setLoading={setLoading}
        showBackupManager={showBackupManager}
        setShowBackupManager={setShowBackupManager}
        showAddPurchase={showAddPurchase}
        setShowAddPurchase={closeAddPurchaseModal}
        isCompanyDebtMode={isCompanyDebtMode}
        setToast={admin.setToast}
        showEnhancedCompanyDebtModal={showEnhancedCompanyDebtModal}
        setShowEnhancedCompanyDebtModal={setShowEnhancedCompanyDebtModal}
        selectedCompanyDebt={selectedCompanyDebt}
        setSelectedCompanyDebt={setSelectedCompanyDebt}
        confirm={confirm}
        triggerCloudBackup={triggerCloudBackupAsync}
      />

      {/* Reset Confirmation Modal */}
      {admin.resetConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
              {t.confirmReset || 'Are you sure you want to reset all data? This will delete everything and cannot be undone!'}
            </h3>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  playModalCloseSound();
                  admin.setResetConfirmOpen(false);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  playActionSound();
                  admin.setResetConfirmOpen(false);
                  await admin.executeResetAllData();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                {t.ok || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {admin.toast && admin.toast.msg && (
        <ToastUnified
          message={admin.toast.msg}
          type={admin.toast.type}
          duration={admin.toast.duration || 3000}
          onClose={() => admin.setToast(null)}
        />
      )}
    </div>
  );
}
