import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getCurrentExchangeRate, formatCurrency, loadExchangeRatesFromDB } from '../utils/exchangeRates';
import { Icon } from '../utils/icons.jsx';
import ModalBase from './ModalBase';

// Local currency formatting helper for ReturnModal with consistent rounding
const formatReturnCurrency = (amount, currency) => {
  const numAmount = Number(amount || 0);
  
  if (currency === 'IQD') {
    // IQD should never show decimals
    return `د.ع${Math.round(numAmount).toLocaleString()}`;
  }
  
  // For USD: apply intelligent rounding
  let finalAmount = numAmount;
  
  // If less than 0.1, round to nearest whole number
  if (Math.abs(numAmount) < 0.1) {
    finalAmount = Math.round(numAmount);
  } else {
    // Round to 2 decimal places max
    finalAmount = Math.round(numAmount * 100) / 100;
  }
  
  // Format with 1-2 decimals max, remove trailing zeros
  if (finalAmount % 1 === 0) {
    return `$${Math.floor(finalAmount)}`;
  } else {
    const formatted = finalAmount.toFixed(2).replace(/\.?0+$/, '');
    return `$${formatted}`;
  }
};

const ReturnModal = ({ 
  show, 
  onClose, 
  returnData, // { type: 'buying' | 'sales', entry: {}, maxQuantity: number }
  onConfirm, 
  admin, 
  t 
}) => {
  // State management
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnCurrency, setReturnCurrency] = useState('USD'); // 'USD', 'IQD', or 'MIXED'
  const [usdAmount, setUsdAmount] = useState('');
  const [iqdAmount, setIqdAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs for focus management
  const quantityInputRef = useRef(null);
  const usdInputRef = useRef(null);
  const iqdInputRef = useRef(null);
  const confirmButtonRef = useRef(null);

  // Calculate maximum returnable amounts from original transaction
  const maxReturnAmounts = useMemo(() => {
    if (!returnData?.entry) {
      return { usd: 0, iqd: 0, totalValueUSD: 0, originalCurrency: 'USD' };
    }

    const entry = returnData.entry;
    const quantity = Math.max(1, Number(returnQuantity) || 1);
    const maxQuantity = Math.max(1, Number(returnData.maxQuantity) || Number(entry.quantity) || 1);
    const quantityRatio = Math.min(quantity, maxQuantity) / maxQuantity;

    // Use original exchange rate from the purchase, not current rate
    let usdToIqd, iqdToUsd;
    if (entry.exchange_rate_usd_to_iqd && entry.exchange_rate_iqd_to_usd) {
      // Use the exchange rate from when the purchase was made
      usdToIqd = entry.exchange_rate_usd_to_iqd;
      iqdToUsd = entry.exchange_rate_iqd_to_usd;
    } else {
      // Fallback to current rate if original rate not stored
      usdToIqd = getCurrentExchangeRate('USD', 'IQD');
      iqdToUsd = getCurrentExchangeRate('IQD', 'USD');
    }

    // Handle individual item returns
    if (returnData.isItemReturn && returnData.itemData) {
      const unitPrice = Number(returnData.itemData.unitPrice) || 0;
      const itemCurrency = returnData.currency || entry.currency || 'USD';
      const returnAmount = unitPrice * quantity;
      
      if (itemCurrency === 'USD') {
        return {
          usd: returnAmount,
          iqd: 0,
          totalValueUSD: returnAmount,
          originalCurrency: 'USD'
        };
      } else {
        return {
          usd: 0,
          iqd: returnAmount,
          totalValueUSD: returnAmount * iqdToUsd,
          originalCurrency: 'IQD'
        };
      }
    }

    // Handle full entry returns
    const originalCurrency = entry.currency || 'USD';
    
    // Multi-currency transactions
    if (originalCurrency === 'MULTI' || entry.multi_currency_usd || entry.multi_currency_iqd) {
      const usdPortion = (Number(entry.multi_currency_usd) || 0) * quantityRatio;
      const iqdPortion = (Number(entry.multi_currency_iqd) || 0) * quantityRatio;
      
      const result = {
        usd: usdPortion,
        iqd: iqdPortion,
        totalValueUSD: usdPortion + (iqdPortion * iqdToUsd),
        originalCurrency: 'MULTI'
      };
      
      return result;
    }
    
    // Single currency transactions
    const totalAmount = (Number(entry.total_price) || Number(entry.amount) || 0) * quantityRatio;
    
    if (originalCurrency === 'USD') {
      const result = {
        usd: totalAmount,
        iqd: 0,
        totalValueUSD: totalAmount,
        originalCurrency: 'USD'
      };
      return result;
    } else {
      const result = {
        usd: 0,
        iqd: totalAmount,
        totalValueUSD: totalAmount * iqdToUsd,
        originalCurrency: 'IQD'
      };
      return result;
    }
  }, [returnData, returnQuantity]);

  // Calculate current return amounts based on user selection
  const currentReturnAmounts = useMemo(() => {
    const maxUSD = maxReturnAmounts.usd;
    const maxIQD = maxReturnAmounts.iqd;
    
    // Use the same exchange rates as maxReturnAmounts calculation
    const entry = returnData?.entry;
    let usdToIqd, iqdToUsd;
    if (entry?.exchange_rate_usd_to_iqd && entry?.exchange_rate_iqd_to_usd) {
      // Use original exchange rate from the purchase
      usdToIqd = entry.exchange_rate_usd_to_iqd;
      iqdToUsd = entry.exchange_rate_iqd_to_usd;
    } else {
      // Fallback to current rate if original rate not stored
      usdToIqd = getCurrentExchangeRate('USD', 'IQD');
      iqdToUsd = getCurrentExchangeRate('IQD', 'USD');
    }
    
    if (returnCurrency === 'MIXED') {
      const requestedUSD = Math.min(parseFloat(usdAmount) || 0, maxUSD);
      const requestedIQD = Math.min(parseFloat(iqdAmount) || 0, maxIQD);
      
      const result = {
        usd: requestedUSD,
        iqd: requestedIQD,
        totalValueUSD: requestedUSD + (requestedIQD * iqdToUsd),
        isValid: (requestedUSD + requestedIQD) > 0
      };
      
      return result;
    } else if (returnCurrency === 'USD') {
      // Return everything as USD
      const totalAvailableUSD = maxUSD + (maxIQD * iqdToUsd);
      const requestedUSD = parseFloat(usdAmount) || totalAvailableUSD;
      const finalUSD = Math.min(requestedUSD, totalAvailableUSD);
      
      const result = {
        usd: finalUSD,
        iqd: 0,
        totalValueUSD: finalUSD,
        isValid: finalUSD > 0
      };
      
      return result;
    } else { // IQD
      // Return everything as IQD
      const totalAvailableIQD = maxIQD + (maxUSD * usdToIqd);
      const requestedIQD = parseFloat(iqdAmount) || totalAvailableIQD;
      const finalIQD = Math.min(requestedIQD, totalAvailableIQD);
      
      const result = {
        usd: 0,
        iqd: finalIQD,
        totalValueUSD: finalIQD * iqdToUsd,
        isValid: finalIQD > 0
      };
      
      return result;
    }
  }, [returnCurrency, usdAmount, iqdAmount, maxReturnAmounts]);

  // Reset form when modal opens
  useEffect(() => {
    if (show && returnData?.entry) {
      // Load current exchange rates from database
      loadExchangeRatesFromDB().catch(console.error);
      
      const maxQuantity = Math.max(1, Number(returnData.maxQuantity) || Number(returnData.entry.quantity) || 1);
      setReturnQuantity(Math.min(1, maxQuantity));
      
      // Set default currency based on original transaction
      const originalCurrency = returnData.entry.currency || 'USD';
      if (originalCurrency === 'MULTI') {
        setReturnCurrency('MIXED');
      } else {
        setReturnCurrency(originalCurrency);
      }
      
      setUsdAmount('');
      setIqdAmount('');
      setIsProcessing(false);
    }
  }, [show, returnData]);

  // Handle close
  const handleClose = () => {
    if (isProcessing) return;
    
    setReturnQuantity(1);
    setReturnCurrency('USD');
    setUsdAmount('');
    setIqdAmount('');
    setIsProcessing(false);
    onClose();
  };
  // Handle confirm
  const handleConfirm = async () => {
    if (isProcessing || !currentReturnAmounts.isValid) return;
    
    setIsProcessing(true);
    
    try {
      const result = {
        returnQuantity: Math.max(1, Number(returnQuantity) || 1),
        returnAmounts: {
          usd: currentReturnAmounts.usd,
          iqd: currentReturnAmounts.iqd
        }
      };
      
      await onConfirm(result);
      handleClose();
    } catch (error) {
      console.error('Error in return confirmation:', error);
      admin?.setToast?.(t?.returnError || 'Error occurred during return', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get max quantity for this return
  const maxQuantity = Math.max(1, Number(returnData?.maxQuantity) || Number(returnData?.entry?.quantity) || 1);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!show) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
        case 'Enter':
          if (e.ctrlKey && currentReturnAmounts.isValid) {
            e.preventDefault();
            handleConfirm();
          }
          break;
        case '1':
          if (e.ctrlKey) {
            e.preventDefault();
            setReturnCurrency('USD');
          }
          break;
        case '2':
          if (e.ctrlKey) {
            e.preventDefault();
            setReturnCurrency('IQD');
          }
          break;
        case 'm':
        case 'M':
          if (e.ctrlKey) {
            e.preventDefault();
            setReturnCurrency('MIXED');
          }
          break;
      }
    };

    if (show) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [show, currentReturnAmounts.isValid, handleConfirm, handleClose]);

  // Auto-focus management
  useEffect(() => {
    if (show) {
      setTimeout(() => {
        if (maxQuantity > 1 && quantityInputRef.current) {
          quantityInputRef.current.focus();
        } else if (returnCurrency === 'MIXED' && usdInputRef.current) {
          usdInputRef.current.focus();
        } else if (confirmButtonRef.current) {
          confirmButtonRef.current.focus();
        }
      }, 100);
    }
  }, [show, maxQuantity, returnCurrency]);

  if (!show || !returnData?.entry) return null;

  const entry = returnData.entry;

  return (
    <ModalBase show={show} onClose={handleClose} maxWidth="2xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] flex flex-col p-6">
        {/* Header */}
        <div className="flex justify-between items-center pb-6 border-b border-gray-200 dark:border-gray-700 -mx-6 -mt-6 px-6 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t?.returnItem || 'Return Item'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {entry.item_name || entry.customer_name || 'Transaction Return'}
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
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Original Transaction Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              {t?.originalPurchase || 'Original Transaction'}
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
                  {maxReturnAmounts.originalCurrency}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600 dark:text-gray-400">
                  {t?.amount || 'Amount'}: 
                </span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {maxReturnAmounts.originalCurrency === 'MULTI' ? (
                    <>
                      {maxReturnAmounts.usd > 0 && formatReturnCurrency(maxReturnAmounts.usd, 'USD')}
                      {maxReturnAmounts.usd > 0 && maxReturnAmounts.iqd > 0 && ' + '}
                      {maxReturnAmounts.iqd > 0 && formatReturnCurrency(maxReturnAmounts.iqd, 'IQD')}
                    </>
                  ) : maxReturnAmounts.originalCurrency === 'USD' ? (
                    formatReturnCurrency(maxReturnAmounts.usd, 'USD')
                  ) : (
                    formatReturnCurrency(maxReturnAmounts.iqd, 'IQD')
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
                onChange={(e) => {
                  const value = Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1));
                  setReturnQuantity(value);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Max: {maxQuantity}
              </p>
            </div>
          )}

          {/* Available Return Amounts */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              {t?.availableToReturn || 'Available to Return'}
            </h3>
            <div className="space-y-1 text-sm">
              {maxReturnAmounts.usd > 0 && (
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">USD:</span>
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    {formatReturnCurrency(maxReturnAmounts.usd, 'USD')}
                  </span>
                </div>
              )}
              {maxReturnAmounts.iqd > 0 && (
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">IQD:</span>
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    {formatReturnCurrency(maxReturnAmounts.iqd, 'IQD')}
                  </span>
                </div>
              )}
              <div className="border-t border-blue-200 dark:border-blue-800 pt-1 mt-2">
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">{t?.totalValue || 'Total Value'}:</span>
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    {formatReturnCurrency(maxReturnAmounts.totalValueUSD, 'USD')} USD
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Return Currency Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t?.returnCurrency || 'How would you like to receive the refund?'}
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="returnCurrency"
                  value="USD"
                  checked={returnCurrency === 'USD'}
                  onChange={(e) => setReturnCurrency(e.target.value)}
                  className="text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  {t?.allInUSD || 'All in USD'} 
                  <span className="text-gray-500 ml-1">
                    ({formatReturnCurrency(maxReturnAmounts.totalValueUSD, 'USD')})
                  </span>
                </span>
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
                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  {t?.allInIQD || 'All in IQD'} 
                  <span className="text-gray-500 ml-1">
                    (د.ع{(() => {
                      const entry = returnData?.entry;
                      const rate = entry?.exchange_rate_usd_to_iqd || getCurrentExchangeRate('USD', 'IQD');
                      return Math.round(maxReturnAmounts.totalValueUSD * rate).toLocaleString();
                    })()})
                  </span>
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="returnCurrency"
                  value="MIXED"
                  checked={returnCurrency === 'MIXED'}
                  onChange={(e) => setReturnCurrency(e.target.value)}
                  className="text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  {t?.mixedCurrency || 'Mixed Currency'} 
                  <span className="text-gray-500 ml-1">
                    ({t?.customAmounts || 'Custom amounts'})
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* Mixed Currency Inputs */}
          {returnCurrency === 'MIXED' && (
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
                  value={usdAmount}
                  onChange={(e) => setUsdAmount(e.target.value)}
                  placeholder={`Max: ${formatReturnCurrency(maxReturnAmounts.usd, 'USD')}`}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
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
                  value={iqdAmount}
                  onChange={(e) => setIqdAmount(e.target.value)}
                  placeholder={`Max: ${formatReturnCurrency(maxReturnAmounts.iqd, 'IQD')}`}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Return Summary */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">
              {t?.returnSummary || 'Return Summary'}
            </h3>
            <div className="space-y-1 text-sm">
              {currentReturnAmounts.usd > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">USD:</span>
                  <span className="font-medium text-green-900 dark:text-green-100">
                    {formatReturnCurrency(currentReturnAmounts.usd, 'USD')}
                  </span>
                </div>
              )}
              {currentReturnAmounts.iqd > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">IQD:</span>
                  <span className="font-medium text-green-900 dark:text-green-100">
                    {formatReturnCurrency(currentReturnAmounts.iqd, 'IQD')}
                  </span>
                </div>
              )}
              <div className="border-t border-green-200 dark:border-green-800 pt-1 mt-2">
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">{t?.totalValue || 'Total Value'}:</span>
                  <span className="font-medium text-green-900 dark:text-green-100">
                    {formatReturnCurrency(currentReturnAmounts.totalValueUSD, 'USD')} USD
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 -mx-6 -mb-6 px-6 pb-6">
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t?.cancel || 'Cancel'}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={handleConfirm}
            disabled={isProcessing || !currentReturnAmounts.isValid}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{t?.processing || 'Processing...'}</span>
              </div>
            ) : (
              t?.confirmReturn || 'Confirm Return'
            )}
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
              Ctrl+M ({t?.mixed || 'Mixed'})
            </span>
          </p>
        </div>
      </div>
    </ModalBase>
  );
};

export default ReturnModal;
