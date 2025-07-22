import React, { useEffect, useState, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
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
import IncentivesSection from '../components/IncentivesSection';
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
import AdminLoadingFallback from '../components/AdminLoadingFallback';
import ExchangeRateIndicator from '../components/ExchangeRateIndicator';
import MonthlyReportsSection from '../components/MonthlyReportsSection';
import BackupSettingsSection from '../components/BackupSettingsSection';
import { Icon } from '../utils/icons.jsx';

export default function Admin() {
  const [confirm, setConfirm] = useState({ open: false, message: '', onConfirm: null });
  
  // showConfirm function needed by useAdmin
  const showConfirm = useCallback((message, onConfirm) => {
    playModalOpenSound();
    setConfirm({ open: true, message, onConfirm });
  }, []);
  
  const admin = useAdmin(showConfirm);
  const { sales, debts, products, refreshAllData, loading: dataLoading, apiReady } = useData();
  const { t, lang, isRTL, notoFont, setLang } = useLocale();
  const navigate = useNavigate();
  const [section, setSection] = useState('multiCurrencyDashboard');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const { theme, setTheme, setAppTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showBackupManager, setShowBackupManager] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  // isCompanyDebtMode is now handled in useAdmin

  // ALL HOOKS MOVED TO TOP LEVEL - FIXES HOOKS RULE VIOLATION
  // Ensure theme is set before first paint
  useLayoutEffect(() => {
    setAppTheme(theme);
  }, [theme, setAppTheme]);

  // Update language on change
  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);
  
  // Load exchange rates from database on mount
  useEffect(() => {
    loadExchangeRatesFromDB().catch(console.error);
  }, []);
  
  // Low stock notification - memoized to prevent infinite re-renders
  const lowStockNotificationProducts = useMemo(() => {
    if (!admin.notificationsEnabled || !products.length) return [];
    return products.filter(p => p.stock < admin.lowStockThreshold);
  }, [products, admin.notificationsEnabled, admin.lowStockThreshold]);

  // Use useRef to track if notification was already shown to prevent re-triggering
  const lastNotificationRef = useRef('');
  
  useEffect(() => {
    if (lowStockNotificationProducts.length > 0) {
      const notificationKey = lowStockNotificationProducts.map(p => `${p.id}-${p.stock}`).join(',');
      
      // Only show notification if products or stock levels have changed
      if (notificationKey !== lastNotificationRef.current) {
        admin.setToast(`${t.lowStockAlert}: ${lowStockNotificationProducts.map(p => p.name).join(', ')}`);
        lastNotificationRef.current = notificationKey;
      }
    } else {
      // Reset when no low stock items
      lastNotificationRef.current = '';
    }
  }, [lowStockNotificationProducts, admin.setToast, t.lowStockAlert]);

  // Calculate total profit - memoized
  const totalProfit = useMemo(() => {
    return sales.reduce((sum, sale) => {
      if (!sale.items) return sum;
      // For debt sales, check if the debt is paid by looking up in debts array
      if (sale.is_debt) {
        const debt = debts?.find(d => d.sale_id === sale.id);
        if (!debt || (!debt.paid_at && !debt.paid)) return sum;
      }
      return sum + sale.items.reduce((itemSum, item) => {
        const quantity = item.quantity || 1;
        const buyingPrice = item.buying_price || 0;
        const sellingPrice = item.selling_price || item.buying_price || 0;
        const profit = (sellingPrice - buyingPrice) * quantity;
        return itemSum + profit;
      }, 0);
    }, 0);
  }, [sales, debts]);

  // Recent activity and low stock products - memoized
  const criticalStockProducts = useMemo(() => products.filter(p => p.stock <= 2 && !p.archived), [products]);
  const lowStockProducts = useMemo(() => products.filter(p => p.stock > 2 && p.stock < admin.lowStockThreshold && !p.archived), [products, admin.lowStockThreshold]);

  // Memoize nav items for performance with keyboard shortcuts and colors
  const navItems = useMemo(() => [
    { key: 'multiCurrencyDashboard', label: t.dashboard || 'Dashboard', icon: 'multiCurrency', shortcut: '1', color: 'blue' },
    { key: 'active', label: t.products, icon: 'products', shortcut: '2', color: 'green' },
    { key: 'accessories', label: t.accessories, icon: 'accessories', shortcut: '3', color: 'orange' },
    { key: 'archived', label: t.archivedProducts, icon: 'archived', shortcut: '4', color: 'gray' },
    { key: 'salesHistory', label: t.salesHistory, icon: 'salesHistory', shortcut: '5', color: 'emerald' },
    { key: 'buyingHistory', label: t.buyingHistory, icon: 'buyingHistory', shortcut: '6', color: 'purple' },
    { key: 'customerDebts', label: t.customerDebts, icon: 'customerDebts', shortcut: '7', color: 'red' },
    { key: 'companyDebts', label: t.companyDebts, icon: 'companyDebts', shortcut: '8', color: 'yellow' },
    { key: 'incentives', label: t.incentives, icon: 'incentives', shortcut: '9', color: 'pink' },
    { key: 'personalLoans', label: t.personalLoans, icon: 'personalLoans', shortcut: '0', color: 'indigo' },
    { key: 'monthlyReports', label: t.monthlyReports, icon: 'monthlyReports', shortcut: 'R', color: 'teal' },
    { key: 'advancedAnalytics', label: t.businessAnalytics || 'Business Analytics', icon: 'barChart3', shortcut: 'A', color: 'cyan' },
    { key: 'backupSettings', label: t.backupSettings || 'Backup & Settings', icon: 'cloud', shortcut: 'B', color: 'slate' }
  ], [t]);

  // Helper function to get color classes with proper light mode support
  const getColorClasses = (color, isActive) => {
    const colorMap = {
      blue: {
        active: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-l-4 border-blue-500',
        inactive: 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'
      },
      green: {
        active: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-l-4 border-green-500',
        inactive: 'text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400'
      },
      orange: {
        active: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-l-4 border-orange-500',
        inactive: 'text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400'
      },
      gray: {
        active: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-l-4 border-gray-500',
        inactive: 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-600 dark:hover:text-gray-400'
      },
      emerald: {
        active: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-l-4 border-emerald-500',
        inactive: 'text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400'
      },
      purple: {
        active: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-l-4 border-purple-500',
        inactive: 'text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400'
      },
      red: {
        active: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-l-4 border-red-500',
        inactive: 'text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400'
      },
      yellow: {
        active: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-l-4 border-yellow-500',
        inactive: 'text-gray-700 dark:text-gray-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:text-yellow-600 dark:hover:text-yellow-400'
      },
      pink: {
        active: 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 border-l-4 border-pink-500',
        inactive: 'text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-600 dark:hover:text-pink-400'
      },
      indigo: {
        active: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-l-4 border-indigo-500',
        inactive: 'text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400'
      },
      teal: {
        active: 'bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 border-l-4 border-teal-500',
        inactive: 'text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-600 dark:hover:text-teal-400'
      },
      cyan: {
        active: 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 border-l-4 border-cyan-500',
        inactive: 'text-gray-700 dark:text-gray-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-cyan-600 dark:hover:text-cyan-400'
      },
      slate: {
        active: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-l-4 border-slate-500',
        inactive: 'text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-900/20 hover:text-slate-600 dark:hover:text-slate-400'
      }
    };
    
    return colorMap[color]?.[isActive ? 'active' : 'inactive'] || colorMap.blue[isActive ? 'active' : 'inactive'];
  };

  // Helper functions
  const openAddPurchaseModal = useCallback((isCompanyDebt = false) => {
    admin.openAddPurchaseModal(isCompanyDebt);
  }, [admin]);
  
  const closeAddPurchaseModal = useCallback(() => {
    admin.closeAddPurchaseModal();
    setShowAddPurchase(false);
  }, [admin]);

  const openEnhancedCompanyDebtModal = useCallback((debtItem = null) => {
    admin.setSelectedCompanyDebt(debtItem);
    admin.setShowEnhancedCompanyDebtModal(true);
    playModalOpenSound();
  }, [admin]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only trigger shortcuts when Ctrl (or Cmd on Mac) is pressed
      if (!e.ctrlKey && !e.metaKey) return;
      // Ignore if Alt key is also pressed to avoid conflicts
      if (e.altKey) return;
      
      const key = e.key.toLowerCase();
      const navItem = navItems.find(item => item.shortcut.toLowerCase() === key);
      
      if (navItem && section !== navItem.key) {
        e.preventDefault();
        setSection(navItem.key);
        playNavigationSound();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navItems, section]);

  // Early loading state with improved fallback
  if (dataLoading && !apiReady) {
    return <AdminLoadingFallback message={t?.loadingAdminData || 'Loading admin data...'} />;
  }

  // Error boundary - improved with full screen
  const renderErrorFallback = (error) => (
    <div className="fixed inset-0 z-50 bg-red-50 dark:bg-red-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center max-w-2xl w-full">
        <div className="text-red-500 text-6xl mb-4 flex justify-center">
          <Icon name="alertCircle" size={64} />
        </div>
        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
          {t.adminRenderError || 'Admin Render Error'}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg">
          {t.adminRenderErrorDesc || 'The admin interface encountered a rendering error. This might be due to data corruption or missing dependencies.'}
        </p>
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-lg font-medium"
          >
            {t.reloadApplication || 'Reload Application'}
          </button>
          <button
            onClick={() => navigate('/cashier')}
            className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-lg font-medium"
          >
            {t.goToCashier || 'Go to Cashier'}
          </button>
        </div>
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400">{t.errorDetails || 'Error Details'}</summary>
          <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
            {error.toString()}
          </pre>
        </details>
      </div>
    </div>
  );

  // Main render with error boundary
  try {
    return (
      <div className={`h-screen bg-gray-50 dark:bg-gray-900 ${notoFont} ${isRTL ? 'rtl' : 'ltr'} flex flex-col`}>
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="max-w-full mx-auto px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {t.adminPanel} - Mobile Roma
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <ExchangeRateIndicator t={t} showModal={true} size="md" onToast={admin.setToast} />
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <Icon name="settings" size={20} />
                </button>
                <button
                  onClick={() => navigate('/cashier')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t.toCashier}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex h-full flex-1 min-h-0">
          {/* Sidebar Navigation */}
          <nav className="w-64 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="p-4">
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.key}>
                    <button
                      onClick={() => {
                        setSection(item.key);
                        playNavigationSound();
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center gap-3 ${
                        getColorClasses(item.color, section === item.key)
                      }`}
                    >
                      <Icon name={item.icon} size={18} />
                      <span>{item.label}</span>
                      <span className="ml-auto text-xs opacity-50">{item.shortcut}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 flex flex-col w-full min-w-0 h-full bg-transparent">
            {/* Section content */}
            <div className="flex-1 h-full w-full overflow-auto">
              {section === 'multiCurrencyDashboard' && <MultiCurrencyDashboard admin={admin} t={t} />}
              {section === 'active' && <ProductsSection admin={admin} t={t} />}
              {section === 'accessories' && <AccessoriesSection admin={admin} t={t} />}
              {section === 'archived' && <ArchivedItemsSection admin={admin} t={t} />}
              {section === 'salesHistory' && <SalesHistorySection admin={admin} t={t} />}
              {section === 'buyingHistory' && <BuyingHistorySection admin={admin} t={t} openAddPurchaseModal={openAddPurchaseModal} />}
              {section === 'customerDebts' && <CustomerDebtsSection 
                admin={admin} 
                t={t} 
                debtSearch={admin.debtSearch}
                setDebtSearch={admin.setDebtSearch}
                showPaidDebts={admin.showPaidDebts}
                setShowPaidDebts={admin.setShowPaidDebts}
                showConfirm={showConfirm}
                setConfirm={setConfirm}
                triggerCloudBackup={triggerCloudBackupAsync} 
              />}
              {section === 'companyDebts' && <CompanyDebtsSection admin={admin} t={t} openEnhancedCompanyDebtModal={openEnhancedCompanyDebtModal} openAddPurchaseModal={openAddPurchaseModal} />}
              {section === 'incentives' && <IncentivesSection admin={admin} t={t} />}
              {section === 'personalLoans' && <PersonalLoansSection admin={admin} t={t} />}
              {section === 'monthlyReports' && <MonthlyReportsSection admin={admin} t={t} />}
              {section === 'advancedAnalytics' && <AdvancedAnalytics admin={admin} t={t} />}
              {section === 'backupSettings' && <BackupSettingsSection admin={admin} t={t} setShowBackupManager={setShowBackupManager} />}
            </div>
          </main>
        </div>

        {/* Modals */}
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
          showAddPurchase={admin.showAddPurchaseModal}
          setShowAddPurchase={closeAddPurchaseModal}
          isCompanyDebtMode={admin.isCompanyDebtMode}
          setToast={admin.setToast}
          showEnhancedCompanyDebtModal={admin.showEnhancedCompanyDebtModal}
          setShowEnhancedCompanyDebtModal={admin.setShowEnhancedCompanyDebtModal}
          selectedCompanyDebt={admin.selectedCompanyDebt}
          setSelectedCompanyDebt={admin.setSelectedCompanyDebt}
          confirm={confirm}
          triggerCloudBackup={triggerCloudBackupAsync}
        />

        {/* Reset Confirmation Modal */}
        {admin.resetConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
                {t.confirmReset || 'Are you sure you want to reset all data? This will delete everything and cannot be undone!'}
              </h3>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    playModalCloseSound();
                    admin.setResetConfirmOpen(false);
                  }}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500 rounded transition"
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
  } catch (renderError) {
    console.error('🔥 Admin: Render error:', renderError);
    return renderErrorFallback(renderError);
  }
}
