import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  EXCHANGE_RATES, 
  formatCurrency, 
  roundIQDToNearestBill, 
  saveExchangeRate, 
  loadExchangeRatesFromDB
} from '../utils/exchangeRates';
import OfflineIndicator from './OfflineIndicator';
import UnderCostWarning from './UnderCostWarning';
import { KeyboardShortcutHint } from './KeyboardShortcutsModal';
import { Icon } from '../utils/icons.jsx';
import { useSound } from '../contexts/SoundContext';

export default function CashierContent({
  t,
  clock,
  items,
  loading,
  isDebt,
  handleCompleteSale,
  search,
  quantity,
  suggestions,
  showSuggestions,
  selectedSuggestionIndex,
  customerName,
  handleSearchInput,
  handleQuantityInput,
  handleSearchSubmit,
  handleSuggestionClick,
  setIsDebt,
  setCustomerName,
  setItems,
  deleteItem,
  showToast,
  allItems,
  addOrUpdateItem,
  currency,
  setCurrency,
  multiCurrency,
  setMultiCurrency,
  refreshProducts,
  refreshAccessories,
  debts,
  debtSales
}) {
  const [showExchangeRateModal, setShowExchangeRateModal] = useState(false);
  const [newExchangeRate, setNewExchangeRate] = useState(EXCHANGE_RATES.USD_TO_IQD.toString());
  const [isLoadingRate, setIsLoadingRate] = useState(true);
  const [filters, setFilters] = useState({
    brand: '',
    category: '',
    priceMin: '',
    priceMax: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [underCostWarningVisible, setUnderCostWarningVisible] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(-1);
  const inputRef = useRef();
  const customerInputRef = useRef();
  const { soundSettings } = useSound();

  // Function to play sounds based on settings
  const playSound = (type) => {
    if (soundSettings.enabled && soundSettings.enabledTypes[type]) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure sound based on type
      switch (type) {
        case 'action':
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          oscillator.type = 'sine';
          break;
        case 'system':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          oscillator.type = 'sine';
          break;
        default:
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          oscillator.type = 'sine';
      }
      
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  };

  const IQD_ROUNDING_MESSAGE = t.roundedToNearest250 || 'Amounts rounded to nearest 250 IQD';
  const IQD_BILL_ROUNDING_MESSAGE = t.roundedToNearestBill || 'Rounded to nearest 250 IQD bill';

  // Simplified rounding - only for sale totals
  const getRoundedTotal = (amount, currencyType) => {
    return currencyType === 'IQD' ? roundIQDToNearestBill(amount) : Math.ceil(amount * 100) / 100;
  };

  // Calculate totals based on selected currency with per-item discounts
  const convertedTotal = useMemo(() => {
    const effectiveCurrency = currency;
    
    if (effectiveCurrency === 'IQD') {
      return items.reduce((sum, item) => {
        const baseItemTotal = item.selling_price * item.quantity;
        const discountAmount = baseItemTotal * ((item.discount_percent || 0) / 100);
        const discountedItemTotal = baseItemTotal - discountAmount;
        
        if (item.currency === 'USD' || !item.currency) {
          return sum + (discountedItemTotal * EXCHANGE_RATES.USD_TO_IQD);
        }
        return sum + discountedItemTotal;
      }, 0);
    } else {
      return items.reduce((sum, item) => {
        const baseItemTotal = item.selling_price * item.quantity;
        const discountAmount = baseItemTotal * ((item.discount_percent || 0) / 100);
        const discountedItemTotal = baseItemTotal - discountAmount;
        
        if (item.currency === 'IQD') {
          return sum + (discountedItemTotal * EXCHANGE_RATES.IQD_TO_USD);
        }
        return sum + discountedItemTotal;
      }, 0);
    }
  }, [items, currency]);

  // Use converted total directly (no discount system)
  const discountedTotal = useMemo(() => {
    return currency === 'IQD' ? getRoundedTotal(convertedTotal, currency) : convertedTotal;
  }, [convertedTotal, currency]);

  // Payment amount tracking removed - no longer needed

  // Get unique brands and categories for filtering
  const uniqueBrands = useMemo(() => {
    const brands = [...new Set(allItems.map(item => item.brand).filter(Boolean))];
    return brands.sort();
  }, [allItems]);

  const uniqueCategories = useMemo(() => {
    const categories = [...new Set(allItems.map(item => item.category).filter(Boolean))];
    return categories.sort();
  }, [allItems]);

  // Get unique customer names from debts and debt sales for autocomplete
  const customerNames = useMemo(() => {
    if (!isDebt) return []; // Only show suggestions for debt sales
    
    const names = new Set();
    
    // Get customer names from existing debts
    if (Array.isArray(debts)) {
      debts.forEach(debt => {
        if (debt.customer_name && debt.customer_name.trim()) {
          names.add(debt.customer_name.trim());
        }
      });
    }
    
    // Get customer names from debt sales
    if (Array.isArray(debtSales)) {
      debtSales.forEach(sale => {
        if (sale.customer_name && sale.customer_name.trim()) {
          names.add(sale.customer_name.trim());
        }
      });
    }
    
    return Array.from(names).sort();
  }, [debts, debtSales, isDebt]);

  // Filter products based on search and selected filters
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (item.stock <= 0) return false;
      
      // Search filter - search in name, brand, model, type, ram, storage
      if (search.trim()) {
        const searchTerm = search.toLowerCase().trim();
        const searchableFields = [
          item.name,
          item.brand, 
          item.model,
          item.type,
          item.ram,
          item.storage,
          item.category
        ].filter(Boolean).map(field => String(field).toLowerCase());
        
        const matchesSearch = searchableFields.some(field => 
          field.includes(searchTerm)
        );
        
        if (!matchesSearch) return false;
      }
      
      // Brand filter
      if (filters.brand && item.brand !== filters.brand) return false;
      
      // Category filter
      if (filters.category && item.category !== filters.category) return false;
      
      // Price range filter
      const itemPrice = currency === 'IQD' && (item.currency === 'USD' || !item.currency)
        ? (item.buying_price || item.price || 0) * EXCHANGE_RATES.USD_TO_IQD
        : currency === 'USD' && item.currency === 'IQD'
        ? (item.buying_price || item.price || 0) * EXCHANGE_RATES.IQD_TO_USD
        : (item.buying_price || item.price || 0);
      
      if (filters.priceMin && itemPrice < Number(filters.priceMin)) return false;
      if (filters.priceMax && itemPrice > Number(filters.priceMax)) return false;
      
      return true;
    });
  }, [allItems, filters, currency, search]);

  // Customer name autocomplete handlers
  const handleCustomerNameInput = (e) => {
    const value = e.target.value;
    setCustomerName(value);
    
    if (!isDebt || !value.trim()) {
      setShowCustomerSuggestions(false);
      setCustomerSuggestions([]);
      setSelectedCustomerIndex(-1);
      return;
    }
    
    // Filter customer names based on input
    const filteredCustomers = customerNames.filter(name =>
      name.toLowerCase().includes(value.toLowerCase())
    );
    
    setCustomerSuggestions(filteredCustomers);
    setShowCustomerSuggestions(filteredCustomers.length > 0 && value.trim() !== '');
    setSelectedCustomerIndex(-1);
  };

  const handleCustomerSuggestionClick = (customerName) => {
    setCustomerName(customerName);
    setShowCustomerSuggestions(false);
    setCustomerSuggestions([]);
    setSelectedCustomerIndex(-1);
    playSound('action');
  };

  const handleCustomerKeyDown = (e) => {
    if (!showCustomerSuggestions || customerSuggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedCustomerIndex(prev => 
          prev < customerSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedCustomerIndex(prev => 
          prev > 0 ? prev - 1 : customerSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedCustomerIndex >= 0) {
          handleCustomerSuggestionClick(customerSuggestions[selectedCustomerIndex]);
        }
        break;
      case 'Escape':
        setShowCustomerSuggestions(false);
        setSelectedCustomerIndex(-1);
        break;
    }
  };

  // Calculate optimal change distribution
  const calculateChange = (totalPaidUSD, totalRequiredUSD) => {
    const changeUSD = totalPaidUSD - totalRequiredUSD;
    if (changeUSD <= 0) return { changeUSD: 0, changeIQD: 0, changeInUSD: 0, changeInIQD: 0 };
    
    // Check if change is less than $1 USD (ignore small change as per user requirement)
    if (changeUSD < 1) {
      return { changeUSD: 0, changeIQD: 0, changeInUSD: 0, changeInIQD: 0 };
    }
    
    // Convert to IQD and check if less than 250 IQD (ignore small change as per user requirement)
    const changeIQD = changeUSD * EXCHANGE_RATES.USD_TO_IQD;
    if (changeIQD < 250) {
      return { changeUSD: 0, changeIQD: 0, changeInUSD: 0, changeInIQD: 0 };
    }
    
    // Default to giving change in IQD (as per user preference)
    const roundedChangeIQD = roundIQDToNearestBill(changeIQD);
    
    // Only use USD if the IQD rounding loses more than 10% of the value
    const iqdDifference = Math.abs(changeIQD - roundedChangeIQD);
    const shouldUseUSD = iqdDifference > (changeUSD * 0.1);
    
    return {
      changeUSD,
      changeIQD,
      changeInUSD: shouldUseUSD ? changeUSD : 0,
      changeInIQD: shouldUseUSD ? 0 : roundedChangeIQD
    };
  };

  // Smart payment processing that handles change automatically
  const processPayment = () => {
    if (underCostWarningVisible) {
      showToast(t.pleaseAcknowledgeWarning || 'Please acknowledge the warning first', 'warning');
      return;
    }

    // For debt sales, use USD as default currency and disable multi-currency
    if (isDebt) {
      const finalPayment = {
        change: null,
        netBalanceUSD: 0, // No balance updates for debt sales
        netBalanceIQD: 0, // No balance updates for debt sales
        changeGivenUSD: 0,
        changeGivenIQD: 0
      };
      
      handleCompleteSale(
        null, // No discount system
        discountedTotal,
        finalPayment
      );
      return;
    }

    const totalRequiredUSD = currency === 'USD' ? discountedTotal : discountedTotal / EXCHANGE_RATES.USD_TO_IQD;
    
    let finalPayment = {};
    let changeInfo = null;

    if (multiCurrency.enabled) {
      const totalPaidUSD = multiCurrency.usdAmount + (multiCurrency.iqdAmount / EXCHANGE_RATES.USD_TO_IQD);
      
      // Calculate change if overpaid
      if (totalPaidUSD > totalRequiredUSD) {
        const change = calculateChange(totalPaidUSD, totalRequiredUSD);
        changeInfo = change;
        
        // Show change information to user
        if (change.changeInUSD > 0) {
          showToast(`${t.change || 'Change'}: ${formatCurrency(change.changeInUSD, 'USD')}`, 'info', 5000);
        } else if (change.changeInIQD > 0) {
          showToast(`${t.change || 'Change'}: ${formatCurrency(change.changeInIQD, 'IQD')}`, 'info', 5000);
        }

        // Calculate amounts for shop balance updates
        // We should add exactly what the customer gave us, then subtract what we gave back as change
        const receivedUSD = multiCurrency.usdAmount;  // What customer actually gave us
        const receivedIQD = multiCurrency.iqdAmount;  // What customer actually gave us

        // Account for change given back from shop balances
        let changeFromUSD = 0;
        let changeFromIQD = 0;
        
        if (change.changeInUSD > 0) {
          changeFromUSD = change.changeInUSD;
        } else if (change.changeInIQD > 0) {
          changeFromIQD = change.changeInIQD;
        }

        finalPayment = {
          usdAmount: multiCurrency.usdAmount,
          iqdAmount: multiCurrency.iqdAmount,
          totalPaidUSD: totalPaidUSD,
          change: changeInfo,
          // What we actually received from customer (to be added to balances)
          netBalanceUSD: receivedUSD,
          netBalanceIQD: receivedIQD,
          // Track what change was given from which currency (to be subtracted from balances)
          changeGivenUSD: changeFromUSD,
          changeGivenIQD: changeFromIQD
        };
      } else {
        // No overpayment, use actual amounts paid
        finalPayment = {
          usdAmount: multiCurrency.usdAmount,
          iqdAmount: multiCurrency.iqdAmount,
          totalPaidUSD: totalPaidUSD,
          change: null,
          netBalanceUSD: multiCurrency.usdAmount,
          netBalanceIQD: multiCurrency.iqdAmount,
          changeGivenUSD: 0,
          changeGivenIQD: 0
        };
      }
    } else {
      // Single currency payment - no overpayment tracking, assume exact amount
      finalPayment = {
        change: null,
        netBalanceUSD: currency === 'USD' ? discountedTotal : 0,
        netBalanceIQD: currency === 'IQD' ? discountedTotal : 0,
        changeGivenUSD: 0,
        changeGivenIQD: 0
      };
    }
    
    handleCompleteSale(
      null, // No discount system
      discountedTotal,
      finalPayment
    );
  };

  const convertUSDToIQD = () => {
    if (multiCurrency.usdAmount > 0) {
      const convertedIQD = multiCurrency.usdAmount * EXCHANGE_RATES.USD_TO_IQD;
      const roundedIQD = getRoundedTotal(convertedIQD, 'IQD');
      setMultiCurrency(prev => ({
        ...prev,
        iqdAmount: prev.iqdAmount + roundedIQD,
        usdAmount: 0
      }));
    }
  };

  const convertIQDToUSD = () => {
    if (multiCurrency.iqdAmount > 0) {
      const convertedUSD = multiCurrency.iqdAmount / EXCHANGE_RATES.USD_TO_IQD;
      setMultiCurrency(prev => ({
        ...prev,
        usdAmount: prev.usdAmount + convertedUSD,
        iqdAmount: 0
      }));
    }
  };

  // Load exchange rate on mount
  useEffect(() => {
    setIsLoadingRate(true);
    loadExchangeRatesFromDB()
      .then(() => {
        setNewExchangeRate(EXCHANGE_RATES.USD_TO_IQD.toString());
        setIsLoadingRate(false);
      })
      .catch(() => {
        setIsLoadingRate(false);
        showToast(t.failedToLoadExchangeRate || 'Failed to load exchange rates', 'error');
      });
  }, [showToast, t.failedToLoadExchangeRate]);

  const handleExchangeRateClick = () => {
    if (isLoadingRate) {
      showToast(t.loadingExchangeRate || 'Loading exchange rate...', 'info');
      return;
    }
    setNewExchangeRate(EXCHANGE_RATES.USD_TO_IQD.toString());
    setShowExchangeRateModal(true);
    playSound('action');
  };

  const handleExchangeRateClose = () => {
    setShowExchangeRateModal(false);
    setNewExchangeRate(EXCHANGE_RATES.USD_TO_IQD.toString());
    playSound('action');
  };

  const handleExchangeRateUpdate = async () => {
    if (isLoadingRate) {
      showToast(t.loadingExchangeRate || 'Loading exchange rate...', 'info');
      return;
    }

    if (newExchangeRate && !isNaN(newExchangeRate) && Number(newExchangeRate) > 0) {
      const newRateNum = Number(newExchangeRate);
      
      try {
        const success = await saveExchangeRate(newRateNum);
        
        if (success) {
          playSound('action');
          showToast(`Exchange rate updated: 1 USD = ${newRateNum} IQD`, 'success');
          setShowExchangeRateModal(false);
          setNewExchangeRate(newRateNum.toString());
          // Force re-render of multi-currency state
          setMultiCurrency(prev => ({ ...prev }));
        } else {
          playSound('system');
          showToast(t.failedToSaveRate || 'Failed to save exchange rate', 'error');
        }
      } catch (error) {
        console.error('Failed to save exchange rate:', error);
        playSound('system');
        showToast(t.failedToSaveRate || 'Failed to save exchange rate', 'error');
      }
    } else {
      playSound('system');
      showToast(t.invalidExchangeRate || 'Please enter a valid exchange rate', 'error');
    }
  };

  // Auto-enable multi-currency when both amounts are entered
  useEffect(() => {
    if (multiCurrency.usdAmount > 0 && multiCurrency.iqdAmount > 0 && !multiCurrency.enabled) {
      setMultiCurrency(prev => ({ ...prev, enabled: true }));
    }
  }, [multiCurrency.usdAmount, multiCurrency.iqdAmount, multiCurrency.enabled]);

  // Add global keyboard event listener for Enter key to complete sale
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only trigger if no modal is open and Enter is pressed
      if (event.key === 'Enter' && !showExchangeRateModal && items.length > 0 && !loading.sale) {
        // Don't trigger if user is typing in an input field
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT')) {
          return;
        }
        event.preventDefault();
        processPayment();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showExchangeRateModal, items.length, loading.sale, processPayment]);

  // Click outside to close customer suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside the customer input container
      const customerContainer = customerInputRef.current?.parentElement;
      if (customerContainer && !customerContainer.contains(event.target)) {
        setShowCustomerSuggestions(false);
        setSelectedCustomerIndex(-1);
      }
    };

    if (showCustomerSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCustomerSuggestions]);

  const clearFilters = () => {
    setFilters({
      brand: '',
      category: '',
      priceMin: '',
      priceMax: ''
    });
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 h-screen overflow-hidden">
      {/* Column 1: Cart & Customer Info */}
      <div className="flex flex-col gap-4 h-full min-h-0 overflow-y-auto">
        {/* Header with Clock and Admin Button */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <div className="text-2xl font-bold text-slate-800 dark:text-white">
                {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {clock.toLocaleDateString()}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.hash = '#/admin'}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
                title="Go to Admin (Ctrl+Shift+C)"
              >
                <Icon name="settings" size={16} />
                {t.admin || 'Admin'}
              </button>
            </div>
          </div>
          
          {/* Keyboard shortcuts hint */}
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
            <KeyboardShortcutHint 
              shortcuts={[
                { key: 'F2', description: t?.completeSale || 'Complete Sale' },
                { key: 'F1', description: t?.showAllShortcuts || 'All Shortcuts' },
                { key: 'F4', description: t?.toggleDebt || 'Toggle Debt' }
              ]}
              className="justify-center"
            />
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
            {t.customerInfo}
          </h3>
          <div className="relative">
            <input
              ref={customerInputRef}
              type="text"
              value={customerName}
              onChange={handleCustomerNameInput}
              onKeyDown={handleCustomerKeyDown}
              placeholder={isDebt ? (t.customerNameOrSearch || 'Customer name (start typing for suggestions)') : t.customerName}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isDebt 
                  ? 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20 text-slate-800 dark:text-white'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white'
              }`}
            />
            {isDebt && customerSuggestions.length > 0 && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {customerSuggestions.length} existing customer{customerSuggestions.length !== 1 ? 's' : ''} found
              </div>
            )}
            {showCustomerSuggestions && customerSuggestions.length > 0 && (
              <div 
                className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border-2 border-blue-300 dark:border-blue-600 rounded-lg mt-1 shadow-xl z-[9999] max-h-40 overflow-y-auto"
                style={{ zIndex: 9999 }}
              >
                {customerSuggestions.map((name, index) => (
                  <div
                    key={name}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCustomerSuggestionClick(name);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCustomerSuggestionClick(name);
                    }}
                    className={`p-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-slate-100 dark:border-slate-700 last:border-b-0 transition-colors ${
                      index === selectedCustomerIndex ? 'bg-blue-100 dark:bg-blue-900' : ''
                    }`}
                    style={{ userSelect: 'none' }}
                  >
                    <div className="font-medium text-slate-800 dark:text-white">
                      {name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Existing customer
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setIsDebt(false)}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                !isDebt
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {t.cashSale}
            </button>
            <button
              onClick={() => setIsDebt(true)}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                isDebt
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {t.debtSale}
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg flex-1 min-h-0 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              {t.cart} ({items.length})
            </h3>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                {t.emptyCart}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => {
                  const product = allItems.find(p => p.uniqueId === item.uniqueId || p.id === item.product_id);
                  return (
                    <div
                      key={`${item.uniqueId || item.product_id}_${index}`}
                      className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 flex justify-between items-center"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-lg text-slate-800 dark:text-white mb-1">
                          {item.name || product?.name || t.unknown}
                        </div>
                        {/* Specifications display - different for products vs accessories */}
                        <div className="flex items-center gap-2 mb-2 text-sm">
                          {/* Show RAM/Storage only for products (phones) */}
                          {(item.itemType === 'product' || item.category === 'phones' || (!item.itemType && !item.category)) && (
                            <>
                              {(item.ram || product?.ram) && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs font-medium">
                                  RAM: {item.ram || product?.ram}
                                </span>
                              )}
                              {(item.storage || product?.storage) && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs font-medium">
                                  Storage: {item.storage || product?.storage}
                                </span>
                              )}
                              {(item.model || product?.model) && (
                                <span className="text-xs text-slate-600 dark:text-slate-400">
                                  Model: {item.model || product?.model}
                                </span>
                              )}
                            </>
                          )}
                          {/* Show type/brand for accessories */}
                          {(item.itemType === 'accessory' || item.category === 'accessories') && (
                            <>
                              {(item.type || product?.type) && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full text-xs font-medium">
                                  {item.type || product?.type}
                                </span>
                              )}
                              {(item.brand || product?.brand) && (
                                <span className="text-xs text-slate-600 dark:text-slate-400">
                                  Brand: {item.brand || product?.brand}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Qty:</label>
                            <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-600 overflow-hidden">
                              <button
                                onClick={() => {
                                  const newQuantity = Math.max(1, item.quantity - 1);
                                  const updatedItems = items.map((cartItem, i) => 
                                    i === index ? { ...cartItem, quantity: newQuantity } : cartItem
                                  );
                                  setItems(updatedItems);
                                  playSound('action');
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors"
                                disabled={item.quantity <= 1}
                              >
                                -
                              </button>
                              <input
                                type="text"
                                value={item.quantity}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9]/g, '');
                                  if (value === '') return;
                                  const newQuantity = parseInt(value);
                                  if (isNaN(newQuantity)) return;
                                  const maxQuantity = product?.stock || 999;
                                  const finalQuantity = Math.min(Math.max(1, newQuantity), maxQuantity);
                                  const updatedItems = items.map((cartItem, i) => 
                                    i === index ? { ...cartItem, quantity: finalQuantity } : cartItem
                                  );
                                  setItems(updatedItems);
                                  if (newQuantity > maxQuantity) {
                                    showToast(`Maximum available stock: ${maxQuantity}`, 'warning');
                                  }
                                }}
                                className="w-12 px-1 py-1 text-center font-medium text-slate-800 dark:text-white bg-transparent border-none outline-none"
                              />
                              <button
                                onClick={() => {
                                  const maxQuantity = product?.stock || 999;
                                  const newQuantity = Math.min(item.quantity + 1, maxQuantity);
                                  if (newQuantity > item.quantity) {
                                    const updatedItems = items.map((cartItem, i) => 
                                      i === index ? { ...cartItem, quantity: newQuantity } : cartItem
                                    );
                                    setItems(updatedItems);
                                    playSound('action');
                                  } else {
                                    showToast(`Maximum available stock: ${maxQuantity}`, 'warning');
                                  }
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Price:</label>
                              <input
                                type="text"
                                value={(() => {
                                  // Show price in payment currency
                                  const itemCurrency = item.currency || product?.currency || 'USD';
                                  let displayPrice = item.selling_price;
                                  
                                  if (currency === 'IQD' && itemCurrency === 'USD') {
                                    displayPrice = item.selling_price * EXCHANGE_RATES.USD_TO_IQD;
                                  } else if (currency === 'USD' && itemCurrency === 'IQD') {
                                    displayPrice = item.selling_price * EXCHANGE_RATES.IQD_TO_USD;
                                  }
                                  
                                  // Format to appropriate precision
                                  return currency === 'IQD' ? Math.round(displayPrice).toString() : Number(displayPrice.toFixed(2)).toString();
                                })()}
                                onChange={(e) => {
                                  const inputValue = e.target.value;
                                  // Allow numbers, decimal point for USD
                                  const allowedPattern = currency === 'USD' ? /^[0-9]*\.?[0-9]*$/ : /^[0-9]*$/;
                                  
                                  if (!allowedPattern.test(inputValue) && inputValue !== '') return;
                                  
                                  const inputPrice = parseFloat(inputValue) || 0;
                                  const itemCurrency = item.currency || product?.currency || 'USD';
                                  let storedPrice = inputPrice;
                                  
                                  // Convert input price back to item's native currency
                                  if (currency === 'IQD' && itemCurrency === 'USD') {
                                    storedPrice = inputPrice * EXCHANGE_RATES.IQD_TO_USD;
                                  } else if (currency === 'USD' && itemCurrency === 'IQD') {
                                    storedPrice = inputPrice * EXCHANGE_RATES.USD_TO_IQD;
                                  }
                                  
                                  // Round to appropriate precision for storage
                                  if (itemCurrency === 'IQD') {
                                    // For accessories, allow more precise pricing - round to nearest IQD
                                    // For products, round to nearest 1000 to eliminate smaller denominations
                                    if (item.itemType === 'accessory' || item.category === 'accessories') {
                                      storedPrice = Math.round(storedPrice);
                                    } else {
                                      storedPrice = Math.round(storedPrice / 1000) * 1000;
                                    }
                                  } else {
                                    storedPrice = Math.round(storedPrice * 100) / 100;
                                  }
                                  
                                  const updatedItems = items.map((cartItem, i) => 
                                    i === index ? { ...cartItem, selling_price: storedPrice } : cartItem
                                  );
                                  setItems(updatedItems);
                                }}
                                className="w-24 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-600 text-center font-bold text-lg text-slate-800 dark:text-white"
                              />
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                {currency}
                              </span>
                            </div>
                            
                            {/* Quick Price Adjustment Buttons - under price */}
                            <div className="mt-1">
                              {(() => {
                                const itemCurrency = item.currency || product?.currency || 'USD';
                                const displayCurrency = currency; // Currency being displayed
                                
                                const adjustPrice = (amount) => {
                                  const currentDisplayPrice = (() => {
                                    let displayPrice = item.selling_price;
                                    if (currency === 'IQD' && itemCurrency === 'USD') {
                                      displayPrice = item.selling_price * EXCHANGE_RATES.USD_TO_IQD;
                                    } else if (currency === 'USD' && itemCurrency === 'IQD') {
                                      displayPrice = item.selling_price * EXCHANGE_RATES.IQD_TO_USD;
                                    }
                                    return currency === 'IQD' ? Math.round(displayPrice) : Number(displayPrice.toFixed(2));
                                  })();
                                  
                                  const newDisplayPrice = Math.max(0, currentDisplayPrice + amount);
                                  let storedPrice = newDisplayPrice;
                                  
                                  // Convert back to item's native currency
                                  if (currency === 'IQD' && itemCurrency === 'USD') {
                                    storedPrice = newDisplayPrice * EXCHANGE_RATES.IQD_TO_USD;
                                  } else if (currency === 'USD' && itemCurrency === 'IQD') {
                                    storedPrice = newDisplayPrice * EXCHANGE_RATES.USD_TO_IQD;
                                  }
                                  
                                  // Round to appropriate precision for storage
                                  if (itemCurrency === 'IQD') {
                                    // For accessories, allow more precise pricing - round to nearest IQD
                                    // For products, round to nearest 1000 to eliminate smaller denominations
                                    if (item.itemType === 'accessory' || item.category === 'accessories') {
                                      storedPrice = Math.round(storedPrice);
                                    } else {
                                      storedPrice = Math.round(storedPrice / 1000) * 1000;
                                    }
                                  } else {
                                    storedPrice = Math.round(storedPrice * 100) / 100;
                                  }
                                  
                                  const updatedItems = items.map((cartItem, i) => 
                                    i === index ? { ...cartItem, selling_price: storedPrice } : cartItem
                                  );
                                  setItems(updatedItems);
                                  playSound('action');
                                };
                                
                                if (displayCurrency === 'IQD') {
                                  // Quick IQD amounts - in two rows
                                  const decreaseAmounts = [1000, 5000, 10000];
                                  const increaseAmounts = [1000, 5000, 10000];
                                  return (
                                    <div className="flex flex-col gap-1">
                                      {/* Decrease row */}
                                      <div className="flex gap-1">
                                        {decreaseAmounts.map(amount => (
                                          <button
                                            key={`minus-${amount}`}
                                            onClick={() => adjustPrice(-amount)}
                                            className="px-1.5 py-0.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                                            title={`Decrease by ${amount.toLocaleString()}`}
                                          >
                                            -{amount/1000}k
                                          </button>
                                        ))}
                                      </div>
                                      {/* Increase row */}
                                      <div className="flex gap-1">
                                        {increaseAmounts.map(amount => (
                                          <button
                                            key={`plus-${amount}`}
                                            onClick={() => adjustPrice(amount)}
                                            className="px-1.5 py-0.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                                            title={`Increase by ${amount.toLocaleString()}`}
                                          >
                                            +{amount/1000}k
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                } else {
                                  // Quick USD amounts - in two rows
                                  const decreaseAmounts = [1, 5, 10];
                                  const increaseAmounts = [1, 5, 10];
                                  return (
                                    <div className="flex flex-col gap-1">
                                      {/* Decrease row */}
                                      <div className="flex gap-1">
                                        {decreaseAmounts.map(amount => (
                                          <button
                                            key={`minus-${amount}`}
                                            onClick={() => adjustPrice(-amount)}
                                            className="px-1.5 py-0.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                                            title={`Decrease by $${amount}`}
                                          >
                                            -${amount}
                                          </button>
                                        ))}
                                      </div>
                                      {/* Increase row */}
                                      <div className="flex gap-1">
                                        {increaseAmounts.map(amount => (
                                          <button
                                            key={`plus-${amount}`}
                                            onClick={() => adjustPrice(amount)}
                                            className="px-1.5 py-0.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors"
                                            title={`Increase by $${amount}`}
                                          >
                                            +${amount}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <label className="font-medium text-slate-600 dark:text-slate-400">Discount:</label>
                            <input
                              type="number"
                              value={item.discount_percent || 0}
                              min="0"
                              max="100"
                              placeholder="0"
                              onChange={(e) => {
                                const discountPercent = Math.min(Math.max(0, Number(e.target.value) || 0), 100);
                                const updatedItems = items.map((cartItem, i) => 
                                  i === index ? { ...cartItem, discount_percent: discountPercent } : cartItem
                                );
                                setItems(updatedItems);
                              }}
                              className="w-16 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-600 text-center text-slate-800 dark:text-white"
                            />
                            <span className="text-slate-600 dark:text-slate-400">%</span>
                          </div>
                          {item.discount_percent > 0 && (
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {t.save || 'Save'}: {(() => {
                                const discountAmount = (item.selling_price * item.quantity * (item.discount_percent / 100));
                                const itemCurrency = item.currency || product?.currency || 'USD';
                                
                                // Convert discount amount to chosen currency
                                let convertedDiscount = discountAmount;
                                if (currency === 'IQD' && itemCurrency === 'USD') {
                                  convertedDiscount = discountAmount * EXCHANGE_RATES.USD_TO_IQD;
                                } else if (currency === 'USD' && itemCurrency === 'IQD') {
                                  convertedDiscount = discountAmount * EXCHANGE_RATES.IQD_TO_USD;
                                }
                                
                                return formatCurrency(convertedDiscount, currency);
                              })()}
                            </span>
                          )}
                        </div>
                        {product?.category === 'accessories' && product?.type && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {t.type || 'Type'}: {product.type}
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
                          {(() => {
                            const basePrice = item.selling_price * item.quantity;
                            const discountAmount = basePrice * ((item.discount_percent || 0) / 100);
                            const finalPrice = basePrice - discountAmount;
                            
                            // Convert price to chosen currency
                            let convertedPrice = finalPrice;
                            const itemCurrency = item.currency || product?.currency || 'USD';
                            
                            if (currency === 'IQD' && itemCurrency === 'USD') {
                              convertedPrice = finalPrice * EXCHANGE_RATES.USD_TO_IQD;
                            } else if (currency === 'USD' && itemCurrency === 'IQD') {
                              convertedPrice = finalPrice * EXCHANGE_RATES.IQD_TO_USD;
                            }
                              
                            return formatCurrency(convertedPrice, currency);
                          })()}
                        </div>
                        {item.discount_percent > 0 && (
                          <div className="text-sm text-slate-500 dark:text-slate-400 line-through">
                            {(() => {
                              const originalPrice = item.selling_price * item.quantity;
                              const itemCurrency = item.currency || product?.currency || 'USD';
                              
                              // Convert original price to chosen currency
                              let convertedOriginalPrice = originalPrice;
                              if (currency === 'IQD' && itemCurrency === 'USD') {
                                convertedOriginalPrice = originalPrice * EXCHANGE_RATES.USD_TO_IQD;
                              } else if (currency === 'USD' && itemCurrency === 'IQD') {
                                convertedOriginalPrice = originalPrice * EXCHANGE_RATES.IQD_TO_USD;
                              }
                              
                              return formatCurrency(convertedOriginalPrice, currency);
                            })()}
                          </div>
                        )}
                        <button
                          onClick={() => deleteItem(item.uniqueId || item.product_id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          {t.remove}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Column 2: Checkout & Payment */}
      <div className="flex flex-col gap-4 h-full overflow-y-auto pb-6">
        {/* Currency Toggle Button with Exchange Rate - now enabled for debt sales too */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                currency === 'USD'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                </svg>
                {t.usd || 'USD'}
              </span>
            </button>
            <button
              onClick={() => setCurrency('IQD')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                currency === 'IQD'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                {t.iqd || 'IQD'}
              </span>
            </button>
          </div>
          <div className="flex-1 text-right">
            <OfflineIndicator className="text-xs" />
            <button
              onClick={handleExchangeRateClick}
              disabled={isLoadingRate}
              className={`px-3 py-2 ${
                isLoadingRate 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white text-sm rounded-lg transition-colors shadow-lg flex items-center gap-2`}
            >
              {isLoadingRate ? (
                <>
                  <span className="animate-spin">⏳</span>
                  {t.loadingRate || 'Loading...'}
                </>
              ) : (
                <>
                  1$ = {EXCHANGE_RATES.USD_TO_IQD}IQD
                </>
              )}
            </button>
          </div>
        </div>

        {/* For debt sales, show updated message about currency selection */}
        {isDebt && (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 mb-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <Icon name="clipboard" size={20} />
              <span className="text-sm font-medium">
                {t.debtSaleNote || `Debt sale in ${currency}. Customer can pay using any currency when settling the debt.`}
              </span>
            </div>
          </div>
        )}

        {/* Multi-Currency Payment - disabled for debt sales */}
        {!isDebt && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                {t.multiCurrencyPayment}
              </h3>
              <div className="flex items-center gap-2">
                {/* Smart suggestion for currency */}
                {!multiCurrency.enabled && items.length > 0 && (
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    {(() => {
                      const totalRequiredUSD = currency === 'USD' ? discountedTotal : discountedTotal / EXCHANGE_RATES.USD_TO_IQD;
                      if (totalRequiredUSD > 100) {
                        return t.suggestMixedPayment || 'Consider mixed payment for large amounts';
                      }
                      return null;
                    })()}
                  </span>
                )}
                <button
                  onClick={() => setMultiCurrency(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  multiCurrency.enabled
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {multiCurrency.enabled ? t.enabled : t.disabled}
              </button>
            </div>
          </div>
          
          {multiCurrency.enabled && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">
                  {t.usdAmount}
                </label>
                <input
                  type="text"
                  value={multiCurrency.usdAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow numbers and decimal point
                    if (!/^[0-9]*\.?[0-9]*$/.test(value) && value !== '') return;
                    const numValue = parseFloat(value) || 0;
                    setMultiCurrency(prev => ({ ...prev, usdAmount: numValue }));
                  }}
                  placeholder="0.00"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                />
                {/* Quick USD buttons */}
                <div className="flex gap-1 mt-2">
                  {[5, 10, 20, 50, 100].map(amount => (
                    <button
                      key={amount}
                      onClick={() => {
                        setMultiCurrency(prev => ({ ...prev, usdAmount: prev.usdAmount + amount }));
                        playSound('action');
                      }}
                      className="flex-1 py-1 px-2 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors"
                    >
                      +${amount}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">
                  {t.iqdAmount}
                </label>
                <input
                  type="text"
                  value={multiCurrency.iqdAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow numbers
                    if (!/^[0-9]*$/.test(value) && value !== '') return;
                    const numValue = parseInt(value) || 0;
                    setMultiCurrency(prev => ({ ...prev, iqdAmount: numValue }));
                  }}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    const roundedValue = roundIQDToNearestBill(value);
                    setMultiCurrency(prev => ({ ...prev, iqdAmount: roundedValue }));
                  }}
                  placeholder="0"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                />
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {IQD_ROUNDING_MESSAGE}
                </div>
                {/* Quick IQD buttons */}
                <div className="flex gap-1 mt-2 flex-wrap">
                  <div className="flex gap-1 w-full">
                    {[1000, 5000, 10000].map(amount => (
                      <button
                        key={amount}
                        onClick={() => {
                          setMultiCurrency(prev => ({ 
                            ...prev, 
                            iqdAmount: roundIQDToNearestBill(prev.iqdAmount + amount)
                          }));
                          playSound('action');
                        }}
                        className="flex-1 py-1 px-2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                      >
                        +{amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1 w-full mt-1">
                    {[25000, 50000, 100000].map(amount => (
                      <button
                        key={amount}
                        onClick={() => {
                          setMultiCurrency(prev => ({ 
                            ...prev, 
                            iqdAmount: roundIQDToNearestBill(prev.iqdAmount + amount)
                          }));
                          playSound('action');
                        }}
                        className="flex-1 py-1 px-2 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded transition-colors"
                      >
                        +{(amount/1000)}k
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      // Round to nearest 10k
                      const current = multiCurrency.iqdAmount;
                      const rounded = Math.ceil(current / 10000) * 10000;
                      if (rounded > current) {
                        setMultiCurrency(prev => ({ ...prev, iqdAmount: rounded }));
                        playSound('action');
                      }
                    }}
                    className="w-full mt-1 py-1 px-2 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded transition-colors"
                  >
                    Round to nearest 10k
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={convertUSDToIQD}
                  className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                >
                  USD → IQD
                </button>
                <button
                  onClick={convertIQDToUSD}
                  className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
                >
                  IQD → USD
                </button>
                <button
                  onClick={() => {
                    setMultiCurrency(prev => ({ ...prev, usdAmount: 0, iqdAmount: 0 }));
                    playSound('system');
                  }}
                  className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                  title="Clear amounts"
                >
                  Clear
                </button>
              </div>
              
              {/* Payment Summary */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 space-y-2">
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span>{t.totalRequired}:</span>
                    <span className="font-medium">
                      {formatCurrency(discountedTotal, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.totalPaid}:</span>
                    <span className="font-medium">
                      {formatCurrency(
                        currency === 'USD' 
                          ? multiCurrency.usdAmount + (multiCurrency.iqdAmount / EXCHANGE_RATES.USD_TO_IQD)
                          : multiCurrency.iqdAmount + (multiCurrency.usdAmount * EXCHANGE_RATES.USD_TO_IQD),
                        currency
                      )}
                    </span>
                  </div>
                </div>
                
                {/* Change Calculation */}
                {(() => {
                  const totalRequiredUSD = currency === 'USD' ? discountedTotal : discountedTotal / EXCHANGE_RATES.USD_TO_IQD;
                  const totalPaidUSD = multiCurrency.usdAmount + (multiCurrency.iqdAmount / EXCHANGE_RATES.USD_TO_IQD);
                  
                  if (totalPaidUSD > totalRequiredUSD) {
                    const change = calculateChange(totalPaidUSD, totalRequiredUSD);
                    return (
                      <div className="border-t border-slate-200 dark:border-slate-600 pt-2">
                        <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {t.change || 'Change'}:
                        </div>
                        {change.changeInUSD > 0 && (
                          <div className="text-sm text-green-600 dark:text-green-400">
                            USD: {formatCurrency(change.changeInUSD, 'USD')}
                          </div>
                        )}
                        {change.changeInIQD > 0 && (
                          <div className="text-sm text-green-600 dark:text-green-400">
                            IQD: {formatCurrency(change.changeInIQD, 'IQD')}
                            {change.changeIQD !== change.changeInIQD && (
                              <div className="text-xs text-blue-600 dark:text-blue-400">
                                ({IQD_ROUNDING_MESSAGE})
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  if (totalPaidUSD < totalRequiredUSD) {
                    const remaining = totalRequiredUSD - totalPaidUSD;
                    return (
                      <div className="border-t border-slate-200 dark:border-slate-600 pt-2">
                        <div className="text-sm text-red-600 dark:text-red-400">
                          {t.remaining || 'Remaining'}: {formatCurrency(remaining, 'USD')}
                          <div className="text-xs">
                            (≈ {formatCurrency(remaining * EXCHANGE_RATES.USD_TO_IQD, 'IQD')})
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="border-t border-slate-200 dark:border-slate-600 pt-2">
                      <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                        ✓ {t.exactAmount || 'Exact Amount'}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Total and Checkout */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-lg">
              <span className="text-slate-600 dark:text-slate-300">{t.subtotal}:</span>
              <span className="font-semibold text-slate-800 dark:text-white">
                {formatCurrency(convertedTotal, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t border-slate-200 dark:border-slate-700 pt-2">
              <span className="text-slate-800 dark:text-white">{t.total}:</span>
              <span className="text-slate-800 dark:text-white">
                {formatCurrency(discountedTotal, currency)}
              </span>
            </div>
            {currency === 'IQD' && discountedTotal !== getRoundedTotal(convertedTotal, currency) && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {IQD_BILL_ROUNDING_MESSAGE}
              </div>
            )}
          </div>
          
          {/* Payment Amount for Single Currency */}
          {/* Payment amount tracking removed - only show sale totals */}
          
          <button
            onClick={processPayment}
            disabled={items.length === 0 || loading.sale}
            className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:bg-slate-400 text-white font-bold text-lg rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            {loading.sale ? (
              <>
                <span className="animate-spin">⏳</span>
                {t.processing}
              </>
            ) : (
              <>
                <Icon name="check" className="inline mr-2" size={16} />
                {t.completeSale}
                <span className="text-sm opacity-75">(Enter)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Column 3: Product Search & Grid */}
      <div className="flex flex-col gap-4 h-full min-h-0 overflow-y-auto">
        {/* Search Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4">
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={handleSearchInput}
                placeholder={t.searchProducts}
                className="w-full p-3 pr-20 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                {search && (
                  <>
                    <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                      {filteredItems.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSearchInput({ target: { value: '' } })}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      title="Clear search"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </>
                )}
                <Icon name="search" size={16} className="text-slate-400" />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg mt-1 shadow-lg z-50 max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={suggestion.uniqueId || suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={`p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 ${
                        index === selectedSuggestionIndex ? 'bg-blue-100 dark:bg-blue-900' : ''
                      }`}
                    >
                      <div className="font-medium text-slate-800 dark:text-white">
                        {suggestion.name}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        {formatCurrency(suggestion.buying_price, suggestion.currency || 'USD')} - {t.stock}: {suggestion.stock}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 overflow-hidden">
                <button
                  onClick={() => {
                    const newQuantity = Math.max(1, quantity - 1);
                    handleQuantityInput({ target: { value: newQuantity.toString() } });
                    playSound('action');
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-300 transition-colors"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value === '') return;
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 1) {
                      handleQuantityInput({ target: { value: numValue.toString() } });
                    }
                  }}
                  className="w-16 p-2 text-center text-slate-800 dark:text-white bg-transparent border-none outline-none"
                />
                <button
                  onClick={() => {
                    const newQuantity = quantity + 1;
                    handleQuantityInput({ target: { value: newQuantity.toString() } });
                    playSound('action');
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  +
                </button>
              </div>
              <button
                type="submit"
                disabled={loading.price}
                className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-400 text-white rounded-lg transition-colors"
              >
                {loading.price ? t.searching : t.addToCart}
              </button>
            </div>
          </form>
        </div>

        {/* Product Grid */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg flex-1 min-h-0 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                  {t.products}
                </h3>
                {search && (
                  <span className="text-sm text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full">
                    "{search}" ({filteredItems.length} found)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(search || filters.brand || filters.category || filters.priceMin || filters.priceMax) && (
                  <button
                    onClick={() => {
                      clearFilters();
                      handleSearchInput({ target: { value: '' } });
                    }}
                    className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-colors"
                    title="Clear all filters and search"
                  >
                    <Icon name="x" className="inline mr-1" size={12} />Clear All
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                >
                  <Icon name="filter" className="inline mr-1" size={16} />{t.filter || 'Filter'}
                </button>
              </div>
            </div>
            
            {/* Filter Controls */}
            {showFilters && (
              <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  {/* Brand Filter */}
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">
                      {t.brand || 'Brand'}
                    </label>
                    <select
                      value={filters.brand}
                      onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))}
                      className="w-full p-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-600 text-slate-800 dark:text-white"
                    >
                      <option value="">{t.allBrands || 'All Brands'}</option>
                      {uniqueBrands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Category Filter */}
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">
                      {t.category || 'Category'}
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full p-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-600 text-slate-800 dark:text-white"
                    >
                      <option value="">{t.allCategories || 'All Categories'}</option>
                      {uniqueCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Price Range */}
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">
                    {t.priceRange || 'Price Range'} ({currency})
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder={t.min || 'Min'}
                      value={filters.priceMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                      className="flex-1 p-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-600 text-slate-800 dark:text-white"
                    />
                    <span className="text-slate-600 dark:text-slate-300 self-center">-</span>
                    <input
                      type="number"
                      placeholder={t.max || 'Max'}
                      value={filters.priceMax}
                      onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                      className="flex-1 p-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-600 text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
                
                {/* Clear Filters Button */}
                <button
                  onClick={clearFilters}
                  className="w-full py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                >
                  {t.clearFilters || 'Clear Filters'}
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Icon name="smartphone" size={60} className="text-slate-300 mb-4" />
                <div className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-2">
                  {allItems.length === 0 ? t.noProductsLoaded || 'No Products Loaded' : t.noProductsFound || 'No Products Found'}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {allItems.length === 0 
                    ? t.loadingProducts || 'Loading products...' 
                    : t.tryDifferentFilter || 'Try a different filter or search term'
                  }
                </div>
                {allItems.length === 0 && (
                  <button
                    onClick={() => {
                      refreshProducts();
                      refreshAccessories();
                    }}
                    className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <Icon name="refresh-cw" className="inline mr-2" size={16} />{t.refreshProducts || 'Refresh Products'}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredItems.slice(0, 20).map((item) => (
                <div
                  key={item.uniqueId || item.id}
                  onClick={() => addOrUpdateItem(item, false, 1)}
                  className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors min-h-[120px] w-full"
                >
                  <div className="font-semibold text-slate-800 dark:text-white text-lg mb-2">
                    {item.name}
                  </div>
                  
                  {/* Show RAM and Storage for phones, Type for accessories */}
                  {item.category === 'phones' || item.itemType === 'product' ? (
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {item.ram && <span>{t?.ram || 'RAM'}: {item.ram}</span>}
                      {item.ram && item.storage && <span className="mx-2">•</span>}
                      {item.storage && <span>{t?.storage || 'Storage'}: {item.storage}</span>}
                    </div>
                  ) : (item.category === 'accessories' || item.itemType === 'accessory') ? (
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {item.type && <span>{item.type}</span>}
                      {item.brand && item.type && <span className="mx-2">•</span>}
                      {item.brand && <span>{item.brand}</span>}
                    </div>
                  ) : null}
                  
                  <div className="text-base text-slate-700 dark:text-slate-300 font-medium">
                    {formatCurrency(
                      currency === 'IQD' && (item.currency === 'USD' || !item.currency)
                        ? (item.buying_price || 0) * EXCHANGE_RATES.USD_TO_IQD
                        : currency === 'USD' && item.currency === 'IQD'
                        ? (item.buying_price || 0) * EXCHANGE_RATES.IQD_TO_USD
                        : (item.buying_price || 0),
                      currency
                    )}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                    {t.stock}: {item.stock}
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exchange Rate Modal */}
      {showExchangeRateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              {t.enterNewExchangeRate || 'Enter New Exchange Rate'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">
                  1 USD = ? IQD
                </label>
                <input
                  type="number"
                  value={newExchangeRate}
                  onChange={(e) => setNewExchangeRate(e.target.value)}
                  placeholder={EXCHANGE_RATES.USD_TO_IQD.toString()}
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  autoFocus
                  disabled={isLoadingRate}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExchangeRateClose}
                  className="flex-1 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  disabled={isLoadingRate}
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleExchangeRateUpdate}
                  className={`flex-1 py-2 ${
                    isLoadingRate 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-500 hover:bg-blue-600'
                  } text-white rounded-lg transition-colors flex items-center justify-center gap-2`}
                  disabled={isLoadingRate}
                >
                  {isLoadingRate ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      {t.loading || 'Loading...'}
                    </>
                  ) : (
                    t.update || 'Update'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Under Cost Warning */}
      <UnderCostWarning 
        items={items}
        allItems={allItems}
        t={t}
        currency={currency}
        onWarningChange={setUnderCostWarningVisible}
      />
    </div>
  );
}
