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
  const [allowCustomCurrency, setAllowCustomCurrency] = useState(false);
  
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

  const handleClose = () => {
    setReturnQuantity(1);
    setReturnCurrency('USD');
    setCustomAmount('');
    setMultiCurrency({ enabled: false, usdAmount: 0, iqdAmount: 0 });
    setAllowCustomCurrency(false);
    onClose();
  };

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

    // Handle full entry returns with multi-currency
    if (entry.currency === 'MULTI') {
      const usdPortion = (entry.multi_currency_usd || 0) * (quantity / maxQuantity);
      const iqdPortion = (entry.multi_currency_iqd || 0) * (quantity / maxQuantity);
      
      return {
        usd: usdPortion,
        iqd: iqdPortion,
        total: usdPortion + (iqdPortion / EXCHANGE_RATES.USD_TO_IQD), // Total in USD equivalent
        currency: 'MULTI'
      };
    } else {
      // Single currency purchase
      const totalPrice = entry.total_price || entry.amount || 0;
      const returnAmount = totalPrice * (quantity / maxQuantity);
      
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
  }, [returnData, returnQuantity, returnCurrency, customAmount, multiCurrency, maxReturnAmounts, allowCustomCurrency]);

  const handleConfirm = () => {
    const result = {
      returnQuantity,
      returnAmounts: returnAmounts
    };
    onConfirm(result);
  };

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
            setAllowCustomCurrency(prev => !prev);
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

  if (!show || !returnData?.entry) return null;

  const entry = returnData.entry;
  const maxQuantity = returnData.maxQuantity || entry.quantity || 1;

  return (
    <ModalBase show={show} onClose={handleClose} maxWidth="2xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t?.returnItem || 'Return Item'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {entry.item_name || 'Purchase Return'}
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <Icon name="close" className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Purchase Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              {t?.originalPurchase || 'Original Purchase'}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">
                  {t?.quantity || 'Quantity'}: 
                </span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {entry.quantity || 1}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">
                  {t?.currency || 'Currency'}: 
                </span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {entry.currency || 'USD'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600 dark:text-gray-400">
                  {t?.amount || 'Amount'}: 
                </span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {entry.currency === 'MULTI' ? (
                    `$${(entry.multi_currency_usd || 0).toFixed(2)} + د.ع${(entry.multi_currency_iqd || 0).toFixed(0)}`
                  ) : (
                    formatCurrency(entry.total_price || entry.amount || 0, entry.currency || 'USD')
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Return Quantity */}
          {maxQuantity > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t?.returnQuantity || 'Return Quantity'}
              </label>
              <input
                ref={quantityInputRef}
                type="number"
                min="1"
                max={maxQuantity}
                value={returnQuantity}
                onChange={(e) => setReturnQuantity(Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Max: {maxQuantity}
              </p>
            </div>
          )}

          {/* Multi-Currency Toggle */}
          {(entry.currency === 'MULTI' || allowCustomCurrency) && (
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={multiCurrency.enabled}
                  onChange={(e) => setMultiCurrency(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t?.multiCurrencyReturn || 'Multi-currency return'}
                </span>
              </label>
            </div>
          )}

          {/* Return Amount Selection */}
          {multiCurrency.enabled ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  USD {t?.amount || 'Amount'}
                </label>
                <input
                  ref={usdInputRef}
                  type="number"
                  min="0"
                  max={maxReturnAmounts.usd}
                  step="0.01"
                  value={multiCurrency.usdAmount}
                  onChange={(e) => setMultiCurrency(prev => ({ ...prev, usdAmount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Max: ${maxReturnAmounts.usd.toFixed(2)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  IQD {t?.amount || 'Amount'}
                </label>
                <input
                  ref={iqdInputRef}
                  type="number"
                  min="0"
                  max={maxReturnAmounts.iqd}
                  step="1"
                  value={multiCurrency.iqdAmount}
                  onChange={(e) => setMultiCurrency(prev => ({ ...prev, iqdAmount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Max: د.ع{maxReturnAmounts.iqd.toFixed(0)}
                </p>
              </div>
            </div>
          ) : (
            <div>
              {/* Currency Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t?.returnCurrency || 'Return Currency'}
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="returnCurrency"
                      value="USD"
                      checked={returnCurrency === 'USD'}
                      onChange={(e) => setReturnCurrency(e.target.value)}
                      className="text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">USD</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="returnCurrency"
                      value="IQD"
                      checked={returnCurrency === 'IQD'}
                      onChange={(e) => setReturnCurrency(e.target.value)}
                      className="text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">IQD</span>
                  </label>
                </div>
              </div>

              {/* Custom Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t?.returnAmount || 'Return Amount'} ({returnCurrency})
                </label>
                <input
                  ref={customAmountInputRef}
                  type="number"
                  min="0"
                  max={
                    returnCurrency === 'USD' ? maxReturnAmounts.usd : maxReturnAmounts.iqd
                  }
                  step={returnCurrency === 'USD' ? '0.01' : '1'}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder={
                    returnCurrency === 'USD' 
                      ? `Max: $${maxReturnAmounts.usd.toFixed(2)}`
                      : `Max: د.ع${maxReturnAmounts.iqd.toFixed(0)}`
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t?.leaveEmptyForFull || 'Leave empty to return the full amount in the selected currency'}
                </p>
              </div>
            </div>
          )}

          {/* Return Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              {t?.returnSummary || 'Return Summary'}
            </h3>
            <div className="space-y-1 text-sm">
              {returnAmounts.usd > 0 && (
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">USD:</span>
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    ${returnAmounts.usd.toFixed(2)}
                  </span>
                </div>
              )}
              {returnAmounts.iqd > 0 && (
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">IQD:</span>
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    د.ع{returnAmounts.iqd.toFixed(0)}
                  </span>
                </div>
              )}
              {returnAmounts.exceeded && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-2">
                  {t?.amountExceeded || 'Amount exceeds maximum returnable amount'}
                </p>
              )}
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setAllowCustomCurrency(!allowCustomCurrency)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              {allowCustomCurrency 
                ? (t?.hideAdvanced || 'Hide Advanced Options')
                : (t?.showAdvanced || 'Show Advanced Options')
              }
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            ref={cancelButtonRef}
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {t?.cancel || 'Cancel'}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={handleConfirm}
            disabled={returnAmounts.exceeded || (returnAmounts.usd === 0 && returnAmounts.iqd === 0)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t?.confirmReturn || 'Confirm Return'}
          </button>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="px-6 pb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t?.keyboardShortcuts || 'Keyboard shortcuts'}: 
            <span className="ml-1">
              Esc ({t?.cancel || 'Cancel'}), 
              Ctrl+Enter ({t?.confirm || 'Confirm'}), 
              Ctrl+1 (USD), 
              Ctrl+2 (IQD), 
              Ctrl+M ({t?.toggleMulti || 'Toggle Multi-currency'})
            </span>
          </p>
        </div>
      </div>
    </ModalBase>
  );
};

export default ReturnModal;
