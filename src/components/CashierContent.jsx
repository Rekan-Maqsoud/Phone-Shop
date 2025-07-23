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
import { Icon } from '../utils/icons.jsx';
import useOnlineStatus from './hooks/useOnlineStatus';
import { useSound } from '../contexts/SoundContext';
import { playActionSound, playSystemSound } from '../utils/sounds';

// Helper function for precise currency formatting
const formatCurrencyPrecise = (amount, currency) => {
  const symbol = currency === 'USD' ? '$' : 'د.ع';
  
  if (currency === 'IQD') {
    const rounded = Math.round(amount);
    return `${rounded.toLocaleString()}${symbol}`;
  }
  
  // For USD: always show 2 decimals for precise amounts
  return `${symbol}${Number(amount).toFixed(2)}`;
};

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
  setShowSuggestions,
  setIsDebt,
  setCustomerName,
  setItems,
  deleteItem,
  showToast,
  allItems,
  addOrUpdateItem,
  currency,
  setCurrency,
  setDiscount,
  multiCurrency,
  setMultiCurrency,
  refreshProducts,
  refreshAccessories
}) {
  const [discount, setLocalDiscount] = useState({ type: 'none', value: 0 });
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
  const inputRef = useRef();
  const { soundSettings } = useSound();
  const { isOnline } = useOnlineStatus();

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

  // Calculate discounted total
  const discountedTotal = useMemo(() => {
    const baseTotal = convertedTotal;
    const effectiveCurrency = currency;
    
    if (discount.type === 'none' || !discount.value || discount.value <= 0) {
      return effectiveCurrency === 'IQD' ? getRoundedTotal(baseTotal, effectiveCurrency) : baseTotal;
    }
    
    let finalTotal;
    if (discount.type === 'percentage') {
      const validPercentage = Math.min(Math.max(0, discount.value), 100);
      finalTotal = baseTotal * (1 - validPercentage / 100);
    } else {
      finalTotal = Math.max(0, baseTotal - discount.value);
    }
    
    return effectiveCurrency === 'IQD' ? getRoundedTotal(finalTotal, effectiveCurrency) : finalTotal;
  }, [convertedTotal, discount, currency]);

  // Calculate actual discount amount for display
  const discountAmount = useMemo(() => {
    if (discount.type === 'none' || !discount.value || discount.value <= 0) {
      return 0;
    }
    
    if (discount.type === 'percentage') {
      const validPercentage = Math.min(Math.max(0, discount.value), 100);
      return convertedTotal * (validPercentage / 100);
    } else {
      return Math.min(discount.value, convertedTotal);
    }
  }, [convertedTotal, discount]);

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

  // Filter products based on selected filters
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (item.stock <= 0) return false;
      
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
  }, [allItems, filters, currency]);

  // Calculate optimal change distribution
  const calculateChange = (totalPaidUSD, totalRequiredUSD) => {
    const changeUSD = totalPaidUSD - totalRequiredUSD;
    if (changeUSD <= 0) return { changeUSD: 0, changeIQD: 0, changeInUSD: 0, changeInIQD: 0 };
    
    // Default to giving change in IQD unless it's a small amount that's better in USD
    const changeIQD = changeUSD * EXCHANGE_RATES.USD_TO_IQD;
    const roundedChangeIQD = roundIQDToNearestBill(changeIQD);
    
    // If the rounded IQD change differs significantly, give change in USD instead
    const iqdDifference = Math.abs(changeIQD - roundedChangeIQD);
    const shouldUseUSD = iqdDifference > (changeUSD * 0.1); // If rounding loses more than 10%
    
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
        discount.type !== 'none' && discount.value > 0 ? { 
          discount_type: discount.type, 
          discount_value: discount.value 
        } : null,
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
      discount.type !== 'none' && discount.value > 0 ? { 
        discount_type: discount.type, 
        discount_value: discount.value 
      } : null,
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
      .catch(error => {
        setIsLoadingRate(false);
        showToast(t.failedToLoadExchangeRate || 'Failed to load exchange rates', 'error');
      });
  }, []);

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
    if (!isOnline) {
      showToast(t.offlineWarning || 'Cannot update exchange rate while offline', 'error');
      playSound('system');
      return;
    }

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

  // Auto-sync discount changes with parent component
  useEffect(() => {
    if (discount.type === 'none') {
      setDiscount({ discount_type: 'none', discount_value: 0 });
    } else if (discount.type === 'percentage') {
      const validPercentage = Math.min(Math.max(0, discount.value), 100);
      setDiscount({ 
        discount_type: 'percentage', 
        discount_value: validPercentage 
      });
    } else {
      const validAmount = Math.max(0, discount.value);
      setDiscount({ 
        discount_type: 'fixed', 
        discount_value: validAmount 
      });
    }
  }, [discount.type, discount.value, setDiscount]);

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
  }, [showExchangeRateModal, items.length, loading.sale]);

  const clearFilters = () => {
    setFilters({
      brand: '',
      category: '',
      priceMin: '',
      priceMax: ''
    });
  };

  // Enhanced currency formatting
  const formatCurrencyPrecise = (amount, currencyType) => {
    if (currencyType === 'IQD') {
      return `${Math.round(amount).toLocaleString()}د.ع`;
    } else {
      return `$${Number(amount).toFixed(2)}`;
    }
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 h-screen overflow-hidden">
      {/* Column 1: Cart & Customer Info */}
      <div className="flex flex-col gap-4 h-full min-h-0 overflow-y-auto">
        {/* Header with Clock and Admin Button */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button
              onClick={() => window.location.hash = '#/admin'}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              {t.admin || 'Admin'}
            </button>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {clock.toLocaleDateString()}
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
            {t.customerInfo}
          </h3>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder={t.customerName}
            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Qty:</label>
                            <input
                              type="number"
                              value={item.quantity}
                              min="1"
                              max={product?.stock || 999}
                              onChange={(e) => {
                                const newQuantity = Number(e.target.value) || 1;
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
                              className="w-16 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-600 text-center font-medium text-slate-800 dark:text-white"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Price:</label>
                            <input
                              type="number"
                              value={item.selling_price}
                              onChange={(e) => {
                                const newPrice = Number(e.target.value) || 0;
                                const updatedItems = items.map((cartItem, i) => 
                                  i === index ? { ...cartItem, selling_price: newPrice } : cartItem
                                );
                                setItems(updatedItems);
                              }}
                              className="w-24 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-600 text-center font-bold text-lg text-slate-800 dark:text-white"
                            />
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                              {currency}
                            </span>
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

        {/* Discount Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
            {t.discount}
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <select
                value={discount.type}
                onChange={(e) => setLocalDiscount(prev => ({ ...prev, type: e.target.value }))}
                className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
              >
                <option value="none">{t.noDiscount}</option>
                <option value="percentage">{t.percentage}</option>
                <option value="fixed">{t.fixedAmount}</option>
              </select>
              {discount.type !== 'none' && (
                <input
                  type="number"
                  value={discount.value}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    // Validate input based on discount type
                    if (discount.type === 'percentage') {
                      // Limit percentage to 0-100
                      if (value >= 0 && value <= 100) {
                        setLocalDiscount(prev => ({ ...prev, value }));
                      }
                    } else {
                      // For fixed amount, don't allow negative values
                      if (value >= 0) {
                        setLocalDiscount(prev => ({ ...prev, value }));
                      }
                    }
                  }}
                  placeholder={discount.type === 'percentage' ? '0-100%' : formatCurrency(0, currency)}
                  min="0"
                  max={discount.type === 'percentage' ? "100" : undefined}
                  step={discount.type === 'percentage' ? "0.1" : "0.01"}
                  className="w-28 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                />
              )}
            </div>
            {discount.type !== 'none' && (
              <div className="text-sm text-green-600 text-center">
                {discount.value > 0 && discountAmount > 0 && (
                  <>
                    {t.discount}: -{formatCurrency(discountAmount, currency)}
                    {discount.type === 'percentage' && ` (${discount.value}%)`}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

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
                  type="number"
                  value={multiCurrency.usdAmount}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 0;
                    setMultiCurrency(prev => ({ ...prev, usdAmount: value }));
                  }}
                  placeholder="0"
                  step="0.01"
                  min="0"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">
                  {t.iqdAmount}
                </label>
                <input
                  type="number"
                  value={multiCurrency.iqdAmount}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 0;
                    setMultiCurrency(prev => ({ ...prev, iqdAmount: value }));
                  }}
                  onBlur={(e) => {
                    const value = Number(e.target.value) || 0;
                    const roundedValue = roundIQDToNearestBill(value);
                    setMultiCurrency(prev => ({ ...prev, iqdAmount: roundedValue }));
                  }}
                  placeholder="0"
                  step="250"
                  min="0"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                />
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {IQD_ROUNDING_MESSAGE}
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
            {discount.type !== 'none' && discount.value > 0 && discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>{t.discount}:</span>
                <span>
                  -{formatCurrency(discountAmount, currency)}
                  {discount.type === 'percentage' && ` (${discount.value}%)`}
                </span>
              </div>
            )}
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
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
              <input
                type="number"
                value={quantity}
                onChange={handleQuantityInput}
                min="1"
                className="w-20 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
              />
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
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                {t.products}
              </h3>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
              >
                <Icon name="filter" className="inline mr-1" size={16} />{t.filter || 'Filter'}
              </button>
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
        discount={discount}
        currency={currency}
        onWarningChange={setUnderCostWarningVisible}
      />
    </div>
  );
}
