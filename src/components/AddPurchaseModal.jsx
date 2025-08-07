import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ModalBase from './ModalBase';
import { phoneBrands, accessoryModels } from './phoneBrands';
import SearchableSelect from './SearchableSelect';
import AutocompleteInput from './AutocompleteInput';
import { EXCHANGE_RATES, loadExchangeRatesFromDB } from '../utils/exchangeRates';
import { useSmartSuggestions } from '../utils/smartSuggestions';
import { Icon } from '../utils/icons.jsx';

export default function AddPurchaseModal({ show, onClose, onSubmit, t, isCompanyDebtMode = false, admin }) {
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [purchaseType, setPurchaseType] = useState('simple'); // 'simple' or 'withItems'
  const [paymentStatus, setPaymentStatus] = useState(isCompanyDebtMode ? 'debt' : 'paid'); // 'debt' or 'paid'
  const [currency, setCurrency] = useState('IQD'); // 'USD' or 'IQD'
  const [simpleAmount, setSimpleAmount] = useState('');
  const [items, setItems] = useState([]);
  const [multiCurrency, setMultiCurrency] = useState({ enabled: false, usdAmount: 0, iqdAmount: 0 });
  const [discount, setDiscount] = useState({
    enabled: false,
    type: 'percentage', // 'percentage' or 'amount'
    value: ''
  });
  const [currentExchangeRates, setCurrentExchangeRates] = useState({ ...EXCHANGE_RATES });

  // Smart suggestions for products and accessories
  const { 
    productBrands,
    accessoryBrands,
    getProductModelsForBrand,
    getAccessoryModelsForBrand,
    accessoryTypes,
    existingRamOptions,
    existingStorageOptions
  } = useSmartSuggestions();

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

  // Load current exchange rates and balances when modal opens
  useEffect(() => {
    if (show) {
      // Load exchange rates
      loadExchangeRatesFromDB().then(success => {
        if (success) {
          // Exchange rates were loaded successfully and are now in EXCHANGE_RATES
          setCurrentExchangeRates({ ...EXCHANGE_RATES });
        } else {
          // Failed to load, but EXCHANGE_RATES should have the defaults
          setCurrentExchangeRates({ ...EXCHANGE_RATES });
        }
      }).catch(error => {
        console.error('Failed to load exchange rates:', error);
        // Keep using EXCHANGE_RATES as fallback
        setCurrentExchangeRates({ ...EXCHANGE_RATES });
      });

      // Load current balances to ensure fresh data
      if (admin?.loadBalances) {
        admin.loadBalances();
      }
    }
  }, [show, admin]);

  // Quick exchange rate change handler
  const handleQuickExchangeRateChange = useCallback(async () => {
    try {
      const success = await loadExchangeRatesFromDB();
      if (success) {
        // Exchange rates were reloaded successfully
        setCurrentExchangeRates({ ...EXCHANGE_RATES });
      } else {
        // Failed to reload, but use current EXCHANGE_RATES
        setCurrentExchangeRates({ ...EXCHANGE_RATES });
      }
    } catch (error) {
      console.error('Failed to reload exchange rates:', error);
      // Fallback to current EXCHANGE_RATES
      setCurrentExchangeRates({ ...EXCHANGE_RATES });
    }
  }, []);

  // Memoize options to prevent recreating arrays on every render and include smart suggestions
  const productBrandOptions = useMemo(() => {
    const staticBrands = phoneBrands.map(brand => brand.name);
    const allBrands = [...new Set([...staticBrands, ...productBrands])];
    return allBrands.sort((a, b) => a.localeCompare(b));
  }, [productBrands]);

  const accessoryBrandOptions = useMemo(() => {
    const staticBrands = phoneBrands.map(brand => brand.name);
    const allBrands = [...new Set([...staticBrands, ...accessoryBrands])];
    return allBrands.sort((a, b) => a.localeCompare(b));
  }, [accessoryBrands]);

  const ramOptions = useMemo(() => {
    const staticRam = ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB', '18GB', '24GB'];
    const allRam = [...new Set([...staticRam, ...existingRamOptions])];
    return allRam.sort((a, b) => a.localeCompare(b));
  }, [existingRamOptions]);

  const storageOptions = useMemo(() => {
    const staticStorage = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
    const allStorage = [...new Set([...staticStorage, ...existingStorageOptions])];
    return allStorage.sort((a, b) => a.localeCompare(b));
  }, [existingStorageOptions]);

  const accessoryTypeOptions = useMemo(() => {
    const staticTypes = ['headphones', 'earbuds', 'charger', 'cable', 'case', 'screen-protector', 'power-bank', 'wireless-charger', 'speaker', 'smartwatch', 'other'];
    const allTypes = [...new Set([...staticTypes, ...accessoryTypes])];
    return allTypes.sort((a, b) => a.localeCompare(b));
  }, [accessoryTypes]);

  // Helper function to get model suggestions for a specific brand
  const getProductModelOptions = useCallback((brand) => {
    if (!brand) return [];
    
    // Get models from static data
    const staticModels = phoneBrands.find(b => b.name === brand)?.models || [];
    
    // Get models from smart suggestions for this brand
    const smartModels = getProductModelsForBrand(brand);
    
    const allModels = [...new Set([...staticModels, ...smartModels])];
    return allModels.sort((a, b) => a.localeCompare(b));
  }, [getProductModelsForBrand]);

  const getAccessoryModelOptions = useCallback((brand) => {
    if (!brand) return [];
    
    // Get models from static data
    const staticModels = accessoryModels[brand] || accessoryModels['Generic'] || [];
    
    // Get models from smart suggestions for this brand
    const smartModels = getAccessoryModelsForBrand(brand);
    
    const allModels = [...new Set([...staticModels, ...smartModels])];
    return allModels.sort((a, b) => a.localeCompare(b));
  }, [getAccessoryModelsForBrand]);

  // Extract unique company names from buying history and company debts for autocomplete
  const companyNameSuggestions = useMemo(() => {
    const names = new Set();
    
    // Get names from admin.buyingHistory (supplier field)
    if (admin?.buyingHistory && Array.isArray(admin.buyingHistory)) {
      admin.buyingHistory.forEach(entry => {
        if (entry.supplier && entry.supplier.trim()) {
          names.add(entry.supplier.trim());
        }
      });
    }
    
    // Get names from admin.companyDebts (company_name field)
    if (admin?.companyDebts && Array.isArray(admin.companyDebts)) {
      admin.companyDebts.forEach(debt => {
        if (debt.company_name && debt.company_name.trim()) {
          names.add(debt.company_name.trim());
        }
      });
    }
    
    // Convert to array and sort alphabetically
    return Array.from(names)
      .filter(name => name !== 'Company debt payment' && name !== 'Personal loan payment' && name !== 'Transaction')
      .sort((a, b) => a.localeCompare(b));
  }, [admin?.buyingHistory, admin?.companyDebts]);

  const addItem = useCallback((type) => {
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
    setItems(prevItems => [...prevItems, newItem]);
  }, []);

  const updateItem = useCallback((id, field, value) => {
    setItems(prevItems => {
      return prevItems.map(item => {
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
    });
  }, []);

  const removeItem = useCallback((id) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  }, []);

  const calculateTotal = useCallback(() => {
    let baseTotal;
    if (purchaseType === 'simple') {
      if (multiCurrency.enabled) {
        // For multi-currency simple purchases, show combined total
        // Convert IQD to USD and add USD amount for display consistency
        const exchangeRate = currentExchangeRates?.USD_TO_IQD || EXCHANGE_RATES.USD_TO_IQD;
        const iqdInUsd = multiCurrency.iqdAmount / exchangeRate;
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
      const exchangeRate = currentExchangeRates?.USD_TO_IQD || EXCHANGE_RATES.USD_TO_IQD;
      if (currency === 'USD') {
        const iqdInUsd = totalIQD / exchangeRate;
        baseTotal = totalUSD + iqdInUsd;
      } else {
        const usdInIqd = totalUSD * exchangeRate;
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
  }, [purchaseType, multiCurrency, simpleAmount, items, currency, discount, currentExchangeRates]);

  const calculateOriginalTotal = useCallback(() => {
    let baseTotal;
    if (purchaseType === 'simple') {
      if (multiCurrency.enabled) {
        // For multi-currency simple purchases, show combined total
        // Convert IQD to USD and add USD amount for display consistency
        const exchangeRate = currentExchangeRates?.USD_TO_IQD || EXCHANGE_RATES.USD_TO_IQD;
        const iqdInUsd = multiCurrency.iqdAmount / exchangeRate;
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
      const exchangeRate = currentExchangeRates?.USD_TO_IQD || EXCHANGE_RATES.USD_TO_IQD;
      if (currency === 'USD') {
        const iqdInUsd = totalIQD / exchangeRate;
        baseTotal = totalUSD + iqdInUsd;
      } else {
        const usdInIqd = totalUSD * exchangeRate;
        baseTotal = totalIQD + usdInIqd;
      }
    }

    return baseTotal;
  }, [purchaseType, multiCurrency, simpleAmount, items, currency, currentExchangeRates]);

  const getDiscountAmount = useCallback(() => {
    if (!discount.enabled || !discount.value) return 0;
    
    const originalTotal = calculateOriginalTotal();
    const discountValue = parseFloat(discount.value) || 0;
    
    if (discount.type === 'percentage') {
      return originalTotal * (discountValue / 100);
    } else {
      return Math.min(discountValue, originalTotal);
    }
  }, [discount, calculateOriginalTotal]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('[AddPurchaseModal] Form submitted with data:', {
      companyName: companyName.trim(),
      description: description.trim(),
      purchaseType,
      paymentStatus,
      currency,
      simpleAmount,
      items,
      multiCurrency,
      discount
    });

    if (!companyName.trim()) {
      admin?.setToast?.(t.pleaseProvideValidCompanyName || 'Please provide a valid company name', 'error');
      return;
    }

    if (purchaseType === 'simple') {
      if (multiCurrency.enabled) {
        // Multi-currency validation
        if (multiCurrency.usdAmount <= 0 && multiCurrency.iqdAmount <= 0) {
          admin?.setToast?.(t.pleaseProvideValidAmount || 'Please provide a valid amount in at least one currency', 'error');
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
          } : null,
          exchange_rate: currentExchangeRates?.USD_TO_IQD || EXCHANGE_RATES.USD_TO_IQD
        };

        await onSubmit(purchaseData);
      } else {
        // Single currency validation
        const amt = parseFloat(simpleAmount);
        if (!simpleAmount || isNaN(amt) || amt <= 0) {
          admin?.setToast?.(t.pleaseProvideValidAmount || 'Please provide a valid amount greater than 0', 'error');
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
          } : null,
          exchange_rate: currentExchangeRates?.USD_TO_IQD || EXCHANGE_RATES.USD_TO_IQD
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
        admin?.setToast?.(t.pleaseAddAtLeastOneItem || 'Please add at least one item', 'error');
        return;
      }

      const invalidItems = items.filter((item) => {
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
        admin?.setToast?.(t.pleaseFillAllRequiredFields || 'Please fill in all required fields for all items (brand, model, quantity, price)', 'error');
        return;
      }

      const processedItems = items.map(item => {
        const originalUnitPrice = parseFloat(item.unit_price);
        const quantity = parseInt(item.quantity);
        
        // Apply discount to individual item price
        let discountedUnitPrice = originalUnitPrice;
        let debugInfo = {
          itemName: item.brand + ' ' + item.model,
          originalUnitPrice,
          discountApplied: false
        };
        
        if (discount.enabled && discount.value) {
          const discountValue = parseFloat(discount.value) || 0;
          debugInfo.discountApplied = true;
          debugInfo.discountType = discount.type;
          debugInfo.discountValue = discountValue;
          
          if (discount.type === 'percentage') {
            discountedUnitPrice = originalUnitPrice * (1 - discountValue / 100);
            debugInfo.calculationType = 'percentage';
          } else {
            // For amount discount, we need to handle multi-currency properly
            // Group items by currency and apply discount proportionally within each currency
            const itemsByCurrency = items.reduce((acc, i) => {
              const curr = i.currency || 'IQD';
              if (!acc[curr]) acc[curr] = [];
              acc[curr].push(i);
              return acc;
            }, {});

            // Calculate total value in each currency
            const totalsByCurrency = {};
            Object.keys(itemsByCurrency).forEach(curr => {
              totalsByCurrency[curr] = itemsByCurrency[curr].reduce((sum, i) => 
                sum + (parseFloat(i.unit_price) * parseInt(i.quantity)), 0
              );
            });

            // For simplicity, apply discount proportionally based on converted values
            // Convert all to IQD for proportion calculation
            const itemTotal = originalUnitPrice * quantity;
            const itemTotalInIQD = item.currency === 'USD' 
              ? itemTotal * (currentExchangeRates?.USD_TO_IQD || EXCHANGE_RATES.USD_TO_IQD)
              : itemTotal;
              
            const totalValueInIQD = items.reduce((sum, i) => {
              const iTotal = parseFloat(i.unit_price) * parseInt(i.quantity);
              return sum + (i.currency === 'USD' 
                ? iTotal * (currentExchangeRates?.USD_TO_IQD || EXCHANGE_RATES.USD_TO_IQD)
                : iTotal);
            }, 0);
            
            const itemProportion = totalValueInIQD > 0 ? itemTotalInIQD / totalValueInIQD : 0;
            
            // Apply discount in the item's original currency
            const discountValueInItemCurrency = item.currency === 'USD' 
              ? discountValue / (currentExchangeRates?.USD_TO_IQD || EXCHANGE_RATES.USD_TO_IQD)
              : discountValue;
              
            const itemDiscountAmount = discountValueInItemCurrency * itemProportion;
            const perUnitDiscount = itemDiscountAmount / quantity;
            discountedUnitPrice = Math.max(0, originalUnitPrice - perUnitDiscount);
            
            debugInfo.calculationType = 'amount';
            debugInfo.itemTotal = itemTotal;
            debugInfo.itemTotalInIQD = itemTotalInIQD;
            debugInfo.totalValueInIQD = totalValueInIQD;
            debugInfo.itemProportion = itemProportion;
            debugInfo.discountValueInItemCurrency = discountValueInItemCurrency;
            debugInfo.itemDiscountAmount = itemDiscountAmount;
            debugInfo.perUnitDiscount = perUnitDiscount;
          }
        }
        
        debugInfo.discountedUnitPrice = discountedUnitPrice;

        console.log('[AddPurchaseModal] Processing item discount:', debugInfo);

        return {
          ...item,
          item_name: item.item_name || [item.brand, item.model].filter(Boolean).join(' '), // Ensure item_name is set
          quantity: quantity,
          unit_price: Math.round(discountedUnitPrice * 100) / 100, // Round to 2 decimal places
          stock: quantity || 0, // Use quantity as initial stock
          total_price: Math.round(discountedUnitPrice * quantity * 100) / 100, // Calculate with discounted price
          buying_price: Math.round(discountedUnitPrice * 100) / 100, // Same as discounted unit price for buying
          ram: item.ram?.trim() || null,
          storage: item.storage?.trim() || null,
          model: item.model?.trim() || null,
          brand: item.brand?.trim() || null,
          category: item.item_type === 'product' ? 'phones' : 'accessories', // Set category based on item type
          type: item.type?.trim() || null, // Accessory type
          currency: item.currency || 'IQD' // Item currency
        };
      });

      console.log('[AddPurchaseModal] Purchase submission with discount:', {
        discountEnabled: discount.enabled,
        discountType: discount.type,
        discountValue: discount.value,
        totalItemsCount: items.length,
        originalTotalValue: items.reduce((sum, i) => sum + (parseFloat(i.unit_price) * parseInt(i.quantity)), 0),
        originalTotalValueInIQD: items.reduce((sum, i) => {
          const iTotal = parseFloat(i.unit_price) * parseInt(i.quantity);
          return sum + (i.currency === 'USD' 
            ? iTotal * (currentExchangeRates?.USD_TO_IQD || EXCHANGE_RATES.USD_TO_IQD)
            : iTotal);
        }, 0),
        processedItemsCount: processedItems.length,
        processedTotalValue: processedItems.reduce((sum, i) => sum + i.total_price, 0),
        exchangeRate: currentExchangeRates?.USD_TO_IQD || EXCHANGE_RATES.USD_TO_IQD,
        itemCurrencies: items.map(i => ({ name: i.brand + ' ' + i.model, currency: i.currency, price: i.unit_price }))
      });

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
        } : null,
        exchange_rate: currentExchangeRates?.USD_TO_IQD || EXCHANGE_RATES.USD_TO_IQD
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
      <div className="max-h-[80vh] overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="plus" size={24} />
              {isCompanyDebtMode ? (t?.addCompanyDebt || 'Add Company Debt') : (t?.addPurchase || 'Add Purchase')}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                1 USD = {currentExchangeRates?.USD_TO_IQD?.toLocaleString() || 'Loading...'} IQD
              </span>
              <button
                type="button"
                onClick={handleQuickExchangeRateChange}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                title="Refresh exchange rate"
              >
                <Icon name="refresh" size={16} />
              </button>
            </div>
          </h2>

        {/* Company Name and Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t?.companyName || 'Company Name'} *
            </label>
            <AutocompleteInput
              value={companyName}
              onChange={setCompanyName}
              suggestions={companyNameSuggestions}
              placeholder={t?.enterCompanyName || 'Enter company name'}
              className="w-full border rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              t={t}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t?.description || 'Description'} ({t?.optional || 'optional'})
            </label>
            <textarea
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t?.enterDescription || 'Enter description'}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>
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
              className={`p-2 rounded-lg border-2 transition-all ${
                purchaseType === 'simple'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1 flex justify-center">
                  <Icon name="dollarSign" size={20} />
                </div>
                <div className="font-medium text-sm text-gray-800 dark:text-gray-100">{t?.simplePurchase || 'Simple Purchase'}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t?.justAmount || 'Just specify the amount'}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setPurchaseType('withItems')}
              className={`p-2 rounded-lg border-2 transition-all ${
                purchaseType === 'withItems'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1 flex justify-center">
                  <Icon name="package" size={20} />
                </div>
                <div className="font-medium text-sm text-gray-800 dark:text-gray-100">{t?.purchaseWithItems || 'Purchase with Items'}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
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
                className={`p-2 rounded-lg border-2 transition-all ${
                  paymentStatus === 'debt'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg mb-1 flex justify-center">
                    <Icon name="edit" size={20} />
                  </div>
                  <div className="font-medium text-sm text-gray-800 dark:text-gray-100">{t?.buyOnCredit || 'Buy on Credit'}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {t?.payLaterCreatesDebt || 'Pay later - creates company debt'}
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('paid')}
                className={`p-2 rounded-lg border-2 transition-all ${
                  paymentStatus === 'paid'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg mb-1 flex justify-center">
                    <Icon name="creditCard" size={20} />
                  </div>
                  <div className="font-medium text-sm text-gray-800 dark:text-gray-100">{t?.payNow || 'Pay Now'}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
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
                <div className="text-2xl mb-2 flex justify-center">
                  <Icon name="edit" size={32} />
                </div>
                <div className="font-semibold text-gray-800 dark:text-gray-100">{t?.buyOnCredit || 'Buy on Credit'}</div>
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
              className={`p-2 rounded-lg border-2 transition-all ${
                currency === 'USD'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1 flex justify-center">
                  <Icon name="dollarSign" size={20} />
                </div>
                <div className="font-medium text-sm text-gray-800 dark:text-gray-100">USD ($)</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t?.usDollars || 'US Dollars'}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setCurrency('IQD')}
              className={`p-2 rounded-lg border-2 transition-all ${
                currency === 'IQD'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1 flex justify-center">
                  <Icon name="coins" size={20} />
                </div>
                <div className="font-medium text-sm text-gray-800 dark:text-gray-100">IQD (د.ع)</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
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
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pl-8 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            
            {/* Single Currency Payment Summary */}
            {!multiCurrency.enabled && paymentStatus === 'paid' && simpleAmount && parseFloat(simpleAmount) > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <div className="font-medium mb-2">{t.paymentSummary || 'Payment Summary'}:</div>
                  <div className="flex justify-between">
                    <span>{t.totalRequired || 'Total Required'}:</span>
                    <span className="font-medium">
                      {currency === 'USD' ? '$' : 'د.ع'}{calculateTotal().toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.totalPaid || 'Total Paid'}:</span>
                    <span className="font-medium">
                      {currency === 'USD' 
                        ? `$${(() => {
                            const amount = parseFloat(simpleAmount);
                            if (Math.abs(amount) < 0.1) return Math.round(amount);
                            const rounded = Math.round(amount * 100) / 100;
                            return rounded % 1 === 0 ? Math.floor(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
                          })()} `
                        : `د.ع${Math.round(parseFloat(simpleAmount)).toLocaleString()}`
                      }
                    </span>
                  </div>
                  
                  {/* Payment Status for Single Currency */}
                  {(() => {
                    const requiredAmount = calculateTotal();
                    const paidAmount = parseFloat(simpleAmount) || 0;
                    
                    if (paidAmount > requiredAmount) {
                      const change = paidAmount - requiredAmount;
                      return (
                        <div className="border-t border-blue-200 dark:border-blue-700 pt-2 mt-2">
                          <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                            {t.change || 'Change'}: {currency === 'USD' ? '$' : 'د.ع'}{change.toFixed(2)}
                          </div>
                        </div>
                      );
                    }
                    
                    if (paidAmount < requiredAmount) {
                      const remaining = requiredAmount - paidAmount;
                      return (
                        <div className="border-t border-blue-200 dark:border-blue-700 pt-2 mt-2">
                          <div className="text-sm text-red-600 dark:text-red-400">
                            {t.remaining || 'Remaining'}: {currency === 'USD' ? '$' : 'د.ع'}{remaining.toFixed(2)}
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="border-t border-blue-200 dark:border-blue-700 pt-2 mt-2">
                        <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                          ✓ {t.exactAmount || 'Exact Amount'}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                {/* Current Balance Display for Single Currency */}
                {admin && (
                  <div className="border-t border-blue-200 dark:border-blue-700 pt-2 mt-2">
                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                      {t.currentBalances || 'Current Balances'}:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center">
                        <div className="text-sm font-bold text-green-600 dark:text-green-400">
                          ${(admin.balanceUSD || 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t.usdBalance || 'USD'}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                          د.ع{(admin.balanceIQD || 0).toFixed(0)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t.iqdBalance || 'IQD'}</div>
                      </div>
                    </div>
                  </div>
                )}
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
                  className={`px-3 py-1 rounded text-sm transition-colors border ${
                    multiCurrency.enabled
                      ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500 hover:bg-gray-300 dark:hover:bg-gray-500'
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
                    <div className="flex flex-col gap-1">
                      <div>{t?.totalAmount || 'Total Amount'}:</div>
                      <div className="font-semibold text-gray-800 dark:text-gray-100">
                        {multiCurrency.usdAmount > 0 && <div>USD: ${multiCurrency.usdAmount.toFixed(2)}</div>}
                        {multiCurrency.iqdAmount > 0 && <div>IQD: د.ع{multiCurrency.iqdAmount.toFixed(2)}</div>}
                      </div>
                    </div>
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
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Icon name="package" size={20} /> {t?.items || 'Items'}
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addItem('product')}
                  className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm flex items-center gap-2"
                >
                  <Icon name="smartphone" size={16} /> {t?.addProduct || 'Add Product'}
                </button>
                <button
                  type="button"
                  onClick={() => addItem('accessory')}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center gap-2"
                >
                  <Icon name="headphones" size={16} /> {t?.addAccessory || 'Add Accessory'}
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
                  <h4 className="font-medium text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Icon name={item.item_type === 'product' ? 'smartphone' : 'headphones'} size={16} />
                    {item.item_type === 'product' ? (t?.product || 'Product') : (t?.accessory || 'Accessory')}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 rounded-full p-1.5 transition-all shadow-sm hover:shadow-md"
                    title={t?.removeItem || 'Remove item'}
                  >
                    <Icon name="x" size={16} />
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
                          options={productBrandOptions}
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
                          options={getProductModelOptions(item.brand)}
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
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className={`px-3 py-1 text-sm font-medium rounded-l border transition ${
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
                        className={`px-3 py-1 text-sm font-medium rounded-r border transition ${
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
                          options={accessoryBrandOptions}
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
                          options={getAccessoryModelOptions(item.brand)}
                          value={item.model}
                          onChange={(value) => updateItem(item.id, 'model', value)}
                          placeholder={item.brand ? (t?.selectModel || 'Select or type model...') : (t?.selectBrandFirst || 'Select brand first')}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {t?.type || 'Type'}
                        </label>
                        <SearchableSelect
                          options={accessoryTypeOptions}
                          value={item.type}
                          onChange={(value) => updateItem(item.id, 'type', value)}
                          placeholder={t?.selectType || 'Select or type type...'}
                        />

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
                    {(() => {
                      const total = (parseInt(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                      if (item.currency === 'USD') {
                        if (Math.abs(total) < 0.1) return `$${Math.round(total)}`;
                        const rounded = Math.round(total * 100) / 100;
                        return rounded % 1 === 0 ? `$${Math.floor(rounded)}` : `$${rounded.toFixed(2).replace(/\.?0+$/, '')}`;
                      } else {
                        return `د.ع${Math.round(total).toLocaleString()}`;
                      }
                    })()}
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
                  className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 text-blue-700 dark:text-blue-300 rounded-lg px-3 py-1.5 flex items-center justify-center text-sm font-bold transition-all min-w-[60px]"
                  title={discount.enabled ? 'Disable discount' : 'Enable discount'}
                >
                  {discount.enabled ? '− Remove' : '+ Add'}
                </button>
              </div>
              
              {discount.enabled && (
                <div className="space-y-3">
                  {/* Discount Type */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscount(prev => ({ ...prev, type: 'percentage' }))}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
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
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
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
                    <div className="mt-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                          <span>{t?.originalAmount || 'Original Amount'}:</span>
                          <span className="line-through">
                            {currency === 'USD' ? '$' : 'د.ع'}{calculateOriginalTotal().toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                          <span>{t?.discountAmount || 'Discount'}:</span>
                          <span>
                            -{currency === 'USD' ? '$' : 'د.ع'}{getDiscountAmount().toFixed(2)}
                            {discount.type === 'percentage' ? ` (${discount.value}%)` : ''}
                          </span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-green-600 dark:text-green-400 text-base border-t pt-1">
                          <span>{t?.finalAmount || 'Final Amount'}:</span>
                          <span>
                            {currency === 'USD' ? '$' : 'د.ع'}{calculateTotal().toFixed(2)}
                          </span>
                        </div>
                        <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {t?.youSave || 'You save'}: {currency === 'USD' ? '$' : 'د.ع'}{getDiscountAmount().toFixed(2)}
                        </div>
                      </div>
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
                      <div>{t.totalPaid}:</div>
                      <div className="flex flex-col gap-1">
                        <div>${(multiCurrency.usdAmount + (multiCurrency.iqdAmount / EXCHANGE_RATES.USD_TO_IQD)).toFixed(2)}</div>
                        <div>د.ع{(multiCurrency.iqdAmount + (multiCurrency.usdAmount * EXCHANGE_RATES.USD_TO_IQD)).toFixed(2)}</div>
                      </div>
                    </div>
                    
                    {/* Payment Summary - like cashier page */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2 mt-3">
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex justify-between">
                          <span>{t.totalRequired || 'Total Required'}:</span>
                          <span className="font-medium">
                            {currency === 'USD' ? '$' : 'د.ع'}{calculateTotal().toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t.totalPaid || 'Total Paid'}:</span>
                          <span className="font-medium">
                            {currency === 'USD' 
                              ? `$${(multiCurrency.usdAmount + (multiCurrency.iqdAmount / EXCHANGE_RATES.USD_TO_IQD)).toFixed(2)}`
                              : `د.ع${(multiCurrency.iqdAmount + (multiCurrency.usdAmount * EXCHANGE_RATES.USD_TO_IQD)).toFixed(2)}`
                            }
                          </span>
                        </div>
                      </div>
                      
                      {/* Payment Status - Remaining/Change/Exact */}
                      {(() => {
                        const totalRequiredUSD = currency === 'USD' ? calculateTotal() : calculateTotal() / EXCHANGE_RATES.USD_TO_IQD;
                        const totalPaidUSD = multiCurrency.usdAmount + (multiCurrency.iqdAmount / EXCHANGE_RATES.USD_TO_IQD);
                        
                        if (totalPaidUSD > totalRequiredUSD) {
                          const changeUSD = totalPaidUSD - totalRequiredUSD;
                          return (
                            <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                {t.change || 'Change'}: ${changeUSD.toFixed(2)}
                                <div className="text-xs">
                                  (≈ د.ع{(changeUSD * EXCHANGE_RATES.USD_TO_IQD).toFixed(0)})
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        if (totalPaidUSD < totalRequiredUSD) {
                          const remainingUSD = totalRequiredUSD - totalPaidUSD;
                          return (
                            <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                              <div className="text-sm text-red-600 dark:text-red-400">
                                {t.remaining || 'Remaining'}: ${remainingUSD.toFixed(2)}
                                <div className="text-xs">
                                  (≈ د.ع{(remainingUSD * EXCHANGE_RATES.USD_TO_IQD).toFixed(0)})
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                            <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                              ✓ {t.exactAmount || 'Exact Amount'}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Current Balance Display - like debt payment modals */}
                    {admin && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mt-3">
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                          {t.currentBalances || 'Current Balances'}:
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                              ${(admin.balanceUSD || 0).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t.usdBalance || 'USD Balance'}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                              د.ع{(admin.balanceIQD || 0).toFixed(0)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t.iqdBalance || 'IQD Balance'}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons with Total */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Total Display */}
          {(items.length > 0 || (purchaseType === 'simple' && (simpleAmount || multiCurrency.enabled))) && (
            <div className="flex-1">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {discount.enabled && discount.value && calculateOriginalTotal() > 0 
                      ? (t?.finalTotal || 'Final Total')
                      : (t?.total || 'Total')
                    }:
                  </span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {purchaseType === 'simple' && multiCurrency.enabled ? (
                      <div className="text-right">
                        {multiCurrency.usdAmount > 0 && (
                          <div className="text-xs">USD: ${multiCurrency.usdAmount.toFixed(2)}</div>
                        )}
                        {multiCurrency.iqdAmount > 0 && (
                          <div className="text-xs">IQD: د.ع{multiCurrency.iqdAmount.toFixed(2)}</div>
                        )}
                      </div>
                    ) : (
                      `${currency === 'USD' ? '$' : 'د.ع'}${calculateTotal().toFixed(2)}`
                    )}
                  </span>
                </div>
                {/* Savings indicator */}
                {discount.enabled && discount.value && getDiscountAmount() > 0 && (
                  <div className="text-center mt-1">
                    <span className="text-green-700 dark:text-green-400 font-medium text-xs">
                      💰 {t?.saved || 'Saved'}: {currency === 'USD' ? '$' : 'د.ع'}{getDiscountAmount().toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Buttons */}
          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500 transition flex items-center gap-2"
            >
              <Icon name="x" size={16} />
              {t?.cancel || 'Cancel'}
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold transition flex items-center gap-2"
            >
              <Icon name="plus" size={16} />
              {isCompanyDebtMode ? (t?.addCompanyDebt || 'Add Company Debt') : (t?.addPurchase || 'Add Purchase')}
            </button>
          </div>
        </div>
        </form>
      </div>
    </ModalBase>
  );
}
