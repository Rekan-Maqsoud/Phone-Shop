import React, { useState, useEffect } from 'react';
import ModalBase from './ModalBase';
import { EXCHANGE_RATES } from '../utils/exchangeRates';

export default function EnhancedCompanyDebtModal({ show, onClose, debt, onMarkPaid, t }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showItems, setShowItems] = useState(true);
  const [multiCurrency, setMultiCurrency] = useState({ enabled: false, usdAmount: 0, iqdAmount: 0, deductCurrency: 'USD' });

  useEffect(() => {
    if (show && debt && debt.has_items) {
      fetchDebtItems();
      setShowItems(true);
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
    let paymentData = null;
    
    if (multiCurrency.enabled) {
      paymentData = {
        usdAmount: multiCurrency.usdAmount,
        iqdAmount: multiCurrency.iqdAmount,
        deductCurrency: multiCurrency.deductCurrency
      };
    } else {
      // For single currency debts, determine payment split based on debt currency
      if (debt.currency === 'MULTI') {
        // For multi-currency debts, use the original amounts
        paymentData = {
          usdAmount: debt.usd_amount || 0,
          iqdAmount: debt.iqd_amount || 0,
          deductCurrency: multiCurrency.deductCurrency
        };
      } else if (debt.currency === 'USD') {
        // For USD debts, pay in USD
        paymentData = {
          usdAmount: debt.amount || 0,
          iqdAmount: 0,
          deductCurrency: 'USD'
        };
      } else if (debt.currency === 'IQD') {
        // For IQD debts, pay in IQD
        paymentData = {
          usdAmount: 0,
          iqdAmount: debt.amount || 0,
          deductCurrency: 'IQD'
        };
      }
    }
    
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
                {debt.currency === 'IQD' ? 'د.ع' : '$'}{debt.amount?.toFixed(2)}
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
                  📦 {t?.purchasedItems || 'Purchased Items'}
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
                                <span className="text-lg mr-3">
                                  {item.item_type === 'product' ? '📱' : '🎧'}
                                </span>
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

        {/* Multi-Currency Payment Section for Unpaid Debts */}
        {!debt.paid_at && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              💰 {t?.paymentOptions || 'Payment Options'}
            </h3>
            
            <div className="space-y-4">

              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t?.customPaymentAmounts || 'Custom Payment Amounts'}
                </label>
                <button
                  type="button"
                  onClick={() => setMultiCurrency(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    multiCurrency.enabled
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {multiCurrency.enabled ? (t?.enabled || 'Enabled') : (t?.disabled || 'Disabled')}
                </button>
              </div>
              
              {!multiCurrency.enabled && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    {t?.defaultPayment || 'Default Payment'}
                  </h4>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    {debt.currency === 'MULTI' ? (
                      <div>
                        <div>USD: ${(debt.usd_amount || 0).toFixed(2)}</div>
                        <div>IQD: د.ع{(debt.iqd_amount || 0).toFixed(2)}</div>
                        <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                          Amounts will be deducted from their respective balances
                        </div>
                      </div>
                    ) : debt.currency === 'USD' ? (
                      <div>
                        <div>USD: ${(debt.amount || 0).toFixed(2)}</div>
                        <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                          Amount will be deducted from USD balance
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div>IQD: د.ع{(debt.amount || 0).toFixed(2)}</div>
                        <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                          Amount will be deducted from IQD balance
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {multiCurrency.enabled && (
                <div className="space-y-3 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      {t?.usdAmount || 'USD Amount'}
                    </label>
                    <input
                      type="number"
                      value={multiCurrency.usdAmount}
                      onChange={(e) => setMultiCurrency(prev => ({ ...prev, usdAmount: Number(e.target.value) || 0 }))}
                      placeholder="0"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      {t?.iqdAmount || 'IQD Amount'}
                    </label>
                    <input
                      type="number"
                      value={multiCurrency.iqdAmount}
                      onChange={(e) => setMultiCurrency(prev => ({ ...prev, iqdAmount: Number(e.target.value) || 0 }))}
                      placeholder="0"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {t?.totalPaid || 'Total Paid'}: {debt.currency === 'USD' 
                      ? `$${(multiCurrency.usdAmount + (multiCurrency.iqdAmount / EXCHANGE_RATES.USD_TO_IQD)).toFixed(2)}`
                      : debt.currency === 'IQD'
                      ? `د.ع${(multiCurrency.iqdAmount + (multiCurrency.usdAmount * EXCHANGE_RATES.USD_TO_IQD)).toFixed(2)}`
                      : `$${multiCurrency.usdAmount.toFixed(2)} + د.ع${multiCurrency.iqdAmount.toFixed(2)}`
                    }
                  </div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                    {t?.deductionNote || `Payment amounts will be deducted from their respective currency balances. Make sure you have sufficient funds.`}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition font-medium"
          >
            {t?.close || 'Close'}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
