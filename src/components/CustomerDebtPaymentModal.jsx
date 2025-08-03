import React, { useState, useMemo } from 'react';
import { EXCHANGE_RATES, formatCurrency, roundIQDToNearestBill } from '../utils/exchangeRates';
import { Icon } from '../utils/icons.jsx';

const CustomerDebtPaymentModal = ({ 
  showPaymentModal, 
  setShowPaymentModal, 
  selectedDebt, 
  setSelectedDebt, 
  admin, 
  t, 
  onPaymentComplete 
}) => {
  const [multiCurrency, setMultiCurrency] = useState({ 
    enabled: false, 
    usdAmount: 0, 
    iqdAmount: 0 
  });
  const [paymentCurrency, setPaymentCurrency] = useState('IQD'); // Default to IQD

  // Calculate payment summary
  const paymentSummary = useMemo(() => {
    if (!selectedDebt || !selectedDebt.sale) return null;
    
    const { sale, debt } = selectedDebt;
    
    // Calculate remaining debt amount after partial payments
    let debtAmountUSD = 0;
    if (!debt) {
      // No debt record means full amount is owed
      debtAmountUSD = sale.currency === 'USD' ? sale.total : sale.total / EXCHANGE_RATES.USD_TO_IQD;
    } else if (debt.paid_at) {
      // Already fully paid
      debtAmountUSD = 0;
    } else {
      // Calculate remaining amount after partial payments
      const originalTotal = sale.total;
      const currency = sale.currency || 'USD';
      
      if (currency === 'USD') {
        const paidAmount = debt.payment_usd_amount || 0;
        const remaining = Math.max(0, originalTotal - paidAmount);
        debtAmountUSD = remaining;
      } else {
        const paidAmount = debt.payment_iqd_amount || 0;
        const remaining = Math.max(0, originalTotal - paidAmount);
        debtAmountUSD = remaining / EXCHANGE_RATES.USD_TO_IQD; // Convert to USD for calculation
      }
    }
    
    if (multiCurrency.enabled) {
      const totalPaidUSD = multiCurrency.usdAmount + (multiCurrency.iqdAmount / EXCHANGE_RATES.USD_TO_IQD);
      const difference = totalPaidUSD - debtAmountUSD;
      
      let changeInfo = null;
      if (difference > 0) {
        // Calculate change - prefer IQD and ignore change less than 250 IQD
        const changeIQD = difference * EXCHANGE_RATES.USD_TO_IQD;
        const roundedChangeIQD = roundIQDToNearestBill(changeIQD);
        
        // If change is less than 250 IQD, ignore it (no change given)
        if (roundedChangeIQD < 250) {
          changeInfo = null; // No change given for amounts less than 250 IQD
        } else {
          // Always give change in IQD for debt payments
          changeInfo = {
            changeUSD: 0, // Don't give USD change for debt payments
            changeIQD: changeIQD,
            changeInUSD: 0, // Always prefer IQD for debt payment change
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
    }
    
    return null;
  }, [selectedDebt, multiCurrency]);

  const handleClose = () => {
    setShowPaymentModal(false);
    setSelectedDebt(null);
    setMultiCurrency({ enabled: false, usdAmount: 0, iqdAmount: 0 });
    setPaymentCurrency('IQD'); // Reset to IQD default
  };

  const processPayment = async () => {
    if (!selectedDebt) return;
    
    const { debt, sale, originalCustomer } = selectedDebt;
    
    // Check if debt is already fully paid
    if (debt && debt.paid_at) {
      admin.setToast?.('This debt has already been fully paid', 'error');
      return;
    }
    
    // Calculate remaining debt amount for validation
    const remainingDebt = (() => {
      if (!debt) {
        return sale.currency === 'USD' ? sale.total : sale.total;
      } else {
        const originalTotal = sale.total;
        const currency = sale.currency || 'USD';
        
        if (currency === 'USD') {
          const paidAmount = debt.payment_usd_amount || 0;
          return Math.max(0, originalTotal - paidAmount);
        } else {
          const paidAmount = debt.payment_iqd_amount || 0;
          return Math.max(0, originalTotal - paidAmount);
        }
      }
    })();
    
    if (remainingDebt <= 0) {
      admin.setToast?.('This debt has been fully paid', 'error');
      return;
    }
    
    try {
      let paymentData = null;
      
      if (multiCurrency.enabled) {
        // Custom payment amounts with change handling
        let netUSD = multiCurrency.usdAmount;
        let netIQD = multiCurrency.iqdAmount;
        
        // Handle overpayment/change
        if (paymentSummary && paymentSummary.change) {
          // Customer overpaid, we need to give change
          if (paymentSummary.change.changeInUSD > 0) {
            netUSD -= paymentSummary.change.changeInUSD;
          } else if (paymentSummary.change.changeInIQD > 0) {
            netIQD -= paymentSummary.change.changeInIQD;
          }
        }
        
        paymentData = {
          usdAmount: netUSD, // What we actually receive
          iqdAmount: netIQD, // What we actually receive  
          deductUSD: netUSD, // What we actually keep after change
          deductIQD: netIQD  // What we actually keep after change
        };
      } else {
        // Default payment based on selected payment currency - use REMAINING debt amount
        const remainingDebtInfo = (() => {
          if (!debt) {
            // No debt record means full amount is owed
            return {
              usdAmount: sale.currency === 'USD' ? sale.total : (sale.total / EXCHANGE_RATES.USD_TO_IQD),
              iqdAmount: sale.currency === 'IQD' ? sale.total : (sale.total * EXCHANGE_RATES.USD_TO_IQD)
            };
          } else if (debt.paid_at) {
            // Already fully paid
            return { usdAmount: 0, iqdAmount: 0 };
          } else {
            // Calculate remaining amount after partial payments
            const originalTotal = sale.total;
            const currency = sale.currency || 'USD';
            
            if (currency === 'USD') {
              const paidAmount = debt.payment_usd_amount || 0;
              const remaining = Math.max(0, originalTotal - paidAmount);
              return {
                usdAmount: remaining,
                iqdAmount: remaining * EXCHANGE_RATES.USD_TO_IQD
              };
            } else {
              const paidAmount = debt.payment_iqd_amount || 0;
              const remaining = Math.max(0, originalTotal - paidAmount);
              return {
                usdAmount: remaining / EXCHANGE_RATES.USD_TO_IQD,
                iqdAmount: remaining
              };
            }
          }
        })();
        
        if (paymentCurrency === 'USD') {
          // Pay with USD - use remaining USD amount
          paymentData = {
            usdAmount: remainingDebtInfo.usdAmount,
            iqdAmount: 0,
            deductUSD: remainingDebtInfo.usdAmount,
            deductIQD: 0
          };
        } else if (paymentCurrency === 'IQD') {
          // Pay with IQD - use remaining IQD amount
          paymentData = {
            usdAmount: 0,
            iqdAmount: remainingDebtInfo.iqdAmount,
            deductUSD: 0,
            deductIQD: remainingDebtInfo.iqdAmount
          };
        } else {
          // Fallback - use remaining IQD amount
          paymentData = {
            usdAmount: 0,
            iqdAmount: remainingDebtInfo.iqdAmount,
            deductUSD: 0,
            deductIQD: remainingDebtInfo.iqdAmount
          };
        }
      }
      
      let result;
      
      if (debt && debt.id) {
        // If there's an existing debt record, mark it as paid
        result = await window.api?.markCustomerDebtPaid?.(debt.id, new Date().toISOString(), {
          payment_currency_used: multiCurrency.enabled ? 'MULTI' : paymentCurrency,
          payment_usd_amount: paymentData.usdAmount || 0,
          payment_iqd_amount: paymentData.iqdAmount || 0,
          // Legacy format for backward compatibility
          currency: sale.currency,
          usdAmount: paymentData.usdAmount || 0,
          iqdAmount: paymentData.iqdAmount || 0,
          deductUSD: paymentData.deductUSD || 0,
          deductIQD: paymentData.deductIQD || 0
        });
      } else {
        // Ensure we have a valid amount
        const debtAmount = sale.total || 0;
        if (debtAmount === 0) {
          throw new Error('Sale total is 0 or undefined, cannot create debt record');
        }
        
        const newDebtResult = await window.api?.addCustomerDebt?.({
          customer_name: originalCustomer,
          amount: debtAmount,
          description: `Debt for sale #${sale.id}`,
          currency: sale.currency || 'IQD',
          sale_id: sale.id
        });
   
        if (newDebtResult && newDebtResult.lastInsertRowid) {
      
          result = await window.api?.markCustomerDebtPaid?.(newDebtResult.lastInsertRowid, new Date().toISOString(), {
            payment_currency_used: multiCurrency.enabled ? 'MULTI' : paymentCurrency,
            payment_usd_amount: paymentData.usdAmount || 0,
            payment_iqd_amount: paymentData.iqdAmount || 0,
            // Legacy format for backward compatibility
            currency: sale.currency,
            usdAmount: paymentData.usdAmount || 0,
            iqdAmount: paymentData.iqdAmount || 0,
            deductUSD: paymentData.deductUSD || 0,
            deductIQD: paymentData.deductIQD || 0
          });
        } else {
          throw new Error('Failed to create debt record');
        }
      }
      if (result && result.changes > 0) {
        const isFullyPaid = result.isFullyPaid;
        const paymentType = isFullyPaid ? 'Full payment' : 'Partial payment';
        const amounts = [];
        if (paymentData.usdAmount > 0) amounts.push(`$${paymentData.usdAmount.toFixed(2)}`);
        if (paymentData.iqdAmount > 0) amounts.push(`د.ع${paymentData.iqdAmount.toFixed(2)}`);
        
        admin.setToast?.(`${paymentType} received: ${amounts.join(' + ')} for ${originalCustomer}`, 'success');
        
        // Refresh balances to show updated amounts
        if (admin.loadBalances) {
          await admin.loadBalances();
        }
        
        // Call the completion callback to refresh data
        if (onPaymentComplete) {
          await onPaymentComplete();
        }
        
        handleClose();
      } else {
        admin.setToast?.('Failed to mark debt as paid');
      }
    } catch (error) {
      console.error('Error marking debt as paid:', error);
      admin.setToast?.('Error marking debt as paid');
    }
  };

  if (!showPaymentModal || !selectedDebt) return null;

  const { debt, sale, originalCustomer } = selectedDebt;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-t-2xl">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              <Icon name="dollar-sign" size={20} className="mr-2" />
              {t.customerDebtPayment || 'Customer Debt Payment'}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t.customer || 'Customer'}
              </h4>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {originalCustomer}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t.debtAmount || 'Debt Amount'}
              </h4>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {(() => {
                  // Calculate remaining debt amount for display with proper conversion
                  let remainingAmount = 0;
                  let currency = '';
                  
                  if (!debt) {
                    // No debt record means full amount is owed
                    remainingAmount = sale.total;
                    currency = sale.currency || 'USD';
                  } else if (debt.paid_at) {
                    // Already fully paid
                    return (sale.currency === 'USD' ? '$' : 'د.ع') + '0.00';
                  } else {
                    // Calculate remaining amount after partial payments
                    const originalTotal = sale.total;
                    currency = sale.currency || 'USD';
                    
                    if (currency === 'USD') {
                      const paidAmount = debt.payment_usd_amount || 0;
                      remainingAmount = Math.max(0, originalTotal - paidAmount);
                    } else {
                      const paidAmount = debt.payment_iqd_amount || 0;
                      remainingAmount = Math.max(0, originalTotal - paidAmount);
                    }
                  }
                  
                  // Display remaining amount with conversion
                  if (currency === 'USD') {
                    const convertedIQD = (remainingAmount * EXCHANGE_RATES.USD_TO_IQD).toFixed(0);
                    return `$${remainingAmount.toFixed(2)} (= د.ع${convertedIQD})`;
                  } else {
                    const convertedUSD = (remainingAmount / EXCHANGE_RATES.USD_TO_IQD).toFixed(2);
                    return `د.ع${remainingAmount.toFixed(0)} (= $${convertedUSD})`;
                  }
                })()}
              </p>
            </div>
          </div>
        </div>
        
        {/* Payment Options */}
        <div className="p-6 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                <Icon name="creditCard" size={20} className="mr-2" />
                {t.paymentOptions || 'Payment Options'}
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
                {multiCurrency.enabled ? (t.customAmounts || 'Custom Amounts') : (t.defaultPayment || 'Default Payment')}
              </button>
            </div>
            
            {!multiCurrency.enabled && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-4">
                <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  {t.defaultPayment || 'Default Payment'}
                </h5>
                
                {/* Payment Currency Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                    {t.payWith || 'Pay with'}:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentCurrency('USD')}
                      className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                        paymentCurrency === 'USD'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <Icon name="dollar" size={16} />
                      USD
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
                      <Icon name="building" size={16} />
                      IQD
                    </button>
                  </div>
                </div>
                
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  {paymentCurrency === 'USD' ? (
                    <div>
                      <div>Pay with USD: ${(() => {
                        // Calculate remaining debt amount in USD
                        if (!debt) {
                          return sale.currency === 'USD' ? sale.total.toFixed(2) : (sale.total / EXCHANGE_RATES.USD_TO_IQD).toFixed(2);
                        } else if (debt.paid_at) {
                          return '0.00';
                        } else {
                          const originalTotal = sale.total;
                          const currency = sale.currency || 'USD';
                          
                          if (currency === 'USD') {
                            const paidAmount = debt.payment_usd_amount || 0;
                            const remaining = Math.max(0, originalTotal - paidAmount);
                            return remaining.toFixed(2);
                          } else {
                            const paidAmount = debt.payment_iqd_amount || 0;
                            const remaining = Math.max(0, originalTotal - paidAmount);
                            return (remaining / EXCHANGE_RATES.USD_TO_IQD).toFixed(2);
                          }
                        }
                      })()}</div>
                      <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                        {sale.currency === 'IQD' && debt && (debt.payment_iqd_amount > 0 || debt.payment_usd_amount > 0) && 
                          `Remaining from original د.ع${sale.total.toFixed(2)} debt`}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div>Pay with IQD: د.ع{(() => {
                        // Calculate remaining debt amount in IQD
                        if (!debt) {
                          return sale.currency === 'IQD' ? sale.total.toFixed(2) : (sale.total * EXCHANGE_RATES.USD_TO_IQD).toFixed(2);
                        } else if (debt.paid_at) {
                          return '0.00';
                        } else {
                          const originalTotal = sale.total;
                          const currency = sale.currency || 'USD';
                          
                          if (currency === 'USD') {
                            const paidAmount = debt.payment_usd_amount || 0;
                            const remaining = Math.max(0, originalTotal - paidAmount);
                            return (remaining * EXCHANGE_RATES.USD_TO_IQD).toFixed(2);
                          } else {
                            const paidAmount = debt.payment_iqd_amount || 0;
                            const remaining = Math.max(0, originalTotal - paidAmount);
                            return remaining.toFixed(2);
                          }
                        }
                      })()}</div>
                      <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                        {sale.currency === 'USD' && debt && (debt.payment_iqd_amount > 0 || debt.payment_usd_amount > 0) && 
                          `Remaining from original $${sale.total.toFixed(2)} debt`}
                      </div>
                      <div className="text-xs mt-1 text-orange-600 dark:text-orange-400">
                        Change less than 250 IQD will be ignored
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {multiCurrency.enabled && (
              <div className="space-y-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                    {t.usdAmount || 'USD Amount'} ($)
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
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                    {t.iqdAmount || 'IQD Amount'} (د.ع)
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
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <div className="font-medium mb-2">{t.paymentSummary || 'Payment Summary'}:</div>
                    
                    {paymentSummary && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>{t.debtAmount || 'Debt Amount'}:</span>
                          <span className="font-medium">{formatCurrency(paymentSummary.debtAmount, 'USD')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t.totalPaying || 'Total Paying'}:</span>
                          <span className="font-medium">{formatCurrency(paymentSummary.totalPaid, 'USD')}</span>
                        </div>
                        <hr className="border-blue-200 dark:border-blue-700" />
                        
                        {paymentSummary.status === 'perfect' && (
                          <div className="text-green-600 dark:text-green-400 font-medium flex items-center">
                            <Icon name="check" size={16} className="text-green-600" />
                            {t.perfectPayment || 'Perfect Payment'}
                          </div>
                        )}
                        
                        {paymentSummary.status === 'underpaid' && (
                          <div className="text-red-600 dark:text-red-400 font-medium flex items-center">
                            <Icon name="warning" size={16} className="text-amber-600" />
                            {t.remaining || 'Remaining'}: {formatCurrency(Math.abs(paymentSummary.difference), 'USD')}
                            <span className="ml-2 text-xs">
                              (≈ د.ع{(Math.abs(paymentSummary.difference) * EXCHANGE_RATES.USD_TO_IQD).toFixed(0)})
                            </span>
                          </div>
                        )}
                        
                        {paymentSummary.status === 'overpaid' && paymentSummary.change && (
                          <div className="text-orange-600 dark:text-orange-400 font-medium">
                            <Icon name="dollar-sign" size={12} className="mr-1" />
                            {t.change || 'Change'}: 
                            {paymentSummary.change.changeInUSD > 0 
                              ? formatCurrency(paymentSummary.change.changeInUSD, 'USD')
                              : formatCurrency(paymentSummary.change.changeInIQD, 'IQD')
                            }
                          </div>
                        )}
                        
                        <div className="text-xs mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                          <div>• USD: ${multiCurrency.usdAmount.toFixed(2)} → {t.addedToBalance || 'Added to USD balance'}</div>
                          <div>• IQD: د.ع{multiCurrency.iqdAmount.toFixed(2)} → {t.addedToBalance || 'Added to IQD balance'}</div>
                          {paymentSummary.change && paymentSummary.change.changeInUSD > 0 && (
                            <div className="text-orange-600 dark:text-orange-400">• Change: ${paymentSummary.change.changeInUSD.toFixed(2)} from USD balance</div>
                          )}
                          {paymentSummary.change && paymentSummary.change.changeInIQD > 0 && (
                            <div className="text-orange-600 dark:text-orange-400">• Change: د.ع{paymentSummary.change.changeInIQD.toFixed(0)} from IQD balance</div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {!paymentSummary && (
                      <div>
                        <div>• USD: ${multiCurrency.usdAmount.toFixed(2)} → {t.addedToBalance || 'Added to USD balance'}</div>
                        <div>• IQD: د.ع{multiCurrency.iqdAmount.toFixed(2)} → {t.addedToBalance || 'Added to IQD balance'}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                  {t.customPaymentNote || `Enter the amounts the customer is paying. These will be added to your respective currency balances.`}
                </div>
              </div>
            )}
          </div>

          {/* Current Balance Display */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h5 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              {t.currentBalance || 'Your Current Balance'}
            </h5>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  ${admin.balanceUSD?.toFixed(2) || '0.00'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t?.usdBalance || 'USD Balance'}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  د.ع{admin.balanceIQD?.toFixed(2) || '0.00'}
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
            {t.cancel || 'Cancel'}
          </button>
          <button
            onClick={processPayment}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold shadow-lg"
          >
            <Icon name="check" size={16} className="mr-2" />
            {t.markAsPaid || 'Mark as Paid'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDebtPaymentModal;
