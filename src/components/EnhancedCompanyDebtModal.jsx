import React, { useState, useEffect, useMemo } from 'react';
import ModalBase from './ModalBase';
import { EXCHANGE_RATES, formatCurrency } from '../utils/exchangeRates';
import { Icon } from '../utils/icons.jsx';

export default function EnhancedCompanyDebtModal({ show, onClose, debt, onMarkPaid, t, onToast = null }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showItems, setShowItems] = useState(true);
  const [paymentMode, setPaymentMode] = useState('single'); // 'single' or 'multi'
  const [paymentCurrency, setPaymentCurrency] = useState('IQD'); // Which currency user will pay with (for single mode)
  const [paymentAmount, setPaymentAmount] = useState(0); // How much user is paying (for single mode)
  
  // Multi-currency payment state
  const [usdPaymentAmount, setUsdPaymentAmount] = useState(0);
  const [iqdPaymentAmount, setIqdPaymentAmount] = useState(0);

  // Calculate payment summary with change skipping logic
  const paymentSummary = useMemo(() => {
    if (!debt) return null;
    
    // Determine effective payment amounts based on mode
    let effectiveUsdPayment = 0;
    let effectiveIqdPayment = 0;
    
    if (paymentMode === 'multi') {
      effectiveUsdPayment = usdPaymentAmount || 0;
      effectiveIqdPayment = iqdPaymentAmount || 0;
    } else {
      // Single currency mode
      if (paymentCurrency === 'USD') {
        effectiveUsdPayment = paymentAmount || 0;
        effectiveIqdPayment = 0;
      } else {
        effectiveUsdPayment = 0;
        effectiveIqdPayment = paymentAmount || 0;
      }
    }
    
    // Skip calculation if no payment amounts
    if (effectiveUsdPayment === 0 && effectiveIqdPayment === 0) return null;
    
    // Calculate debt amount in USD equivalent based on its original currency
    let debtAmountUSD = 0;
    if (debt.currency === 'IQD') {
      debtAmountUSD = (debt.amount || 0) / EXCHANGE_RATES.USD_TO_IQD; // Convert IQD debt to USD
    } else if (debt.currency === 'USD') {
      debtAmountUSD = debt.amount || 0; // Already in USD
    } else if (debt.currency === 'MULTI') {
      // Multi-currency debt - use USD amount as primary
      debtAmountUSD = debt.usd_amount || 0;
    } else {
      // Legacy handling - assume IQD if currency not specified (default to IQD, not USD)
      debtAmountUSD = (debt.amount || 0) / EXCHANGE_RATES.USD_TO_IQD;
    }
    
    // Account for previous payments
    const previousPaidUSD = debt.payment_usd_amount || 0;
    const previousPaidIQD = debt.payment_iqd_amount || 0;
    const previousPaidUSDEquivalent = previousPaidUSD + (previousPaidIQD / EXCHANGE_RATES.USD_TO_IQD);
    
    // Calculate remaining debt after previous payments
    const remainingDebtUSD = Math.max(0, debtAmountUSD - previousPaidUSDEquivalent);
    
    // Convert total payment to USD equivalent for comparison
    const totalPaymentUSD = effectiveUsdPayment + (effectiveIqdPayment / EXCHANGE_RATES.USD_TO_IQD);
    
    let changeInfo = null;
    let netDeductionUSD = 0;
    let netDeductionIQD = 0;
    
    const overpaymentUSD = totalPaymentUSD - remainingDebtUSD;
    
    if (overpaymentUSD > 0) {
      // Skip change if less than $1 USD equivalent
      if (overpaymentUSD < 1) {
        changeInfo = { message: `Change of $${overpaymentUSD.toFixed(2)} will be ignored (less than $1)` };
        netDeductionUSD = effectiveUsdPayment; // Keep full USD payment
        netDeductionIQD = effectiveIqdPayment; // Keep full IQD payment
      } else {
        changeInfo = { message: `Change: $${overpaymentUSD.toFixed(2)} will be returned` };
        // Calculate proportional deduction
        if (paymentMode === 'multi') {
          // For multi-currency, proportionally reduce both currencies
          const debtRatio = remainingDebtUSD / totalPaymentUSD;
          netDeductionUSD = effectiveUsdPayment * debtRatio;
          netDeductionIQD = effectiveIqdPayment * debtRatio;
        } else {
          // For single currency, only deduct debt amount
          netDeductionUSD = Math.min(effectiveUsdPayment, remainingDebtUSD);
          netDeductionIQD = Math.min(effectiveIqdPayment, remainingDebtUSD * EXCHANGE_RATES.USD_TO_IQD);
        }
      }
    } else {
      // Not overpaying, deduct full payment amounts
      netDeductionUSD = effectiveUsdPayment;
      netDeductionIQD = effectiveIqdPayment;
    }
    
    return {
      originalDebtAmount: debtAmountUSD,
      remainingDebtAmount: remainingDebtUSD,
      previousPaidUSD,
      previousPaidIQD,
      paymentAmountUSD: effectiveUsdPayment,
      paymentAmountIQD: effectiveIqdPayment,
      totalPaymentUSD,
      netDeductionUSD,
      netDeductionIQD,
      changeInfo,
      isOverpaying: overpaymentUSD > 0,
      isUnderpaying: totalPaymentUSD < remainingDebtUSD,
      isPerfect: Math.abs(totalPaymentUSD - remainingDebtUSD) < 0.01,
      finalRemainingDebtUSD: Math.max(0, remainingDebtUSD - totalPaymentUSD)
    };
  }, [debt, paymentAmount, paymentCurrency, paymentMode, usdPaymentAmount, iqdPaymentAmount]);

  // Calculate remaining debt display
  const getRemainingDebtDisplay = () => {
    if (!debt) return '';
    
    const previousPaidUSD = debt.payment_usd_amount || 0;
    const previousPaidIQD = debt.payment_iqd_amount || 0;
    
    if (debt.currency === 'USD') {
      const remainingUSD = Math.max(0, (debt.amount || 0) - previousPaidUSD - (previousPaidIQD / EXCHANGE_RATES.USD_TO_IQD));
      return `$${remainingUSD.toFixed(2)}`;
    } else if (debt.currency === 'IQD') {
      const remainingIQD = Math.max(0, (debt.amount || 0) - previousPaidIQD - (previousPaidUSD * EXCHANGE_RATES.USD_TO_IQD));
      return `د.ع${remainingIQD.toFixed(0)} IQD`;
    } else if (debt.currency === 'MULTI') {
      const originalUSD = debt.usd_amount || 0;
      const originalIQD = debt.iqd_amount || 0;
      const remainingUSD = Math.max(0, originalUSD - previousPaidUSD);
      const remainingIQD = Math.max(0, originalIQD - previousPaidIQD);
      
      if (remainingUSD > 0 && remainingIQD > 0) {
        return `$${remainingUSD.toFixed(2)} + د.ع${remainingIQD.toFixed(0)} IQD`;
      } else if (remainingUSD > 0) {
        return `$${remainingUSD.toFixed(2)}`;
      } else if (remainingIQD > 0) {
        return `د.ع${remainingIQD.toFixed(0)} IQD`;
      } else {
        return 'Fully Paid';
      }
    } else {
      // Default to IQD
      const remainingIQD = Math.max(0, (debt.amount || 0) - previousPaidIQD - (previousPaidUSD * EXCHANGE_RATES.USD_TO_IQD));
      return `د.ع${remainingIQD.toFixed(0)} IQD`;
    }
  };

  useEffect(() => {
    if (show && debt && debt.has_items) {
      fetchDebtItems();
      setShowItems(true);
    }
    
    // Set default payment amount when debt changes
    if (show && debt) {
      setPaymentMode('single');
      setPaymentCurrency('IQD');
      setUsdPaymentAmount(0);
      setIqdPaymentAmount(0);
      
      // Calculate remaining debt considering previous payments
      const previousPaidUSD = debt.payment_usd_amount || 0;
      const previousPaidIQD = debt.payment_iqd_amount || 0;
      
      // Set payment amount based on remaining debt (not original debt)
      if (debt.currency === 'IQD') {
        const remainingIQD = Math.max(0, (debt.amount || 0) - previousPaidIQD - (previousPaidUSD * EXCHANGE_RATES.USD_TO_IQD));
        setPaymentAmount(remainingIQD); // IQD debt, IQD payment - remaining amount
      } else if (debt.currency === 'USD') {
        const remainingUSD = Math.max(0, (debt.amount || 0) - previousPaidUSD - (previousPaidIQD / EXCHANGE_RATES.USD_TO_IQD));
        setPaymentAmount(remainingUSD * EXCHANGE_RATES.USD_TO_IQD); // USD debt, convert remaining to IQD for payment
      } else if (debt.currency === 'MULTI') {
        // For multi-currency debt, calculate remaining total in IQD
        const originalUSD = debt.usd_amount || 0;
        const originalIQD = debt.iqd_amount || 0;
        const remainingUSD = Math.max(0, originalUSD - previousPaidUSD);
        const remainingIQD = Math.max(0, originalIQD - previousPaidIQD);
        const remainingUSDInIQD = remainingUSD * EXCHANGE_RATES.USD_TO_IQD;
        const totalRemainingIQD = remainingUSDInIQD + remainingIQD;
        setPaymentAmount(totalRemainingIQD);
      } else {
        // Legacy or unknown currency, default to IQD (assume debt amount is in IQD)
        const remainingIQD = Math.max(0, (debt.amount || 0) - previousPaidIQD - (previousPaidUSD * EXCHANGE_RATES.USD_TO_IQD));
        setPaymentAmount(remainingIQD);
      }
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
    let effectiveUsdPayment = 0;
    let effectiveIqdPayment = 0;
    
    if (paymentMode === 'multi') {
      effectiveUsdPayment = usdPaymentAmount || 0;
      effectiveIqdPayment = iqdPaymentAmount || 0;
      
      if (effectiveUsdPayment <= 0 && effectiveIqdPayment <= 0) {
        if (typeof onToast === 'function') {
          onToast(t?.pleaseEnterValidAmount || 'Please enter a valid payment amount', 'error');
        } else {
          console.error('Please enter a valid payment amount');
        }
        return;
      }
    } else {
      // Single currency mode
      if (!paymentAmount || paymentAmount <= 0) {
        if (typeof onToast === 'function') {
          onToast(t?.pleaseEnterValidAmount || 'Please enter a valid payment amount', 'error');
        } else {
          console.error('Please enter a valid payment amount');
        }
        return;
      }
      
      if (paymentCurrency === 'USD') {
        effectiveUsdPayment = paymentAmount;
        effectiveIqdPayment = 0;
      } else {
        effectiveUsdPayment = 0;
        effectiveIqdPayment = paymentAmount;
      }
    }
    
    // Use new multi-currency format to properly track which currencies were used for payment
    const paymentData = {
      payment_currency_used: paymentMode === 'multi' ? 'MULTI' : paymentCurrency,
      payment_usd_amount: effectiveUsdPayment,
      payment_iqd_amount: effectiveIqdPayment,
      // Keep legacy format for backward compatibility
      payment_currency: paymentCurrency,
      payment_amount: paymentAmount
    };
    
    await onMarkPaid(debt.id, paymentData);
    onClose();
  };

  if (!show || !debt) return null;

  return (
    <ModalBase show={show} onClose={onClose} maxWidth="6xl">
      <div className="max-h-[90vh] overflow-y-auto space-y-6 p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl -mx-6 -mt-6 mb-6">
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
                {debt.currency === 'IQD' 
                  ? `د.ع${Math.round(debt.amount || 0).toLocaleString()}`
                  : debt.currency === 'MULTI'
                  ? `$${(debt.usd_amount || 0).toFixed(2)}${debt.iqd_amount ? ` + د.ع${Math.round(debt.iqd_amount).toLocaleString()}` : ''}`
                  : debt.currency === 'USD'
                  ? `$${(debt.amount || 0).toFixed(2)}`
                  : `د.ع${Math.round(debt.amount || 0).toLocaleString()}` // Default to IQD if currency not specified
                }
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
              {/* Payment Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Mode:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('single');
                      setUsdPaymentAmount(0);
                      setIqdPaymentAmount(0);
                    }}
                    className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                      paymentMode === 'single'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Single Currency
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('multi');
                      setPaymentAmount(0);
                    }}
                    className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                      paymentMode === 'multi'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Mixed Currency
                  </button>
                </div>
              </div>

              {/* Single Currency Payment */}
              {paymentMode === 'single' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t?.payWith || 'Pay with'}:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentCurrency('USD');
                        // Set payment amount based on debt currency
                        if (debt.currency === 'IQD') {
                          setPaymentAmount((debt.amount || 0) / EXCHANGE_RATES.USD_TO_IQD); // Convert IQD debt to USD payment
                        } else if (debt.currency === 'USD') {
                          setPaymentAmount(debt.amount || 0); // USD debt, USD payment
                        } else if (debt.currency === 'MULTI') {
                          setPaymentAmount(debt.usd_amount || 0); // Multi-currency debt, use USD portion
                        } else {
                          // Legacy or unknown currency, assume IQD debt and convert to USD
                          setPaymentAmount((debt.amount || 0) / EXCHANGE_RATES.USD_TO_IQD);
                        }
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
                        // Set payment amount based on debt currency
                        if (debt.currency === 'IQD') {
                          setPaymentAmount(debt.amount || 0); // IQD debt, IQD payment
                        } else if (debt.currency === 'USD') {
                          setPaymentAmount((debt.amount || 0) * EXCHANGE_RATES.USD_TO_IQD); // Convert USD debt to IQD payment
                        } else if (debt.currency === 'MULTI') {
                          const usdInIQD = (debt.usd_amount || 0) * EXCHANGE_RATES.USD_TO_IQD;
                          setPaymentAmount(usdInIQD + (debt.iqd_amount || 0)); // Multi-currency debt, total in IQD
                        } else {
                          // Legacy or unknown currency, assume IQD debt
                          setPaymentAmount(debt.amount || 0);
                        }
                      }}
                      className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                        paymentCurrency === 'IQD'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        د.ع IQD
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Multi-Currency Payment */}
              {paymentMode === 'multi' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      USD Amount:
                    </label>
                    <input
                      type="number"
                      value={usdPaymentAmount}
                      onChange={(e) => setUsdPaymentAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      IQD Amount:
                    </label>
                    <input
                      type="number"
                      value={iqdPaymentAmount}
                      onChange={(e) => setIqdPaymentAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                      min="0"
                      step="1"
                    />
                  </div>
                </div>
              )}

              {/* Payment Currency Selection */}
              {paymentMode === 'single' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t?.payWith || 'Pay with'}:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentCurrency('USD');
                        // Set payment amount based on debt currency
                        if (debt.currency === 'IQD') {
                          setPaymentAmount((debt.amount || 0) / EXCHANGE_RATES.USD_TO_IQD); // Convert IQD debt to USD payment
                        } else if (debt.currency === 'USD') {
                          setPaymentAmount(debt.amount || 0); // USD debt, USD payment
                        } else if (debt.currency === 'MULTI') {
                          setPaymentAmount(debt.usd_amount || 0); // Multi-currency debt, use USD portion
                        } else {
                          // Legacy or unknown currency, assume IQD debt and convert to USD
                          setPaymentAmount((debt.amount || 0) / EXCHANGE_RATES.USD_TO_IQD);
                        }
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
                        // Set payment amount based on debt currency
                        if (debt.currency === 'IQD') {
                          setPaymentAmount(debt.amount || 0); // IQD debt, IQD payment
                        } else if (debt.currency === 'USD') {
                          setPaymentAmount((debt.amount || 0) * EXCHANGE_RATES.USD_TO_IQD); // Convert USD debt to IQD payment
                        } else if (debt.currency === 'MULTI') {
                          const usdInIQD = (debt.usd_amount || 0) * EXCHANGE_RATES.USD_TO_IQD;
                          setPaymentAmount(usdInIQD + (debt.iqd_amount || 0)); // Multi-currency debt, total in IQD
                        } else {
                          // Legacy or unknown currency, assume IQD debt
                          setPaymentAmount(debt.amount || 0);
                        }
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
              )}

              {/* Payment Amount Input for Single Currency Mode */}
              {paymentMode === 'single' && (
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
              )}

              {/* Default Payment Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <div className="font-medium mb-2">{t?.debtInfo || 'Debt Information'}:</div>
                  
                  {/* Original Debt Amount */}
                  <div className="mb-2">
                    <span className="font-medium">Original Debt: </span>
                    {debt.currency === 'IQD' && (
                      <span>د.ع{(debt.amount || 0).toFixed(0)} IQD</span>
                    )}
                    {debt.currency === 'USD' && (
                      <span>${(debt.amount || 0).toFixed(2)} USD</span>
                    )}
                    {debt.currency === 'MULTI' && (
                      <span>${(debt.usd_amount || 0).toFixed(2)} USD + د.ع{(debt.iqd_amount || 0).toFixed(0)} IQD</span>
                    )}
                    {(!debt.currency || (debt.currency !== 'USD' && debt.currency !== 'IQD' && debt.currency !== 'MULTI')) && (
                      <span>د.ع{(debt.amount || 0).toFixed(0)} IQD (Default Currency)</span>
                    )}
                  </div>

                  {/* Previous Payments (if any) */}
                  {((debt.payment_usd_amount || 0) > 0 || (debt.payment_iqd_amount || 0) > 0) && (
                    <div className="mb-2">
                      <span className="font-medium">Previous Payments: </span>
                      <div className="text-green-600 dark:text-green-400">
                        {(debt.payment_usd_amount || 0) > 0 && (
                          <span className="mr-2">${(debt.payment_usd_amount || 0).toFixed(2)} USD</span>
                        )}
                        {(debt.payment_iqd_amount || 0) > 0 && (
                          <span>د.ع{(debt.payment_iqd_amount || 0).toFixed(0)} IQD</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Remaining Debt */}
                  <div className="border-t pt-2">
                    <span className="font-bold">Remaining Debt: </span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {getRemainingDebtDisplay()}
                    </span>
                  </div>

                  {/* Payment Currency Equivalent */}
                  {paymentCurrency && debt.currency !== paymentCurrency && paymentMode === 'single' && (
                    <div className="mt-2 text-xs">
                      {paymentCurrency === 'USD' && debt.currency === 'IQD' && (
                        <div>USD Equivalent: ${((debt.amount || 0) / EXCHANGE_RATES.USD_TO_IQD).toFixed(2)}</div>
                      )}
                      {paymentCurrency === 'IQD' && debt.currency === 'USD' && (
                        <div>IQD Equivalent: د.ع{((debt.amount || 0) * EXCHANGE_RATES.USD_TO_IQD).toFixed(0)}</div>
                      )}
                    </div>
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
                        <span className="font-medium">
                          {debt.currency === 'IQD' 
                            ? `د.ع${Math.round(debt.amount || 0).toLocaleString()}`
                            : debt.currency === 'MULTI'
                            ? `$${(debt.usd_amount || 0).toFixed(2)}${debt.iqd_amount ? ` + د.ع${Math.round(debt.iqd_amount).toLocaleString()}` : ''}`
                            : debt.currency === 'USD'
                            ? `$${(debt.amount || 0).toFixed(2)}`
                            : `د.ع${Math.round(debt.amount || 0).toLocaleString()}` // Default to IQD if currency not specified
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t?.payingAmount || 'Paying'}:</span>
                        <span className="font-medium">
                          <div className="flex flex-col">
                            {paymentMode === 'multi' ? (
                              <div>
                                {paymentSummary.paymentAmountUSD > 0 && <div>${paymentSummary.paymentAmountUSD.toFixed(2)} USD</div>}
                                {paymentSummary.paymentAmountIQD > 0 && <div>د.ع{paymentSummary.paymentAmountIQD.toFixed(0)} IQD</div>}
                                <div className="text-xs opacity-75">Total: ${paymentSummary.totalPaymentUSD.toFixed(2)} USD equivalent</div>
                              </div>
                            ) : (
                              <div>{paymentCurrency === 'USD' ? `$${paymentSummary.paymentAmountUSD.toFixed(2)}` : `د.ع${paymentSummary.paymentAmountIQD.toFixed(0)}`}</div>
                            )}
                          </div>
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t?.willBeDeducted || 'Will be deducted'}:</span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          <div className="flex flex-col">
                            {paymentMode === 'multi' ? (
                              <div>
                                {paymentSummary.netDeductionUSD > 0 && <div>${paymentSummary.netDeductionUSD.toFixed(2)} USD</div>}
                                {paymentSummary.netDeductionIQD > 0 && <div>د.ع{paymentSummary.netDeductionIQD.toFixed(0)} IQD</div>}
                              </div>
                            ) : (
                              <div>{paymentCurrency === 'USD' ? `$${paymentSummary.netDeductionUSD.toFixed(2)}` : `د.ع${paymentSummary.netDeductionIQD.toFixed(0)}`}</div>
                            )}
                            <div className="text-xs opacity-75">{t?.fromBalance?.replace('{currency}', paymentMode === 'multi' ? 'both' : paymentCurrency) || `from ${paymentMode === 'multi' ? 'both currencies' : paymentCurrency} balance`}</div>
                          </div>
                        </span>
                      </div>
                      {paymentSummary.remainingDebtUSD > 0 && (
                        <div className="flex justify-between">
                          <span className="text-red-600 dark:text-red-400">Remaining:</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            ${paymentSummary.remainingDebtUSD.toFixed(2)}
                            {debt.currency === 'IQD' && (
                              <div className="text-xs opacity-75">(≈ د.ع{(paymentSummary.remainingDebtUSD * EXCHANGE_RATES.USD_TO_IQD).toFixed(0)})</div>
                            )}
                          </span>
                        </div>
                      )}
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
