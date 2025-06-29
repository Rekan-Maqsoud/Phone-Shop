import React, { useEffect, useState, useLayoutEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import ToastUnified from '../components/ToastUnified';
import SettingsModal from '../components/SettingsModal';
import ConfirmModal from '../components/ConfirmModal';
import ProductTable from '../components/ProductTable';
import SalesHistoryTable from '../components/SalesHistoryTable';
import SaleDetailsModal from '../components/SaleDetailsModal';
import ProductModal from '../components/ProductModal'; // Ensure this import is present and correct
import QuickAddProduct from '../components/QuickAddProduct';
import BackupManager from '../components/BackupManager';
import CloudBackupManager from '../components/CloudBackupManager';
import OfflineIndicator from '../components/OfflineIndicator';
import { useLocale } from '../contexts/LocaleContext';
import useAdmin from '../components/useAdmin';
import AccessoryModal from '../components/AccessoryModal';

// Helper to robustly set theme (for Electron and browser)
function setAppTheme(theme) {
  localStorage.setItem('theme', theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }
  document.body.style.display = 'none';
  void document.body.offsetHeight;
  document.body.style.display = '';
}

function AddCompanyDebtModal({ show, onClose, onSubmit, t }) {
  const [companyName, setCompanyName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!companyName.trim()) {
      setError('Please provide a valid company name');
      return;
    }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setError('Please provide a valid amount greater than 0');
      return;
    }
    await onSubmit({
      company_name: companyName.trim(),
      amount: Math.round(amt * 100) / 100,
      description: description.trim(),
    });
    setCompanyName('');
    setAmount('');
    setDescription('');
  };

  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md flex flex-col gap-4 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-2 text-gray-800 dark:text-gray-100">{t.addCompanyDebt || 'Add Company Debt'}</h2>
        <input
          className="border rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600"
          placeholder={t.companyName || 'Company Name'}
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          required
        />
        <input
          className="border rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600"
          placeholder={t.amount || 'Amount'}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          type="number"
          min="0.01"
          step="0.01"
          required
        />
        <textarea
          className="border rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600"
          placeholder={t.description || 'Description (optional)'}
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex gap-2 justify-end mt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500">{t.cancel || 'Cancel'}</button>
          <button type="submit" className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold">{t.add || 'Add'}</button>
        </div>
      </form>
    </div>
  );
}

