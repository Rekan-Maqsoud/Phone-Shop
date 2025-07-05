import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import ProductSelectModal from '../components/ProductSelectModal';
import CashierContent from '../components/CashierContent';
import UnderCostWarning from '../components/UnderCostWarning';
import useCart from '../components/hooks/useCart';
import useAdmin from '../components/useAdmin';
import useProductLookup from '../components/hooks/useProductLookup';
import useOnlineStatus from '../components/hooks/useOnlineStatus';
import useCashierKeyboard from '../components/hooks/useCashierKeyboard';
import { useTheme } from '../contexts/ThemeContext';
import { useLocale } from '../contexts/LocaleContext';
import { useData } from '../contexts/DataContext';
import ToastUnified from '../components/ToastUnified';
import { 
  playWarningSound, 
  playSaleCompleteSound, 
  playActionSound, 
  playSuccessSound, 
  playErrorSound, 
  playModalOpenSound,
  playDeleteSound,
  playFormSubmitSound
} from '../utils/sounds';

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
  const showToast = (msg, type = 'success', duration = 3000) => {
    setToast({ msg, type, duration });
  };
  const showConfirm = (message, onConfirm) => {
    setConfirm({ open: true, message, onConfirm });
  };
  const { items, addOrUpdateItem, deleteItem, clearCart, total, setItems } = useCart((msg, type) => {
    setToast({ msg, type, duration: 3000 });
  }, showConfirm, t);
  const admin = useAdmin(navigate);

  // Get data from DataContext
  const { 
    products: allProducts, 
    accessories: allAccessories, 
    apiReady,
    refreshDebts, 
    refreshDebtSales,
    refreshProducts, 
    refreshAccessories, 
    refreshSales 
  } = useData();

  // Data is automatically fetched by DataContext, no need for manual fetch calls
  
  // Memoize derived values
  const products = useMemo(() => Array.isArray(allProducts) ? allProducts.filter(p => !p.archived) : [], [allProducts]);
  const accessories = useMemo(() => Array.isArray(allAccessories) ? allAccessories.filter(a => !a.archived) : [], [allAccessories]);
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
    refreshAccessories();
  }, [refreshAccessories]);

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
      showToast(t.pleaseEnterProductName, 'error');
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
      showToast(t.productNotFoundOrInvalid, 'error');
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
      showToast(t.offlineWarning, 'warning');
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
        return product ? product.name : t.unknown;
      }).join(', ');
      
      // Play warning sound
      playWarningSound();
      
      const confirmed = await new Promise((resolve) => {
        showConfirm(
          `${t.warningSellingBelowCost}\nItems: ${itemNames}\n${t.continueAnyway}`,
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
      playErrorSound();
      showToast(t.cannotCompleteNegativeTotal, 'error');
      return;
    }
    
    // Customer name is now required for ALL sales (both cash and debt)
    if (!customerName.trim()) {
      playErrorSound();
      showToast(t.pleaseEnterCustomerName, 'error');
      return;
    }
    
    playModalOpenSound();
    showConfirm(
      isDebt
        ? t.confirmDebtSale
        : t.confirmSale,
      async () => {
        setConfirm({ open: false, message: '', onConfirm: null });
        
        // Double-check customer name is provided
        if (!customerName.trim()) {
          playErrorSound();
          showToast(t.customerNameRequired, 'error');
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
                showToast(t.saleRecordCreationFailed + (debtResult.message || t.unknownError), 'error');
              }
              await refreshDebts();
              await refreshDebtSales();
              // debt sales are now refreshed immediately for instant UI update
            } catch (debtError) {
              showToast(t.debtCreationFailed + debtError.message, 'error');
            }
          }
          setLoading(l => ({ ...l, sale: false }));
          if (res.success) {
            playSaleCompleteSound();
            setItems([]);
            setSearch('');
            setIsDebt(false);
            setCustomerName("");
            await refreshProducts();
            await refreshAccessories();
            await refreshSales();
            
            // Auto backup is now handled automatically by the unified backup system
            
            showToast(isDebt ? t.debtSaleSuccess : t.saleSuccess);
          } else {
            playErrorSound();
            showToast(res.message || t.saleFailed, 'error');
          }
        } else {
          setLoading(l => ({ ...l, sale: false }));
          playErrorSound();
          showToast(t.saleApiUnavailable, 'error');
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
    
    debounceId = setTimeout(fetchSuggestions, 150); // Reduced debounce for better responsiveness
    return () => {
      active = false;
      clearTimeout(debounceId);
    };
  }, [search, allItems]); // Changed dependency from products to allItems

  useEffect(() => {
    if (apiReady) {
      refreshProducts();
      refreshAccessories();
    }
  }, [apiReady, refreshProducts, refreshAccessories]);
  

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
      
      {/* Under Cost Warning */}
      <UnderCostWarning 
        items={items}
        allItems={allItems}
        t={t}
      />
      
      {/* Toast */}
      <ToastUnified 
        message={toast?.msg || ''} 
        type={toast?.type || 'success'} 
        duration={toast?.duration || 3000}
        onClose={() => setToast(null)} 
      />
      
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
