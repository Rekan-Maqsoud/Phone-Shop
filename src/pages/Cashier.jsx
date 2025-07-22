import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import ProductSelectModal from '../components/ProductSelectModal';
import CashierContent from '../components/CashierContent';
import { BackupProgressOverlay } from '../contexts/BackupProgressContext';
import useCart from '../components/hooks/useCart';
import useAdmin from '../components/useAdmin';
import useOnlineStatus from '../components/hooks/useOnlineStatus';
import useCashierKeyboard from '../components/hooks/useCashierKeyboard';
import { useTheme } from '../contexts/ThemeContext';
import { useLocale } from '../contexts/LocaleContext';
import { useData } from '../contexts/DataContext';
import ToastUnified from '../components/ToastUnified';
import { 
  playSaleCompleteSound, 
  playErrorSound, 
  playModalOpenSound
} from '../utils/sounds';
import { formatCurrency, EXCHANGE_RATES, loadExchangeRatesFromDB } from '../utils/exchangeRates';

export default function Cashier() {
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
  const [currency, setCurrency] = useState('IQD'); // Default to IQD as requested
  const [discount, setDiscount] = useState(null);
  const [multiCurrency, setMultiCurrency] = useState({ enabled: false, usdAmount: 0, iqdAmount: 0 });
  const inputRef = useRef();
  const navigate = useNavigate();
  const { isOnline } = useOnlineStatus();

  const { t, isRTL, notoFont } = useLocale();

  const showToast = (msg, type = 'success', duration = 3000) => {
    setToast({ msg, type, duration });
  };

  const showConfirm = (message, onConfirm) => {
    setConfirm({ open: true, message, onConfirm });
  };
  
  const { items, addOrUpdateItem, deleteItem, total: baseTotal, setItems } = useCart((msg, type) => {
    setToast({ msg, type, duration: 3000 });
  }, showConfirm, t);
  
  // Note: Discount calculation is now handled in CashierContent component
  // This ensures consistency between UI display and sale processing
  const total = baseTotal; // Use base total, discounted total comes from CashierContent
  
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

  // Memoize derived values with minimal validation
  const products = useMemo(() => {
    if (!Array.isArray(allProducts)) return [];
    return allProducts.filter(p => p && !p.archived);
  }, [allProducts]);
  
  const accessories = useMemo(() => {
    if (!Array.isArray(allAccessories)) return [];
    return allAccessories.filter(a => a && !a.archived);
  }, [allAccessories]);
  
  // Add unique identifiers to differentiate products and accessories
  const allItems = useMemo(() => {
    const productItems = products.map((p, index) => {
      // Create a robust unique ID even if p.id is missing
      const safeId = p.id || `temp_product_${index}_${p.name?.replace(/\s+/g, '_').toLowerCase()}`;
      const item = {
        ...p, 
        itemType: 'product', 
        category: p.category || 'phones', 
        uniqueId: `product_${safeId}`,
        // Ensure we have an ID for the product
        id: p.id || safeId
      };
      return item;
    });
    
    const accessoryItems = accessories.map((a, index) => {
      // Create a robust unique ID even if a.id is missing
      const safeId = a.id || `temp_accessory_${index}_${a.name?.replace(/\s+/g, '_').toLowerCase()}`;
      const item = {
        ...a, 
        itemType: 'accessory', 
        category: 'accessories', 
        uniqueId: `accessory_${safeId}`,
        // Ensure we have an ID for the accessory
        id: a.id || safeId
      };
      return item;
    });
    
    const result = [...productItems, ...accessoryItems];
    return result;
  }, [products, accessories]);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load exchange rates from database on mount
  useEffect(() => {
    loadExchangeRatesFromDB().catch(console.error);
  }, []);

  useEffect(() => {
    if (apiReady) {
      refreshProducts();
      refreshAccessories();
    }
  }, [apiReady, refreshProducts, refreshAccessories]);

  
  const handleSearchInput = (e) => {
    setSearch(e.target.value);
    setSelectedSuggestionIndex(-1);
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
    
    // Name search (case-insensitive, partial match)
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

  const handleSelectProductVariant = (product) => {
    addOrUpdateItem(product, false, quantity);
    setShowProductSelect(false);
    setProductOptions([]);
    setSearch('');
    setQuantity(1);
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
  
  // Cloud backup is now handled automatically by the unified backup system
  
  const handleCompleteSale = async (saleDiscount = null, discountedTotal = null, multiCurrency = null) => {
    if (!items.length) return;
    
    const finalTotal = discountedTotal !== null ? discountedTotal : total;
    
    // Check for insufficient payment - simplified with new smart payment system
    // Skip payment validation for debt sales or when discounts are applied
    let insufficientPayment = false;
    let warningDetails = '';
    
    if (!isDebt && !saleDiscount && multiCurrency && multiCurrency.totalPaidUSD) {
      const totalPaidUSD = multiCurrency.totalPaidUSD || 0;
      const requiredAmount = currency === 'USD' ? finalTotal : finalTotal / EXCHANGE_RATES.USD_TO_IQD;
      
      if (totalPaidUSD < requiredAmount) {
        insufficientPayment = true;
        warningDetails = `${t.insufficientPayment || 'Insufficient payment'}.\n` +
                        `${t.required || 'Required'}: ${formatCurrency(requiredAmount, 'USD')}\n` +
                        `${t.provided || 'Provided'}: ${formatCurrency(totalPaidUSD, 'USD')}`;
      }
    }
    
    if (insufficientPayment) {
      const confirmed = await new Promise((resolve) => {
        showConfirm(
          warningDetails + '\n' + t.continueAnyway,
          () => {
            setConfirm({ open: false, message: '', onConfirm: null });
            resolve(true);
          }
        );
        setTimeout(() => {
          setConfirm({ open: false, message: '', onConfirm: null });
          resolve(false);
        }, 30000);
      });
      
      if (!confirmed) {
        return;
      }
    }
    
    // Don't allow negative totals
    if (finalTotal < 0) {
      playErrorSound();
      showToast(t.cannotCompleteNegativeTotal, 'error');
      return;
    }
    
    // Customer name is required for ALL sales
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
        
        // Validate all items before creating sale
        const saleItems = items.map(item => {
          // Get the original product from allItems to get the real database ID
          const originalProduct = allItems.find(p => 
            p.uniqueId === item.uniqueId || 
            p.id === item.id || 
            (p.name === item.name && p.itemType === item.itemType)
          );
          
          const validatedItem = {
            ...item,
            product_id: originalProduct?.id || item.product_id || item.id,
            itemType: item.itemType || 'product',
            buying_price: item.buying_price || originalProduct?.buying_price || 0,
            selling_price: item.selling_price || item.price || 0,
            currency: item.currency || originalProduct?.currency || 'IQD'
          };
          return validatedItem;
        });
        
        const sale = {
          items: saleItems,
          total: finalTotal,
          created_at: new Date().toISOString(),
          is_debt: isDebt ? 1 : 0,
          customer_name: customerName.trim() || null,
          currency: isDebt ? 'USD' : currency, // Force USD for debt sales
          discount: saleDiscount,
          multi_currency: isDebt ? null : (multiCurrency || null) // Disable multi-currency for debt sales
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
              console.error('❌ Debt creation error:', debtError);
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
            setMultiCurrency({ enabled: false, usdAmount: 0, iqdAmount: 0 }); // Reset multi-currency state
            
            // Force refresh products and accessories to update stock levels
            await Promise.all([
              refreshProducts(),
              refreshAccessories(),
              refreshSales()
            ]);
            
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

  // Debounced Suggestions Effect
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
      let matches = safeProducts.filter(p => 
        p.stock > 0 && 
        p.name.toLowerCase().includes(search.toLowerCase())
      );
      
      if (active) {
        setSuggestions(matches.slice(0, 7));
        setShowSuggestions(matches.length > 0);
        setSelectedSuggestionIndex(-1);
      }
    };
    
    debounceId = setTimeout(fetchSuggestions, 150);
    return () => {
      active = false;
      clearTimeout(debounceId);
    };
  }, [search, allItems]);

  // UI
  return (
    <div
      className={`min-h-screen h-screen w-screen flex flex-col md:flex-row bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#c7d2fe] dark:from-[#1e293b] dark:via-[#0f172a] dark:to-[#0e7490] transition-colors duration-300`}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={notoFont}
    >
      <CashierContent
        t={t}
        clock={clock}
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
        allItems={allItems}
        addOrUpdateItem={addOrUpdateItem}
        currency={currency}
        setCurrency={setCurrency}
        setDiscount={setDiscount}
        multiCurrency={multiCurrency}
        setMultiCurrency={setMultiCurrency}
        refreshProducts={refreshProducts}
        refreshAccessories={refreshAccessories}
      />
      
      {/* Toast */}
      <ToastUnified 
        message={toast?.msg || ''} 
        type={toast?.type || 'success'} 
        duration={toast?.duration || 3000}
        onClose={() => setToast(null)} 
      />

      {/* Backup Progress Overlay */}
      <BackupProgressOverlay />
      
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