export default function Admin() {
  const admin = useAdmin();
  const { t, lang, isRTL, notoFont, setLang } = useLocale();
  const navigate = useNavigate();
  const [section, setSection] = useState('dashboard');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [debtSearch, setDebtSearch] = useState('');
  const [showPaidDebts, setShowPaidDebts] = useState(false);
  const [showBackupManager, setShowBackupManager] = useState(false);
  const [showCloudBackupManager, setShowCloudBackupManager] = useState(false);
  const [showAddCompanyDebt, setShowAddCompanyDebt] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, message: '', onConfirm: null });

  // Helper function for showing confirm modals
  const showConfirm = (message, onConfirm) => {
    setConfirm({ open: true, message, onConfirm });
  };

  // Ensure theme is set before first paint
  useLayoutEffect(() => {
    setAppTheme(theme);
  }, [theme]);

  // Update language on change
  useEffect(() => {
    if (admin.setLang) admin.setLang(lang);
    localStorage.setItem('lang', lang);
  }, [lang]);  // Fetch initial data on mount
  useEffect(() => {
    if (admin.fetchProducts) admin.fetchProducts();
    if (admin.fetchAccessories) admin.fetchAccessories();
    if (admin.fetchSales) admin.fetchSales();
    if (admin.fetchDebts) admin.fetchDebts();
    if (admin.fetchDebtSales) admin.fetchDebtSales();
    if (admin.fetchCompanyDebts) admin.fetchCompanyDebts();
    if (admin.fetchMonthlyReports) admin.fetchMonthlyReports();
  }, []);
  // Low stock notification
  useEffect(() => {
    if (admin.notificationsEnabled && admin.products.length) {
      const lowStock = admin.products.filter(p => p.stock < admin.lowStockThreshold);
      if (lowStock.length) {
        admin.setToast(`Low stock alert: ${lowStock.map(p => p.name).join(', ')}`);
      }
    }
  }, [admin.products, admin.notificationsEnabled, admin.lowStockThreshold]);

  // Calculate total profit (fixed calculation)
  const totalProfit = admin.sales.reduce((sum, sale) => {
    if (!sale.items) return sum;
    // For debt sales, check if the debt is paid by looking up in debts array
    if (sale.is_debt) {
      const debt = admin.debts?.find(d => d.sale_id === sale.id);
      if (!debt || !debt.paid) return sum; // Skip unpaid debts
    }
    return sum + sale.items.reduce((itemSum,item) => {
      return item.profit;
    }, 0);
  }, 0);

  // Enhanced calculations for better admin insights
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Today's sales
  const todaysSales = admin.sales.filter(sale => {
    const saleDate = new Date(sale.created_at);
    return saleDate.toDateString() === currentDate.toDateString();
  });
  
  const todaysRevenue = todaysSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const todaysProfit = todaysSales.reduce((sum, sale) => {
    if (!sale.items) return sum;
    return sum + sale.items.reduce((itemSum, item) => {
      return item.profit;
    }, 0);
  }, 0);

  // Today's spending (paid company debts)
  const todaysSpending = (admin.companyDebts || []).filter(debt => {
    if (!debt.paid_at) return false;
    const paidDate = new Date(debt.paid_at);
    return paidDate.toDateString() === currentDate.toDateString();
  }).reduce((sum, debt) => sum + debt.amount, 0);

  // Net performance for today (revenue - spending)
  const todaysNetPerformance = todaysRevenue - todaysSpending;

  // Low stock products (critical alerts)
  const criticalStockProducts = admin.products.filter(p => p.stock <= 2 && !p.archived);
  const lowStockProducts = admin.products.filter(p => p.stock > 2 && p.stock < admin.lowStockThreshold && !p.archived);
  
  // Top selling products (by quantity sold)
  const productSalesMap = {};
  admin.sales.forEach(sale => {
    if (sale.items) {
      sale.items.forEach(item => {
        if (!productSalesMap[item.name]) {
          productSalesMap[item.name] = { quantity: 0, revenue: 0, profit: 0 };
        }
        productSalesMap[item.name].quantity += item.quantity || 1;
        productSalesMap[item.name].revenue += (item.price || 0) * (item.quantity || 1);
        productSalesMap[item.name].profit += ((item.price || 0) - (item.buying_price || 0)) * (item.quantity || 1);
      });
    }
  });
  
  const topSellingProducts = Object.entries(productSalesMap)
    .sort(([,a], [,b]) => b.quantity - a.quantity)
    .slice(0, 5);

  // Recent activity (last 5 sales)
  const recentSales = admin.sales.slice(0, 5);

  // Debt summary
  const totalDebtAmount = admin.debts ? admin.debts.filter(d => !d.paid).reduce((sum, debt) => sum + (debt.total || 0), 0) : 0;
  const paidDebtsToday = admin.debts ? admin.debts.filter(d => {
    if (!d.paid || !d.paid_at) return false;
    const paidDate = new Date(d.paid_at);
    return paidDate.toDateString() === currentDate.toDateString();
  }).length : 0;

  // Memoize nav items for performance
  const navItems = useMemo(() => [
    { key: 'dashboard', label: t.dashboard || 'Dashboard', icon: '📊', accent: 'bg-blue-600' },
    { key: 'active', label: t.products, icon: '📦', accent: 'bg-purple-600' },
    { key: 'accessories', label: t.accessories || 'Accessories', icon: '🎧', accent: 'bg-green-600' },
    { key: 'archived', label: t.archivedProducts || 'Archived', icon: '🗃️' },
    { key: 'history', label: t.salesHistory || 'Sales', icon: '📈' },
    { key: 'buyingHistory', label: t.buyingHistory || 'Buying History', icon: '🛒' },
    { key: 'customerDebts', label: t.customerDebts || 'Customer Debts', icon: '💳' },
    { key: 'companyDebts', label: t.companyDebts || 'Company Debts', icon: '💸' },
    { key: 'monthlyReports', label: t.monthlyReports || 'Monthly Reports', icon: '📊' },
    { key: 'backup', label: t.backupManager || 'Local Backup', icon: '🗄️', action: () => setShowBackupManager(true) },
    { key: 'cloudBackup', label: t.cloudBackupManager || 'Cloud Backup', icon: '☁️', action: () => setShowCloudBackupManager(true) },
    { key: 'settings', label: t.settings, icon: '⚙️' },
    { key: 'logout', label: t.logout || 'Log out', icon: '🚪', action: () => navigate('/cashier'), accent: 'bg-red-600 text-white hover:bg-red-700', isLogout: true },
  ], [t, navigate]);

  // Keyboard navigation for sections
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle keys if a modal is open
      if (admin.productModal || admin.saleDetailsModal || showSettingsModal || showBackupManager || showCloudBackupManager) {
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
  }, [section, navItems, admin.productModal, admin.saleDetailsModal, showSettingsModal, showBackupManager, showCloudBackupManager]);

  // UseCallback for nav click handler
  const handleNavClick = useCallback((item) => {
    if (item.key === 'settings') {
      setShowSettingsModal(true);
    } else if (item.action) {
      item.action();
    } else {
      setSection(item.key);
    }
  }, [setShowSettingsModal, setSection]);

  // Unified archive/unarchive handler
  const handleArchiveToggle = useCallback(async (item, archive) => {
    const isAccessory = item.hasOwnProperty('brand') || item.hasOwnProperty('type'); // Simple check for accessory
    const itemType = isAccessory ? 'accessory' : 'product';
    const apiCall = isAccessory ? window.api?.editAccessory : window.api?.editProduct;
    
    admin.setToast(archive ? `Archiving: ${item.name}` : `Unarchiving: ${item.name}`);
    setLoading(true);
    try {
      const updated = {
        ...item,
        archived: archive ? 1 : 0,
        stock: archive ? 0 : item.stock
      };
      const res = await apiCall?.(updated); 
      if (!res || !res.success) {
        admin.setToast(res?.message || 'Archive/unarchive failed (no response).');
      } else {
        admin.setToast(archive ? (t.productArchived || 'Item archived!') : (t.productUnarchived || 'Item unarchived!'));
        if (isAccessory) {
          admin.fetchAccessories();
        } else {
          admin.fetchProducts();
        }
      }
    } catch (e) {
      admin.setToast(archive ? (t.archiveFailed || 'Archive failed.') : (t.unarchiveFailed || 'Unarchive failed.'));
      
    } finally {
      setLoading(false);
    }
  }, [admin, t]);

  // Helper to open product modal for editing
  const handleEditProduct = (product) => {
    console.log('Editing product:', product); // Debug log
    admin.setEditProduct(product);
    admin.setShowProductModal(true);
  };

  // Memoize fetch functions
  const fetchProducts = useCallback(() => {
    if (admin.fetchProducts) admin.fetchProducts();
  }, [admin]);
  const fetchAccessories = useCallback(() => {
    if (admin.fetchAccessories) admin.fetchAccessories();
  }, [admin]);
  const fetchSales = useCallback(() => {
    if (admin.fetchSales) admin.fetchSales();
  }, [admin]);

  // Memoize derived values
  const products = useMemo(() => Array.isArray(admin.products) ? admin.products : [], [admin.products]);
  const accessories = useMemo(() => Array.isArray(admin.accessories) ? admin.accessories : [], [admin.accessories]);
  const allItems = useMemo(() => [...products, ...accessories], [products, accessories]);

  // Cloud backup trigger
  const triggerCloudBackup = useCallback(async () => {
    try {
      if (window.api?.autoBackupAfterSale) {
        await window.api.autoBackupAfterSale();
      }
    } catch (error) {
      console.warn('Cloud backup trigger failed:', error);
    }
  }, []);

  // --- Redesigned UI ---
  return (
    <div
      className={`w-screen h-screen min-h-screen min-w-0 flex flex-row gap-0 justify-center items-stretch p-0 overflow-hidden bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#c7d2fe] dark:from-[#1e293b] dark:via-[#0f172a] dark:to-[#0e7490] ${isRTL ? 'rtl' : ''}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={notoFont}
      {...(loading ? { 'aria-busy': true } : {})}
    >
      {/* Glassy Sidebar */}
      <aside className="w-full md:w-[370px] h-full flex flex-col justify-between p-8 bg-white/30 dark:bg-gray-900/60 backdrop-blur-xl shadow-2xl border-r border-white/10 relative z-10 overflow-y-auto" aria-label="Admin navigation">
        <div className="flex flex-col h-full min-h-0">
          {/* Mobile Roma Admin Dashboard label moved to top of sidebar */}
          <div className="flex flex-col gap-2 mb-6 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-purple-400 animate-pulse"></span>
                <span className="font-extrabold text-2xl text-[#a21caf] dark:text-purple-200 tracking-tight drop-shadow">Mobile Roma</span>
              </div>
              <OfflineIndicator className="text-xs" />
            </div>
            <span className="font-bold text-lg text-gray-700 dark:text-gray-300 ml-5">{t.adminDashboard}</span>
          </div>
          {/* Enhanced Stats */}
          <div className="space-y-3 mb-8 shrink-0">
            {/* Today's Performance */}
            <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 dark:from-blue-900/40 dark:to-cyan-900/40 rounded-2xl shadow p-4 border border-blue-200/30 dark:border-blue-700/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📈</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.todaysPerformance || 'Today\'s Performance'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t.sales || 'Sales'}: </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{todaysSales.length}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t.revenue || 'Revenue'}: </span>
                  <span className="font-bold text-green-600 dark:text-green-400">${todaysRevenue}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t.spending || 'Spending'}: </span>
                  <span className="font-bold text-red-600 dark:text-red-400">${todaysSpending.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t.profit || 'Profit'}: </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">${todaysProfit.toFixed(2)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">{t.netPerformance || 'Net Performance'}: </span>
                  <span className={`font-bold ${todaysNetPerformance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ${todaysNetPerformance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Overview */}
            <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-4 flex flex-col border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🏪</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.thisMonth || 'This Month'}</span>
              </div>
              <span className="text-xl font-bold text-blue-500 dark:text-blue-300">${admin.monthlySales}</span>
            </div>

            {/* Total Profit */}
            <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-4 flex flex-col border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">💰</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.totalProfit || 'Total Profit'}</span>
              </div>
              <span className="text-xl font-bold text-green-500 dark:text-green-300">${totalProfit.toFixed(2)}</span>
            </div>

            {/* Inventory Value */}
            <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-4 flex flex-col border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">📦</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.inventoryValue}</span>
              </div>
              <span className="text-xl font-bold text-purple-500 dark:text-purple-300">${admin.inventoryValue}</span>
            </div>

            {/* Stock Alerts */}
            {(criticalStockProducts.length > 0 || lowStockProducts.length > 0) && (
              <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 dark:from-red-900/40 dark:to-orange-900/40 rounded-2xl shadow p-4 border border-red-200/30 dark:border-red-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚠️</span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.stockAlerts || 'Stock Alerts'}</span>
                </div>
                <div className="space-y-1 text-sm">
                  {criticalStockProducts.length > 0 && (
                    <div className="text-red-600 dark:text-red-400 font-semibold">
                      🚨 {t.critical || 'Critical'}: {criticalStockProducts.length} {t.items || 'items'}
                    </div>
                  )}
                  {lowStockProducts.length > 0 && (
                    <div className="text-orange-600 dark:text-orange-400">
                      ⚡ {t.lowStock || 'Low'}: {lowStockProducts.length} {t.items || 'items'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Debt Summary */}
            {admin.debts && admin.debts.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 dark:from-yellow-900/40 dark:to-amber-900/40 rounded-2xl shadow p-4 border border-yellow-200/30 dark:border-yellow-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💸</span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.debts || 'Debts'}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{t.outstanding || 'Outstanding'}: </span>
                    <span className="font-bold text-red-600 dark:text-red-400">${totalDebtAmount}</span>
                  </div>
                  {paidDebtsToday > 0 && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">{t.paidToday || 'Paid today'}: </span>
                      <span className="font-bold text-green-600 dark:text-green-400">{paidDebtsToday}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Navigation buttons - move down, let whole sidebar scroll */}
          <nav className="flex flex-col gap-4 mt-16" aria-label="Section navigation">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => handleNavClick(item)}
                disabled={item.disabled}
                className={`flex items-center gap-3 px-4 py-4 rounded-xl font-semibold text-lg transition shadow-md
                  ${item.isLogout
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : section === item.key && item.key !== 'settings' && item.key !== 'backup' && !item.action
                      ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-xl scale-105'
                      : 'bg-white/60 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 hover:bg-purple-100 dark:hover:bg-purple-900'}
                  ${item.disabled ? 'opacity-60 cursor-not-allowed' : ''}
                `}
                aria-current={section === item.key ? 'page' : undefined}
                title={item.disabled ? 'No backup method configured' : ''}
                aria-label={item.label}
              >
                <span className="text-2xl">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>
      {/* Main content glassy card */}
      <main className="flex-1 flex flex-col gap-6 w-full min-w-0 h-full max-w-full mx-0 p-8 overflow-auto items-center justify-start bg-transparent relative z-0">
        {/* Section content in glassy card */}
        <div className="w-full max-w-6xl mx-auto bg-white/80 dark:bg-gray-800/80 rounded-3xl shadow-2xl border border-white/20 p-8 flex flex-col gap-8">
          {/* Section content */}
          <div className="flex-1 min-h-0">
            {/* Dashboard Section */}
            {section === 'dashboard' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{t.businessOverview || 'Business Overview'}</h2>
                {/* Business Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Top Selling Products */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200/50 dark:border-blue-700/30">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">🏆</span>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{t.topProducts || 'Top Products'}</h3>
                    </div>
                    <div className="space-y-3">
                      {topSellingProducts.length > 0 ? topSellingProducts.slice(0, 3).map(([name, data], idx) => (
                        <div key={name} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">#{idx + 1}</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{name}</span>
                          </div>
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">{data.quantity} {t.sold || 'sold'}</span>
                        </div>
                      )) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t.noSalesDataYet || 'No sales data yet'}</p>
                      )}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200/50 dark:border-green-700/30">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">📋</span>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{t.recentSales || 'Recent Sales'}</h3>
                    </div>
                    <div className="space-y-3">
                      {recentSales.length > 0 ? recentSales.slice(0, 3).map((sale, idx) => (
                        <div key={sale.id} className="flex justify-between items-center">
                          <div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(sale.created_at).toLocaleDateString()}
                            </span>
                            <div className="text-base font-semibold text-gray-700 dark:text-gray-300">
                              ${sale.total} {sale.is_debt ? `(${t.debt || 'Debt'})` : ''}
                            </div>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {sale.items?.length || 0} {t.items || 'items'}
                          </span>
                        </div>
                      )) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t.noRecentSales || 'No recent sales'}</p>
                      )}
                    </div>
                  </div>

                  {/* Critical Stock Items */}
                  <div className="bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-6 border border-orange-200/50 dark:border-orange-700/30">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">⚠️</span>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{t.stockAlerts || 'Stock Alerts'}</h3>
                    </div>
                    <div className="space-y-3">
                      {criticalStockProducts.length > 0 ? criticalStockProducts.slice(0, 3).map((product) => (
                        <div key={product.id} className="flex justify-between items-center">
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{product.name}</span>
                          <span className="text-xs font-bold text-red-600 dark:text-red-400">
                            {product.stock} {t.left || 'left'}
                          </span>
                        </div>
                      )) : lowStockProducts.length > 0 ? lowStockProducts.slice(0, 3).map((product) => (
                        <div key={product.id} className="flex justify-between items-center">
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{product.name}</span>
                          <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                            {product.stock} {t.left || 'left'}
                          </span>
                        </div>
                      )) : (
                        <p className="text-sm text-green-600 dark:text-green-400">{t.allStocksHealthy || 'All stocks healthy'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200/50 dark:border-purple-700/30">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">⚡</span>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{t.quickActions || 'Quick Actions'}</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      onClick={() => setSection('active')}
                      className="flex flex-col items-center gap-2 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-white/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all"
                    >
                      <span className="text-lg">📦</span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{t.products}</span>
                    </button>
                    <button
                      onClick={() => setSection('history')}
                      className="flex flex-col items-center gap-2 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-white/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all"
                    >
                      <span className="text-lg">📈</span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{t.salesHistory}</span>
                    </button>
                    <button
                      onClick={() => setSection('customerDebts')}
                      className="flex flex-col items-center gap-2 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-white/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all"
                    >
                      <span className="text-lg">💸</span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{t.manageDebts || 'Manage Debts'}</span>
                    </button>
                    <button
                      onClick={() => setSection('archived')}
                      className="flex flex-col items-center gap-2 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-white/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all"
                    >
                      <span className="text-lg">🗃️</span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{t.archived || 'Archived'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Products Section */}
            {section === 'active' && (
              <div className="space-y-6">
                <QuickAddProduct t={t} onAdd={admin.handleAddProduct} loading={loading} />
                <ProductTable
                  title={t.products}
                  products={admin.products.filter(p => p && ((typeof p.archived === 'undefined' ? 0 : p.archived) === 0))}
                  t={t}
                  lowStockThreshold={admin.lowStockThreshold}
                  onEdit={handleEditProduct}
                  onArchive={p => handleArchiveToggle(p, true)}
                  isArchived={false}
                />
              </div>
            )}

            {/* Accessories Section */}
            {section === 'accessories' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.accessories || 'Accessories'}</h2>
                  <button
                    onClick={() => {
                      admin.setEditAccessory(null);
                      admin.setShowAccessoryModal(true);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:scale-105 hover:from-emerald-600 hover:to-green-600 transition-all duration-200"
                  >
                    {t.addAccessory || 'Add Accessory'}
                  </button>
                </div>
                
                {admin.accessories.filter(accessory => !accessory.archived).length === 0 ? (
                  <div className="text-center text-gray-400 py-12">
                    <p className="text-xl">{t.noAccessories || 'No accessories yet'}</p>
                    <p className="text-sm mt-2">{t.addFirstAccessory || 'Add your first accessory to get started'}</p>
                  </div>
                ) : (
                  <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow-2xl overflow-hidden border border-white/20">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                          <tr>
                            <th className="px-6 py-4 text-left font-bold">{t.name}</th>
                            <th className="px-6 py-4 text-left font-bold">{t.brand || 'Brand'}</th>
                            <th className="px-6 py-4 text-left font-bold">{t.type || 'Type'}</th>
                            <th className="px-6 py-4 text-left font-bold">{t.buyingPrice || 'Cost'}</th>
                            <th className="px-6 py-4 text-left font-bold">{t.sellingPrice || 'Price'}</th>
                            <th className="px-6 py-4 text-left font-bold">{t.stock}</th>
                            <th className="px-6 py-4 text-center font-bold">{t.actions}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {admin.accessories.filter(accessory => !accessory.archived).map((accessory, idx) => (
                            <tr key={accessory.id} className={`border-b dark:border-gray-700 ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800/50'} hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors`}>
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{accessory.name}</td>
                              <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{accessory.brand || '-'}</td>
                              <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{accessory.type || '-'}</td>
                              <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-semibold">${accessory.buying_price || accessory.price}</td>
                              <td className="px-6 py-4 text-green-600 dark:text-green-400 font-bold">${accessory.price}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                                  accessory.stock <= 2 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                  accessory.stock <= 5 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                }`}>
                                  {accessory.stock}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={() => {
                                      admin.setEditAccessory(accessory);
                                      admin.setShowAccessoryModal(true);
                                    }}
                                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                                  >
                                    {t.edit}
                                  </button>
                                  <button
                                    onClick={() => handleArchiveToggle(accessory, true)}
                                    className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                                    disabled={loading}
                                  >
                                    {t.archive || 'Archive'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Archived Items Section */}
            {section === 'archived' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.archivedItems || 'Archived Items'}</h2>
                </div>
                
                {/* Archived Products */}
                <div className="mb-8">
                  <ProductTable
                    title={t.archivedProducts || 'Archived Products'}
                    products={admin.products.filter(p => p && ((typeof p.archived === 'undefined' ? 0 : p.archived) === 1))}
                    t={t}
                    lowStockThreshold={admin.lowStockThreshold}
                    onUnarchive={p => handleArchiveToggle(p, false)}
                    isArchived={true}
                  />
                </div>
                
                {/* Archived Accessories */}
                <div>
                  <ProductTable
                    title={t.archivedAccessories || 'Archived Accessories'}
                    products={admin.accessories.filter(a => a && ((typeof a.archived === 'undefined' ? 0 : a.archived) === 1))}
                    t={t}
                    lowStockThreshold={admin.lowStockThreshold}
                    onUnarchive={a => handleArchiveToggle(a, false)}
                    isArchived={true}
                    isAccessory={true}
                  />
                </div>
              </div>
            )}
            {section === 'history' && (
              <SalesHistoryTable
                sales={admin.sales}
                t={t}
                onView={saleId => {
                  const sale = admin.sales.find(s => s.id === saleId);
                  if (sale) admin.setViewSale(sale);
                }}
                onReturn={async (saleId) => {
                  showConfirm(
                    t.confirmReturnSale || 'Are you sure you want to return this entire sale? This will restore stock and remove the sale from records.',
                    async () => {
                      setConfirm({ open: false, message: '', onConfirm: null });
                      setLoading(true);
                      try {
                        const result = await window.api?.returnSale?.(saleId);
                        if (result?.success) {
                          admin.setToast?.('Sale returned successfully. Stock has been restored.');
                          if (admin.fetchSales) admin.fetchSales();
                          if (admin.fetchProducts) admin.fetchProducts();
                          if (admin.fetchAccessories) admin.fetchAccessories();
                          if (admin.fetchDebts) admin.fetchDebts();
                          if (admin.fetchDebtSales) admin.fetchDebtSales();
                          triggerCloudBackup(); // Trigger cloud backup
                        } else {
                          admin.setToast?.('Failed to return sale: ' + (result?.message || 'Unknown error'));
                        }
                      } catch (error) {
                        admin.setToast?.('Error returning sale: ' + error.message);
                      } finally {
                        setLoading(false);
                      }
                    }
                  );
                }}
              />
            )}
            {section === 'customerDebts' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.customerDebts || 'Customer Debts'} - They owe us</h2>
                  <div className="flex gap-2 items-center flex-wrap">
                    <input
                      type="text"
                      placeholder={t.searchCustomer || 'Search by customer name...'}
                      value={debtSearch}
                      onChange={(e) => setDebtSearch(e.target.value)}
                      className="border rounded-xl px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600 transition"
                    />
                    {debtSearch && (
                      <button
                        onClick={() => setDebtSearch('')}
                        className="px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-400 dark:hover:bg-gray-500 transition"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      onClick={() => setShowPaidDebts(!showPaidDebts)}
                      className={`px-4 py-2 rounded-xl font-semibold transition ${showPaidDebts ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500'}`}
                    >
                      {showPaidDebts ? 'Hide Paid' : 'Show Paid'}
                    </button>
                  </div>
                </div>

                {(() => {
                  const debtMap = {};
                  (admin.debts || []).forEach(d => { debtMap[d.sale_id] = d; });
                  const grouped = {};
                  (admin.debtSales || []).forEach(sale => {
                    const debt = debtMap[sale.id];
                    const customer = debt?.customer_name || sale.customer_name || 'Unknown';
                    
                    // Fix: Check paid status correctly - debt.paid_at indicates if it's paid
                    const isPaid = Boolean(debt?.paid_at);
                    
                    // Filter by paid status based on toggle
                    if (showPaidDebts) {
                      // When showing paid debts, only include paid ones
                      if (!isPaid) return;
                    } else {
                      // When showing unpaid debts, only include unpaid ones
                      if (isPaid) return;
                    }
                    
                    if (!grouped[customer]) grouped[customer] = [];
                    grouped[customer].push({ sale, debt });
                  });

                  const filteredGroups = Object.entries(grouped).filter(([customer, sales]) => 
                    !debtSearch || customer.toLowerCase().includes(debtSearch.toLowerCase())
                  );

                  if (admin.debtSales.length === 0) {
                    return <div className="text-center text-gray-400 py-6">{t.noCustomerDebts || 'No customer debts'}</div>;
                  }

                  if (filteredGroups.length === 0) {
                    return <div className="text-center text-gray-400 py-6">{t.noCustomerDebtsFound || 'No customer debts found for this search'}</div>;
                  }

                  const totalCustomerDebt = filteredGroups.reduce((total, [customer, sales]) => {
                    return total + sales.reduce((customerTotal, { sale, debt }) => {
                      // For unpaid debts view, count unpaid amounts; for paid debts view, count paid amounts
                      if (showPaidDebts) {
                        return customerTotal + (debt?.paid_at ? sale.total : 0);
                      } else {
                        return customerTotal + (debt?.paid_at ? 0 : sale.total);
                      }
                    }, 0);
                  }, 0);

                  return (
                    <>                        <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl p-4 mb-6 shadow border border-white/20">
                          <span className="text-lg font-bold text-red-600 dark:text-red-400">
                            {showPaidDebts ? 'Total Paid Debts' : 'Total Customer Debt'}: ${totalCustomerDebt.toFixed(2)}
                          </span>
                        </div>
                      {filteredGroups.map(([customer, sales]) => (
                        <div key={customer} className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-6 border border-white/20">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{customer}</h3>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {showPaidDebts ? 'Paid Amount' : 'Outstanding'}: ${sales.reduce((sum, { sale, debt }) => {
                                if (showPaidDebts) {
                                  return sum + (debt?.paid_at ? sale.total : 0);
                                } else {
                                  return sum + (debt?.paid_at ? 0 : sale.total);
                                }
                              }, 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="space-y-3">
                            {sales.map(({ sale, debt }) => (
                              <div key={sale.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 flex justify-between items-center">
                                <div className="flex-1">
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {new Date(sale.created_at).toLocaleDateString()}
                                  </div>
                                  <div className="font-semibold text-gray-800 dark:text-gray-100">
                                    ${sale.total} - {sale.items?.length || 0} items
                                  </div>
                                  {debt?.paid_at && (
                                    <div className="text-xs text-green-600 dark:text-green-400">
                                      {t.paidOn || 'Paid on'} {new Date(debt.paid_at).toLocaleDateString()} at {new Date(debt.paid_at).toLocaleTimeString()}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2 items-center">
                                  <button
                                    onClick={() => admin.setViewSale(sale)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                                  >
                                    {t.view || 'View'}
                                  </button>
                                  {debt && !debt.paid_at && (
                                    <div className="flex items-center gap-2">
                                      <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                          onChange={async (e) => {
                                            if (e.target.checked) {
                                              const confirmed = window.confirm(t.markDebtAsPaidConfirm || 'Are you sure you want to mark this debt as paid? This action cannot be undone.');
                                              if (!confirmed) {
                                                e.target.checked = false;
                                                return;
                                              }
                                              try {
                                                const result = await window.api?.markCustomerDebtPaid?.(debt.id, new Date().toISOString());
                                                if (result && result.changes > 0) {
                                                  admin.setToast?.('Debt marked as paid');
                                                  if (admin.fetchDebts) admin.fetchDebts();
                                                  if (admin.fetchDebtSales) admin.fetchDebtSales();
                                                  triggerCloudBackup(); // Trigger cloud backup
                                                } else {
                                                  admin.setToast?.('Failed to mark debt as paid');
                                                  e.target.checked = false; // Reset checkbox
                                                }
                                              } catch (error) {
                                                console.error('Error marking debt as paid:', error);
                                                admin.setToast?.('Error marking debt as paid');
                                                e.target.checked = false; // Reset checkbox
                                              }
                                            }
                                          }}
                                        />
                                        <span className="text-sm text-green-600 font-medium">Paid</span>
                                      </label>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            )}

            {section === 'companyDebts' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.companyDebts || 'Company Debts'} - We owe them</h2>
                  <button
                    onClick={() => setShowAddCompanyDebt(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold"
                  >
                    {t.addCompanyDebt || 'Add Company Debt'}
                  </button>
                </div>

                {(() => {
                  const companyDebts = admin.companyDebts || [];
                  const totalCompanyDebt = companyDebts.filter(d => !d.paid_at).reduce((sum, d) => sum + d.amount, 0);

                  if (companyDebts.length === 0) {
                    return <div className="text-center text-gray-400 py-6">{t.noCompanyDebts || 'No company debts'}</div>;
                  }

                  return (
                    <>
                      <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl p-4 mb-6 shadow border border-white/20">
                        <span className="text-lg font-bold text-red-600 dark:text-red-400">
                          Total Company Debt: ${totalCompanyDebt.toFixed(2)}
                        </span>
                      </div>
                      <div className="space-y-4">
                        {companyDebts.map((debt) => (
                          <div key={debt.id} className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-6 border border-white/20">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{debt.company_name}</h3>
                                <p className="text-gray-600 dark:text-gray-400">{debt.description || 'No description'}</p>
                                <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                                  {t.created || 'Created'}: {new Date(debt.created_at).toLocaleDateString()}
                                </div>
                                {debt.paid_at && (
                                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    {t.paidOn || 'Paid on'} {new Date(debt.paid_at).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className={`text-xl font-bold ${debt.paid_at ? 'text-green-600' : 'text-red-600'}`}>
                                  ${debt.amount.toFixed(2)}
                                </span>
                                {!debt.paid_at && (
                                  <button
                                    onClick={() => {
                                      showConfirm(
                                        `Mark debt to ${debt.company_name} as paid?`,
                                        () => {
                                          setConfirm({ open: false, message: '', onConfirm: null });
                                          window.api?.markCompanyDebtPaid?.(debt.id);
                                          admin.fetchCompanyDebts?.();
                                          triggerCloudBackup(); // Trigger cloud backup
                                        }
                                      );
                                    }}
                                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                                  >
                                    {t.markAsPaid || 'Mark as Paid'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Monthly Reports Section */}
            {section === 'monthlyReports' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.monthlyReports || 'Monthly Reports'}</h2>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t.reportsAutomaticallyGeneratedMonthly || 'Reports are automatically generated monthly'}
                  </div>
                </div>

                {(() => {
                  const reports = admin.monthlyReports || [];
                  if (reports.length === 0) {
                    return <div className="text-center text-gray-400 py-6">{t.noReports || 'No monthly reports yet'}</div>;
                  }

                  // Helper to get sales for a given month/year
                  function getSalesForMonth(month, year) {
                    return admin.sales.filter(sale => {
                      const d = new Date(sale.created_at);
                      return d.getMonth() + 1 === month && d.getFullYear() === year;
                    });
                  }
                  // Helper to get accessories sold for a given month/year
                  function getAccessorySalesForMonth(month, year) {
                    return admin.sales.filter(sale => {
                      const d = new Date(sale.created_at);
                      return d.getMonth() + 1 === month && d.getFullYear() === year && sale.items?.some(i => i.is_accessory);
                    });
                  }
                  // Helper to get products sold for a given month/year
                  function getProductSalesForMonth(month, year) {
                    return admin.sales.filter(sale => {
                      const d = new Date(sale.created_at);
                      return d.getMonth() + 1 === month && d.getFullYear() === year && sale.items?.some(i => !i.is_accessory);
                    });
                  }

                  return (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {reports.map((report) => {
                        // Calculate details for this month
                        const sales = getSalesForMonth(report.month, report.year);
                        let totalProductsSold = 0;
                        let totalAccessoriesSold = 0;
                        let productProfit = 0;
                        let accessoryProfit = 0;
                        sales.forEach(sale => {
                          (sale.items || []).forEach(item => {
                            if (item.is_accessory) {
                              totalAccessoriesSold += item.quantity || 1;
                              accessoryProfit += (item.profit || ((item.price || 0) - (item.buying_price || 0))) * (item.quantity || 1);
                            } else {
                              totalProductsSold += item.quantity || 1;
                              productProfit += (item.profit || ((item.price || 0) - (item.buying_price || 0))) * (item.quantity || 1);
                            }
                          });
                        });
                        const totalProfit = productProfit + accessoryProfit;
                        const totalTransactions = sales.length;
                        return (
                          <div key={report.id} className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-6 border border-white/20">
                            <div className="flex items-center gap-3 mb-4">
                              <span className="text-2xl">📅</span>
                              <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                  {new Date(report.year, report.month - 1).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {t.generated} {new Date(report.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">{t.sales || 'Sales'}:</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">${report.total_sales}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">{t.totalTransactions || 'Total Transactions'}:</span>
                                <span className="font-bold text-purple-600 dark:text-purple-400">{totalTransactions}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">{t.totalProductsSold || 'Total Products Sold'}:</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{totalProductsSold}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">{t.totalAccessoriesSold || 'Total Accessories Sold'}:</span>
                                <span className="font-bold text-pink-600 dark:text-pink-400">{totalAccessoriesSold}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">{t.productProfit || 'Product Profit'}:</span>
                                <span className="font-bold text-green-600 dark:text-green-400">${productProfit.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">{t.accessoryProfit || 'Accessory Profit'}:</span>
                                <span className="font-bold text-green-600 dark:text-green-400">${accessoryProfit.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">{t.totalProfit || 'Total Profit'}:</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">${totalProfit.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">{t.profit || 'Profit'}:</span>
                                <span className="font-bold text-green-600 dark:text-green-400">${report.total_profit}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        show={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        theme={theme}
        setTheme={setTheme}
        lang={lang}
        setLang={setLang}
        notificationsEnabled={admin.notificationsEnabled}
        setNotificationsEnabled={admin.setNotificationsEnabled}
        lowStockThreshold={admin.lowStockThreshold}
        setLowStockThreshold={admin.setLowStockThreshold}
        handleExportSales={admin.handleExportSales}
        handleExportInventory={admin.handleExportInventory}
        handleTestPrint={admin.handleTestPrint}
        handleResetAllData={admin.handleResetAllData}
        t={t}
      />

      {/* Product Modal */}
      {typeof ProductModal !== 'undefined' ? (
        <ProductModal
          show={admin.showProductModal}
          initialProduct={admin.editProduct}
          onSubmit={admin.editProduct ? admin.handleEditProduct : admin.handleAddProduct}
          onClose={() => {
            admin.setShowProductModal(false);
            admin.setEditProduct(null);
          }}
          t={t}
          loading={loading}
        />
      ) : (
        <div className="text-red-600 font-bold p-4">ProductModal component not found or failed to import.</div>
      )}

      {/* Accessory Modal */}
      <AccessoryModal
        show={admin.showAccessoryModal}
        accessory={admin.editAccessory}
        onSave={admin.handleAddAccessory}
        onUpdate={admin.handleEditAccessory}
        onClose={() => {
          admin.setShowAccessoryModal(false);
          admin.setEditAccessory(null);
        }}
        t={t}
      />

      {/* Sale Details Modal */}
      <SaleDetailsModal
        sale={admin.viewSale}
        onClose={() => admin.setViewSale(null)}
        onReturnItem={async (saleId, itemId) => {
          showConfirm(
            t.confirmReturnItem || 'Are you sure you want to return this item? This will restore stock and remove the item from the sale.',
            async () => {
              setConfirm({ open: false, message: '', onConfirm: null });
              setLoading(true);
              try {
                const result = await window.api?.returnSaleItem?.(saleId, itemId);
                if (result?.success) {
                  admin.setToast?.('Item returned successfully. Stock has been restored.');
                  if (admin.fetchSales) admin.fetchSales();
                  if (admin.fetchProducts) admin.fetchProducts();
                  if (admin.fetchAccessories) admin.fetchAccessories();
                  // Refresh the current sale view
                  const updatedSale = admin.sales.find(s => s.id === saleId);
                  if (updatedSale) admin.setViewSale(updatedSale);
                  triggerCloudBackup(); // Trigger cloud backup
                } else {
                  admin.setToast?.('Failed to return item: ' + (result?.message || 'Unknown error'));
                }
              } catch (error) {
                admin.setToast?.('Error returning item: ' + error.message);
              } finally {
                setLoading(false);
              }
            }
          );
        }}
        t={t}
      />

      {/* Backup Manager */}
      <BackupManager
        show={showBackupManager}
        onClose={() => setShowBackupManager(false)}
        onRestore={admin.handleRestoreBackup}
        t={t}
      />

      {/* Cloud Backup Manager */}
      {showCloudBackupManager && (
        <CloudBackupManager
          onClose={() => setShowCloudBackupManager(false)}
          t={t}
        />
      )}

      {/* Toast */}
      <ToastUnified
        message={admin.toast}
        onClose={() => admin.setToast("")}
      />

      <AddCompanyDebtModal
        show={showAddCompanyDebt}
        onClose={() => setShowAddCompanyDebt(false)}
        t={t}
        onSubmit={async (data) => {
          setLoading(true);
          try {
            const result = await window.api?.addCompanyDebt?.(data);
            if (result && result.lastInsertRowid) {
              admin.setToast?.('Company debt added successfully');
              setShowAddCompanyDebt(false);
              if (admin.fetchCompanyDebts) admin.fetchCompanyDebts();
              triggerCloudBackup(); // Trigger cloud backup
            } else {
              admin.setToast?.('Failed to add company debt: ' + (result?.message || 'Unknown error'));
            }
          } catch (error) {
            admin.setToast?.('Error adding company debt: ' + error.message);
          } finally {
            setLoading(false);
          }
        }}
      />

      {/* Confirm Modal */}
      <ConfirmModal 
        open={confirm.open} 
        message={confirm.message} 
        onConfirm={confirm.onConfirm} 
        onCancel={() => setConfirm({ open: false, message: '', onConfirm: null })} 
        t={t}
      />
    </div>
  );
}
