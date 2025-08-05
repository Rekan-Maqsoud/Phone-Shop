import React, { useState, useMemo } from 'react';
import { EXCHANGE_RATES, formatCurrency, roundIQDToNearestBill } from '../utils/exchangeRates';
import { Icon } from '../utils/icons.jsx';

const CompanyTotalPaymentModal = ({ 
  show, 
  onClose, 
  companyName,
  totalDebt, // { usd: number, iqd: number }
  onPaymentComplete,
  admin, 
  t 
}) => {
  // Early return if modal should not be shown or required data is missing
  if (!show || !companyName || !totalDebt) {
    return null;
  }

  const [paymentCurrency, setPaymentCurrency] = useState('IQD');
  const [customAmount, setCustomAmount] = useState('');
  const [multiCurrency, setMultiCurrency] = useState({ 
    enabled: false, 
    usdAmount: 0, 
    iqdAmount: 0 
  });

  // Calculate total debt amount in USD for consistency
  const debtAmountUSD = useMemo(() => {
    if (!totalDebt) return 0;
    return totalDebt.usd + (totalDebt.iqd / EXCHANGE_RATES.USD_TO_IQD);
  }, [totalDebt]);

  // Payment summary calculation
  const paymentSummary = useMemo(() => {
    if (!multiCurrency.enabled) return null;
    
    const totalPaidUSD = multiCurrency.usdAmount + (multiCurrency.iqdAmount / EXCHANGE_RATES.USD_TO_IQD);
    const difference = totalPaidUSD - debtAmountUSD;
    
    let changeInfo = null;
    if (difference > 0) {
      const changeIQD = difference * EXCHANGE_RATES.USD_TO_IQD;
      const roundedChangeIQD = roundIQDToNearestBill(changeIQD);
      
      if (roundedChangeIQD < 250) {
        changeInfo = null;
      } else {
        changeInfo = {
          changeUSD: 0,
          changeIQD: changeIQD,
          changeInUSD: 0,
          changeInIQD: roundedChangeIQD
        };
      }
    }
    
    return {
      debtAmount: debtAmountUSD,
      totalPaid: totalPaidUSD,
      difference,
      isOverpaid: difference > 0,
      isUnderpaid: difference < 0,
      isPerfect: Math.abs(difference) < 0.01,
      change: changeInfo,
      status: difference > 0.01 ? 'overpaid' : difference < -0.01 ? 'underpaid' : 'perfect'
    };
  }, [multiCurrency, debtAmountUSD]);

  const handleClose = () => {
    setMultiCurrency({ enabled: false, usdAmount: 0, iqdAmount: 0 });
    setCustomAmount('');
    setPaymentCurrency('IQD');
    onClose();
  };

  const processPayment = async () => {
    try {
      let paymentData = {};
      
      if (multiCurrency.enabled) {
        let netUSD = multiCurrency.usdAmount;
        let netIQD = multiCurrency.iqdAmount;
        
        if (paymentSummary?.change) {
          if (paymentSummary.change.changeInIQD > 0) {
            netIQD -= paymentSummary.change.changeInIQD;
          }
        }
        
        paymentData = {
          payment_usd_amount: netUSD,
          payment_iqd_amount: netIQD,
          payment_currency_used: 'MULTI'
        };
      } else if (customAmount) {
        const amount = parseFloat(customAmount) || 0;
        if (paymentCurrency === 'USD') {
          paymentData = {
            payment_usd_amount: amount,
            payment_iqd_amount: 0,
            payment_currency_used: 'USD'
          };
        } else {
          paymentData = {
            payment_usd_amount: 0,
            payment_iqd_amount: amount,
            payment_currency_used: 'IQD'
          };
        }
      } else {
        // Default: pay exact debt amount
        paymentData = {
          payment_usd_amount: totalDebt.usd,
          payment_iqd_amount: totalDebt.iqd,
          payment_currency_used: totalDebt.usd > 0 && totalDebt.iqd > 0 ? 'MULTI' : (totalDebt.usd > 0 ? 'USD' : 'IQD')
        };
      }

      console.log('Processing company total payment:', paymentData);
      await onPaymentComplete(paymentData);
      
      const amounts = [];
      if (paymentData.payment_usd_amount > 0) amounts.push(formatCurrency(paymentData.payment_usd_amount, 'USD'));
      if (paymentData.payment_iqd_amount > 0) amounts.push(formatCurrency(paymentData.payment_iqd_amount, 'IQD'));
      
      admin.setToast?.(`Payment processed: ${amounts.join(' + ')}`, 'success');
      handleClose();
    } catch (error) {
      console.error('Error processing payment:', error);
      admin.setToast?.(`Payment failed: ${error.message}`, 'error');
    }
  };

  // Quick amount buttons for IQD
  const getQuickAmountButtonsIQD = () => {
    const debtIQD = debtAmountUSD * EXCHANGE_RATES.USD_TO_IQD;
    const rounded250 = roundIQDToNearestBill(debtIQD);
    const rounded1000 = Math.round(debtIQD / 1000) * 1000;
    const rounded5000 = Math.round(debtIQD / 5000) * 5000;
    const rounded10000 = Math.round(debtIQD / 10000) * 10000;

    return [
      { label: t?.exact || 'Exact', amount: debtIQD },
      { label: t?.nearest250 || '~250', amount: rounded250 },
      { label: t?.nearest1000 || '~1000', amount: rounded1000 },
      { label: t?.nearest5000 || '~5000', amount: rounded5000 },
      { label: t?.nearest10000 || '~10000', amount: rounded10000 },
    ];
  };

  if (!show || !companyName) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {t?.payCompanyDebt || 'Pay Company Debt'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {companyName}
          </p>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Currency Selection */}
          <div className="flex gap-2">
            <button
              onClick={() => setPaymentCurrency('IQD')}
              className={`flex-1 py-2 px-4 rounded-lg transition ${
                paymentCurrency === 'IQD'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              IQD
            </button>
            <button
              onClick={() => setPaymentCurrency('USD')}
              className={`flex-1 py-2 px-4 rounded-lg transition ${
                paymentCurrency === 'USD'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              USD
            </button>
            <button
              onClick={() => setMultiCurrency({ ...multiCurrency, enabled: !multiCurrency.enabled })}
              className={`flex-1 py-2 px-4 rounded-lg transition ${
                multiCurrency.enabled
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {t?.both || 'Both'}
            </button>
          </div>

          {/* Debt Summary */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
              {t?.totalDebt || 'Total Debt'}
            </h3>
            <div className="space-y-1">
              {totalDebt.usd > 0 && (
                <div className="text-red-700 dark:text-red-300 font-medium">
                  {formatCurrency(totalDebt.usd, 'USD')}
                </div>
              )}
              {totalDebt.iqd > 0 && (
                <div className="text-red-700 dark:text-red-300 font-medium">
                  {formatCurrency(totalDebt.iqd, 'IQD')}
                </div>
              )}
            </div>
          </div>

          {/* Payment Options */}
          {multiCurrency.enabled ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {t?.multiCurrencyPayment || 'Multi-Currency Payment'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    USD {t?.amount || 'Amount'}
                  </label>
                  <input
                    type="number"
                    value={multiCurrency.usdAmount}
                    onChange={(e) => setMultiCurrency({ ...multiCurrency, usdAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    IQD {t?.amount || 'Amount'}
                  </label>
                  <input
                    type="number"
                    value={multiCurrency.iqdAmount}
                    onChange={(e) => setMultiCurrency({ ...multiCurrency, iqdAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="0"
                    step="250"
                  />
                </div>
              </div>
              
              {/* Payment Summary */}
              {paymentSummary && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {t?.paymentSummary || 'Payment Summary'}
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>{t?.debtAmount || 'Debt Amount'}:</span>
                      <span>{formatCurrency(paymentSummary.debtAmount, 'USD')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t?.totalPaid || 'Total Paid'}:</span>
                      <span>{formatCurrency(paymentSummary.totalPaid, 'USD')}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>{t?.remaining || 'Remaining'}:</span>
                      <span className={paymentSummary.isUnderpaid ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(Math.abs(paymentSummary.difference), 'USD')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : paymentCurrency === 'IQD' ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {t?.quickAmounts || 'Quick Amounts'} (IQD):
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {getQuickAmountButtonsIQD().map((btn, index) => (
                  <button
                    key={index}
                    onClick={() => setCustomAmount(btn.amount.toString())}
                    className="py-2 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    <div className="font-medium">{btn.label}</div>
                    <div className="text-xs">{formatCurrency(btn.amount, 'IQD')}</div>
                  </button>
                ))}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t?.customAmount || 'Custom Amount'} (IQD):
                </label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder={formatCurrency(debtAmountUSD * EXCHANGE_RATES.USD_TO_IQD, 'IQD')}
                  step="250"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t?.paymentAmount || 'Payment Amount'} (USD):
              </label>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder={formatCurrency(debtAmountUSD, 'USD')}
                step="0.01"
              />
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-2 px-4 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
            >
              {t?.cancel || 'Cancel'}
            </button>
            <button
              onClick={processPayment}
              className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              {t?.processPayment || 'Process Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyTotalPaymentModal;
