import React, { useState, useEffect, useMemo } from 'react';
import ModalBase from './ModalBase';
import { EXCHANGE_RATES, formatCurrency } from '../utils/exchangeRates';
import { Icon } from '../utils/icons.jsx';

export default function EnhancedCompanyDebtModal({ show, onClose, debt, onMarkPaid, t }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showItems, setShowItems] = useState(true);
  const [paymentCurrency, setPaymentCurrency] = useState('USD'); // Which currency user will pay with
  const [paymentAmount, setPaymentAmount] = useState(0); // How much user is paying

  // Calculate payment summary with change skipping logic
  const paymentSummary = useMemo(() => {
    if (!debt || !paymentAmount) return null;
    
    // Debt is always stored in USD
    const debtAmountUSD = debt.amount || 0;
    
    let changeInfo = null;
    let netDeduction = 0;
    
    if (paymentCurrency === 'USD') {
      const overpaymentUSD = paymentAmount - debtAmountUSD;
      
      if (overpaymentUSD > 0) {
        // Skip change if less than $1 USD
        if (overpaymentUSD < 1) {
          changeInfo = { message: `Change of $${overpaymentUSD.toFixed(2)} will be ignored (less than $1)` };
          netDeduction = paymentAmount; // Keep full payment
        } else {
          changeInfo = { message: `Change: $${overpaymentUSD.toFixed(2)} will be returned` };
          netDeduction = debtAmountUSD; // Only deduct debt amount
        }
      } else {
        netDeduction = paymentAmount;
      }
    } else {
      // Paying with IQD
      const debtAmountIQD = debtAmountUSD * EXCHANGE_RATES.USD_TO_IQD;
      const overpaymentIQD = paymentAmount - debtAmountIQD;
      
      if (overpaymentIQD > 0) {
        // Skip change if less than 1000 IQD
        if (overpaymentIQD < 1000) {
          changeInfo = { message: `Change of د.ع${overpaymentIQD.toFixed(0)} will be ignored (less than 1000 IQD)` };
          netDeduction = paymentAmount / EXCHANGE_RATES.USD_TO_IQD; // Convert full payment to USD equivalent
        } else {
          changeInfo = { message: `Change: د.ع${overpaymentIQD.toFixed(0)} will be returned` };
          netDeduction = debtAmountUSD; // Only deduct debt amount in USD equivalent
        }
      } else {
        netDeduction = paymentAmount / EXCHANGE_RATES.USD_TO_IQD; // Convert payment to USD equivalent
      }
    }
    
    return {
      debtAmount: debtAmountUSD,
      paymentAmount,
      netDeduction,
      changeInfo,
      isOverpaying: paymentAmount > (paymentCurrency === 'USD' ? debtAmountUSD : debtAmountUSD * EXCHANGE_RATES.USD_TO_IQD),
      isUnderpaying: paymentAmount < (paymentCurrency === 'USD' ? debtAmountUSD : debtAmountUSD * EXCHANGE_RATES.USD_TO_IQD),
      isPerfect: Math.abs(paymentAmount - (paymentCurrency === 'USD' ? debtAmountUSD : debtAmountUSD * EXCHANGE_RATES.USD_TO_IQD)) < 0.01
    };
  }, [debt, paymentAmount, paymentCurrency]);

  useEffect(() => {
    if (show && debt && debt.has_items) {
      fetchDebtItems();
      setShowItems(true);
    }
    
    // Set default payment amount when debt changes
    if (show && debt) {
      setPaymentCurrency('USD');
      setPaymentAmount(debt.amount || 0); // Default to exact debt amount in USD
    }
  }, [show, debt]);

  const fetchDebtItems = async () => {
    if (!debt.id) return;
    
    setLoading(true);
    try {
      const items = await window.api?.getCompanyDebtItems?.(debt.id);
      setItems(items || []);
    } catch (error) {
      console.error('Error fetching debt items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!paymentAmount || paymentAmount <= 0) {
      alert(t?.pleaseEnterValidAmount || 'Please enter a valid payment amount');
      return;
    }
    
    const paymentData = {
      payment_currency: paymentCurrency,
      payment_amount: paymentAmount
    };
    
    await onMarkPaid(debt.id, paymentData);
    onClose();
  };

  if (!show || !debt) return null;

  return (
    <ModalBase show={show} onClose={onClose} maxWidth="6xl">
      <div className="max-h-[90vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              � {t?.companyDebtDetails || 'Company Debt Details'}
            </h2>
            {!debt.paid_at && (
              <button
                onClick={handleMarkPaid}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold shadow-lg"
              >
                ✅ {t?.markAsPaid || 'Mark as Paid'}
              </button>
            )}
          </div>

          {/* Key Information in Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t?.companyName || 'Company Name'}
              </h3>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {debt.company_name}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t?.amount || 'Amount'}
              </h3>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                ${(debt.amount || 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t?.createdAt || 'Created At'}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {new Date(debt.created_at).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(debt.created_at).toLocaleTimeString()}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t?.status || 'Status'}
              </h3>
              {debt.paid_at ? (
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    ✅ {t?.paid || 'Paid'}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(debt.paid_at).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  ⏳ {t?.unpaid || 'Unpaid'}
                </span>
              )}
            </div>
          </div>

          {debt.description && (
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                {t?.description || 'Description'}
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {debt.description}
              </p>
            </div>
          )}
        </div>

        {/* Items Section - Table format like buying history */}
        {debt.has_items && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,15.4L16.2,16.2Z"/>
                  </svg>
                  {t?.purchasedItems || 'Purchased Items'}
                </h3>
                <button
                  onClick={() => setShowItems(!showItems)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                  {showItems ? '🔼' : '🔽'} {showItems ? (t?.hideItems || 'Hide Items') : (t?.showItems || 'Show Items')}
                </button>
              </div>
            </div>

            {showItems && (
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    {t?.loading || 'Loading items...'}
                  </div>
                ) : items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t?.item || 'Item'}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t?.specifications || 'Specifications'}
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t?.quantity || 'Qty'}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t?.unitPrice || 'Unit Price'}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t?.total || 'Total'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-4">
                              <div className="flex items-center">
                                <svg className="w-5 h-5 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                  {item.item_type === 'product' ? (
                                    <path d="M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z"/>
                                  ) : (
                                    <path d="M16,12A2,2 0 0,1 18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12M10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12M4,12A2,2 0 0,1 6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12Z"/>
                                  )}
                                </svg>
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {item.item_name}
                                  </div>
                                  <div className="text-xs">
                                    {item.item_type === 'product' ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        {t?.product || 'Product'}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                        {t?.accessory || 'Accessory'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm space-y-1">
                                {item.brand && (
                                  <div className="text-gray-900 dark:text-gray-100">
                                    <span className="font-medium">{item.brand}</span>
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                  {item.ram && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                      RAM: {item.ram}
                                    </span>
                                  )}
                                  {item.storage && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                      Storage: {item.storage}
                                    </span>
                                  )}
                                  {item.model && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                      Model: {item.model}
                                    </span>
                                  )}
                                  {item.type && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                      Type: {item.type}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {item.quantity}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                ${item.unit_price}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                ${item.total_price}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <td colSpan="4" className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                            {t?.totalAmount || 'Total Amount'}:
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">
                              ${items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-2">📭</div>
                    {t?.noItemsFound || 'No items found'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Simple Payment Section for Unpaid Debts */}
        {!debt.paid_at && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
              </svg>
              {t?.paymentOptions || 'Payment Options'}
            </h3>
            
            <div className="space-y-4">
              {/* Payment Currency Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t?.payWith || 'Pay with'}:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentCurrency('USD');
                      setPaymentAmount(debt.amount || 0); // Set to debt amount in USD
                    }}
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
                      USD
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentCurrency('IQD');
                      setPaymentAmount((debt.amount || 0) * EXCHANGE_RATES.USD_TO_IQD); // Convert to IQD
                    }}
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
                      د.ع IQD
                    </span>
                  </button>
                </div>
              </div>

              {/* Payment Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t?.paymentAmount || 'Payment Amount'} ({paymentCurrency === 'USD' ? '$' : 'د.ع'})
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  min="0"
                  step={paymentCurrency === 'USD' ? '0.01' : '1'}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                />
              </div>

              {/* Default Payment Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <div className="font-medium mb-2">{t?.debtInfo || 'Debt Information'}:</div>
                  <div>Debt Amount: ${(debt.amount || 0).toFixed(2)} USD</div>
                  {paymentCurrency === 'IQD' && (
                    <div>Equivalent: د.ع{((debt.amount || 0) * EXCHANGE_RATES.USD_TO_IQD).toFixed(0)} IQD</div>
                  )}
                </div>
              </div>

              {/* Payment Summary */}
              {paymentSummary && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    <div className="font-medium mb-2">{t?.paymentSummary || 'Payment Summary'}:</div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>{t?.debtAmount || 'Debt Amount'}:</span>
                        <span className="font-medium">${paymentSummary.debtAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t?.payingAmount || 'Paying'}:</span>
                        <span className="font-medium">
                          <div className="flex flex-col">
                            <div>{paymentCurrency === 'USD' ? `$${paymentSummary.paymentAmount.toFixed(2)}` : `د.ع${paymentSummary.paymentAmount.toFixed(0)}`}</div>
                          </div>
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t?.willBeDeducted || 'Will be deducted'}:</span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          <div className="flex flex-col">
                            <div>{paymentCurrency === 'USD' ? `$${paymentSummary.netDeduction.toFixed(2)}` : `د.ع${(paymentSummary.netDeduction * EXCHANGE_RATES.USD_TO_IQD).toFixed(0)}`}</div>
                            <div className="text-xs opacity-75">from {paymentCurrency} balance</div>
                          </div>
                        </span>
                      </div>
                      <hr className="border-yellow-200 dark:border-yellow-700" />
                      
                      {paymentSummary.changeInfo && (
                        <div className="text-orange-600 dark:text-orange-400 font-medium">
                          � {paymentSummary.changeInfo.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                {t?.changeNote || `Changes less than $1 USD or 1000 IQD will be ignored to avoid small transactions.`}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition font-medium"
          >
            {t?.close || 'Close'}
          </button>
          
          {!debt.paid_at && (
            <button
              onClick={handleMarkPaid}
              disabled={!paymentAmount || paymentAmount <= 0}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                !paymentAmount || paymentAmount <= 0
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700 shadow-lg'
              }`}
            >
              <Icon name="check" size={16} className="mr-2" />
              {t?.markAsPaid || 'Mark as Paid'}
            </button>
          )}
        </div>
      </div>
    </ModalBase>
  );
}
