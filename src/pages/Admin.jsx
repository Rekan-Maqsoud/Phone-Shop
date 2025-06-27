import React, { useEffect, useState, useLayoutEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ToastUnified from '../components/ToastUnified';
import SettingsModal from '../components/SettingsModal';
import ProductTable from '../components/ProductTable';
import SalesHistoryTable from '../components/SalesHistoryTable';
import SaleDetailsModal from '../components/SaleDetailsModal';
import ProductModal from '../components/ProductModal';
import QuickAddProduct from '../components/QuickAddProduct';
import BackupManager from '../components/BackupManager';
import CloudBackupManager from '../components/CloudBackupManager';
import { useLocale } from '../contexts/LocaleContext';
import useAdmin from '../components/useAdmin';

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

export default function Admin() {
  const admin = useAdmin();
  const { t, lang, isRTL, notoFont } = useLocale();
  const navigate = useNavigate();
  const [section, setSection] = useState('dashboard');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
  const [language, setLanguage] = useState(() => localStorage.getItem('lang') || lang || 'en');
  const [loading, setLoading] = useState(false);
  const [debtSearch, setDebtSearch] = useState('');
  const [paymentModal, setPaymentModal] = useState({ show: false, debtId: null, defaultTime: '' });
  const [showBackupManager, setShowBackupManager] = useState(false);
  const [showCloudBackupManager, setShowCloudBackupManager] = useState(false);

  // Ensure theme is set before first paint
  useLayoutEffect(() => {
    setAppTheme(theme);
  }, [theme]);

  // Update language on change
  useEffect(() => {
    if (admin.setLang) admin.setLang(language);
    localStorage.setItem('lang', language);
  }, [language]);

  // Fetch products on mount
  useEffect(() => {
    if (admin.fetchProducts) admin.fetchProducts();
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
    { key: 'archived', label: t.archivedProducts || 'Archived', icon: '🗃️' },
    { key: 'history', label: t.salesHistory || 'Sales', icon: '📈' },
    { key: 'debts', label: t.debts || 'Debts', icon: '💸' },
    { key: 'backup', label: t.backupManager || 'Local Backup', icon: '🗄️', action: () => setShowBackupManager(true) },
    { key: 'cloudBackup', label: t.cloudBackupManager || 'Cloud Backup', icon: '☁️', action: () => setShowCloudBackupManager(true) },
    { key: 'settings', label: t.settings, icon: '⚙️' },
    { key: 'logout', label: t.logout || 'Log out', icon: '🚪', action: () => navigate('/cashier'), accent: 'bg-red-600 text-white hover:bg-red-700', isLogout: true },
  ], [t, navigate]);

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
  const handleArchiveToggle = useCallback(async (product, archive) => {
    admin.setToast(archive ? `Archiving: ${product.name}` : `Unarchiving: ${product.name}`);
    setLoading(true);
    try {
      const updated = {
        ...product,
        archived: archive ? 1 : 0,
        stock: archive ? 0 : product.stock
      };
      const res = await window.api?.editProduct?.(updated); 
      if (!res || !res.success) {
        admin.setToast(res?.message || 'Archive/unarchive failed (no response).');
      } else {
        admin.setToast(archive ? (t.productArchived || 'Product archived!') : (t.productUnarchived || 'Product unarchived!'));
        admin.fetchProducts();
      }
    } catch (e) {
      admin.setToast(archive ? (t.archiveFailed || 'Archive failed.') : (t.unarchiveFailed || 'Unarchive failed.'));
      
    } finally {
      setLoading(false);
    }
  }, [admin, t]);

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
          {/* Admin Dashboard label moved to top of sidebar */}
          <div className="flex items-center gap-2 mb-6 shrink-0">
            <span className="inline-block w-3 h-3 rounded-full bg-purple-400 animate-pulse"></span>
            <span className="font-extrabold text-3xl text-[#a21caf] dark:text-purple-200 tracking-tight drop-shadow">{t.adminDashboard}</span>
          </div>
          {/* Enhanced Stats */}
          <div className="space-y-3 mb-8 shrink-0">
            {/* Today's Performance */}
            <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 dark:from-blue-900/40 dark:to-cyan-900/40 rounded-2xl shadow p-4 border border-blue-200/30 dark:border-blue-700/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📈</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Today's Performance</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Sales: </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{todaysSales.length}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Revenue: </span>
                  <span className="font-bold text-green-600 dark:text-green-400">${todaysRevenue}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Profit: </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">${todaysProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Monthly Overview */}
            <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-4 flex flex-col border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🏪</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">This Month</span>
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
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Stock Alerts</span>
                </div>
                <div className="space-y-1 text-xs">
                  {criticalStockProducts.length > 0 && (
                    <div className="text-red-600 dark:text-red-400 font-semibold">
                      🚨 Critical: {criticalStockProducts.length} items
                    </div>
                  )}
                  {lowStockProducts.length > 0 && (
                    <div className="text-orange-600 dark:text-orange-400">
                      ⚡ Low: {lowStockProducts.length} items
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
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Debts</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Outstanding: </span>
                    <span className="font-bold text-red-600 dark:text-red-400">${totalDebtAmount}</span>
                  </div>
                  {paidDebtsToday > 0 && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Paid today: </span>
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
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">📊 Business Overview</h2>
                
                {/* Business Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Top Selling Products */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200/50 dark:border-blue-700/30">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">🏆</span>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Top Products</h3>
                    </div>
                    <div className="space-y-3">
                      {topSellingProducts.length > 0 ? topSellingProducts.slice(0, 3).map(([name, data], idx) => (
                        <div key={name} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">#{idx + 1}</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{name}</span>
                          </div>
                          <span className="text-xs font-bold text-green-600 dark:text-green-400">{data.quantity} sold</span>
                        </div>
                      )) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No sales data yet</p>
                      )}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200/50 dark:border-green-700/30">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">📋</span>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Recent Sales</h3>
                    </div>
                    <div className="space-y-3">
                      {recentSales.length > 0 ? recentSales.slice(0, 3).map((sale, idx) => (
                        <div key={sale.id} className="flex justify-between items-center">
                          <div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {new Date(sale.created_at).toLocaleDateString()}
                            </span>
                            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              ${sale.total} {sale.is_debt ? '(Debt)' : ''}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {sale.items?.length || 0} items
                          </span>
                        </div>
                      )) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No recent sales</p>
                      )}
                    </div>
                  </div>

                  {/* Critical Stock Items */}
                  <div className="bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-6 border border-orange-200/50 dark:border-orange-700/30">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">⚠️</span>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Stock Alerts</h3>
                    </div>
                    <div className="space-y-3">
                      {criticalStockProducts.length > 0 ? criticalStockProducts.slice(0, 3).map((product) => (
                        <div key={product.id} className="flex justify-between items-center">
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{product.name}</span>
                          <span className="text-xs font-bold text-red-600 dark:text-red-400">
                            {product.stock} left
                          </span>
                        </div>
                      )) : lowStockProducts.length > 0 ? lowStockProducts.slice(0, 3).map((product) => (
                        <div key={product.id} className="flex justify-between items-center">
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{product.name}</span>
                          <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                            {product.stock} left
                          </span>
                        </div>
                      )) : (
                        <p className="text-sm text-green-600 dark:text-green-400">All stocks healthy</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200/50 dark:border-purple-700/30">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">⚡</span>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Quick Actions</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      onClick={() => setSection('active')}
                      className="flex flex-col items-center gap-2 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-white/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all"
                    >
                      <span className="text-lg">�</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Products</span>
                    </button>
                    <button
                      onClick={() => setSection('history')}
                      className="flex flex-col items-center gap-2 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-white/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all"
                    >
                      <span className="text-lg">�</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Sales History</span>
                    </button>
                    <button
                      onClick={() => setSection('debts')}
                      className="flex flex-col items-center gap-2 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-white/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all"
                    >
                      <span className="text-lg">�</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Manage Debts</span>
                    </button>
                    <button
                      onClick={() => setSection('archived')}
                      className="flex flex-col items-center gap-2 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-white/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all"
                    >
                      <span className="text-lg">🗃️</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Archived</span>
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
                  onEdit={admin.setEditProduct}
                  onArchive={p => handleArchiveToggle(p, true)}
                  isArchived={false}
                />
              </div>
            )}

            {/* Archived Products Section */}
            {section === 'archived' && (
              <ProductTable
                title={t.archivedProducts || 'Archived Products'}
                products={admin.products.filter(p => p && ((typeof p.archived === 'undefined' ? 0 : p.archived) === 1))}
                t={t}
                lowStockThreshold={admin.lowStockThreshold}
                onUnarchive={p => handleArchiveToggle(p, false)}
                isArchived={true}
              />
            )}
            {section === 'history' && (
              <SalesHistoryTable
                sales={admin.sales}
                t={t}
                onView={saleId => {
                  const sale = admin.sales.find(s => s.id === saleId);
                  if (sale) admin.setViewSale(sale);
                }}
              />
            )}
            {section === 'debts' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.debts || 'Debts'}</h2>
                  <div className="flex gap-2 items-center">
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
                  </div>
                </div>

                {(() => {
                  const debtMap = {};
                  (admin.debts || []).forEach(d => { debtMap[d.sale_id] = d; });
                  // Group debt sales by customer name (from debt record if present)
                  const grouped = {};
                  (admin.debtSales || []).forEach(sale => {
                    const debt = debtMap[sale.id];
                    const customer = debt?.customer_name || 'Unknown';
                    if (!grouped[customer]) grouped[customer] = [];
                    grouped[customer].push({ sale, debt });
                  });

                  // Filter by search term
                  const filteredGroups = Object.entries(grouped).filter(([customer, sales]) => 
                    !debtSearch || customer.toLowerCase().includes(debtSearch.toLowerCase())
                  );

                  if (admin.debtSales.length === 0) {
                    return <div className="text-center text-gray-400 py-6">{t.noDebts || 'No debts'}</div>;
                  }

                  if (filteredGroups.length === 0) {
                    return <div className="text-center text-gray-400 py-6">{t.noDebtsFound || 'No debts found for this search'}</div>;
                  }

                  return filteredGroups.map(([customer, sales]) => (
                    <div key={customer} className="bg-white/90 dark:bg-gray-900/80 rounded-2xl shadow p-6 border border-purple-200 dark:border-purple-700">
                      <h3 className="text-lg font-bold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-purple-400"></span>
                        {customer}
                      </h3>
                      {sales.map(({ sale, debt }) => (
                        <div key={sale.id} className="mb-6">
                          {/* Debug warning if debt record is missing */}
                          {!debt && (
                            <div className="text-sm text-red-500 mb-2">⚠️ {t.debtRecordMissing || 'Debt record missing for this sale.'}</div>
                          )}
                          <div className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{t.date || 'Date'}: {new Date(sale.created_at).toLocaleString()}</div>
                          <table className="min-w-full text-left border rounded-lg text-gray-800 dark:text-gray-100 bg-white/90 dark:bg-gray-900/80 mb-2">
                            <thead className="bg-gradient-to-r from-purple-700 to-pink-500 text-white">
                              <tr>
                                <th className="px-4 py-2">{t.items || 'Items'}</th>
                                <th className="px-4 py-2">{t.ram || 'RAM'}</th>
                                <th className="px-4 py-2">{t.storage || 'Storage'}</th>
                                <th className="px-4 py-2">{t.sellingPrice || 'Selling Price'}</th>
                                <th className="px-4 py-2">{t.buyingPrice || 'Buying Price'}</th>
                                <th className="px-4 py-2">{t.quantity || 'Quantity'}</th>
                                <th className="px-4 py-2">{t.amount || 'Amount'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sale.items.map((item, idx) => (
                                <tr key={item.id || idx} className="border-b last:border-b-0 hover:bg-purple-50 dark:hover:bg-purple-900 transition-colors">
                                  <td className="px-4 py-2">{item.name}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{item.ram || '-'}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{item.storage || '-'}</td>
                                  <td className="px-4 py-2">${item.selling_price || item.price || 0}</td>
                                  <td className="px-4 py-2">${item.buying_price || 0}</td>
                                  <td className="px-4 py-2">{item.quantity || 1}</td>
                                  <td className="px-4 py-2">${(item.selling_price || item.price || 0) * (item.quantity || 1)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="font-bold text-lg text-blue-700 dark:text-blue-300">{t.total}: ${sale.total}</span>
                            <span className="font-bold text-lg text-green-700 dark:text-green-300">{t.profit || 'Profit'}: ${sale.items.reduce((sum, item) => sum + (((item.selling_price || item.price || 0) - (item.buying_price || 0)) * (item.quantity || 1)), 0).toFixed(2)}</span>
                            <span className="font-bold text-lg text-gray-700 dark:text-gray-200">{t.paid || 'Paid'}: {debt?.paid ? t.yes || 'Yes' : t.no || 'No'}</span>
                            {debt?.paid && debt?.paid_at && (
                              <span className="text-sm text-gray-600 dark:text-gray-400">{t.paidAt || 'Paid at'}: {new Date(debt.paid_at).toLocaleString()}</span>
                            )}
                            {!debt?.paid && debt && (
                              <button
                                className="ml-2 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                                onClick={() => {
                                  setPaymentModal({
                                    show: true,
                                    debtId: debt.id,
                                    defaultTime: new Date().toISOString().slice(0, 16)
                                  });
                                }}
                              >
                                {t.markAsPaid || 'Mark as Paid'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      </main>
      {/* Modals and overlays (unchanged) */}
      {/* Sale Details Modal */}
      <SaleDetailsModal
        viewSale={admin.viewSale}
        t={t}
        onClose={() => admin.setViewSale(null)}
      />
      {/* Product Add/Edit Modal */}
      <ProductModal
        show={admin.showProductModal || !!admin.editProduct}
        t={t}
        onClose={() => {
          admin.setShowProductModal(false);
          admin.setEditProduct(null);
        }}
        onSubmit={async (product) => {
          if (admin.editProduct) {
            await admin.handleEditProduct(product);
            admin.setEditProduct(null);
          } else {
            await admin.handleAddProduct(product);
            admin.setShowProductModal(false);
          }
        }}
        initialProduct={admin.editProduct}
      />
      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          show={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          t={t}
          theme={theme}
          setTheme={setTheme}
          setAppTheme={setAppTheme}
          lang={language}
          setLang={setLanguage}
          autoBackup={admin.autoBackup}
          setAutoBackup={admin.setAutoBackup}
          notificationsEnabled={admin.notificationsEnabled}
          setNotificationsEnabled={admin.setNotificationsEnabled}
          lowStockThreshold={admin.lowStockThreshold}
          setLowStockThreshold={admin.setLowStockThreshold}
          handleRestoreBackup={admin.handleRestoreBackup}
          handleExportSales={admin.handleExportSales}
          handleExportInventory={admin.handleExportInventory}
          handleTestPrint={admin.handleTestPrint}
          handleResetAllData={admin.handleResetAllData}
          handleChangeAdminPassword={admin.handleChangeAdminPassword}
          loading={admin.loading}
        />
      )}
      {/* Edit Product Modal */}
      {admin.editProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-sm" tabIndex="-1">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">{t.edit} {t.products}</h2>
            <form onSubmit={async e => {
              e.preventDefault();
              const form = e.target;
              const product = {
                id: admin.editProduct.id,
                name: form.name.value,
                price: parseFloat(form.price.value),
                stock: parseInt(form.stock.value, 10),
                archived: typeof admin.editProduct.archived === 'undefined' ? 0 : admin.editProduct.archived
              };
              await admin.handleEditProduct(product);
              admin.setEditProduct(null);
            }} className="flex flex-col gap-2">
              <input name="name" type="text" placeholder={t.name} defaultValue={admin.editProduct.name} className="border rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600 transition" required />
              <input name="price" type="number" step="0.01" placeholder={t.price} defaultValue={admin.editProduct.price} className="border rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600 transition" required />
              <input name="stock" type="number" placeholder={t.stock} defaultValue={admin.editProduct.stock} className="border rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600 transition" required />
              <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition">{t.save}</button>
            </form>
            <button onClick={() => admin.setEditProduct(null)} className="mt-4 w-full bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded-lg font-semibold shadow hover:bg-gray-400 dark:hover:bg-gray-500 transition">{t.close}</button>
          </div>
        </div>
      )}
      {/* Payment Modal */}
      {paymentModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md" tabIndex="-1">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">{t.markAsPaid || 'Mark as Paid'}</h2>
            <form onSubmit={async e => {
              e.preventDefault();
              const form = e.target;
              const paidAt = form.paidAt.value ? new Date(form.paidAt.value).toISOString() : new Date().toISOString();
              
              if (window.confirm(t.confirmMarkPaid || 'Mark this purchase as paid? This cannot be undone.')) {
                await admin.handleMarkDebtPaid(paymentModal.debtId, paidAt);
                setPaymentModal({ show: false, debtId: null, defaultTime: '' });
                admin.setToast(t.debtMarkedPaid || 'Debt marked as paid and moved to sales history!');
              }
            }} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.paymentTime || 'Payment Time'}
                </label>
                <input 
                  name="paidAt" 
                  type="datetime-local" 
                  defaultValue={paymentModal.defaultTime}
                  className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600 transition" 
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t.paymentTimeHelp || 'Leave empty to use current time'}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">
                  {t.confirm || 'Confirm'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setPaymentModal({ show: false, debtId: null, defaultTime: '' })}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition"
                >
                  {t.cancel || 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Backup Manager Modal */}
      {showBackupManager && (
        <BackupManager
          t={t}
          onClose={() => setShowBackupManager(false)}
        />
      )}
      {/* Cloud Backup Manager Modal */}
      {showCloudBackupManager && (
        <CloudBackupManager
          t={t}
          onClose={() => setShowCloudBackupManager(false)}
        />
      )}
      <ToastUnified message={admin.toast} type="success" onClose={() => admin.setToast("")} />
    </div>
  );
}
