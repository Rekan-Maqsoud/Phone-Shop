import React, { useEffect, useState, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Toast from '../components/Toast';
import SettingsModal from '../components/SettingsModal';
import ProductTable from '../components/ProductTable';
import SalesHistoryTable from '../components/SalesHistoryTable';
import SaleDetailsModal from '../components/SaleDetailsModal';
import ProductModal from '../components/ProductModal';
import QuickAddProduct from '../components/QuickAddProduct';
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
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }
  // Force reflow (for Electron)
  document.body.style.display = 'none';
  void document.body.offsetHeight;
  document.body.style.display = '';
}

export default function Admin() {
  const admin = useAdmin();
  const { t, lang, isRTL, notoFont } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const [section, setSection] = useState('active');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
  const [language, setLanguage] = useState(() => localStorage.getItem('lang') || lang || 'en');

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

  // Debug: log products
  useEffect(() => {
    console.log('[Admin] admin.products:', admin.products);
  }, [admin.products]);

  // Low stock notification
  useEffect(() => {
    if (admin.notificationsEnabled && admin.products.length) {
      const lowStock = admin.products.filter(p => p.stock < admin.lowStockThreshold);
      if (lowStock.length) {
        showToast(`Low stock alert: ${lowStock.map(p => p.name).join(', ')}`);
      }
    }
  }, [admin.products, admin.notificationsEnabled, admin.lowStockThreshold]);

  // Helper to show toast
  const showToast = msg => {
    admin.setToast(msg);
  };

  // Redesigned nav items for glassy sidebar
  const navItems = [
    { key: 'active', label: t.products, icon: '📦', accent: 'bg-purple-600' },
    { key: 'archived', label: t.archivedProducts || 'Archived', icon: '🗃️' },
    { key: 'history', label: t.salesHistory || 'Sales', icon: '📈' },
    { key: 'debts', label: t.debts || 'Debts', icon: '💸' },
    { key: 'settings', label: t.settings, icon: '⚙️' },
    { key: 'backup', label: t.backupNow, icon: '🗄️', action: () => {}, disabled: true },
    { key: 'logout', label: t.logout || 'Log out', icon: '🚪', action: () => navigate('/cashier'), accent: 'bg-red-600 text-white hover:bg-red-700', isLogout: true },
  ];

  // --- Redesigned UI ---
  return (
    <div
      className={`w-screen h-screen min-h-screen min-w-0 flex flex-row gap-0 justify-center items-stretch p-0 overflow-hidden bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#c7d2fe] dark:from-[#1e293b] dark:via-[#0f172a] dark:to-[#0e7490] ${isRTL ? 'rtl' : ''}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={notoFont}
      {...(admin.loading ? { 'aria-busy': true } : {})}
    >
      {/* Glassy Sidebar */}
      <aside className="w-full md:w-[370px] h-full flex flex-col justify-between p-8 bg-white/30 dark:bg-gray-900/60 backdrop-blur-xl shadow-2xl border-r border-white/10 relative z-10 overflow-y-auto">
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
              <span className="text-lg text-gray-700 dark:text-gray-300">{t.totalRevenue}</span>
              <span className="text-2xl font-bold text-green-500 dark:text-green-300">${admin.totalRevenue}</span>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-4 flex flex-col items-center md:items-start border border-white/20">
              <span className="text-lg text-gray-700 dark:text-gray-300">{t.inventoryValue}</span>
              <span className="text-2xl font-bold text-purple-500 dark:text-purple-300">${admin.inventoryValue}</span>
            </div>
          </div>
          {/* Navigation buttons - move down, let whole sidebar scroll */}
          <nav className="flex flex-col gap-4 mt-16">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => {
                  if (item.key === 'settings') {
                    setShowSettingsModal(true);
                  } else if (item.action) {
                    item.action();
                  } else {
                    setSection(item.key);
                  }
                }}
                disabled={item.disabled}
                className={`flex items-center gap-3 px-4 py-4 rounded-xl font-semibold text-lg transition shadow-md
                  ${item.isLogout
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : section === item.key && item.key !== 'settings' && !item.action
                      ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-xl scale-105'
                      : item.key === 'backup' ? 'bg-yellow-500 text-gray-900 opacity-70 cursor-not-allowed' :
                        'bg-white/60 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 hover:bg-purple-100 dark:hover:bg-purple-900'}
                  ${item.disabled ? 'opacity-60 cursor-not-allowed' : ''}
                `}
                aria-current={section === item.key ? 'page' : undefined}
                title={item.disabled ? 'No backup method configured' : ''}
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
              <QuickAddProduct t={t} onAdd={admin.handleAddProduct} loading={admin.loading} />
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
                onArchive={async (p) => {
                  admin.setLoading(true);
                  try {
                    const updated = {
                      ...p,
                      archived: 1,
                      stock: 0
                    };
                    const res = await window.api.editProduct(updated);
                    showToast(res.success ? t.productArchived || 'Product archived!' : res.message || t.archiveFailed || 'Archive failed.');
                    if (res.success) admin.fetchProducts();
                  } catch (e) {
                    showToast(t.archiveFailed || 'Archive failed.');
                  } finally {
                    admin.setLoading(false);
                  }
                }}
                isArchived={false}
              />
            )}
            {section === 'archived' && (
              <ProductTable
                title={t.archivedProducts || 'Archived Products'}
                products={admin.products.filter(p => p && ((typeof p.archived === 'undefined' ? 0 : p.archived) === 1))}
                t={t}
                lowStockThreshold={admin.lowStockThreshold}
                onUnarchive={async (p) => {
                  admin.setLoading(true);
                  try {
                    const updated = {
                      id: p.id,
                      name: p.name,
                      price: p.price,
                      stock: p.stock,
                      archived: 0
                    };
                    const res = await window.api.editProduct(updated);
                    showToast(res.success ? t.productUnarchived || 'Product unarchived!' : res.message || t.unarchiveFailed || 'Unarchive failed.');
                    if (res.success) admin.fetchProducts();
                  } catch (e) {
                    showToast(t.unarchiveFailed || 'Unarchive failed.');
                  } finally {
                    admin.setLoading(false);
                  }
                }}
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
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-2 text-gray-800 dark:text-gray-100">{t.debts || 'Debts'}</h2>
                <table className="min-w-full text-left border rounded-lg text-gray-800 dark:text-gray-100 bg-white/90 dark:bg-gray-900/80">
                  <thead className="bg-gradient-to-r from-purple-700 to-pink-500 text-white">
                    <tr>
                      <th className="px-4 py-2">{t.customerName || 'Customer'}</th>
                      <th className="px-4 py-2">{t.amount || 'Amount'}</th>
                      <th className="px-4 py-2">{t.date || 'Date'}</th>
                      <th className="px-4 py-2">{t.paid || 'Paid'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admin.debts.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-gray-400 py-6">{t.noDebts || 'No debts'}</td></tr>
                    ) : (
                      admin.debts.map(debt => (
                        <tr key={debt.id} className="border-b last:border-b-0 hover:bg-purple-50 dark:hover:bg-purple-900 transition-colors">
                          <td className="px-4 py-2">{debt.customer_name}</td>
                          <td className="px-4 py-2">${debt.total}</td>
                          <td className="px-4 py-2">{new Date(debt.created_at).toLocaleString()}</td>
                          <td className="px-4 py-2">
                            <input type="checkbox" checked={!!debt.paid} onChange={() => admin.handleMarkDebtPaid(debt.id)} disabled={!!debt.paid} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
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
      <Toast message={admin.toast} onClose={() => admin.setToast("")} />
    </div>
  );
}
