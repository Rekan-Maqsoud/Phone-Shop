import React, { useState, useMemo, useEffect } from 'react';
import { EXCHANGE_RATES, formatCurrency, roundIQDToNearestBill } from '../utils/exchangeRates';
import { Icon } from '../utils/icons.jsx';

const UniversalPaymentModal = ({ 
  show, 
  onClose, 
  debtData,
  paymentType, // 'customer', 'company', 'personal'
  onPaymentComplete,
  admin, 
  t 
}) => {
  const [paymentCurrency, setPaymentCurrency] = useState('IQD'); // Default to IQD
  const [customAmount, setCustomAmount] = useState('');
  const [multiCurrency, setMultiCurrency] = useState({ 
    enabled: false, 
    usdAmount: 0, 
    iqdAmount: 0 
  });
  const [currentBalances, setCurrentBalances] = useState({ usd: 0, iqd: 0 });

  // Load current balances when modal opens and when balances might have changed
  useEffect(() => {
    const loadBalances = async () => {
      if (show && window.api?.getBalances) {
        try {
          const balances = await window.api.getBalances();
          if (balances) {
            setCurrentBalances({
              usd: balances.usd_balance || 0,
              iqd: balances.iqd_balance || 0
            });
          }
        } catch (error) {
          console.error('Error loading balances in UniversalPaymentModal:', error);
        }
      }
    };
    
    loadBalances();
  }, [show, admin?.balanceUSD, admin?.balanceIQD]); // Re-fetch when modal opens or when admin balances change

  // Calculate debt amount in USD for consistency
  const debtAmountUSD = useMemo(() => {
    if (!debtData) return 0;
    
    if (paymentType === 'customer') {
      // Calculate remaining amount for customer debts with partial payment support
      if (!debtData.debt) {
        // No debt record means full amount is owed
        return debtData.sale?.currency === 'USD' 
          ? debtData.sale.total 
          : debtData.sale.total / EXCHANGE_RATES.USD_TO_IQD;
      }
      
      if (debtData.debt.paid_at) {
        // Already paid
        return 0;
      }
      
      // Calculate remaining amount after partial payments
      const originalTotal = debtData.sale.total;
      const currency = debtData.sale.currency || 'USD';
      
      if (currency === 'USD') {
        // USD debt - subtract USD payments and IQD payments converted to USD
        const paidUSD = debtData.debt.payment_usd_amount || 0;
        const paidIQD = debtData.debt.payment_iqd_amount || 0;
        const remaining = Math.max(0, originalTotal - paidUSD - (paidIQD / EXCHANGE_RATES.USD_TO_IQD));
        return remaining;
      } else {
        // IQD debt - subtract IQD payments and USD payments converted to IQD
        const paidUSD = debtData.debt.payment_usd_amount || 0;
        const paidIQD = debtData.debt.payment_iqd_amount || 0;
        const remaining = Math.max(0, originalTotal - paidIQD - (paidUSD * EXCHANGE_RATES.USD_TO_IQD));
        return remaining / EXCHANGE_RATES.USD_TO_IQD; // Convert to USD for calculation
      }
    } else if (paymentType === 'company') {
      // Calculate remaining amount for company debts with partial payment support
      let remainingUSD = 0;
      let remainingIQD = 0;
      
      if (debtData.currency === 'MULTI') {
        remainingUSD = Math.max(0, (debtData.usd_amount || 0) - (debtData.payment_usd_amount || 0));
        remainingIQD = Math.max(0, (debtData.iqd_amount || 0) - (debtData.payment_iqd_amount || 0));
      } else if (debtData.currency === 'USD') {
        // USD debt - subtract USD payments and IQD payments converted to USD
        const paidUSD = debtData.payment_usd_amount || 0;
        const paidIQD = debtData.payment_iqd_amount || 0;
        remainingUSD = Math.max(0, (debtData.amount || 0) - paidUSD - (paidIQD / EXCHANGE_RATES.USD_TO_IQD));
        remainingIQD = 0;
      } else {
        // IQD or unknown currency - subtract IQD payments and USD payments converted to IQD
        const paidUSD = debtData.payment_usd_amount || 0;
        const paidIQD = debtData.payment_iqd_amount || 0;
        remainingUSD = 0;
        remainingIQD = Math.max(0, (debtData.amount || 0) - paidIQD - (paidUSD * EXCHANGE_RATES.USD_TO_IQD));
      }
      
      // Convert to USD equivalent for consistent calculation
      return remainingUSD + (remainingIQD / EXCHANGE_RATES.USD_TO_IQD);
    } else if (paymentType === 'personal') {
      // For personal loans, calculate remaining amount
      const remainingUSD = Math.max(0, (debtData.usd_amount || 0) - (debtData.payment_usd_amount || 0));
      const remainingIQD = Math.max(0, (debtData.iqd_amount || 0) - (debtData.payment_iqd_amount || 0));
      return remainingUSD + (remainingIQD / EXCHANGE_RATES.USD_TO_IQD);
    }
    return 0;
  }, [debtData, paymentType]);

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
      { label: t?.nearest1000 || '~1K', amount: rounded1000 },
      { label: t?.nearest5000 || '~5K', amount: rounded5000 },
      { label: t?.nearest10000 || '~10K', amount: rounded10000 }
    ];
  };

  // Quick amount buttons for USD
  const getQuickAmountButtonsUSD = () => {
    const exact = debtAmountUSD;
    const rounded1 = Math.round(exact);
    const rounded5 = Math.round(exact / 5) * 5;
    const rounded10 = Math.round(exact / 10) * 10;

    return [
      { label: t?.exact || 'Exact', amount: exact },
      { label: t?.nearest1 || '~$1', amount: rounded1 },
      { label: t?.nearest5 || '~$5', amount: rounded5 },
      { label: t?.nearest10 || '~$10', amount: rounded10 }
    ];
  };

  // Payment summary calculation
  const paymentSummary = useMemo(() => {
    if (!debtData) return null;
    
    let totalPaidUSD = 0;
    
    if (multiCurrency.enabled) {
      totalPaidUSD = multiCurrency.usdAmount + (multiCurrency.iqdAmount / EXCHANGE_RATES.USD_TO_IQD);
    } else if (customAmount) {
      const amount = parseFloat(customAmount) || 0;
      totalPaidUSD = paymentCurrency === 'USD' ? amount : amount / EXCHANGE_RATES.USD_TO_IQD;
    } else {
      // Default payment
      totalPaidUSD = paymentCurrency === 'USD' ? debtAmountUSD : debtAmountUSD;
    }
    
    const difference = totalPaidUSD - debtAmountUSD;
    
    let changeInfo = null;
    if (difference > 0) {
      const changeIQD = difference * EXCHANGE_RATES.USD_TO_IQD;
      const roundedChangeIQD = roundIQDToNearestBill(changeIQD);
      
      if (roundedChangeIQD < 250) {
        changeInfo = null; // No change for amounts less than 250 IQD
      } else {
        changeInfo = {
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
      change: changeInfo
    };
  }, [debtData, multiCurrency, customAmount, paymentCurrency, debtAmountUSD]);

  const handleClose = async () => {
    onClose();
    setCustomAmount('');
    setMultiCurrency({ enabled: false, usdAmount: 0, iqdAmount: 0 });
    setPaymentCurrency('IQD');
    
    // Refresh balances when closing modal to ensure they're current for next time
    if (admin?.refreshBalances) {
      try {
        await admin.refreshBalances();
      } catch (error) {
        console.error('Error refreshing balances on modal close:', error);
      }
    }
  };

  const processPayment = async () => {
    if (!debtData) return;
    
    console.log('🔄 PROCESS PAYMENT DEBUG:');
    console.log('- debtData:', debtData);
    console.log('- paymentType:', paymentType);
    console.log('- multiCurrency.enabled:', multiCurrency.enabled);
    console.log('- customAmount:', customAmount);
    console.log('- paymentCurrency:', paymentCurrency);
    
    try {
      let paymentData = {};
      
      if (multiCurrency.enabled) {
        // Multi-currency payment
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
        // Custom amount payment
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
        // Default payment (exact debt amount)
        if (paymentCurrency === 'USD') {
          paymentData = {
            payment_usd_amount: debtAmountUSD,
            payment_iqd_amount: 0,
            payment_currency_used: 'USD'
          };
        } else {
          const debtIQD = debtAmountUSD * EXCHANGE_RATES.USD_TO_IQD;
          paymentData = {
            payment_usd_amount: 0,
            payment_iqd_amount: debtIQD,
            payment_currency_used: 'IQD'
          };
        }
      }

      console.log('💳 CREATED PAYMENT DATA:', paymentData);

      let result;
      
      // Call appropriate payment function based on type
      if (paymentType === 'customer') {
        if (debtData.debt?.id) {
          result = await window.api?.markCustomerDebtPaid?.(debtData.debt.id, null, {
            payment_currency_used: paymentData.payment_currency_used,
            payment_usd_amount: paymentData.payment_usd_amount,
            payment_iqd_amount: paymentData.payment_iqd_amount
          });
        } else {
          // Create debt record first
          const newDebtResult = await window.api?.addCustomerDebt?.({
            customer_name: debtData.originalCustomer,
            amount: debtData.sale.total,
            description: `Debt for sale #${debtData.sale.id}`,
            currency: debtData.sale.currency || 'USD',
            sale_id: debtData.sale.id
          });
          
          if (newDebtResult?.lastInsertRowid) {
            result = await window.api?.markCustomerDebtPaid?.(newDebtResult.lastInsertRowid, null, {
              payment_currency_used: paymentData.payment_currency_used,
              payment_usd_amount: paymentData.payment_usd_amount,
              payment_iqd_amount: paymentData.payment_iqd_amount
            });
          }
        }
      } else if (paymentType === 'company') {
        // For company debts, let the parent component handle the payment processing
        // We just pass the payment data to the callback
        console.log('🏢 COMPANY PAYMENT DEBUG:');
        console.log('- paymentData before adding company_name:', paymentData);
        console.log('- debtData:', debtData);
        console.log('- onPaymentComplete exists:', !!onPaymentComplete);
        
        // Add company name to payment data
        paymentData.company_name = debtData.company_name;
        console.log('- paymentData after adding company_name:', paymentData);
        
        if (onPaymentComplete) {
          console.log('📞 Calling onPaymentComplete with paymentData...');
          await onPaymentComplete(paymentData);
          handleClose();
          return;
        } else {
          console.error('❌ No onPaymentComplete callback provided for company payment');
        }
      } else if (paymentType === 'personal') {
        result = await window.api?.markPersonalLoanPaid?.(debtData.id, paymentData);
      }

      if (result?.success || result?.changes > 0) {
        const amounts = [];
        if (paymentData.payment_usd_amount > 0) amounts.push(formatCurrency(paymentData.payment_usd_amount, 'USD'));
        if (paymentData.payment_iqd_amount > 0) amounts.push(formatCurrency(paymentData.payment_iqd_amount, 'IQD'));
        
        // Determine if this was a full or partial payment
        const isFullPayment = result?.isFullyPaid ?? true; // Default to true for backward compatibility
        const paymentTypeText = isFullPayment ? (t?.fullPayment || 'Full payment') : (t?.partialPayment || 'Partial payment');
        
        admin.setToast?.(`${paymentTypeText} received: ${amounts.join(' + ')}`, 'success');
        
        // Refresh balances immediately after successful payment
        if (admin?.refreshBalances) {
          try {
            await admin.refreshBalances();
          } catch (error) {
            console.error('Error refreshing balances in UniversalPaymentModal:', error);
          }
        }
        
        // Also refresh local balances for immediate UI update
        if (window.api?.getBalances) {
          try {
            const balances = await window.api.getBalances();
            if (balances) {
              setCurrentBalances({
                usd: balances.usd_balance || 0,
                iqd: balances.iqd_balance || 0
              });
            }
          } catch (error) {
            console.error('Error refreshing local balances:', error);
          }
        }
        
        // Force a small delay to ensure database write is complete before triggering callbacks
        await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 100ms
        
        if (onPaymentComplete) {
          await onPaymentComplete(paymentData);
        }
        
        handleClose();
      } else {
        admin.setToast?.(`❌ ${t?.paymentFailed || 'Payment failed'}: ${result?.message || result?.error || t?.unknownError || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      admin.setToast?.(`❌ ${t?.paymentError || 'Payment error'}`, 'error');
    }
  };

  if (!show || !debtData) return null;

  const getTitle = () => {
    switch (paymentType) {
      case 'customer': return t?.customerDebtPayment || 'Customer Debt Payment';
      case 'company': return t?.companyDebtPayment || 'Company Debt Payment';
      case 'personal': return t?.personalLoanPayment || 'Personal Loan Payment';
      default: return t?.payment || 'Payment';
    }
  };

  const getDebtorName = () => {
    switch (paymentType) {
      case 'customer': return debtData.originalCustomer || debtData.sale?.customer_name || t?.unknownCustomer || 'Unknown Customer';
      case 'company': return debtData.company_name || t?.unknownCompany || 'Unknown Company';
      case 'personal': return debtData.person_name || t?.unknownPerson || 'Unknown Person';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-t-2xl">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
              </svg>
              {getTitle()}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold transition-colors"
            >
              ✕
            </button>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {paymentType === 'customer' ? t?.customer || 'Customer' : 
                 paymentType === 'company' ? t?.company || 'Company' :
                 t?.person || 'Person'}:
              </span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {getDebtorName()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {paymentType === 'personal' ? t?.loanAmount || 'Loan Amount' : t?.debtAmount || 'Debt Amount'}:
              </span>
              <span className="text-xl font-bold text-red-600 dark:text-red-400">
                {paymentType === 'company' ? (
                  debtData.currency === 'IQD' ? (
                    <>
                      {(() => {
                        // IQD debt - subtract IQD payments and USD payments converted to IQD
                        const paidUSD = debtData.payment_usd_amount || 0;
                        const paidIQD = debtData.payment_iqd_amount || 0;
                        const remaining = Math.max(0, (debtData.amount || 0) - paidIQD - (paidUSD * EXCHANGE_RATES.USD_TO_IQD));
                        return formatCurrency(remaining, 'IQD');
                      })()}
                      <div className="text-sm text-gray-500">
                        (≈ {formatCurrency(debtAmountUSD, 'USD')})
                      </div>
                    </>
                  ) : debtData.currency === 'MULTI' ? (
                    <>
                      {(() => {
                        const remainingUSD = (debtData.usd_amount || 0) - (debtData.payment_usd_amount || 0);
                        const remainingIQD = (debtData.iqd_amount || 0) - (debtData.payment_iqd_amount || 0);
                        const parts = [];
                        if (remainingUSD > 0) parts.push(formatCurrency(remainingUSD, 'USD'));
                        if (remainingIQD > 0) parts.push(formatCurrency(remainingIQD, 'IQD'));
                        return parts.join(' + ') || formatCurrency(0, 'USD');
                      })()}
                    </>
                  ) : (
                    <>
                      {(() => {
                        // USD debt - subtract USD payments and IQD payments converted to USD
                        const paidUSD = debtData.payment_usd_amount || 0;
                        const paidIQD = debtData.payment_iqd_amount || 0;
                        const remaining = Math.max(0, (debtData.amount || 0) - paidUSD - (paidIQD / EXCHANGE_RATES.USD_TO_IQD));
                        return formatCurrency(remaining, 'USD');
                      })()}
                      <div className="text-sm text-gray-500">
                        (≈ {formatCurrency(debtAmountUSD * EXCHANGE_RATES.USD_TO_IQD, 'IQD')})
                      </div>
                    </>
                  )
                ) : (
                  <>
                    {formatCurrency(debtAmountUSD, 'USD')}
                    <div className="text-sm text-gray-500">
                      (≈ {formatCurrency(debtAmountUSD * EXCHANGE_RATES.USD_TO_IQD, 'IQD')})
                    </div>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Options */}
        <div className="p-6 space-y-6">
          {/* Currency Selection */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                <Icon name="creditCard" size={20} className="mr-2" />
                {t?.paymentOptions || 'Payment Options'}
              </h4>
              <button
                type="button"
                onClick={() => setMultiCurrency(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  multiCurrency.enabled
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {multiCurrency.enabled ? t?.singleCurrency || 'Single Currency' : t?.multiCurrency || 'Multi Currency'}
              </button>
            </div>

            {!multiCurrency.enabled && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setPaymentCurrency('USD')}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                    paymentCurrency === 'USD'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                    </svg>
                    {t?.payWithUSD || 'Pay with USD'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentCurrency('IQD')}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                    paymentCurrency === 'IQD'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    {t?.payWithIQD || 'Pay with IQD'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Payment Buttons for IQD */}
          {!multiCurrency.enabled && paymentCurrency === 'IQD' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t?.quickAmounts || 'Quick Amounts'} (IQD):
              </label>
              <div className="grid grid-cols-5 gap-2">
                {getQuickAmountButtonsIQD().map((btn, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCustomAmount(btn.amount.toString())}
                    className="p-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    {btn.label}
                    <div className="text-xs opacity-75">
                      {formatCurrency(btn.amount, 'IQD')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Payment Buttons for USD */}
          {!multiCurrency.enabled && paymentCurrency === 'USD' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t?.quickAmounts || 'Quick Amounts'} (USD):
              </label>
              <div className="grid grid-cols-4 gap-2">
                {getQuickAmountButtonsUSD().map((btn, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCustomAmount(btn.amount.toString())}
                    className="p-2 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                  >
                    {btn.label}
                    <div className="text-xs opacity-75">
                      {formatCurrency(btn.amount, 'USD')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Amount Input */}
          {!multiCurrency.enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t?.customAmount || 'Custom Amount'} ({paymentCurrency}):
              </label>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder={`0.00 ${paymentCurrency}`}
                step="0.01"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
              />
            </div>
          )}

          {/* Multi-Currency Inputs */}
          {multiCurrency.enabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t?.usdAmount || 'USD Amount'}:
                </label>
                <input
                  type="number"
                  value={multiCurrency.usdAmount}
                  onChange={(e) => setMultiCurrency(prev => ({ ...prev, usdAmount: Number(e.target.value) || 0 }))}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t?.iqdAmount || 'IQD Amount'}:
                </label>
                <input
                  type="number"
                  value={multiCurrency.iqdAmount}
                  onChange={(e) => setMultiCurrency(prev => ({ ...prev, iqdAmount: Number(e.target.value) || 0 }))}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Payment Summary */}
          {paymentSummary && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <div className="font-medium mb-2">{t?.paymentSummary || 'Payment Summary'}:</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t?.debtAmount || 'Debt Amount'}:</span>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(paymentSummary.debtAmount, 'USD')}</span>
                      <div className="text-xs opacity-75">
                        (≈ {formatCurrency(paymentSummary.debtAmount * EXCHANGE_RATES.USD_TO_IQD, 'IQD')})
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span>{t?.totalPaid || 'Total Paid'}:</span>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(paymentSummary.totalPaid, 'USD')}</span>
                      <div className="text-xs opacity-75">
                        (≈ {formatCurrency(paymentSummary.totalPaid * EXCHANGE_RATES.USD_TO_IQD, 'IQD')})
                      </div>
                    </div>
                  </div>
                  <div className={`flex justify-between ${paymentSummary.isPerfect ? 'text-green-600' : paymentSummary.isOverpaid ? 'text-orange-600' : 'text-red-600'}`}>
                    <span>{paymentSummary.isUnderpaid ? (t?.remaining || 'Remaining') : (t?.difference || 'Difference')}:</span>
                    <div className="text-right">
                      <span className="font-medium">
                        {paymentSummary.difference >= 0 ? '+' : ''}{formatCurrency(Math.abs(paymentSummary.difference), 'USD')}
                      </span>
                      <div className="text-xs opacity-75">
                        (≈ {formatCurrency(Math.abs(paymentSummary.difference) * EXCHANGE_RATES.USD_TO_IQD, 'IQD')})
                      </div>
                    </div>
                  </div>
                  {paymentSummary.change && (
                    <div className="text-orange-600 dark:text-orange-400">
                      • {t?.change || 'Change'}: {formatCurrency(paymentSummary.change.changeInIQD, 'IQD')} {t?.fromBalance || 'from IQD balance'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Current Balances */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              {t?.currentBalances || 'Current Balances'}:
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(currentBalances.usd, 'USD')}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t?.usdBalance || 'USD Balance'}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {formatCurrency(currentBalances.iqd, 'IQD')}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t?.iqdBalance || 'IQD Balance'}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-4">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
          >
            {t?.cancel || 'Cancel'}
          </button>
          <button
            onClick={processPayment}
            disabled={!paymentSummary}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-semibold shadow-lg"
          >
            {t?.processPayment || 'Process Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UniversalPaymentModal;
