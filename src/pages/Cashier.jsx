import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import ProductSelectModal from '../components/ProductSelectModal';
import CashierContent from '../components/CashierContent';
import useCart from '../components/hooks/useCart';
import useAdmin from '../components/useAdmin';
import useProductLookup from '../components/hooks/useProductLookup';
import useOnlineStatus from '../components/hooks/useOnlineStatus';
import useCashierKeyboard from '../components/hooks/useCashierKeyboard';
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
  // Add unique identifiers to differentiate products and accessories
  const allItems = useMemo(() => [
    ...products.map(p => ({ ...p, itemType: 'product', uniqueId: `product_${p.id}` })), 
    ...accessories.map(a => ({ ...a, itemType: 'accessory', uniqueId: `accessory_${a.id}` }))
  ], [products, accessories]);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Ensure we fetch accessories for the cashier
  useEffect(() => {
    fetchAccessories();
  }, [fetchAccessories]);

  const handleSearchInput = (e) => {
    setSearch(e.target.value);
    setSelectedSuggestionIndex(-1); // Reset selection when typing
    // Removed fetchProducts from here to avoid infinite loop/blank screen
  };
  const handleQuantityInput = (e) => {
    const val = Math.max(1, parseInt(e.target.value) || 1);
    setQuantity(val);
  };

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

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    
    if (!search.trim()) {
      showToast(t.pleaseEnterProductName || 'Please enter a product name', 'error');
      return;
    }
    
    setLoading(l => ({ ...l, price: true }));
    
    // Name search (case-insensitive, partial match, for normal sales only show items with stock > 0)
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

  // Use keyboard hook for handling all keyboard interactions
  useCashierKeyboard({
    showProductSelect,
    showSuggestions,
    suggestions,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    handleSuggestionClick,
    items,
    showToast,
    t,
    search,
    setSearch,
    setShowSuggestions,
    handleSearchSubmit
  });

  const handleSelectProductVariant = (product) => {
    addOrUpdateItem(product, false, quantity);
    setShowProductSelect(false);
    setProductOptions([]);
    setSearch('');
    setQuantity(1);
  };

  // Cloud backup is now handled automatically by the unified backup system
  
  const handleCompleteSale = async () => {
    if (!items.length) return;
    
    // Check if offline and warn user
    if (!isOnline) {
      showToast(t.offlineWarning || '⚠️ You are offline! This sale will not be backed up to cloud until connection is restored.', 'warning');
    }
    
    // Check for low price warning (selling below buying price)
    const belowCostItems = items.filter(item => {
      const product = allItems.find(p => p.uniqueId === item.uniqueId || p.id === item.product_id);
      if (!product) return false;
      const buyingPrice = product.buying_price || product.price;
      return item.selling_price < buyingPrice;
    });
    
    if (belowCostItems.length > 0) {
      const itemNames = belowCostItems.map(item => {
        const product = allItems.find(p => p.uniqueId === item.uniqueId || p.id === item.product_id);
        return product ? product.name : (t.unknown || 'Unknown');
      }).join(', ');
      
      // Play warning sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmgiBhSBzvTBaCYJLYHM8d2NOwgYYK3u6qJUEAhOqOPwtWMcBjiS2vLNeSsFJH/K8dmJOAgZYLLr6axXFAhOp+PoumMcBzuV2vHKeisGI3/L8d6NOwgZYrnp55tOEAhOp+Hju2EeBTmS2PDAaSMGLYHO8diKNwcbZK7s6KdXFAlBn9vou2MdBDqU2vHOeysGJXzJ8NqMOAcZYrPk66JUFB+MzO/YhikGKJ7A9dl+JQkWe8Hx3I5AEAhOqOHwtWMcBjiS2vLNeSwFJX/K8N6NOwgZYbrp55xOEAhOp+Hju2MeBTuV2vHKeisGI3/L8d6NOwgZYbvn6JtOEAlGqOPwtWMcBzmS2vLNeSsFJYDK8N6NOwcZYrTp6KNTEg5BqOPvuGQdBDuS2vHOeSsFJYDL8N2OOgcZY7Lr56BMEAJJ');
      audio.play().catch(() => {}); // Ignore if audio fails
      
      const confirmed = await new Promise((resolve) => {
        showConfirm(
          `${t.warningSellingBelowCost || '⚠️ WARNING: Selling below buying price!'}\nItems: ${itemNames}\n${t.continueAnyway || 'This will result in a loss. Continue anyway?'}`,
          () => {
            setConfirm({ open: false, message: '', onConfirm: null });
            resolve(true);
          }
        );
        // Add a timeout to auto-resolve as false if no action after 30 seconds
        setTimeout(() => {
          setConfirm({ open: false, message: '', onConfirm: null });
          resolve(false);
        }, 30000);
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
            
            // Auto backup is now handled automatically by the unified backup system
            
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
    
    const fetchSuggestions = async () => {
      if (!search.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      
      const safeProducts = Array.isArray(allItems) ? allItems : [];
      // Show all items with stock > 0, case-insensitive partial name match
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
  }, [search, allItems]); // Changed dependency from products to allItems

  useEffect(() => {
    console.debug('[Cashier] Fetching products on mount');
    fetchProducts();
  }, [fetchProducts]);
  

  // --- Redesigned UI ---
  return (
    <div
      className={`min-h-screen h-screen w-screen flex flex-col md:flex-row bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#c7d2fe] dark:from-[#1e293b] dark:via-[#0f172a] dark:to-[#0e7490] transition-colors duration-300`}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={notoFont}
    >
      <CashierContent
        t={t}
        theme={theme}
        admin={admin}
        products={products}
        clock={clock}
        total={total}
        items={items}
        loading={loading}
        isDebt={isDebt}
        handleCompleteSale={handleCompleteSale}
        search={search}
        quantity={quantity}
        suggestions={suggestions}
        showSuggestions={showSuggestions}
        selectedSuggestionIndex={selectedSuggestionIndex}
        customerName={customerName}
        handleSearchInput={handleSearchInput}
        handleQuantityInput={handleQuantityInput}
        handleSearchSubmit={handleSearchSubmit}
        handleSuggestionClick={handleSuggestionClick}
        setShowSuggestions={setShowSuggestions}
        setIsDebt={setIsDebt}
        setCustomerName={setCustomerName}
        setItems={setItems}
        deleteItem={deleteItem}
        showToast={showToast}
        isRTL={isRTL}
        notoFont={notoFont}
        allItems={allItems}
        addOrUpdateItem={addOrUpdateItem}
      />
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
    </div>
  );
}
