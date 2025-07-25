import React, { useState, useMemo, useEffect, useRef } from 'react';
import { EXCHANGE_RATES, formatCurrency } from '../utils/exchangeRates';
import { Icon } from '../utils/icons.jsx';
import ModalBase from './ModalBase';

const ReturnModal = ({ 
  show, 
  onClose, 
  returnData, // { type: 'buying' | 'sales', entry: {}, maxQuantity: number }
  onConfirm, 
  admin, 
  t 
}) => {
  // Determine if this is a full entry return or individual item return
  const isFullEntryReturn = !returnData?.isItemReturn;
  
  // Initialize return quantity based on return type
  const [returnQuantity, setReturnQuantity] = useState(() => {
    if (isFullEntryReturn && returnData?.entry) {
      return returnData.entry.quantity || returnData.maxQuantity || 1;
    }
    return 1;
  });
  
  // Initialize return currency based on original purchase currency
  const [returnCurrency, setReturnCurrency] = useState(() => {
    if (returnData?.entry) {
      const entry = returnData.entry;
      if (entry.currency === 'MULTI') {
        return 'MULTI'; // Will handle multi-currency specially
      }
      return entry.currency || 'USD';
    }
    return 'USD';
  });
  
  const [customAmount, setCustomAmount] = useState('');
  
  // Initialize multi-currency based on original purchase
  const [multiCurrency, setMultiCurrency] = useState(() => {
    if (isFullEntryReturn && returnData?.entry?.currency === 'MULTI') {
      return { 
        enabled: true, 
        usdAmount: returnData.entry.multi_currency_usd || 0,
        iqdAmount: returnData.entry.multi_currency_iqd || 0
      };
    }
    return { 
      enabled: false, 
      usdAmount: 0, 
      iqdAmount: 0 
    };
  });

  // Refs for keyboard navigation
  const quantityInputRef = useRef(null);
  const customAmountInputRef = useRef(null);
  const usdInputRef = useRef(null);
  const iqdInputRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const cancelButtonRef = useRef(null);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!show) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
        
        case 'Enter':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (!returnAmounts.exceeded && (returnAmounts.usd > 0 || returnAmounts.iqd > 0)) {
              handleConfirm();
            }
          }
          break;
        
        case 'Tab':
          // Let Tab work naturally for focus management
          break;
        
        case '1':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setReturnCurrency('USD');
          }
          break;
        
        case '2':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setReturnCurrency('IQD');
          }
          break;
        
        case 'm':
        case 'M':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setMultiCurrency(prev => ({ ...prev, enabled: !prev.enabled }));
          }
          break;
        
        case 'ArrowUp':
          if (e.target.type === 'number') {
            // Let number inputs handle arrows naturally
            break;
          }
          e.preventDefault();
          if (maxQuantity > 1) {
            setReturnQuantity(prev => Math.min(prev + 1, maxQuantity));
          }
          break;
        
        case 'ArrowDown':
          if (e.target.type === 'number') {
            // Let number inputs handle arrows naturally
            break;
          }
          e.preventDefault();
          if (maxQuantity > 1) {
            setReturnQuantity(prev => Math.max(prev - 1, 1));
          }
          break;
      }
    };

    if (show) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [show, returnAmounts, maxQuantity, handleConfirm, handleClose]);

  // Auto-focus management
  useEffect(() => {
    if (show) {
      // Focus first relevant input after modal opens
      setTimeout(() => {
        if (maxQuantity > 1 && quantityInputRef.current) {
          quantityInputRef.current.focus();
        } else if (multiCurrency.enabled && usdInputRef.current) {
          usdInputRef.current.focus();
        } else if (customAmountInputRef.current) {
          customAmountInputRef.current.focus();
        } else if (confirmButtonRef.current) {
          confirmButtonRef.current.focus();
        }
      }, 100);
    }
  }, [show, maxQuantity, multiCurrency.enabled]);

  // Calculate maximum return amounts based on original purchase
  const maxReturnAmounts = useMemo(() => {
    if (!returnData?.entry) return { usd: 0, iqd: 0, total: 0 };
    
    const entry = returnData.entry;
    const quantity = returnQuantity || 1;
    const maxQuantity = returnData.maxQuantity || entry.quantity || 1;
    
    // Handle individual item returns
    if (returnData.isItemReturn && returnData.itemData) {
      const unitPrice = returnData.itemData.unitPrice || 0;
      const itemCurrency = returnData.currency || 'USD';
      
      if (itemCurrency === 'USD') {
        return {
          usd: unitPrice * quantity,
          iqd: 0,
          total: unitPrice * quantity,
          currency: 'USD'
        };
      } else {
        return {
          usd: 0,
          iqd: unitPrice * quantity,
          total: (unitPrice * quantity) / EXCHANGE_RATES.USD_TO_IQD,
          currency: 'IQD'
        };
      }
    }
    
    // Handle full entry returns - use exact amounts based on original purchase
    if (entry.currency === 'MULTI') {
      // For multi-currency entries, calculate proportional amounts based on quantity
      const totalQuantity = entry.quantity || 1;
      const perUnitUSD = (entry.multi_currency_usd || 0) / totalQuantity;
      const perUnitIQD = (entry.multi_currency_iqd || 0) / totalQuantity;
      
      return {
        usd: perUnitUSD * quantity,
        iqd: perUnitIQD * quantity,
        total: (perUnitUSD * quantity) + ((perUnitIQD * quantity) / EXCHANGE_RATES.USD_TO_IQD),
        currency: 'MULTI'
      };
    } else {
      // Single currency entries
      const totalAmount = entry.total_price || entry.amount || 0;
      const perUnitAmount = totalAmount / maxQuantity;
      const returnAmount = perUnitAmount * quantity;
      
      if (entry.currency === 'USD') {
        return {
          usd: returnAmount,
          iqd: 0,
          total: returnAmount,
          currency: 'USD'
        };
      } else {
        return {
          usd: 0,
          iqd: returnAmount,
          total: returnAmount / EXCHANGE_RATES.USD_TO_IQD,
          currency: 'IQD'
        };
      }
    }
  }, [returnData, returnQuantity]);

  // Calculate return amounts based on user selection
  const returnAmounts = useMemo(() => {
    if (!returnData?.entry) return { usd: 0, iqd: 0 };
    
    if (multiCurrency.enabled) {
      // Validate multi-currency amounts don't exceed maximum
      const requestedUSD = multiCurrency.usdAmount || 0;
      const requestedIQD = multiCurrency.iqdAmount || 0;
      const totalRequestedUSD = requestedUSD + (requestedIQD / EXCHANGE_RATES.USD_TO_IQD);
      
      if (totalRequestedUSD > maxReturnAmounts.total) {
        return { 
          usd: Math.min(requestedUSD, maxReturnAmounts.usd), 
          iqd: Math.min(requestedIQD, maxReturnAmounts.iqd),
          exceeded: true
        };
      }
      
      return { usd: requestedUSD, iqd: requestedIQD, exceeded: false };
    } else if (customAmount) {
      // Single currency custom amount
      const amount = parseFloat(customAmount) || 0;
      const maxAmount = returnCurrency === 'USD' ? maxReturnAmounts.usd : maxReturnAmounts.iqd;
      
      if (amount > maxAmount) {
        return {
          usd: returnCurrency === 'USD' ? maxAmount : 0,
          iqd: returnCurrency === 'IQD' ? maxAmount : 0,
          exceeded: true
        };
      }
      
      return {
        usd: returnCurrency === 'USD' ? amount : 0,
        iqd: returnCurrency === 'IQD' ? amount : 0,
        exceeded: false
      };
    } else {
      // Default: return full amount in selected currency
      if (returnCurrency === 'USD') {
        const usdAmount = maxReturnAmounts.currency === 'USD' 
          ? maxReturnAmounts.usd 
          : maxReturnAmounts.iqd / EXCHANGE_RATES.USD_TO_IQD;
        return { usd: usdAmount, iqd: 0, exceeded: false };
      } else {
        const iqdAmount = maxReturnAmounts.currency === 'IQD' 
          ? maxReturnAmounts.iqd 
          : maxReturnAmounts.usd * EXCHANGE_RATES.USD_TO_IQD;
        return { usd: 0, iqd: iqdAmount, exceeded: false };
      }
    }
  }, [returnData, returnQuantity, returnCurrency, customAmount, multiCurrency, maxReturnAmounts]);

  const handleConfirm = () => {
    const returnInfo = {
      ...returnData,
      returnQuantity,
      returnAmounts: {
        usd: returnAmounts.usd,
        iqd: returnAmounts.iqd
      }
    };
    
    onConfirm(returnInfo);
    handleClose();
  };

  const handleClose = () => {
    setReturnQuantity(1);
    setReturnCurrency('USD');
    setCustomAmount('');
    setMultiCurrency({ enabled: false, usdAmount: 0, iqdAmount: 0 });
    onClose();
  };

  if (!show || !returnData?.entry) return null;

  const entry = returnData.entry;
  const maxQuantity = returnData.maxQuantity || entry.quantity || 1;

  return (
    <ModalBase show={show} onClose={handleClose} maxWidth="2xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white p-6 rounded-t-lg flex-shrink-0">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Icon name="undo" size={24} />
            {t?.returnOriginalItem || 'Return Original Item'}
          </h2>
          <p className="text-red-100 mt-2">
            {t?.returnItemDescription || 'Process a return for individual items with accurate currency handling'}
          </p>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Item Information */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
              <Icon name="info" size={18} />
              {t?.itemInformation || 'Item Information'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">{t?.item || 'Item'}:</span>
                <div className="font-medium text-gray-800 dark:text-gray-200 mt-1">
                  {returnData.isItemReturn && returnData.itemData 
                    ? returnData.itemData.itemName 
                    : (entry.item_name || entry.description || 'Purchase')
                  }
                </div>
              </div>
              <div>
                <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">{t?.originalAmount || 'Original Amount'}:</span>
                <div className="font-medium text-gray-800 dark:text-gray-200">
                  {returnData.isItemReturn && returnData.itemData ? (
                    // Individual item return - show unit price with correct currency
                    <div className="flex items-center gap-2">
                      <Icon name={(returnData.currency || 'IQD') === 'USD' ? 'dollar' : 'building'} size={16} />
                      <span>
                        {(returnData.currency || 'IQD') === 'USD' ? '$' : 'د.ع'}
                        {(returnData.currency || 'IQD') === 'USD' 
                          ? returnData.itemData.unitPrice.toFixed(2)
                          : Math.round(returnData.itemData.unitPrice).toLocaleString()
                        }
                      </span>
                    </div>
                  ) : entry.currency === 'MULTI' ? (
                    // Multi-currency entry
                    <div className="flex flex-col gap-1">
                      {(entry.multi_currency_usd || 0) > 0 && (
                        <div className="flex items-center gap-2">
                          <Icon name="dollar" size={16} />
                          <span>${(entry.multi_currency_usd || 0).toFixed(2)}</span>
                        </div>
                      )}
                      {(entry.multi_currency_iqd || 0) > 0 && (
                        <div className="flex items-center gap-2">
                          <Icon name="building" size={16} />
                          <span>د.ع{Math.round(entry.multi_currency_iqd || 0).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Single currency entry
                    <div className="flex items-center gap-2">
                      <Icon name={entry.currency === 'USD' ? 'dollar' : 'building'} size={16} />
                      <span>
                        {entry.currency === 'USD' ? '$' : 'د.ع'}
                        {entry.currency === 'USD' 
                          ? (entry.total_price || entry.amount || 0).toFixed(2)
                          : Math.round(entry.total_price || entry.amount || 0).toLocaleString()
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quantity Selection */}
          {maxQuantity > 1 && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Icon name="package" size={16} />
                {t?.returnQuantity || 'Return Quantity'} <span className="text-xs text-gray-500">(↑/↓ arrows)</span>:
              </label>
              <input
                ref={quantityInputRef}
                type="number"
                min="1"
                max={maxQuantity}
                value={returnQuantity}
                onChange={(e) => setReturnQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), maxQuantity))}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <Icon name="warning" size={12} />
                {t?.maxQuantity || 'Maximum'}: {maxQuantity}
              </div>
            </div>
          )}

          {/* Return Currency Options */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                <Icon name="settings" size={18} />
                {t?.returnConfiguration || 'Return Configuration'}
              </h4>
              <button
                type="button"
                onClick={() => setMultiCurrency(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  multiCurrency.enabled
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
                title="Ctrl+M to toggle"
              >
                <Icon name={multiCurrency.enabled ? 'dollar' : 'money'} size={14} />
                {multiCurrency.enabled ? t?.singleCurrency || 'Single Currency' : t?.multiCurrency || 'Multi Currency'}
                <span className="text-xs opacity-75 ml-1">(Ctrl+M)</span>
              </button>
            </div>

            {!multiCurrency.enabled && (
              <div className="space-y-4">
                {/* Currency Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReturnCurrency('USD')}
                    className={`p-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      returnCurrency === 'USD'
                        ? 'bg-green-500 text-white shadow-lg'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                    title="Ctrl+1 to select"
                  >
                    <Icon name="dollar" size={16} />
                    {t?.returnInUSD || 'Return in USD'}
                    <span className="text-xs opacity-75">(Ctrl+1)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReturnCurrency('IQD')}
                    className={`p-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      returnCurrency === 'IQD'
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                    title="Ctrl+2 to select"
                  >
                    <Icon name="building" size={16} />
                    {t?.returnInIQD || 'Return in IQD'}
                    <span className="text-xs opacity-75">(Ctrl+2)</span>
                  </button>
                </div>

                {/* Custom Amount */}
                <div>
                  <label className="block text-sm font-medium text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
                    <Icon name="edit" size={14} />
                    {t?.customAmount || 'Custom Amount'} ({returnCurrency}) - {t?.optional || 'Optional'}:
                  </label>
                  <input
                    ref={customAmountInputRef}
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder={`${t?.maxAmount || 'Max'}: ${formatCurrency(
                      returnCurrency === 'USD' ? maxReturnAmounts.usd : maxReturnAmounts.iqd, 
                      returnCurrency
                    )}`}
                    step="0.01"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            )}

            {multiCurrency.enabled && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t?.usdAmount || 'USD Amount'}:
                  </label>
                  <input
                    ref={usdInputRef}
                    type="number"
                    value={multiCurrency.usdAmount}
                    onChange={(e) => setMultiCurrency(prev => ({ ...prev, usdAmount: Number(e.target.value) || 0 }))}
                    placeholder={`${t?.max || 'Max'}: ${maxReturnAmounts.usd.toFixed(2)}`}
                    step="0.01"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t?.iqdAmount || 'IQD Amount'}:
                  </label>
                  <input
                    ref={iqdInputRef}
                    type="number"
                    value={multiCurrency.iqdAmount}
                    onChange={(e) => setMultiCurrency(prev => ({ ...prev, iqdAmount: Number(e.target.value) || 0 }))}
                    placeholder={`${t?.max || 'Max'}: ${maxReturnAmounts.iqd.toFixed(0)}`}
                    step="1"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Return Summary */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
            <div className="text-sm text-yellow-700 dark:text-yellow-300">
              <div className="font-medium mb-3 flex items-center gap-2">
                <Icon name="money" size={16} />
                {t?.totalReturnAmount || 'Total Return Amount'}:
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>{t?.returnAmount || 'Return Amount'}:</span>
                  <div className="text-right">
                    {returnAmounts.usd > 0 && (
                      <div className="font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Icon name="dollar" size={14} />
                        ${returnAmounts.usd.toFixed(2)}
                      </div>
                    )}
                    {returnAmounts.iqd > 0 && (
                      <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Icon name="building" size={14} />
                        د.ع{returnAmounts.iqd.toFixed(0)}
                      </div>
                    )}
                  </div>
                </div>
                {returnAmounts.exceeded && (
                  <div className="text-red-600 dark:text-red-400 font-medium flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-700">
                    <Icon name="warning" size={16} />
                    {t?.amountExceeded || 'Amount exceeds maximum return value'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Current Balance Display */}
          {admin && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                {t?.currentBalances || 'Current Balances'}:
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    ${(admin.balanceUSD || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t?.usdBalance || 'USD Balance'}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    د.ع{(admin.balanceIQD || 0).toFixed(0)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t?.iqdBalance || 'IQD Balance'}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-4 flex-shrink-0">
          <button
            ref={cancelButtonRef}
            onClick={handleClose}
            className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            title="Escape to cancel"
          >
            <Icon name="x" size={16} />
            {t?.cancel || 'Cancel'} <span className="text-xs opacity-75">(Esc)</span>
          </button>
          <button
            ref={confirmButtonRef}
            onClick={handleConfirm}
            disabled={returnAmounts.exceeded || (returnAmounts.usd === 0 && returnAmounts.iqd === 0)}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            title="Ctrl+Enter to confirm"
          >
            <Icon name="check" size={16} />
            {t?.returnNow || 'Return Now'} <span className="text-xs opacity-75">(Ctrl+⏎)</span>
          </button>
        </div>
      </div>
    </ModalBase>
  );
};

export default ReturnModal;
