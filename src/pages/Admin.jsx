import React, { useEffect, useState, useLayoutEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useLocale } from '../contexts/LocaleContext';
import { useData } from '../contexts/DataContext';
import { triggerCloudBackupAsync } from '../utils/cloudBackupEnhanced';
import { playNavigationSound, playActionSound, playModalOpenSound, playModalCloseSound, playSuccessSound, playErrorSound } from '../utils/sounds';
import useAdmin from '../components/useAdmin';
import AdminStatsSidebar from '../components/AdminStatsSidebar';
import AdminDashboard from '../components/AdminDashboard';
import CustomerDebtsSection from '../components/CustomerDebtsSection';
import CompanyDebtsSection from '../components/CompanyDebtsSection';
import AccessoriesSection from '../components/AccessoriesSection';
import MonthlyReportsSection from '../components/MonthlyReportsSection';
import ArchivedItemsSection from '../components/ArchivedItemsSection';
import ProductsSection from '../components/ProductsSection';
import SalesHistorySection from '../components/SalesHistorySection';
import BuyingHistorySection from '../components/BuyingHistorySection';
import AdminModals from '../components/AdminModals';
import ToastUnified from '../components/ToastUnified';

export default function Admin() {
  const admin = useAdmin();
  const { sales, debts, products } = useData(); // Get data directly from DataContext
  const { t, lang, isRTL, notoFont, setLang } = useLocale();
  const navigate = useNavigate();
  const [section, setSection] = useState('dashboard');
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
        return itemSum + (item.profit || 0);
      }, 0);
    }, 0);
  }, [sales, debts]);

  // Top selling products (by quantity sold) - memoized for performance
  const topSellingProducts = useMemo(() => {
    const productSalesMap = {};
    sales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          // Skip items without names
          if (!item.name || item.name === 'null' || item.name === null) return;
          
          if (!productSalesMap[item.name]) {
            productSalesMap[item.name] = { quantity: 0, revenue: 0, profit: 0 };
          }
          productSalesMap[item.name].quantity += item.quantity || 1;
          productSalesMap[item.name].revenue += (item.price || 0) * (item.quantity || 1);
          productSalesMap[item.name].profit += ((item.price || 0) - (item.buying_price || 0)) * (item.quantity || 1);
        });
      }
    });
    
    return Object.entries(productSalesMap)
      .filter(([name]) => name && name !== 'null' && name !== null) // Filter out null/invalid names
      .sort(([,a], [,b]) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [sales]);

  // Recent activity and low stock products - memoized
  const recentSales = useMemo(() => sales.slice(0, 5), [sales]);
  const criticalStockProducts = useMemo(() => products.filter(p => p.stock <= 2 && !p.archived), [products]);
  const lowStockProducts = useMemo(() => products.filter(p => p.stock > 2 && p.stock < admin.lowStockThreshold && !p.archived), [products, admin.lowStockThreshold]);

  // Memoize nav items for performance
  const navItems = useMemo(() => [
    { key: 'dashboard', label: t.dashboard, icon: '📊', accent: 'bg-blue-600' },
    { key: 'active', label: t.products, icon: '📦', accent: 'bg-purple-600' },
    { key: 'accessories', label: t.accessories, icon: '🎧', accent: 'bg-green-600' },
    { key: 'archived', label: t.archivedProducts, icon: '🗃️' },
    { key: 'history', label: t.salesHistory, icon: '📈' },
    { key: 'buyingHistory', label: t.buyingHistory, icon: '🛒' },
    { key: 'customerDebts', label: t.customerDebts, icon: '💳' },
    { key: 'companyDebts', label: t.companyDebts, icon: '💸' },
    { key: 'monthlyReports', label: t.monthlyReports, icon: '📊' },
    { key: 'backup', label: t.cloudBackup, icon: '☁️', action: () => setShowBackupManager(true) },
    { key: 'settings', label: t.settings, icon: '⚙️' },
    { key: 'logout', label: t.logout, icon: '🚪', action: () => navigate('/cashier'), accent: 'bg-red-600 text-white hover:bg-red-700', isLogout: true },
  ], [t, navigate]);

  // Keyboard navigation for sections
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle keys if a modal is open
      if (admin.productModal || admin.saleDetailsModal || showSettingsModal || showBackupManager) {
        return;
      }
      
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const sectionKeys = navItems.filter(item => !item.action).map(item => item.key);
        const currentIndex = sectionKeys.indexOf(section);
        
        if (e.key === 'ArrowUp') {
          const newIndex = currentIndex > 0 ? currentIndex - 1 : sectionKeys.length - 1;
          setSection(sectionKeys[newIndex]);
        } else if (e.key === 'ArrowDown') {
          const newIndex = currentIndex < sectionKeys.length - 1 ? currentIndex + 1 : 0;
          setSection(sectionKeys[newIndex]);
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
  }, [admin.setToast, admin.fetchAccessories, admin.fetchProducts, t, setLoading]);

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

  // --- Redesigned UI ---
  return (
    <div
      className={`w-screen h-screen min-h-screen min-w-0 flex flex-row gap-0 justify-center items-stretch p-0 overflow-hidden bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#c7d2fe] dark:from-[#1e293b] dark:via-[#0f172a] dark:to-[#0e7490] ${isRTL ? 'rtl' : ''}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={notoFont}
      {...(loading ? { 'aria-busy': true } : {})}
    >
      {/* Admin Stats Sidebar */}
      <AdminStatsSidebar 
        admin={admin}
        t={t}
        navItems={navItems}
        section={section}
        handleNavClick={handleNavClick}
      />
      {/* Main content glassy card */}
      <main className="flex-1 flex flex-col gap-6 w-full min-w-0 h-full max-w-full mx-0 p-8 overflow-auto items-center justify-start bg-transparent relative z-0">
        {/* Section content in glassy card */}
        <div className="w-full max-w-6xl mx-auto bg-white/80 dark:bg-gray-800/80 rounded-3xl shadow-2xl border border-white/20 p-8 flex flex-col gap-8">
          {/* Section content */}
          <div className="flex-1 min-h-0">
            {/* Dashboard Section */}
            {section === 'dashboard' && (
              <AdminDashboard 
                t={t}
                admin={admin}
                openAddPurchaseModal={openAddPurchaseModal}
                topSellingProducts={topSellingProducts}
                recentSales={recentSales}
                criticalStockProducts={criticalStockProducts}
                lowStockProducts={lowStockProducts}
                setSection={setSection}
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

            {/* Monthly Reports Section */}
            {section === 'monthlyReports' && (
              <MonthlyReportsSection 
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
