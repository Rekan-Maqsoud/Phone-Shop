import React, { useState, useMemo, useEffect } from 'react';
import ModalBase from './ModalBase';
import { phoneBrands, accessoryModels } from './phoneBrands';
import SearchableSelect from './SearchableSelect';
import { EXCHANGE_RATES, loadExchangeRatesFromDB } from '../utils/exchangeRates';

export default function AddPurchaseModal({ show, onClose, onSubmit, t, isCompanyDebtMode = false }) {
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [purchaseType, setPurchaseType] = useState('simple'); // 'simple' or 'withItems'
  const [paymentStatus, setPaymentStatus] = useState(isCompanyDebtMode ? 'debt' : 'paid'); // 'debt' or 'paid'
  const [currency, setCurrency] = useState('IQD'); // 'USD' or 'IQD'
  const [simpleAmount, setSimpleAmount] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [multiCurrency, setMultiCurrency] = useState({ enabled: false, usdAmount: 0, iqdAmount: 0 });
  const [discount, setDiscount] = useState({
    enabled: false,
    type: 'percentage', // 'percentage' or 'amount'
    value: ''
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!show) {
      setCompanyName('');
      setDescription('');
      setSimpleAmount('');
      setItems([]);
      setPurchaseType('simple');
      setPaymentStatus(isCompanyDebtMode ? 'debt' : 'paid');
      // Don't reset currency - let user choose
      setError('');
      setMultiCurrency({ enabled: false, usdAmount: 0, iqdAmount: 0 });
      setDiscount({
        enabled: false,
        type: 'percentage',
        value: ''
      });
    } else {
      // Set the payment status when modal opens
      setPaymentStatus(isCompanyDebtMode ? 'debt' : 'paid');
    }
  }, [show, isCompanyDebtMode]);

  // Memoize options to prevent recreating arrays on every render
  const brandOptions = useMemo(() => phoneBrands.map(brand => brand.name), []);
  const ramOptions = useMemo(() => ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB', '18GB', '24GB'], []);
  const storageOptions = useMemo(() => ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'], []);

  const addItem = (type) => {
    const newItem = {
      id: Date.now(),
      item_type: type,
      item_name: '', // Will be auto-generated from brand/model
      quantity: 1,
      unit_price: '',
      currency: 'IQD', // Default to IQD, user can change
      ram: '',
      storage: '',
      model: '',
      brand: '',
      type: type === 'accessory' ? '' : undefined // Specific accessory type
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id, field, value) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // Auto-generate item_name based on brand and model
          if (field === 'brand' || field === 'model') {
            if (updatedItem.item_type === 'product') {
              updatedItem.item_name = [updatedItem.brand, updatedItem.model].filter(Boolean).join(' ');
            } else if (updatedItem.item_type === 'accessory') {
              updatedItem.item_name = [updatedItem.brand, updatedItem.model].filter(Boolean).join(' ');
            }
          }
          
          return updatedItem;
        }
        return item;
      });
      return newItems;
    });
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    let baseTotal;
    if (purchaseType === 'simple') {
      if (multiCurrency.enabled) {
        // For multi-currency simple purchases, show combined total
        // Convert IQD to USD and add USD amount for display consistency
        const iqdInUsd = multiCurrency.iqdAmount / EXCHANGE_RATES.USD_TO_IQD;
        baseTotal = multiCurrency.usdAmount + iqdInUsd;
      } else {
        baseTotal = parseFloat(simpleAmount) || 0;
      }
    } else {
      // Calculate total considering individual item currencies
      let totalUSD = 0;
      let totalIQD = 0;
      
      items.forEach(item => {
        const quantity = parseInt(item.quantity) || 0;
        const unitPrice = parseFloat(item.unit_price) || 0;
        const itemTotal = quantity * unitPrice;
        
        if (item.currency === 'USD') {
          totalUSD += itemTotal;
        } else {
          totalIQD += itemTotal;
        }
      });
      
      // Display combined total converted to the selected currency
      if (currency === 'USD') {
        const iqdInUsd = totalIQD / EXCHANGE_RATES.USD_TO_IQD;
        baseTotal = totalUSD + iqdInUsd;
      } else {
        const usdInIqd = totalUSD * EXCHANGE_RATES.USD_TO_IQD;
        baseTotal = totalIQD + usdInIqd;
      }
    }

    // Apply discount if enabled
    if (discount.enabled && discount.value) {
      const discountValue = parseFloat(discount.value) || 0;
      if (discount.type === 'percentage') {
        return baseTotal * (1 - discountValue / 100);
      } else {
        return Math.max(0, baseTotal - discountValue);
      }
    }

    return baseTotal;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!companyName.trim()) {
      setError(t.pleaseProvideValidCompanyName || 'Please provide a valid company name');
      return;
    }

    if (purchaseType === 'simple') {
      if (multiCurrency.enabled) {
        // Multi-currency validation
        if (multiCurrency.usdAmount <= 0 && multiCurrency.iqdAmount <= 0) {
          setError(t.pleaseProvideValidAmount || 'Please provide a valid amount in at least one currency');
          return;
        }
        
        const purchaseData = {
          company_name: companyName.trim(),
          amount: 0, // Set to 0 for multi-currency, actual amounts are in multi_currency object
          description: description.trim(),
          type: 'simple',
          payment_status: paymentStatus,
          currency: 'MULTI', // Special indicator for multi-currency
          multi_currency: {
            enabled: true,
            usdAmount: multiCurrency.usdAmount,
            iqdAmount: multiCurrency.iqdAmount
          },
          discount: discount.enabled && discount.value ? {
            discount_type: discount.type,
            discount_value: parseFloat(discount.value)
          } : null
        };

        await onSubmit(purchaseData);
      } else {
        // Single currency validation
        const amt = parseFloat(simpleAmount);
        if (!simpleAmount || isNaN(amt) || amt <= 0) {
          setError(t.pleaseProvideValidAmount || 'Please provide a valid amount greater than 0');
          return;
        }

        const purchaseData = {
          company_name: companyName.trim(),
          amount: Math.round(amt * 100) / 100,
          description: description.trim(),
          type: 'simple',
          payment_status: paymentStatus,
          currency: currency, // Keep the exact selected currency (USD or IQD)
          multi_currency: null,
          discount: discount.enabled && discount.value ? {
            discount_type: discount.type,
            discount_value: parseFloat(discount.value)
          } : null
        };

        await onSubmit(purchaseData);
      }
      
      // Reset form only on successful submission
      setCompanyName('');
      setDescription('');
      setSimpleAmount('');
      setItems([]);
      setPurchaseType('simple');
      setPaymentStatus(isCompanyDebtMode ? 'debt' : 'paid');
    } else {
      // Validate items
      if (items.length === 0) {
        setError(t.pleaseAddAtLeastOneItem || 'Please add at least one item');
        return;
      }

      const invalidItems = items.filter((item, index) => {
        // For products: require brand, model, quantity, price
        if (item.item_type === 'product') {
          const validations = {
            brand: !item.brand?.trim(),
            model: !item.model?.trim(),
            quantity: !item.quantity || parseInt(item.quantity) <= 0,
            unitPrice: !item.unit_price || parseFloat(item.unit_price) <= 0
          };
          
          const isInvalid = validations.brand || validations.model || validations.quantity || validations.unitPrice;
          return isInvalid;
        }
        // For accessories: require brand, model, quantity, price (type is optional)
        else if (item.item_type === 'accessory') {
          const validations = {
            brand: !item.brand?.trim(),
            model: !item.model?.trim(),
            quantity: !item.quantity || parseInt(item.quantity) <= 0,
            unitPrice: !item.unit_price || parseFloat(item.unit_price) <= 0
          };
          
          const isInvalid = validations.brand || validations.model || validations.quantity || validations.unitPrice;
          return isInvalid;
        }
        return true;
      });

      if (invalidItems.length > 0) {
        setError(t.pleaseFillAllRequiredFields || 'Please fill in all required fields for all items (brand, model, quantity, price)');
        return;
      }

      const processedItems = items.map(item => ({
        ...item,
        item_name: item.item_name || [item.brand, item.model].filter(Boolean).join(' '), // Ensure item_name is set
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unit_price),
        stock: parseInt(item.quantity) || 0, // Use quantity as initial stock
        total_price: parseInt(item.quantity) * parseFloat(item.unit_price),
        buying_price: parseFloat(item.unit_price), // Same as unit price for buying
        ram: item.ram?.trim() || null,
        storage: item.storage?.trim() || null,
        model: item.model?.trim() || null,
        brand: item.brand?.trim() || null,
        category: item.item_type === 'product' ? 'phones' : 'accessories', // Set category based on item type
        type: item.type?.trim() || null, // Accessory type
        currency: item.currency || 'IQD' // Item currency
      }));

      const purchaseData = {
        company_name: companyName.trim(),
        description: description.trim(),
        items: processedItems,
        type: 'withItems',
        payment_status: paymentStatus,
        currency: currency,
        multi_currency: multiCurrency.enabled ? multiCurrency : null,
        discount: discount.enabled && discount.value ? {
          discount_type: discount.type,
          discount_value: parseFloat(discount.value)
        } : null
      };

      await onSubmit(purchaseData);
      
      // Reset form only on successful submission
      setCompanyName('');
      setDescription('');
      setSimpleAmount('');
      setItems([]);
      setPurchaseType('simple');
      setPaymentStatus(isCompanyDebtMode ? 'debt' : 'paid');
    }
  };

  if (!show) return null;

  return (
    <ModalBase show={show} onClose={onClose} maxWidth="4xl">
      <div className="max-h-[80vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
            ➕ {isCompanyDebtMode ? (t?.addCompanyDebt || 'Add Company Debt') : (t?.addPurchase || 'Add Purchase')}
          </h2>

        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t?.companyName || 'Company Name'} *
          </label>
          <input
            className="w-full border rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t?.enterCompanyName || 'Enter company name'}
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t?.description || 'Description'} ({t?.optional || 'optional'})
          </label>
          <textarea
            className="w-full border rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t?.enterDescription || 'Enter description'}
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        {/* Purchase Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t?.purchaseType || 'Purchase Type'}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPurchaseType('simple')}
              className={`p-4 rounded-xl border-2 transition-all ${
                purchaseType === 'simple'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">💰</div>
                <div className="font-semibold">{t?.simplePurchase || 'Simple Purchase'}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t?.justAmount || 'Just specify the amount'}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setPurchaseType('withItems')}
              className={`p-4 rounded-xl border-2 transition-all ${
                purchaseType === 'withItems'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">📦</div>
                <div className="font-semibold">{t?.purchaseWithItems || 'Purchase with Items'}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t?.addItemsToInventory || 'Add items to inventory'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Payment Status Selection */}
        {!isCompanyDebtMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t?.paymentStatus || 'Payment Status'}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentStatus('debt')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  paymentStatus === 'debt'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">📝</div>
                  <div className="font-semibold">{t?.buyOnCredit || 'Buy on Credit'}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t?.payLaterCreatesDebt || 'Pay later - creates company debt'}
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('paid')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  paymentStatus === 'paid'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">💳</div>
                  <div className="font-semibold">{t?.payNow || 'Pay Now'}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t?.immediatePaymentHistory || 'Immediate payment - goes to buying history'}
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Show locked payment status for company debt mode */}
        {isCompanyDebtMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t?.paymentStatus || 'Payment Status'}
            </label>
            <div className="p-4 rounded-xl border-2 border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300">
              <div className="text-center">
                <div className="text-2xl mb-2">📝</div>
                <div className="font-semibold">{t?.buyOnCredit || 'Buy on Credit'}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t?.companyDebtMode || 'Company debt mode - payment will be tracked as unpaid debt'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Currency Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t?.currency || 'Currency'}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`p-4 rounded-xl border-2 transition-all ${
                currency === 'USD'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">💵</div>
                <div className="font-semibold">USD ($)</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t?.usDollars || 'US Dollars'}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setCurrency('IQD')}
              className={`p-4 rounded-xl border-2 transition-all ${
                currency === 'IQD'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">🪙</div>
                <div className="font-semibold">IQD (د.ع)</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t?.iraqiDinars || 'Iraqi Dinars'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Simple Purchase Amount */}
        {purchaseType === 'simple' && (
          <div className="space-y-4">
            {/* Single Currency Amount */}
            {!multiCurrency.enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t?.amount || 'Amount'} ({currency === 'USD' ? '$' : 'د.ع'}) *
                </label>
                <div className="relative">
                  <input
                    className="w-full border rounded-lg px-4 py-2 pl-8 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    value={simpleAmount}
                    onChange={e => setSimpleAmount(e.target.value)}
                    type="number"
                    min="0.01"
                    step="0.01"
                    required={purchaseType === 'simple' && !multiCurrency.enabled}
                  />
                  <span className="absolute left-2 top-2 text-gray-600 dark:text-gray-400">
                    {currency === 'USD' ? '$' : 'د.ع'}
                  </span>
                </div>
              </div>
            )}

            {/* Multi-Currency Payment Toggle */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t?.multiCurrencyPayment || 'Multi-Currency Payment'}
                </label>
                <button
                  type="button"
                  onClick={() => setMultiCurrency(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    multiCurrency.enabled
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {multiCurrency.enabled ? (t?.enabled || 'Enabled') : (t?.disabled || 'Disabled')}
                </button>
              </div>
              
              {multiCurrency.enabled && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      {t?.usdAmount || 'USD Amount'}
                    </label>
                    <input
                      type="number"
                      value={multiCurrency.usdAmount}
                      onChange={(e) => setMultiCurrency(prev => ({ ...prev, usdAmount: Number(e.target.value) || 0 }))}
                      placeholder="0"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      {t?.iqdAmount || 'IQD Amount'}
                    </label>
                    <input
                      type="number"
                      value={multiCurrency.iqdAmount}
                      onChange={(e) => setMultiCurrency(prev => ({ ...prev, iqdAmount: Number(e.target.value) || 0 }))}
                      placeholder="0"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {t?.totalAmount || 'Total Amount'}: {currency === 'USD' 
                      ? `$${(multiCurrency.usdAmount + (multiCurrency.iqdAmount / EXCHANGE_RATES.USD_TO_IQD)).toFixed(2)}`
                      : `د.ع${(multiCurrency.iqdAmount + (multiCurrency.usdAmount * EXCHANGE_RATES.USD_TO_IQD)).toFixed(2)}`
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Items Section */}
        {purchaseType === 'withItems' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                📦 {t?.items || 'Items'}
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addItem('product')}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
                >
                  📱 {t?.addProduct || 'Add Product'}
                </button>
                <button
                  type="button"
                  onClick={() => addItem('accessory')}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                >
                  🎧 {t?.addAccessory || 'Add Accessory'}
                </button>
              </div>
            </div>

            {items.length === 0 && (
              <div className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <p>{t?.noItemsAdded || 'No items added yet'}</p>
                <p className="text-sm">{t?.clickAddButtons || 'Click the buttons above to add items'}</p>
              </div>
            )}

            {items.map((item) => (
              <div key={item.id} className={`p-4 border rounded-lg ${
                item.item_type === 'product' 
                  ? 'border-purple-300 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-700' 
                  : 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
              }`}>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    {item.item_type === 'product' ? '📱' : '🎧'}
                    {item.item_type === 'product' ? (t?.product || 'Product') : (t?.accessory || 'Accessory')}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-red-600 hover:text-red-800 font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Product-specific fields - Brand and Model only */}
                  {item.item_type === 'product' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {t?.brand || 'Brand'} *
                        </label>
                        <SearchableSelect
                          options={brandOptions}
                          value={item.brand}
                          onChange={(value) => {
                            updateItem(item.id, 'brand', value);
                            // Clear model when brand changes
                            updateItem(item.id, 'model', '');
                          }}
                          placeholder={t?.selectBrand || 'Select or type brand...'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {t?.model || 'Model'} *
                        </label>
                        <SearchableSelect
                          key={`model_${item.id}_${item.brand}`} // Force re-render when brand changes
                          options={item.brand ? (phoneBrands.find(b => b.name === item.brand)?.models || []) : []}
                          value={item.model}
                          onChange={(value) => updateItem(item.id, 'model', value)}
                          placeholder={item.brand ? (t?.selectModel || 'Select or type model...') : (t?.selectBrandFirst || 'Select brand first')}
                        />
                      </div>
                      <div></div> {/* Empty div for grid spacing */}
                    </>
                  )}

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {t?.quantity || 'Quantity'} *
                    </label>
                    <input
                      className="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="1"
                      value={item.quantity}
                      onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                      type="number"
                      min="1"
                      required
                    />
                  </div>

                  {/* Unit Price */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {t?.unitPrice || 'Unit Price'} *
                    </label>
                    <input
                      className="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="0.00"
                      value={item.unit_price}
                      onChange={e => updateItem(item.id, 'unit_price', e.target.value)}
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>

                  {/* Item Currency */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {t?.currency || 'Currency'} *
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => updateItem(item.id, 'currency', 'USD')}
                        className={`px-3 py-2 text-sm font-medium rounded-l border transition ${
                          item.currency === 'USD'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        USD
                      </button>
                      <button
                        type="button"
                        onClick={() => updateItem(item.id, 'currency', 'IQD')}
                        className={`px-3 py-2 text-sm font-medium rounded-r border transition ${
                          item.currency === 'IQD'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        IQD
                      </button>
                    </div>
                  </div>

                  {/* Product-specific fields */}
                  {item.item_type === 'product' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          RAM
                        </label>
                        <SearchableSelect
                          options={ramOptions}
                          value={item.ram}
                          onChange={(value) => updateItem(item.id, 'ram', value)}
                          placeholder={t?.selectRAM || 'Select or type RAM...'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {t?.storage || 'Storage'}
                        </label>
                        <SearchableSelect
                          options={storageOptions}
                          value={item.storage}
                          onChange={(value) => updateItem(item.id, 'storage', value)}
                          placeholder={t?.selectStorage || 'Select or type storage...'}
                        />
                      </div>
                      <div></div> {/* Empty div for grid spacing */}
                    </>
                  )}

                  {/* Accessory-specific fields */}
                  {item.item_type === 'accessory' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {t?.brand || 'Brand'} *
                        </label>
                        <SearchableSelect
                          options={brandOptions}
                          value={item.brand}
                          onChange={(value) => {
                            updateItem(item.id, 'brand', value);
                            // Clear model when brand changes
                            updateItem(item.id, 'model', '');
                          }}
                          placeholder={t?.selectBrand || 'Select or type brand...'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {t?.model || 'Model'} *
                        </label>
                        <SearchableSelect
                          key={`model_${item.id}_${item.brand}`} // Force re-render when brand changes
                          options={item.brand ? (accessoryModels[item.brand] || accessoryModels['Generic'] || []) : []}
                          value={item.model}
                          onChange={(value) => updateItem(item.id, 'model', value)}
                          placeholder={item.brand ? (t?.selectModel || 'Select or type model...') : (t?.selectBrandFirst || 'Select brand first')}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {t?.type || 'Type'}
                        </label>
                        <select
                          value={item.type}
                          onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                          className="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          <option value="">{t?.selectType || 'Select Type'}</option>
                          <option value="headphones">{t?.headphones || 'Headphones'}</option>
                          <option value="earbuds">{t?.earbuds || 'Earbuds'}</option>
                          <option value="charger">{t?.charger || 'Charger'}</option>
                          <option value="cable">{t?.cable || 'Cable'}</option>
                          <option value="case">{t?.case || 'Case'}</option>
                          <option value="screen-protector">{t?.screenProtector || 'Screen Protector'}</option>
                          <option value="power-bank">{t?.powerBank || 'Power Bank'}</option>
                          <option value="wireless-charger">{t?.wirelessCharger || 'Wireless Charger'}</option>
                          <option value="speaker">{t?.speaker || 'Speaker'}</option>
                          <option value="smartwatch">{t?.smartwatch || 'Smart Watch'}</option>
                          <option value="other">{t?.other || 'Other'}</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {/* Total for this item */}
                <div className="mt-3 text-right">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t?.itemTotal || 'Item Total'}: 
                  </span>
                  <span className="ml-2 font-bold text-green-600 dark:text-green-400">
                    {item.currency === 'USD' ? '$' : 'د.ع'}{((parseInt(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}

            {/* Discount Section */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t?.discount || 'Discount'}
                </label>
                <button
                  type="button"
                  onClick={() => setDiscount(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {discount.enabled ? '−' : '+'}
                </button>
              </div>
              
              {discount.enabled && (
                <div className="space-y-3">
                  {/* Discount Type */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscount(prev => ({ ...prev, type: 'percentage' }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        discount.type === 'percentage'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                    >
                      % {t?.percentage || 'Percentage'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscount(prev => ({ ...prev, type: 'amount' }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        discount.type === 'amount'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                    >
                      {currency === 'USD' ? '$' : 'د.ع'} {t?.amount || 'Amount'}
                    </button>
                  </div>
                  
                  {/* Discount Value */}
                  <input
                    type="number"
                    value={discount.value}
                    onChange={(e) => setDiscount(prev => ({ ...prev, value: e.target.value }))}
                    placeholder={discount.type === 'percentage' ? '10' : '50'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max={discount.type === 'percentage' ? '100' : undefined}
                  />
                  
                  {discount.value && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {discount.type === 'percentage' 
                        ? `${discount.value}% discount` 
                        : `${currency === 'USD' ? '$' : 'د.ع'}${discount.value} discount`
                      }
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Multi-Currency Payment */}
            {paymentStatus === 'paid' && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t.multiCurrencyPayment}
                  </label>
                  <button
                    type="button"
                    onClick={() => setMultiCurrency(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      multiCurrency.enabled
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {multiCurrency.enabled ? t.enabled : t.disabled}
                  </button>
                </div>
                
                {multiCurrency.enabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                        {t.usdAmount}
                      </label>
                      <input
                        type="number"
                        value={multiCurrency.usdAmount}
                        onChange={(e) => setMultiCurrency(prev => ({ ...prev, usdAmount: Number(e.target.value) || 0 }))}
                        placeholder="0"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                        {t.iqdAmount}
                      </label>
                      <input
                        type="number"
                        value={multiCurrency.iqdAmount}
                        onChange={(e) => setMultiCurrency(prev => ({ ...prev, iqdAmount: Number(e.target.value) || 0 }))}
                        placeholder="0"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      />
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {t.totalPaid}: {currency === 'USD' 
                        ? `$${(multiCurrency.usdAmount + (multiCurrency.iqdAmount / EXCHANGE_RATES.USD_TO_IQD)).toFixed(2)}`
                        : `د.ع${(multiCurrency.iqdAmount + (multiCurrency.usdAmount * EXCHANGE_RATES.USD_TO_IQD)).toFixed(2)}`
                      }
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Total Amount */}
            {(items.length > 0 || (purchaseType === 'simple' && (simpleAmount || multiCurrency.enabled))) && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    {t?.totalAmount || 'Total Amount'}:
                  </span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {purchaseType === 'simple' && multiCurrency.enabled ? (
                      <div className="text-right">
                        {multiCurrency.usdAmount > 0 && (
                          <div className="text-sm">USD: ${multiCurrency.usdAmount.toFixed(2)}</div>
                        )}
                        {multiCurrency.iqdAmount > 0 && (
                          <div className="text-sm">IQD: د.ع{multiCurrency.iqdAmount.toFixed(2)}</div>
                        )}
                        <div className="border-t pt-1">
                          {currency === 'USD' ? '$' : 'د.ع'}{calculateTotal().toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      `${currency === 'USD' ? '$' : 'د.ع'}${calculateTotal().toFixed(2)}`
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-6 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500 transition"
          >
            {t?.cancel || 'Cancel'}
          </button>
          <button 
            type="submit" 
            className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold transition"
          >
            ➕ {t?.addPurchase || 'Add Purchase'}
          </button>
        </div>
        </form>
      </div>
    </ModalBase>
  );
}
