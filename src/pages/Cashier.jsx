import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import ProductSelectModal from '../components/ProductSelectModal';
import useCart from '../components/hooks/useCart';
import useAdmin from '../components/useAdmin';
import useProductLookup from '../components/hooks/useProductLookup';
import useOnlineStatus from '../components/hooks/useOnlineStatus';
import OfflineIndicator from '../components/OfflineIndicator';
import { useTheme } from '../contexts/ThemeContext';
import { useLocale } from '../contexts/LocaleContext';
import ToastUnified from '../components/ToastUnified';
import { playWarningSound, playSuccessSound } from '../utils/sounds';

// Redesigned Cashier page with stunning modern UI
export default function Cashier() {
  // --- State Initialization Fixes ---
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isDebt, setIsDebt] = useState(false);
  const [showProductSelect, setShowProductSelect] = useState(false);
  const [productOptions, setProductOptions] = useState([]);
  const [clock, setClock] = useState(new Date());
  const [loading, setLoading] = useState({ admin: false, sale: false, price: false });
  const [confirm, setConfirm] = useState({ open: false, message: '', onConfirm: null });
  const [toast, setToast] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t, lang, isRTL, notoFont } = useLocale();
  const { isOnline } = useOnlineStatus();

  // Hooks
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
  };
  const showConfirm = (message, onConfirm) => {
    setConfirm({ open: true, message, onConfirm });
  };
  const { items, addOrUpdateItem, deleteItem, clearCart, total, setItems } = useCart((msg, type) => {
    console.log('[Toast]', msg, type);
    setToast({ msg, type });
  }, showConfirm);
  const admin = useAdmin(navigate);

  // Memoize fetch functions to avoid unnecessary re-creation
  const fetchProducts = useCallback(() => {
    if (admin.fetchProducts) admin.fetchProducts();
  }, [admin.fetchProducts]);
  const fetchAccessories = useCallback(() => {
    if (admin.fetchAccessories) admin.fetchAccessories();
  }, [admin.fetchAccessories]);
  const fetchSales = useCallback(() => {
    if (admin.fetchSales) admin.fetchSales();
  }, [admin.fetchSales]);

  // Memoize derived values
  const products = useMemo(() => Array.isArray(admin.products) ? admin.products.filter(p => !p.archived) : [], [admin.products]);
  const accessories = useMemo(() => Array.isArray(admin.accessories) ? admin.accessories.filter(a => !a.archived) : [], [admin.accessories]);
  const allItems = useMemo(() => [...products, ...accessories], [products, accessories]);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Ensure we fetch accessories for the cashier
  useEffect(() => {
    fetchAccessories();
  }, [fetchAccessories]);

  useEffect(() => {
    const handler = (e) => {
      if (showProductSelect) return;
      
      // Handle arrow navigation for suggestions
      if (showSuggestions && suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          return;
        }
        if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
          e.preventDefault();
          const selectedProduct = suggestions[selectedSuggestionIndex];
          if (selectedProduct) {
            handleSuggestionClick(selectedProduct);
            return;
          }
        }
      }
      
      if (e.key === 'F2') {
        e.preventDefault();
        if (items.length) showToast(t.completeSaleNotImplemented || 'Complete sale (not implemented)', 'info');
      } else if (e.key === 'Escape') {
        setSearch('');
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      } else if (e.key === 'Enter' && search && !showSuggestions) {
        handleSearchSubmit(e);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [search, items, showSuggestions, suggestions, selectedSuggestionIndex]);

  const handleSearchInput = (e) => {
    setSearch(e.target.value);
    setSelectedSuggestionIndex(-1); // Reset selection when typing
    // Removed fetchProducts from here to avoid infinite loop/blank screen
  };
  const handleQuantityInput = (e) => {
    const val = Math.max(1, parseInt(e.target.value) || 1);
    setQuantity(val);
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    console.debug('[DEBUG] allItems:', allItems);
    console.debug('[DEBUG] admin.products:', admin.products);
    console.debug('[DEBUG] admin.accessories:', admin.accessories);
    if (!search.trim()) {
      showToast(t.pleaseEnterProductName || 'Please enter a product name', 'error');
      return;
    }
    setLoading(l => ({ ...l, price: true }));
    // Name search (case-insensitive, partial match, for returns show all items even with 0 stock)
    let matches = allItems.filter(p => 
      p.stock > 0 && 
      p.name.toLowerCase().includes(search.toLowerCase())
    );
    setLoading(l => ({ ...l, price: false }));
    if (matches.length === 1) {
      addOrUpdateItem(matches[0], false, quantity);
      setSearch('');
      setQuantity(1);
    } else if (matches.length > 1) {
      setProductOptions(matches);
      setShowProductSelect(true);
    } else {
      showToast(t.productNotFoundOrInvalid || 'Product not found or invalid', 'error');
      setSearch('');
      setQuantity(1);
    }
  };

  const handleSelectProductVariant = (product) => {
    addOrUpdateItem(product, false, quantity);
    setShowProductSelect(false);
    setProductOptions([]);
    setSearch('');
    setQuantity(1);
  };

  const triggerCloudBackup = useCallback(() => {
    console.debug('[CloudBackup] Attempting to trigger cloud backup via IPC');
    if (window.api?.send) {
      window.api.send('trigger-cloud-auto-backup');
      console.debug('[CloudBackup] IPC event sent: trigger-cloud-auto-backup');
    } else {
      console.warn('[CloudBackup] window.api.send not available');
    }
  }, []);

  const handleCompleteSale = async () => {
    if (!items.length) return;
    
    // Check if offline and warn user
    if (!isOnline) {
      showToast(t.offlineWarning || '⚠️ You are offline! This sale will not be backed up to cloud until connection is restored.', 'warning');
    }
    
    // Check for low price warning (selling below buying price)
    const belowCostItems = items.filter(item => {
      const product = allItems.find(p => p.id === item.product_id);
      if (!product) return false;
      const buyingPrice = product.buying_price || product.price;
      return item.selling_price < buyingPrice;
    });
    
    if (belowCostItems.length > 0) {
      const itemNames = belowCostItems.map(item => {
        const product = allItems.find(p => p.id === item.product_id);
        return product ? product.name : (t.unknown || 'Unknown');
      }).join(', ');
      
      // Play warning sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmgiBhSBzvTBaCYJLYHM8d2NOwgYYK3u6qJUEAhOqOPwtWMcBjiS2vLNeSsFJH/K8dmJOAgZYLLr6axXFAhOp+PoumMcBzuV2vHKeisGI3/L8d6NOwgZYrnp55tOEAhOp+Hju2EeBTmS2PDAaSMGLYHO8diKNwcbZK7s6KdXFAlBn9vou2MdBDqU2vHOeysGJXzJ8NqMOAcZYrPk66JUFB+MzO/YhikGKJ7A9dl+JQkWe8Hx3I5AEAhOqOHwtWMcBjiS2vLNeSwFJX/K8N6NOwgZYbrp55xOEAhOp+Hju2MeBTuV2vHKeisGI3/L8d6NOwgZYbvn6JtOEAlGqOPwtWMcBzmS2vLNeSsFJYDK8N6NOwcZYrTp6KNTEg5BqOPvuGQdBDuS2vHOeSsFJYDL8N2OOgcZY7Lr56BMEAJJ');
      audio.play().catch(() => {}); // Ignore if audio fails
      
      const confirmed = await new Promise((resolve) => {
        showConfirm(
          `${t.warningSellingBelowCost || '⚠️ WARNING: Selling below buying price!'}\nItems: ${itemNames}\n${t.continueAnyway || 'This will result in a loss. Continue anyway?'}`,
          () => resolve(true)
        );
        // Add a timeout to auto-resolve as false if no action
        setTimeout(() => resolve(false), 10000);
      });
      
      if (!confirmed) {
        return;
      }
    }
    
    // Don't allow negative totals for regular sales 
    if (total < 0) {
      showToast(t.cannotCompleteNegativeTotal || 'Cannot complete sale with negative total', 'error');
      return;
    }
    if (isDebt && !customerName.trim()) {
      showToast(t.pleaseEnterCustomerName || 'Please enter customer name for debt sale', 'error');
      return;
    }
    showConfirm(
      isDebt
        ? t.confirmDebtSale || 'Are you sure you want to record this sale as debt?'
        : t.confirmSale || 'Are you sure you want to complete this sale?',
      async () => {
        setConfirm({ open: false, message: '', onConfirm: null });
        if (isDebt && !customerName.trim()) {
          showToast(t.customerNameRequired || 'Customer name is required for debt sales.', 'error');
          setLoading(l => ({ ...l, sale: false }));
          return;
        }
        setLoading(l => ({ ...l, sale: true }));
        const saleItems = items.map(item => {
          const { id, ...rest } = item;
          return {
            ...rest,
            product_id: item.product_id || item.id,
          };
        });
        
        const sale = {
          items: saleItems,
          total,
          created_at: new Date().toISOString(),
          is_debt: isDebt ? 1 : 0,
          customer_name: customerName.trim() || null,
        };
        if (window.api?.saveSale) {
          const res = await window.api.saveSale(sale);
          if (res.success && isDebt) {
            try {
              const debtResult = await window.api.addDebt({ sale_id: res.id || res.lastInsertRowid, customer_name: customerName });
              if (!debtResult.success) {
                admin.setToast?.((t.saleRecordCreationFailed || 'Sale saved but failed to create debt record: ') + (debtResult.message || (t.unknownError || 'Unknown error')));
              }
              if (admin.fetchDebts) await admin.fetchDebts();
              if (admin.fetchDebtSales) await admin.fetchDebtSales();
            } catch (debtError) {
              admin.setToast?.((t.debtCreationFailed || 'Sale saved but debt creation failed: ') + debtError.message);
            }
          }
          setLoading(l => ({ ...l, sale: false }));
          if (res.success) {
            setItems([]);
            setSearch('');
            setIsDebt(false);
            setCustomerName("");
            if (admin.fetchProducts) await admin.fetchProducts();
            if (admin.fetchAccessories) await admin.fetchAccessories();
            if (admin.fetchSales) await admin.fetchSales();
            
            // Trigger auto backup after sale
            try {
              console.debug('[CloudBackup] Calling triggerCloudBackup after sale');
              triggerCloudBackup();
            } catch (backupError) {
              console.warn('Auto backup failed:', backupError);
            }
            
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

  // --- Debounced Suggestions Effect ---
  useEffect(() => {
    let active = true;
    let debounceId;
    // Removed fetchProducts from here to avoid infinite loop/blank screen
    const fetchSuggestions = async () => {
      if (!search.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      const safeProducts = Array.isArray(allItems) ? allItems : [];
      // Show all items with stock > 0
      let matches = safeProducts.filter(p => 
        p.stock > 0 && 
        p.name.toLowerCase().includes(search.toLowerCase())
      );
      if (active) {
        setSuggestions(matches.slice(0, 7));
        setShowSuggestions(matches.length > 0);
        setSelectedSuggestionIndex(-1); // Reset selection when suggestions change
      }
    };
    debounceId = setTimeout(fetchSuggestions, 200); // debounce for 200ms
    return () => {
      active = false;
      clearTimeout(debounceId);
    };
  }, [search, products]);

  useEffect(() => {
    console.debug('[Cashier] Fetching products on mount');
    fetchProducts();
  }, [fetchProducts]);
  

  const handleSuggestionClick = (product) => {
    console.debug('[Cart] addOrUpdateItem (suggestion click):', { product, quantity });
    addOrUpdateItem(product, false, quantity);
    setSearch('');
    setQuantity(1);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    if (inputRef.current) inputRef.current.blur();
  };

  // --- Redesigned UI ---
  return (
    <div
      className={`min-h-screen h-screen w-screen flex flex-col md:flex-row bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#c7d2fe] dark:from-[#1e293b] dark:via-[#0f172a] dark:to-[#0e7490] transition-colors duration-300`}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={notoFont}
    >
      {/* Fallback for loading or empty products */}
      {admin.loading ? (
        <div className="flex-1 flex items-center justify-center text-2xl text-gray-500 dark:text-gray-300">{t.loading || 'Loading...'}</div>
      ) : products.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-2xl text-gray-500 dark:text-gray-300">{t.noProducts || 'No products found.'}</div>
      ) : (
        <>
          {/* Glassy Sidebar */}
          <aside className="w-full md:w-[370px] h-full flex flex-col justify-between p-8 bg-white/30 dark:bg-gray-900/60 backdrop-blur-xl shadow-2xl border-r border-white/10 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-block w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>
                <span className="font-extrabold text-3xl text-[#0e7490] dark:text-blue-200 tracking-tight drop-shadow">{t.cashier}</span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">{clock.toLocaleTimeString()} | {clock.toLocaleDateString()}</div>
              <div className="mb-6">
                <span className="block text-gray-700 dark:text-gray-200 font-semibold text-lg mb-1">{t.total}:</span>
                <span className={`text-4xl font-black drop-shadow ${total < 0 ? 'text-red-600 dark:text-red-400' : 'text-[#0e7490] dark:text-blue-300'}`}>
                  ${total.toFixed(2)}
                </span>
              </div>
              <div className="mb-6 text-gray-600 dark:text-gray-300 text-base">{items.length} {t.items || 'items'}</div>
              <button
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 rounded-xl font-extrabold text-xl shadow-xl hover:scale-105 hover:from-green-600 hover:to-emerald-500 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-60"
                disabled={items.length === 0 || loading.sale || total < 0}
                onClick={handleCompleteSale}
                title={total < 0 ? (t.cannotCompleteNegativeTotal || 'Cannot complete sale with negative total') : ''}
              >
                <span>{loading.sale ? (t.processing || 'Processing...') : (total < 0 ? (t.negativeTotal || 'Negative Total!') : t.completeSale || 'Complete Sale')}</span>
              </button>
            </div>
            {/* Receipt Preview */}
            <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl p-5 mt-8 shadow-xl border border-white/20">
              <div className="font-bold mb-3 text-gray-800 dark:text-gray-100 text-lg flex items-center gap-2">
                <span>🧾</span>
                {t.receiptPreview || 'Receipt Preview'}
              </div>
              {items.length === 0 ? (
                <div className="text-gray-500 dark:text-gray-400 text-center py-4 italic">{t.noItems}</div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map((item, idx) => (
                    <li key={item.id} className="flex justify-between py-2 text-base">
                      <span className="text-gray-900 dark:text-gray-100 flex-1">
                        {item.name} 
                        <span className="text-sm text-gray-400 ml-1">×{item.quantity}</span>
                      </span>
                      <span className="font-bold text-green-700 dark:text-green-400 ml-2">
                        ${Math.abs(item.price * item.quantity).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 pt-3 border-t border-gray-300 dark:border-gray-600 flex justify-between font-bold text-lg text-gray-800 dark:text-gray-100">
                <span>{t.total}:</span>
                <span className="text-green-600">${total.toFixed(2)}</span>
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
              <div className="flex items-center gap-4">
                <OfflineIndicator />
                <div className="text-gray-800 dark:text-gray-200 text-base font-mono tracking-wide bg-white/40 dark:bg-gray-800/60 px-4 py-2 rounded-xl shadow">
                  {clock.toLocaleDateString()}
                </div>
              </div>
            </div>
            {/* Scan/Search Card */}
            <div className="w-full max-w-3xl mx-auto mb-8">
              <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 items-center bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-2xl p-6 border border-white/20 relative">
                <input
                  ref={inputRef}
                  type="text"
                  className="flex-1 border-2 border-blue-300 dark:border-blue-700 rounded-xl px-6 py-3 text-xl font-semibold focus:outline-none focus:ring-4 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100 bg-white text-gray-900 dark:placeholder-gray-400 placeholder-gray-400 dark:placeholder-gray-400 shadow-md transition-all"
                  placeholder={t.enterProductName || 'Enter product name'}
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
                        key={p.id ? p.id + '-' + (p.model || idx) : idx}
                        type="button"
                        onClick={() => handleSuggestionClick(p)}
                        className={`flex w-full items-center justify-between px-6 py-3 transition-colors rounded-none text-left border-b last:border-b-0 border-blue-100 dark:border-blue-800 ${
                          idx === selectedSuggestionIndex
                            ? 'bg-blue-500 text-white dark:bg-blue-600'
                            : 'hover:bg-blue-50 dark:hover:bg-blue-900 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100'
                        }`}
                      >
                        <div>
                          <span className={`font-bold text-lg ${
                            idx === selectedSuggestionIndex ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {p.name}
                          </span>
                          {p.model && <span className={`ml-2 text-sm ${
                            idx === selectedSuggestionIndex ? 'text-blue-100' : 'text-gray-500'
                          }`}>{p.model}</span>}
                          {p.ram && <span className={`ml-2 text-sm ${
                            idx === selectedSuggestionIndex ? 'text-purple-200' : 'text-purple-500'
                          }`}>{p.ram}</span>}
                          {p.storage && <span className={`ml-2 text-sm ${
                            idx === selectedSuggestionIndex ? 'text-green-200' : 'text-green-500'
                          }`}>{p.storage}</span>}
                        </div>
                        <span className={`font-bold text-lg ${
                          idx === selectedSuggestionIndex ? 'text-white' : 'text-blue-600 dark:text-blue-300'
                        }`}>
                          ${p.price}
                        </span>
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
              {/* Debt Control and Customer Name */}
              <div className="flex flex-wrap items-center gap-4 mt-4 justify-center md:justify-start">
                <label className={`flex items-center gap-2 cursor-pointer select-none text-lg font-semibold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'}`}>
                  <input
                    type="checkbox"
                    checked={isDebt}
                    onChange={() => setIsDebt(!isDebt)}
                    className="form-checkbox h-6 w-6 text-yellow-600 accent-yellow-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400 dark:focus:ring-yellow-600 transition"
                  />
                  {t.debt || 'Debt'}
                </label>
                {/* Customer Name for all sales */}
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder={isDebt ? (t.customerName || 'Customer name (required)') : (t.customerNameOptional || 'Customer name (optional)')}
                  className={`border-2 ${isDebt ? 'border-yellow-400' : 'border-blue-300'} dark:border-blue-700 rounded-xl px-4 py-2 dark:bg-gray-700 dark:text-gray-100 bg-white text-gray-900 placeholder-gray-400 dark:placeholder-gray-400 text-lg font-semibold shadow focus:outline-none focus:ring-2 ${isDebt ? 'focus:ring-yellow-400 dark:focus:ring-yellow-600' : 'focus:ring-blue-400'} transition`}
                  required={isDebt}
                />
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
                    <th className="px-6 py-4 text-white text-lg font-bold">{t.quantity || 'Qty'}</th>
                    <th className="px-6 py-4 text-white text-lg font-bold">{t.sellingPrice || 'Selling Price'}</th>
                    {/* Removed buying price column */}
                    <th className="px-6 py-4 text-white text-lg font-bold">{t.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-gray-400 py-10 text-xl font-semibold">{t.noItems}</td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr
                        key={item.id ? item.id : idx}
                        className="border-b last:border-b-0 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors group"
                      >
                        <td className="px-6 py-4 text-gray-900 dark:text-gray-100 font-bold">{idx + 1}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-gray-100 font-semibold">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{item.model || '-'}</td>
                        <td className="px-6 py-4 text-purple-700 dark:text-purple-300">{item.ram || '-'}</td>
                        <td className="px-6 py-4 text-green-700 dark:text-green-300">{item.storage || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              max={item.stock || 999}
                              value={item.quantity || 1}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 1;
                                const maxStock = item.stock || 999;
                                if (val > maxStock) {
                                  showToast(t.cannotExceedStock ? `${t.cannotExceedStock} (${maxStock})` : `Cannot exceed available stock (${maxStock})`, 'error');
                                  return;
                                }
                                setItems(items => items.map((it, i) => (i === idx ? { ...it, quantity: val <= maxStock ? val : maxStock } : it)));
                              }}
                              className="border rounded px-3 py-2 w-20 text-lg font-bold dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              title={`${t.availableStock || 'Available stock: '}${item.stock || (t.unknown || 'Unknown')}`}
                            />
                            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                              Stock: {item.stock || '?'}
                            </div>
                            {item.quantity >= (item.stock || 999) && (
                              <div className="text-orange-500 text-sm mt-1 font-semibold">
                                {t.maxStockReached || 'Max stock reached!'}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={item.selling_price || item.price}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                if (val < (item.buying_price || 0)) {
                                  showToast(t.belowBuyingPrice || 'Warning: Selling below buying price!', 'warning');
                                  playWarningSound();
                                }
                                setItems(items => items.map((it, i) => i === idx ? { ...it, selling_price: val, price: val } : it));
                              }}
                              className={`border rounded px-2 py-1 w-24 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                (item.selling_price || item.price) < (item.buying_price || 0) ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''
                              }`}
                            />
                            {(item.selling_price || item.price) < (item.buying_price || 0) && (
                              <div className="text-red-500 text-xs mt-1 font-semibold animate-pulse">
                                {t.belowBuyingPrice || 'Below buying price!'}
                              </div>
                            )}
                          </div>
                        </td>
                        {/* Removed buying price cell */}
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-lg shadow hover:scale-110 hover:from-pink-600 hover:to-red-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-300"
                            title={t.deleteProduct}
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
          {/* Toast */}
          <ToastUnified message={toast?.msg || ''} type={toast?.type || 'success'} onClose={() => setToast(null)} />
          {/* Modals */}
          <ConfirmModal open={confirm.open} message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm({ open: false, message: '', onConfirm: null })} t={t} />
          <ProductSelectModal
            show={showProductSelect}
            options={productOptions}
            t={t}
            onSelect={handleSelectProductVariant}
            onCancel={() => { setShowProductSelect(false); setProductOptions([]); }}
          />
        </>
      )}
    </div>
  );
}
