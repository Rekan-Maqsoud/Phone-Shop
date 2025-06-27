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
  const [section, setSection] = useState('active');
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
    return sum + sale.items.reduce((itemSum, item) => {
      const profit = (item.price - (item.buying_price || 0)) * (item.quantity || 1);
      return itemSum + profit;
    }, 0);
  }, 0);

  // Memoize nav items for performance
  const navItems = useMemo(() => [
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
          {/* Stats */}
          <div className="space-y-4 mb-8 shrink-0">
            <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-4 flex flex-col items-center md:items-start border border-white/20">
              <span className="text-lg text-gray-700 dark:text-gray-300">{t.monthlySales || 'This Month Sales'}</span>
              <span className="text-2xl font-bold text-blue-500 dark:text-blue-300">${admin.monthlySales}</span>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-4 flex flex-col items-center md:items-start border border-white/20">
              <span className="text-lg text-gray-700 dark:text-gray-300">{t.totalProfit || 'Total Profit'}</span>
              <span className="text-2xl font-bold text-green-500 dark:text-green-300">${totalProfit.toFixed(2)}</span>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-4 flex flex-col items-center md:items-start border border-white/20">
              <span className="text-lg text-gray-700 dark:text-gray-300">{t.inventoryValue}</span>
              <span className="text-2xl font-bold text-purple-500 dark:text-purple-300">${admin.inventoryValue}</span>
            </div>
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
          {/* Quick Add Product and Actions */}
          {section === 'active' && (
            <div className="flex flex-col gap-4 mb-4">
              <QuickAddProduct t={t} onAdd={admin.handleAddProduct} loading={loading} />
            </div>
          )}
          {/* Section content */}
          <div className="flex-1 min-h-0">
            {section === 'active' && (
              <ProductTable
                title={t.products}
                products={admin.products.filter(p => p && ((typeof p.archived === 'undefined' ? 0 : p.archived) === 0))}
                t={t}
                lowStockThreshold={admin.lowStockThreshold}
                onEdit={admin.setEditProduct}
                onArchive={p => handleArchiveToggle(p, true)}
                isArchived={false}
              />
            )}
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
                onView={admin.handleViewSale}
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
                                <th className="px-4 py-2">{t.sellingPrice || 'Selling Price'}</th>
                                <th className="px-4 py-2">{t.buyingPrice || 'Buying Price'}</th>
                                <th className="px-4 py-2">{t.amount || 'Amount'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sale.items.map((item, idx) => (
                                <tr key={item.id || idx} className="border-b last:border-b-0 hover:bg-purple-50 dark:hover:bg-purple-900 transition-colors">
                                  <td className="px-4 py-2">{item.name}</td>
                                  <td className="px-4 py-2">${item.price}</td>
                                  <td className="px-4 py-2">${item.buying_price || 0}</td>
                                  <td className="px-4 py-2">${item.price * item.quantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="font-bold text-lg text-blue-700 dark:text-blue-300">{t.total}: ${sale.total}</span>
                            <span className="font-bold text-lg text-green-700 dark:text-green-300">{t.profit || 'Profit'}: ${sale.items.reduce((sum, item) => sum + ((item.price - (item.buying_price || 0)) * item.quantity), 0).toFixed(2)}</span>
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
