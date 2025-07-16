import React, { useState } from 'react';

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

  const handleClose = () => {
    setShowPaymentModal(false);
    setSelectedDebt(null);
    setMultiCurrency({ enabled: false, usdAmount: 0, iqdAmount: 0 });
  };

  const processPayment = async () => {
    if (!selectedDebt) return;
    
    const { debt, sale, originalCustomer } = selectedDebt;
    
    try {
      let paymentData = null;
      
      if (multiCurrency.enabled) {
        // Custom payment amounts
        paymentData = {
          usdAmount: multiCurrency.usdAmount,
          iqdAmount: multiCurrency.iqdAmount,
          deductUSD: multiCurrency.usdAmount,
          deductIQD: multiCurrency.iqdAmount
        };
      } else {
        // Default payment based on debt currency
        if (sale.currency === 'USD') {
          paymentData = {
            usdAmount: sale.total,
            iqdAmount: 0,
            deductUSD: sale.total,
            deductIQD: 0
          };
        } else {
          paymentData = {
            usdAmount: 0,
            iqdAmount: sale.total,
            deductUSD: 0,
            deductIQD: sale.total
          };
        }
      }
      
      let result;
      
      if (debt && debt.id) {
        // If there's an existing debt record, mark it as paid
    
        result = await window.api?.markCustomerDebtPaid?.(debt.id, new Date().toISOString(), {
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
          currency: sale.currency || 'USD',
          sale_id: sale.id
        });
   
        if (newDebtResult && newDebtResult.lastInsertRowid) {
      
          result = await window.api?.markCustomerDebtPaid?.(newDebtResult.lastInsertRowid, new Date().toISOString(), {
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
        admin.setToast?.(`💰 Debt of ${(sale.currency === 'USD' ? '$' : 'د.ع')}${sale.total.toFixed(2)} marked as paid for ${originalCustomer}`);
        
        // Call the completion callback to refresh data
        if (onPaymentComplete) {
          await onPaymentComplete();
        }
        
        handleClose();
      } else {
        admin.setToast?.('❌ Failed to mark debt as paid');
      }
    } catch (error) {
      console.error('Error marking debt as paid:', error);
      admin.setToast?.('❌ Error marking debt as paid');
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
              💰 {t.customerDebtPayment || 'Customer Debt Payment'}
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
                {(sale.currency === 'USD' ? '$' : 'د.ع')}{sale.total.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Payment Options */}
        <div className="p-6 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                💳 {t.paymentOptions || 'Payment Options'}
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
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  {t.defaultPayment || 'Default Payment'}
                </h5>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  {sale.currency === 'USD' ? (
                    <div>
                      <div>USD: ${sale.total.toFixed(2)}</div>
                      <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                        Amount will be added to your USD balance
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div>IQD: د.ع{sale.total.toFixed(2)}</div>
                      <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                        Amount will be added to your IQD balance
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
                
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <div className="text-sm text-green-700 dark:text-green-300">
                    <div className="font-medium mb-1">{t.paymentSummary || 'Payment Summary'}:</div>
                    <div>• USD: ${multiCurrency.usdAmount.toFixed(2)} → {t.addedToBalance || 'Added to USD balance'}</div>
                    <div>• IQD: د.ع{multiCurrency.iqdAmount.toFixed(2)} → {t.addedToBalance || 'Added to IQD balance'}</div>
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
                <div className="text-xs text-gray-500 dark:text-gray-400">USD Balance</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  د.ع{admin.balanceIQD?.toFixed(2) || '0.00'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">IQD Balance</div>
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
            💰 {t.markAsPaid || 'Mark as Paid'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDebtPaymentModal;
