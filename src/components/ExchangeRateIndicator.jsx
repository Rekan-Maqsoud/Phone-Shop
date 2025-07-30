import React, { useState, useEffect } from 'react';
import { EXCHANGE_RATES, loadExchangeRatesFromDB, updateExchangeRate } from '../utils/exchangeRates';
import { Icon } from '../utils/icons.jsx';

export default function ExchangeRateIndicator({ 
  t = {}, 
  showModal = false, 
  className = "",
  size = "sm", // sm, md, lg
  onToast = null // Function to show toast messages instead of alerts
}) {
  const [showExchangeRateModal, setShowExchangeRateModal] = useState(false);
  const [newExchangeRate, setNewExchangeRate] = useState(EXCHANGE_RATES.USD_TO_IQD.toString());
  const [isLoadingRate, setIsLoadingRate] = useState(true);

  useEffect(() => {
    const loadRates = async () => {
      setIsLoadingRate(true);
      await loadExchangeRatesFromDB();
      setIsLoadingRate(false);
      setNewExchangeRate(EXCHANGE_RATES.USD_TO_IQD.toString());
    };
    loadRates();
  }, []);

  const handleExchangeRateClick = () => {
    if (isLoadingRate) return;
    setNewExchangeRate(EXCHANGE_RATES.USD_TO_IQD.toString());
    setShowExchangeRateModal(true);
  };

  const handleExchangeRateClose = () => {
    setShowExchangeRateModal(false);
    setNewExchangeRate(EXCHANGE_RATES.USD_TO_IQD.toString());
  };

  const handleExchangeRateUpdate = async () => {
    const rate = parseFloat(newExchangeRate);
    if (!rate || rate <= 0) {
      if (typeof onToast === 'function') {
        onToast(t.invalidExchangeRate || 'Please enter a valid exchange rate', 'error');
      } else {
        console.error('Please enter a valid exchange rate');
      }
      return;
    }

    const success = await updateExchangeRate(rate);
    if (success) {
      setShowExchangeRateModal(false);
      if (typeof onToast === 'function') {
        onToast(t.exchangeRateUpdated || `Exchange rate updated successfully to 1$ = ${rate}${t?.iqd || 'IQD'}`, 'success');
      } else {
        console.log('Exchange rate updated successfully');
      }
    } else {
      if (typeof onToast === 'function') {
        onToast(t.exchangeRateUpdateFailed || 'Failed to update exchange rate', 'error');
      } else {
        console.error('Failed to update exchange rate');
      }
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'lg':
        return 'px-4 py-3 text-base';
      case 'md':
        return 'px-3 py-2 text-sm';
      case 'sm':
      default:
        return 'px-2 py-1 text-xs';
    }
  };

  return (
    <>
      <button
        onClick={showModal ? handleExchangeRateClick : undefined}
        disabled={isLoadingRate}
        className={`${getSizeClasses()} ${
          isLoadingRate 
            ? 'bg-gray-400 cursor-not-allowed text-white' 
            : showModal 
              ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer text-white' 
              : 'bg-gray-600 cursor-default text-white'
        } rounded-lg transition-colors shadow-sm flex items-center gap-2 ${className}`}
        title={showModal ? (t.clickToChangeRate || 'Click to change exchange rate') : undefined}
      >
        {isLoadingRate ? (
          <>
            <span className="animate-spin">⏳</span>
            {size === 'lg' ? (t.loadingRate || 'Loading...') : '...'}
          </>
        ) : (
          <>
            <Icon name="dollar-sign" size={size === 'lg' ? 20 : size === 'md' ? 16 : 14} />
            1$ = {EXCHANGE_RATES.USD_TO_IQD.toLocaleString()}{t?.iqd || 'IQD'}
          </>
        )}
      </button>

      {/* Exchange Rate Modal */}
      {showExchangeRateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              {t.updateExchangeRate || 'Update Exchange Rate'}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {t.currentRate || 'Current Rate'}: 1$ = {EXCHANGE_RATES.USD_TO_IQD}{t?.iqd || 'IQD'}
              </label>
              <input
                type="number"
                value={newExchangeRate}
                onChange={(e) => setNewExchangeRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t.enterNewRate || 'Enter new rate (e.g., 1440)'}
                step="0.01"
                min="0"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExchangeRateUpdate}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                {t.update || 'Update'}
              </button>
              <button
                onClick={handleExchangeRateClose}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                {t.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
