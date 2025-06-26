import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import ProductSelectModal from '../components/ProductSelectModal';
import useCart from '../components/hooks/useCart';
import useAdmin from '../components/hooks/useAdmin';
import useProductLookup from '../components/hooks/useProductLookup';
import { useTheme } from '../contexts/ThemeContext';
import { useLocale } from '../contexts/LocaleContext';

// Redesigned Cashier page with stunning modern UI
export default function Cashier() {
  const [search, setSearch] = useState(''); // rename barcode to search for clarity
  const [isReturn, setIsReturn] = useState(false);
  const [isDebt, setIsDebt] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState({ admin: false, sale: false, price: false });
  const [confirm, setConfirm] = useState({ open: false, message: '', onConfirm: null });
  const [productOptions, setProductOptions] = useState([]);
  const [showProductSelect, setShowProductSelect] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const inputRef = useRef();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t, lang, isRTL, notoFont } = useLocale();

  // Hooks
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };
  const showConfirm = (message, onConfirm) => {
    setConfirm({ open: true, message, onConfirm });
  };
  const { items, addOrUpdateItem, deleteItem, clearCart, total, setItems } = useCart(showToast, showConfirm);
  const admin = useAdmin(navigate);
  // Defensive: always use array for products
  const products = Array.isArray(admin.products) ? admin.products : [];
  const { fetchProductByBarcode, fetchProductsByName } = useProductLookup();

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (admin.adminModal) return;
      if (e.key === 'F2') {
        e.preventDefault();
        if (items.length) showToast('Complete sale (not implemented)', 'info');
      } else if (e.key === 'Escape') {
        setSearch('');
      } else if (e.key === 'Enter' && search) {
        handleSearchSubmit(e);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [search, items, admin.adminModal]);

  const handleSearchInput = (e) => {
    setSearch(e.target.value);
    // Always fetch latest products from database
    if (admin.fetchProducts) admin.fetchProducts();
  };
  const handleQuantityInput = (e) => {
    const val = Math.max(1, parseInt(e.target.value) || 1);
    setQuantity(val);
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!search.trim()) {
      showToast(t.enterName || 'Please enter a product name', 'error');
      return;
    }
    setLoading(l => ({ ...l, price: true }));
    // Name search (case-insensitive, partial match, stock > 0)
    let matches = products.filter(p => p.stock > 0 && p.name.toLowerCase().includes(search.toLowerCase()));
    setLoading(l => ({ ...l, price: false }));
    if (matches.length === 1) {
      addOrUpdateItem(matches[0], isReturn, quantity);
      setSearch('');
      setQuantity(1);
      setIsReturn(false);
    } else if (matches.length > 1) {
      setProductOptions(matches);
      setShowProductSelect(true);
    } else {
      showToast(t.productNotFound || 'Product not found or invalid', 'error');
      setSearch('');
      setQuantity(1);
      setIsReturn(false);
    }
  };

  const handleSelectProductVariant = (product) => {
    addOrUpdateItem(product, isReturn, quantity);
    setShowProductSelect(false);
    setProductOptions([]);
    setSearch('');
    setQuantity(1);
    setIsReturn(false);
  };

  const handleCompleteSale = async () => {
    if (!items.length) return;
    showConfirm(
      isDebt
        ? t.confirmDebtSale || 'ئایا دڵنیایت کە ئەم فرۆشتنە بە قەرز تۆمار بکەیت؟'
        : t.confirmSale || 'ئایا دڵنیایت کە ئەم فرۆشتنە تەواو بکەیت؟',
      async () => {
        setConfirm({ open: false, message: '', onConfirm: null });
        setLoading(l => ({ ...l, sale: true }));
        const sale = {
          items: items.map(item => ({
            product_id: item.id || item.product_id,
            quantity: 1,
            price: item.price,
            isReturn: item.isReturn || false,
          })),
          total,
          created_at: new Date().toISOString(),
        };
        if (window.api?.saveSale) {
          const res = await window.api.saveSale(sale);
          if (res.success && isDebt) {
            await window.api.addDebt({ sale_id: res.lastInsertRowid || res.id, customer_name: customerName });
          }
          setLoading(l => ({ ...l, sale: false }));
          if (res.success) {
            // Decrease stock for each sold product
            for (const item of items) {
              if (!item.isReturn && window.api?.editProduct) {
                await window.api.editProduct({ ...item, stock: (item.stock ?? 0) - (item.quantity || 1) });
              }
            }
            setItems([]);
            setSearch('');
            setIsDebt(false);
            setCustomerName("");
            showToast(isDebt ? (t.debtSaleSuccess || 'Debt sale recorded!') : (t.saleSuccess || 'Complete sale successful!'));
          } else {
            showToast(res.message || t.saleFailed || 'Sale failed', 'error');
          }
        } else {
          setLoading(l => ({ ...l, sale: false }));
          showToast(t.saleApiUnavailable || 'Sale API not available', 'error');
        }
      }
    );
  };

  useEffect(() => {
    let active = true;
    if (admin.fetchProducts) admin.fetchProducts(); // always fetch latest
    const fetchSuggestions = async () => {
      if (!search.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      // Use products from admin for suggestions
      const safeProducts = Array.isArray(products) ? products : [];
      let matches = safeProducts.filter(p => p.stock > 0 && p.name.toLowerCase().includes(search.toLowerCase()));
      if (active) {
        setSuggestions(matches.slice(0, 7));
        setShowSuggestions(matches.length > 0);
      }
    };
    fetchSuggestions();
    return () => { active = false; };
  }, [search, products]);

  // Always fetch products on mount and after add/edit/delete
  useEffect(() => {
    if (admin.fetchProducts) admin.fetchProducts();
  }, []);
  useEffect(() => {
    if (admin.fetchProducts) admin.fetchProducts();
  }, [Array.isArray(admin.products) ? admin.products.length : 0]);

  // Re-fetch products after add/edit/delete
  useEffect(() => {
    if (admin.fetchProducts) admin.fetchProducts();
  }, [items]);

  const toastStyles = {
    success: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg',
    error: 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg',
    info: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg',
  };

  const handleSuggestionClick = (product) => {
    addOrUpdateItem(product, isReturn, quantity);
    setSearch('');
    setQuantity(1);
    setSuggestions([]);
    setShowSuggestions(false);
    if (inputRef.current) inputRef.current.blur();
  };

  // --- Redesigned UI ---
  return (
    <div
      className={`min-h-screen h-screen w-screen flex flex-col md:flex-row bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#c7d2fe] dark:from-[#1e293b] dark:via-[#0f172a] dark:to-[#0e7490] transition-colors duration-300`}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={notoFont}
    >
      {/* Glassy Sidebar */}
      <aside className="w-full md:w-[370px] h-full flex flex-col justify-between p-8 bg-white/30 dark:bg-gray-900/60 backdrop-blur-xl shadow-2xl border-r border-white/10 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>
            <span className="font-extrabold text-3xl text-[#0e7490] dark:text-blue-200 tracking-tight drop-shadow">{t.cashier}</span>
          </div>
          <div className="text-xs text-gray-700 dark:text-gray-300 mb-2">{clock.toLocaleTimeString()} | {clock.toLocaleDateString()}</div>
          <div className="mb-6">
            <span className="block text-gray-700 dark:text-gray-200 font-semibold text-lg mb-1">{t.total}:</span>
            <span className="text-4xl font-black text-[#0e7490] dark:text-blue-300 drop-shadow">${total}</span>
          </div>
          <div className="mb-6 text-gray-600 dark:text-gray-300 text-base">{items.length} {t.items || 'items'}</div>
          <button
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 rounded-xl font-extrabold text-xl shadow-xl hover:scale-105 hover:from-green-600 hover:to-emerald-500 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-60"
            disabled={items.length === 0 || loading.sale}
            onClick={handleCompleteSale}
          >
            <span>{loading.sale ? t.processing || 'Processing...' : t.completeSale || 'Complete Sale'}</span>
          </button>
        </div>
        {/* Receipt Preview */}
        <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl p-5 mt-8 shadow-xl border border-white/20">
          <div className="font-bold mb-2 text-gray-800 dark:text-gray-100 text-base">{t.receiptPreview || 'Receipt Preview'}</div>
          {items.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400">{t.noItems}</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((item, idx) => (
                <li key={item.id + '-' + item.isReturn} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-900 dark:text-gray-100">{item.name} <span className="text-xs text-gray-400">x{item.quantity}</span></span>
                  <span className={`font-bold ${item.isReturn ? 'text-red-600' : 'text-green-700'} dark:text-green-400`}>{item.isReturn ? '-' : ''}${Math.abs(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex justify-between font-bold text-lg text-gray-800 dark:text-gray-100">
            <span>{t.total}:</span>
            <span>${total}</span>
          </div>
        </div>
      </aside>
      {/* Main Area */}
      <main className="flex-1 flex flex-col items-center justify-start p-8 min-h-screen h-full bg-transparent relative z-0">
        {/* Top Bar */}
        <div className="w-full flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <button
            onClick={admin.openAdminModal}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold shadow-lg hover:scale-105 hover:from-indigo-700 hover:to-blue-600 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300"
            title={t.backToAdmin}
          >
            {t.backToAdmin || 'Admin Panel'}
          </button>
          <div className="text-gray-800 dark:text-gray-200 text-base font-mono tracking-wide bg-white/40 dark:bg-gray-800/60 px-4 py-2 rounded-xl shadow">
            {clock.toLocaleDateString()}
          </div>
        </div>
        {/* Scan/Search Card */}
        <div className="w-full max-w-3xl mx-auto mb-8">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 items-center bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-2xl p-6 border border-white/20 relative">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 border-2 border-blue-300 dark:border-blue-700 rounded-xl px-6 py-3 text-xl font-semibold focus:outline-none focus:ring-4 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 bg-white text-gray-900 dark:placeholder-gray-400 placeholder-gray-400 dark:placeholder-gray-400 shadow-md transition-all"
              placeholder={t.enterName || 'Enter product name'}
              value={search}
              onChange={handleSearchInput}
              autoFocus
              disabled={loading.price}
              onFocus={() => setShowSuggestions(suggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={handleQuantityInput}
              className="w-24 border-2 border-blue-300 dark:border-blue-700 rounded-xl px-4 py-3 text-xl font-semibold focus:outline-none focus:ring-4 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 bg-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-400 shadow-md transition-all"
              placeholder={t.quantity || 'Qty'}
              disabled={loading.price}
              style={{ maxWidth: 100 }}
            />
            {/* Suggestions overlay */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 top-full mt-2 w-full z-50 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700 rounded-xl shadow-2xl animate-fade-in overflow-hidden">
                {suggestions.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSuggestionClick(p)}
                    className="flex w-full items-center justify-between px-6 py-3 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors rounded-none text-left border-b last:border-b-0 border-blue-100 dark:border-blue-800 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100"
                  >
                    <div>
                      <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">{p.name}</span>
                      {p.model && <span className="ml-2 text-xs text-gray-500">{p.model}</span>}
                      {p.ram && <span className="ml-2 text-xs text-purple-500">{p.ram}</span>}
                      {p.storage && <span className="ml-2 text-xs text-green-500">{p.storage}</span>}
                    </div>
                    <span className="font-bold text-blue-600 dark:text-blue-300 text-lg">${p.price}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:scale-105 hover:from-indigo-700 hover:to-blue-600 transition-all duration-200 disabled:opacity-60"
              disabled={loading.price}
            >
              {loading.price ? '...' : t.add}
            </button>
          </form>
          {/* Return & Debt Controls */}
          <div className="flex flex-wrap items-center gap-4 mt-4 justify-center md:justify-start">
            <label className={`flex items-center gap-2 cursor-pointer select-none text-lg font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-700'}`}>
              <input
                type="checkbox"
                checked={isReturn}
                onChange={() => setIsReturn(!isReturn)}
                className="form-checkbox h-6 w-6 text-red-600 accent-red-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-red-400 dark:focus:ring-red-600 transition"
              />
              {t.returnItem}
            </label>
            <label className={`flex items-center gap-2 cursor-pointer select-none text-lg font-semibold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'}`}>
              <input
                type="checkbox"
                checked={isDebt}
                onChange={() => setIsDebt(!isDebt)}
                className="form-checkbox h-6 w-6 text-yellow-600 accent-yellow-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400 dark:focus:ring-yellow-600 transition"
              />
              {t.debt || 'Debt'}
            </label>
            {isDebt && (
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder={t.customerName || 'Customer name'}
                className="border-2 border-yellow-400 rounded-xl px-4 py-2 dark:bg-gray-700 dark:text-gray-100 bg-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-400 text-lg font-semibold shadow focus:outline-none focus:ring-2 focus:ring-yellow-400 dark:focus:ring-yellow-600 transition"
                required
              />
            )}
          </div>
        </div>
        {/* Product Table */}
        <div className="w-full max-w-5xl mx-auto overflow-x-auto mb-8">
          <table className="min-w-full rounded-2xl overflow-hidden shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl">
            <thead className="bg-gradient-to-r from-blue-900 to-blue-700 dark:from-gray-900 dark:to-gray-800">
              <tr>
                <th className="px-6 py-4 text-white text-lg font-bold">#</th>
                <th className="px-6 py-4 text-white text-lg font-bold">{t.name}</th>
                <th className="px-6 py-4 text-white text-lg font-bold">{t.model}</th>
                <th className="px-6 py-4 text-white text-lg font-bold">{t.ram}</th>
                <th className="px-6 py-4 text-white text-lg font-bold">{t.storage}</th>
                <th className="px-6 py-4 text-white text-lg font-bold">{t.price}</th>
                <th className="px-6 py-4 text-white text-lg font-bold">{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-10 text-xl font-semibold">{t.noItems}</td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr
                    key={item.id + '-' + item.isReturn}
                    className="border-b last:border-b-0 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors group"
                  >
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100 font-bold">{idx + 1}</td>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100 font-semibold">{item.name} <span className="text-xs text-gray-400">x{item.quantity}</span></td>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{item.model}</td>
                    <td className="px-6 py-4 text-purple-700 dark:text-purple-300">{item.ram}</td>
                    <td className="px-6 py-4 text-green-700 dark:text-green-300">{item.storage}</td>
                    <td className={`px-6 py-4 font-bold text-right ${item.isReturn ? 'text-red-600' : 'text-blue-700'} dark:text-blue-300`}>{item.isReturn ? '-' : ''}${Math.abs(item.price * item.quantity)}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-lg shadow hover:scale-110 hover:from-pink-600 hover:to-red-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-300"
                        title={t.delete}
                      >
                        <span className="text-lg">🗑️</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
      {/* Admin Modal */}
      {admin.adminModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
          <form onSubmit={admin.handleAdminAccess} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md flex flex-col gap-6 border border-blue-200 dark:border-blue-700">
            <h2 className="text-2xl font-extrabold mb-2 text-gray-800 dark:text-gray-100 text-center">{t.adminAccess || 'Admin Access'}</h2>
            <input
              ref={el => el && admin.adminModal && el.focus()}
              type="password"
              value={admin.adminPassword}
              onChange={e => admin.setAdminPassword(e.target.value)}
              placeholder={t.adminPassword || 'Admin password'}
              className="border-2 border-blue-300 dark:border-blue-700 rounded-xl px-4 py-3 text-lg dark:bg-gray-700 dark:text-gray-100 bg-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-400 shadow focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 transition"
              autoFocus
              disabled={loading.admin}
            />
            {admin.adminError && <div className="text-red-600 text-base text-center">{admin.adminError}</div>}
            <div className="flex gap-4 mt-2">
              <button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 rounded-xl font-bold shadow hover:scale-105 transition-all duration-200 disabled:opacity-60" disabled={loading.admin}>{loading.admin ? '...' : t.login || 'Login'}</button>
              <button type="button" onClick={() => admin.setAdminModal(false)} className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 px-4 py-2 rounded-xl font-bold shadow hover:bg-gray-400 dark:hover:bg-gray-500 transition-all duration-200">{t.cancel || 'Cancel'}</button>
            </div>
          </form>
        </div>
      )}
      {/* Toast */}
      {toast && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl z-50 font-extrabold text-xl animate-fade-in ${toastStyles[toast.type] || toastStyles.success}`}>
          {toast.msg}
        </div>
      )}
      {/* Modals */}
      <ConfirmModal open={confirm.open} message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm({ open: false, message: '', onConfirm: null })} />
      <ProductSelectModal
        show={showProductSelect}
        options={productOptions}
        t={t}
        onSelect={handleSelectProductVariant}
        onCancel={() => { setShowProductSelect(false); setProductOptions([]); }}
      />
    </div>
  );
}
