import React, { useState, useRef, useMemo, useEffect } from 'react';
import { EXCHANGE_RATES, formatCurrency, roundIQDToNearestBill, getRoundedPaymentTotal } from '../utils/exchangeRates';
import OfflineIndicator from './OfflineIndicator';
import UnderCostWarning from './UnderCostWarning';

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
  setDiscount
}) {
  const [multiCurrency, setMultiCurrency] = useState({ enabled: false, usdAmount: 0, iqdAmount: 0 });
  const [discount, setLocalDiscount] = useState({ type: 'none', value: 0 });
  const [showExchangeRateModal, setShowExchangeRateModal] = useState(false);
  const [newExchangeRate, setNewExchangeRate] = useState('');
  const [filters, setFilters] = useState({
    brand: '',
    category: '',
    priceMin: '',
    priceMax: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [underCostWarningVisible, setUnderCostWarningVisible] = useState(false);
  const inputRef = useRef();

  const IQD_ROUNDING_MESSAGE = t.roundedToNearest250 || 'Amounts rounded to nearest 250 IQD';
  const IQD_BILL_ROUNDING_MESSAGE = t.roundedToNearestBill || 'Rounded to nearest 250 IQD bill';

  // Get rounded total for IQD payments
  const getRoundedTotal = (amount, currencyType) => {
    return getRoundedPaymentTotal(amount, currencyType);
  };

  // Calculate totals based on selected currency
  const convertedTotal = useMemo(() => {
    if (currency === 'IQD') {
      return items.reduce((sum, item) => {
        const itemTotal = item.selling_price * item.quantity;
        if (item.currency === 'USD' || !item.currency) {
          return sum + (itemTotal * EXCHANGE_RATES.USD_TO_IQD);
        }
        return sum + itemTotal;
      }, 0);
    } else {
      return items.reduce((sum, item) => {
        const itemTotal = item.selling_price * item.quantity;
        if (item.currency === 'IQD') {
          return sum + (itemTotal * EXCHANGE_RATES.IQD_TO_USD);
        }
        return sum + itemTotal;
      }, 0);
    }
  }, [items, currency]);

  // Calculate discounted total
  const discountedTotal = useMemo(() => {
    const baseTotal = convertedTotal;
    if (discount.type === 'none' || !discount.value) {
      return currency === 'IQD' ? getRoundedTotal(baseTotal, currency) : baseTotal;
    }
    
    let finalTotal;
    if (discount.type === 'percentage') {
      finalTotal = baseTotal * (1 - discount.value / 100);
    } else {
      finalTotal = Math.max(0, baseTotal - discount.value);
    }
    
    return currency === 'IQD' ? getRoundedTotal(finalTotal, currency) : finalTotal;
  }, [convertedTotal, discount, currency]);

  // Update payment amount when discounted total changes
  useEffect(() => {
    if (discountedTotal > 0 && (paymentAmount === 0 || paymentAmount < discountedTotal)) {
      const roundedAmount = currency === 'IQD' ? getRoundedTotal(discountedTotal, currency) : Math.ceil(discountedTotal);
      setPaymentAmount(roundedAmount);
    }
  }, [discountedTotal, currency]);

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
        ? (item.price || 0) * EXCHANGE_RATES.USD_TO_IQD
        : currency === 'USD' && item.currency === 'IQD'
        ? (item.price || 0) * EXCHANGE_RATES.IQD_TO_USD
        : (item.price || 0);
      
      if (filters.priceMin && itemPrice < Number(filters.priceMin)) return false;
      if (filters.priceMax && itemPrice > Number(filters.priceMax)) return false;
      
      return true;
    });
  }, [allItems, filters, currency]);

  // Multi-currency payment handlers
  const handleMultiCurrencyPayment = () => {
    if (underCostWarningVisible) {
      showToast(t.pleaseAcknowledgeWarning || 'Please acknowledge the warning first', 'warning');
      return;
    }
    const totalPaidUSD = multiCurrency.usdAmount + (multiCurrency.iqdAmount / EXCHANGE_RATES.USD_TO_IQD);
    
    handleCompleteSale(
      discount.type !== 'none' ? { discount_type: discount.type, discount_value: discount.value } : null,
      discountedTotal,
      {
        usdAmount: multiCurrency.usdAmount,
        iqdAmount: multiCurrency.iqdAmount,
        totalPaidUSD: totalPaidUSD
      }
    );
  };

  const handleSingleCurrencyPayment = () => {
    if (underCostWarningVisible) {
      showToast(t.pleaseAcknowledgeWarning || 'Please acknowledge the warning first', 'warning');
      return;
    }
    const actualPayment = paymentAmount > 0 ? paymentAmount : discountedTotal;
    handleCompleteSale(
      discount.type !== 'none' ? { discount_type: discount.type, discount_value: discount.value } : null,
      discountedTotal,
      { paymentAmount: actualPayment }
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

  const handleExchangeRateUpdate = () => {
    if (newExchangeRate && !isNaN(newExchangeRate) && Number(newExchangeRate) > 0) {
      const newRateNum = Number(newExchangeRate);
      EXCHANGE_RATES.USD_TO_IQD = newRateNum;
      EXCHANGE_RATES.IQD_TO_USD = 1 / newRateNum;
      showToast(`Exchange rate updated: 1 USD = ${newRateNum} IQD`, 'success');
      setShowExchangeRateModal(false);
      setNewExchangeRate('');
      setMultiCurrency(prev => ({ ...prev }));
    }
  };

  const handleDiscountApply = () => {
    setDiscount({ 
      discount_type: discount.type, 
      discount_value: discount.value 
    });
  };

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
              onClick={() => window.location.href = '/admin'}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Admin
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
                        <div className="font-medium text-slate-800 dark:text-white">
                          {item.name || product?.name || t.unknown}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
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
                            className="w-12 px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-600 text-xs"
                          /> × 
                          <input
                            type="number"
                            value={item.selling_price}
                            onChange={(e) => {
                              const newPrice = Number(e.target.value) || 0;
                              console.log(`🔄 CART: Updating selling_price for ${item.name || 'Unknown'} from ${item.selling_price} to ${newPrice}`);
                              const updatedItems = items.map((cartItem, i) => 
                                i === index ? { ...cartItem, selling_price: newPrice } : cartItem
                              );
                              setItems(updatedItems);
                              console.log(`✅ CART: Updated items:`, updatedItems.map(i => ({ name: i.name, selling_price: i.selling_price, buying_price: i.buying_price })));
                            }}
                            className="w-20 px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-600 text-xs"
                          />
                          {item.currency || product?.currency || 'USD'}
                        </div>
                        {product?.category === 'accessories' && product?.type && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Type: {product.type}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-800 dark:text-white">
                          {formatCurrency(
                            currency === 'IQD' && (item.currency === 'USD' || !item.currency)
                              ? item.selling_price * item.quantity * EXCHANGE_RATES.USD_TO_IQD
                              : currency === 'USD' && item.currency === 'IQD'
                              ? item.selling_price * item.quantity * EXCHANGE_RATES.IQD_TO_USD
                              : item.selling_price * item.quantity,
                            currency
                          )}
                        </div>
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
        {/* Exchange Rate Display with Online Status */}
        <div className="flex justify-end items-center gap-2">
          <OfflineIndicator className="text-xs" />
          <button
            onClick={() => {
              setNewExchangeRate(EXCHANGE_RATES.USD_TO_IQD.toString());
              setShowExchangeRateModal(true);
            }}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors shadow-lg"
          >
            1$ = {EXCHANGE_RATES.USD_TO_IQD}IQD {t.change}
          </button>
        </div>

        {/* Currency Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
            {t.currency}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrency('USD')}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                currency === 'USD'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              USD
            </button>
            <button
              onClick={() => setCurrency('IQD')}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                currency === 'IQD'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              IQD
            </button>
          </div>
        </div>

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
                  onChange={(e) => setLocalDiscount(prev => ({ ...prev, value: Number(e.target.value) }))}
                  placeholder={discount.type === 'percentage' ? '%' : formatCurrency(0, currency)}
                  className="w-24 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                />
              )}
            </div>
            {discount.type !== 'none' && (
              <button
                onClick={handleDiscountApply}
                className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
              >
                {t.applyDiscount}
              </button>
            )}
          </div>
        </div>

        {/* Multi-Currency Payment */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              {t.multiCurrencyPayment}
            </h3>
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
          
          {multiCurrency.enabled && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">
                  {t.usdAmount}
                </label>
                <input
                  type="number"
                  value={multiCurrency.usdAmount}
                  onChange={(e) => setMultiCurrency(prev => ({ ...prev, usdAmount: Number(e.target.value) || 0 }))}
                  placeholder="0"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                />
                {multiCurrency.usdAmount > 0 && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {(() => {
                      const remaining = Math.max(0, (currency === 'USD' ? discountedTotal : discountedTotal / EXCHANGE_RATES.USD_TO_IQD) - multiCurrency.usdAmount) * EXCHANGE_RATES.USD_TO_IQD;
                      const roundedRemaining = getRoundedTotal(remaining, 'IQD');
                      return roundedRemaining > 0 ? `${t.remaining}: ${formatCurrencyPrecise(roundedRemaining, 'IQD')}` : '';
                    })()}
                  </div>
                )}
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
                {multiCurrency.iqdAmount > 0 && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {(() => {
                      const remaining = Math.max(0, (currency === 'IQD' ? discountedTotal : discountedTotal * EXCHANGE_RATES.USD_TO_IQD) - multiCurrency.iqdAmount) / EXCHANGE_RATES.USD_TO_IQD;
                      return remaining > 0 ? `${t.remaining}: ${formatCurrencyPrecise(remaining, 'USD')}` : '';
                    })()}
                  </div>
                )}
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
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {t.totalPaid}: {formatCurrency(
                  currency === 'USD' 
                    ? multiCurrency.usdAmount + (multiCurrency.iqdAmount / EXCHANGE_RATES.USD_TO_IQD)
                    : multiCurrency.iqdAmount + (multiCurrency.usdAmount * EXCHANGE_RATES.USD_TO_IQD),
                  currency
                )}
              </div>
              {(() => {
                const totalPaid = currency === 'USD' 
                  ? multiCurrency.usdAmount + (multiCurrency.iqdAmount / EXCHANGE_RATES.USD_TO_IQD)
                  : multiCurrency.iqdAmount + (multiCurrency.usdAmount * EXCHANGE_RATES.USD_TO_IQD);
                const change = totalPaid - discountedTotal;
                if (change > 0) {
                  const roundedChange = currency === 'IQD' ? roundIQDToNearestBill(change) : change;
                  return (
                    <div className="text-sm text-green-600 dark:text-green-400 font-semibold">
                      {t.change || 'Change'}: {formatCurrencyPrecise(roundedChange, currency)}
                      {currency === 'IQD' && change !== roundedChange && (
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          ({IQD_ROUNDING_MESSAGE})
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>

        {/* Total and Checkout */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-lg">
              <span className="text-slate-600 dark:text-slate-300">{t.subtotal}:</span>
              <span className="font-semibold text-slate-800 dark:text-white">
                {formatCurrency(convertedTotal, currency)}
              </span>
            </div>
            {discount.type !== 'none' && discount.value > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>{t.discount}:</span>
                <span>
                  -{discount.type === 'percentage' ? `${discount.value}%` : formatCurrency(discount.value, currency)}
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
          {!multiCurrency.enabled && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-slate-600 dark:text-slate-300">
                  {t.paymentAmount || 'Payment Amount'} ({currency})
                </label>
                <button
                  onClick={() => setShowPaymentInput(!showPaymentInput)}
                  className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                >
                  {showPaymentInput ? t.hide || 'Hide' : t.calculateChange || 'Calculate Change'}
                </button>
              </div>
              {showPaymentInput && (
                <>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => {
                      const value = Number(e.target.value) || 0;
                      setPaymentAmount(value);
                    }}
                    onBlur={(e) => {
                      const value = Number(e.target.value) || 0;
                      const finalValue = currency === 'IQD' ? roundIQDToNearestBill(value) : value;
                      setPaymentAmount(finalValue);
                    }}
                    placeholder={formatCurrencyPrecise(getRoundedTotal(discountedTotal, currency), currency)}
                    step={currency === 'USD' ? '0.01' : '250'}
                    min={currency === 'USD' ? '0' : '250'}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  />
                  {currency === 'IQD' && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {IQD_ROUNDING_MESSAGE}
                    </div>
                  )}
                  {paymentAmount > discountedTotal && (
                    <div className="text-sm text-green-600 dark:text-green-400 font-semibold mt-1">
                      {(() => {
                        const change = paymentAmount - discountedTotal;
                        const roundedChange = currency === 'IQD' ? roundIQDToNearestBill(change) : change;
                        return (
                          <>
                            {t.change || 'Change'}: {formatCurrencyPrecise(roundedChange, currency)}
                            {currency === 'IQD' && change !== roundedChange && (
                              <div className="text-xs text-blue-600 dark:text-blue-400">
                                ({IQD_ROUNDING_MESSAGE})
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          <button
            onClick={multiCurrency.enabled ? handleMultiCurrencyPayment : handleSingleCurrencyPayment}
            disabled={items.length === 0 || loading.sale}
            className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors"
          >
            {loading.sale ? t.processing : t.completeSale}
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
                🔍 Filter
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
                      {item.ram && <span>RAM: {item.ram}</span>}
                      {item.ram && item.storage && <span className="mx-2">•</span>}
                      {item.storage && <span>Storage: {item.storage}</span>}
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
                  placeholder="1440"
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowExchangeRateModal(false);
                    setNewExchangeRate('');
                  }}
                  className="flex-1 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleExchangeRateUpdate}
                  className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  {t.update || 'Update'}
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
