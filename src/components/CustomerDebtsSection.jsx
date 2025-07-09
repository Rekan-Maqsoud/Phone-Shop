import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';

const CustomerDebtsSection = ({ 
  t, 
  admin, 
  debtSearch, 
  setDebtSearch, 
  showPaidDebts, 
  setShowPaidDebts, 
  showConfirm,
  triggerCloudBackup 
}) => {
  const { refreshDebts, refreshDebtSales, refreshSales } = useData();
  const [sortBy, setSortBy] = useState('date'); // 'date', 'amount', 'customer'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [paymentCurrency, setPaymentCurrency] = useState('USD');

  const toggleCustomerExpanded = (customer) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customer)) {
      newExpanded.delete(customer);
    } else {
      newExpanded.add(customer);
    }
    setExpandedCustomers(newExpanded);
  };

  const formatCurrency = (amount) => `$${amount.toFixed(2)}`;

  const handleMarkDebtPaid = async (debt, sale, originalCustomer) => {
    setSelectedDebt({ debt, sale, originalCustomer });
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!selectedDebt) return;
    
    const { debt, sale, originalCustomer } = selectedDebt;
    
    try {
      // Calculate payment amounts based on selected currency
      const payment_usd_amount = paymentCurrency === 'USD' ? admin.balanceUSD : 0;
      const payment_iqd_amount = paymentCurrency === 'IQD' ? admin.balanceIQD : 0;
      
      const result = await window.api?.markCustomerDebtPaid?.(
        debt.id, 
        new Date().toISOString(),
        paymentCurrency,
        payment_usd_amount,
        payment_iqd_amount
      );
      
      if (result && result.changes > 0) {
        admin.setToast?.(`💰 Debt of ${(sale.currency === 'USD' ? '$' : 'د.ع')}${sale.total.toFixed(2)} marked as paid for ${originalCustomer}`);
        // Refresh all debt-related data
        await Promise.all([
          refreshDebts(),
          refreshDebtSales(),
          refreshSales() // Also refresh sales since paid debt moves to sales history
        ]);
        triggerCloudBackup();
        setShowPaymentModal(false);
        setSelectedDebt(null);
      } else {
        admin.setToast?.('❌ Failed to mark debt as paid');
      }
    } catch (error) {
      console.error('Error marking debt as paid:', error);
      admin.setToast?.('❌ Error marking debt as paid');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-6 border border-white/20">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              👥 {t.customerDebts || 'Customer Debts'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t.customerDebtsDesc || 'Track money owed to you by customers'}
            </p>
          </div>
          
          <div className="flex gap-2 items-center flex-wrap">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder={t.searchCustomer || 'Search customers...'}
                value={debtSearch}
                onChange={(e) => setDebtSearch(e.target.value)}
                className="border rounded-xl px-4 py-2 pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600 transition min-w-[200px]"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              {debtSearch && (
                <button
                  onClick={() => setDebtSearch('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-');
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}
              className="border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="date-desc">📅 {t.newestFirst || 'Newest First'}</option>
              <option value="date-asc">📅 {t.oldestFirst || 'Oldest First'}</option>
              <option value="amount-desc">💰 {t.highestAmount || 'Highest Amount'}</option>
              <option value="amount-asc">💰 {t.lowestAmount || 'Lowest Amount'}</option>
              <option value="customer-asc">👤 {t.customerAZ || 'Customer A-Z'}</option>
              <option value="customer-desc">👤 {t.customerZA || 'Customer Z-A'}</option>
            </select>

            {/* Paid/Unpaid Toggle */}
            <button
              onClick={() => setShowPaidDebts(!showPaidDebts)}
              className={`px-4 py-2 rounded-xl font-semibold transition flex items-center gap-2 ${
                showPaidDebts 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {showPaidDebts ? '✅ ' + (t.paidDebts || 'Paid Debts') : '💸 ' + (t.outstandingDebts || 'Outstanding Debts')}
            </button>
          </div>
        </div>
      </div>

      {(() => {
        const debtMap = {};
        (admin.debts || []).forEach(d => { debtMap[d.sale_id] = d; });
        const grouped = {};
        
        (admin.debtSales || []).forEach(sale => {
          const debt = debtMap[sale.id];
          const originalCustomer = debt?.customer_name || sale.customer_name || 'Unknown Customer';
          const customer = originalCustomer.toLowerCase(); // Normalize for grouping
          const currency = sale.currency || 'USD';
          
          // Check paid status correctly
          const isPaid = Boolean(debt?.paid_at);
          
          // Filter by paid status based on toggle
          if (showPaidDebts && !isPaid) return; // When showing paid debts, skip unpaid ones
          if (!showPaidDebts && isPaid) return; // When showing unpaid debts, skip paid ones
          
          if (!grouped[customer]) {
            grouped[customer] = {
              sales: [],
              totalAmountUSD: 0,
              totalAmountIQD: 0,
              totalTransactions: 0,
              latestDate: sale.created_at,
              oldestDate: sale.created_at,
              displayName: originalCustomer // Store the original name for display
            };
          }
          
          grouped[customer].sales.push({ sale, debt, originalCustomer });
          if (currency === 'USD') {
            grouped[customer].totalAmountUSD += sale.total;
          } else {
            grouped[customer].totalAmountIQD += sale.total;
          }
          grouped[customer].totalTransactions += 1;
          
          if (sale.created_at > grouped[customer].latestDate) {
            grouped[customer].latestDate = sale.created_at;
          }
          if (sale.created_at < grouped[customer].oldestDate) {
            grouped[customer].oldestDate = sale.created_at;
          }
        });

        // Apply search filter (case-insensitive)
        let filteredGroups = Object.entries(grouped).filter(([normalizedCustomer, data]) => 
          !debtSearch || data.displayName.toLowerCase().includes(debtSearch.toLowerCase())
        );

        // Apply sorting
        filteredGroups.sort(([customerA, dataA], [customerB, dataB]) => {
          let comparison = 0;
          
          switch (sortBy) {
            case 'date':
              comparison = new Date(dataA.latestDate) - new Date(dataB.latestDate);
              break;
            case 'amount':
              comparison = (dataA.totalAmountUSD + dataA.totalAmountIQD) - (dataB.totalAmountUSD + dataB.totalAmountIQD);
              break;
            case 'customer':
              comparison = dataA.displayName.toLowerCase().localeCompare(dataB.displayName.toLowerCase());
              break;
            default:
              comparison = 0;
          }
          
          return sortOrder === 'desc' ? -comparison : comparison;
        });

        if (admin.debtSales.length === 0) {
          return (
            <div className="text-center py-12 bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow border border-white/20">
              <div className="text-6xl mb-4">💸</div>
              <div className="text-gray-500 dark:text-gray-400 text-lg">
                {t.noCustomerDebts || 'No customer debts found'}
              </div>
              <div className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                {t.noCustomerDebtsDesc || 'All customers have paid their debts or no debt sales have been made'}
              </div>
            </div>
          );
        }

        if (filteredGroups.length === 0) {
          return (
            <div className="text-center py-12 bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow border border-white/20">
              <div className="text-6xl mb-4">🔍</div>
              <div className="text-gray-500 dark:text-gray-400 text-lg">
                {t.noCustomerDebtsFound || 'No customer debts found for this search'}
              </div>
              <div className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                {t.tryDifferentSearch || 'Try a different search term or clear the filter'}
              </div>
            </div>
          );
        }

        const totalAmountUSD = filteredGroups.reduce((total, [, data]) => total + data.totalAmountUSD, 0);
        const totalAmountIQD = filteredGroups.reduce((total, [, data]) => total + data.totalAmountIQD, 0);
        const totalTransactions = filteredGroups.reduce((total, [, data]) => total + data.totalTransactions, 0);

        return (
          <>
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 dark:from-red-900/40 dark:to-orange-900/40 rounded-2xl p-6 shadow border border-red-200/30 dark:border-red-700/30">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center md:text-left">
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">
                    ${totalAmountUSD.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {showPaidDebts ? (t.totalPaidUSD || 'Total Paid USD') : (t.totalOutstandingUSD || 'Total Outstanding USD')}
                  </div>
                </div>
                <div className="text-center md:text-left">
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">
                    د.ع{totalAmountIQD.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {showPaidDebts ? (t.totalPaidIQD || 'Total Paid IQD') : (t.totalOutstandingIQD || 'Total Outstanding IQD')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {totalTransactions}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t.transactions || 'Transactions'}
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {filteredGroups.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t.customers || 'Customers'}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer List */}
            <div className="space-y-4">
              {filteredGroups.map(([normalizedCustomer, data]) => {
                // Capitalize first letter, rest lowercase for formal display
                // Capitalize first letter, rest lowercase for formal display, but keep multi-word names correct
                const customer = data.displayName
                  ? data.displayName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
                  : '';
                const isExpanded = expandedCustomers.has(normalizedCustomer);
                
                return (
                  <div key={normalizedCustomer} className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow border border-white/20 overflow-hidden">
                    {/* Customer Header - Clickable to expand/collapse */}
                    <div 
                      className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                      onClick={() => toggleCustomerExpanded(normalizedCustomer)}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div className="flex items-center gap-3 mb-3 md:mb-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {customer.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{customer}</h3>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {data.totalTransactions} {data.totalTransactions === 1 ? (t.singleTransaction || 'transaction') : (t.transactions || 'transactions')}
                              {data.latestDate !== data.oldestDate && (
                                <span> • {new Date(data.oldestDate).toLocaleDateString()} - {new Date(data.latestDate).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`text-lg font-bold ${showPaidDebts ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {data.totalAmountUSD > 0 && `$${data.totalAmountUSD.toFixed(2)}`}
                              {data.totalAmountUSD > 0 && data.totalAmountIQD > 0 && ' • '}
                              {data.totalAmountIQD > 0 && `د.ع${data.totalAmountIQD.toFixed(2)}`}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {showPaidDebts ? (t.paidAmount || 'Paid Amount') : (t.outstandingAmount || 'Outstanding')}
                            </div>
                          </div>
                          
                          <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            <span className="text-gray-400 text-xl">▼</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Transaction Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30">
                        <div className="p-6 space-y-3">
                          {data.sales
                            .sort((a, b) => new Date(b.sale.created_at) - new Date(a.sale.created_at))
                            .map(({ sale, debt, originalCustomer }) => (
                            <div key={sale.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 flex justify-between items-center shadow-sm">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    📅 {new Date(sale.created_at).toLocaleDateString()} at {new Date(sale.created_at).toLocaleTimeString()}
                                  </div>
                                  <div className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    {sale.currency || 'USD'}
                                  </div>
                                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    debt?.paid_at 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}>
                                    {debt?.paid_at ? '✅ ' + (t.paid || 'Paid') : '💸 ' + (t.unpaid || 'Unpaid')}
                                  </div>
                                </div>
                                
                                <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                                  {(sale.currency === 'USD' ? '$' : 'د.ع')}{sale.total.toFixed(2)} • {sale.items?.length || 0} {t.itemsCount || 'items'}
                                </div>
                                
                                {debt?.paid_at && (
                                  <div className="text-xs text-green-600 dark:text-green-400">
                                    ✅ {t.paidOn || 'Paid on'} {new Date(debt.paid_at).toLocaleDateString()} at {new Date(debt.paid_at).toLocaleTimeString()}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex gap-2 items-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    admin.setViewSale(sale);
                                  }}
                                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm flex items-center gap-1"
                                >
                                  👁️ {t.view || 'View'}
                                </button>
                                
                                {debt && !debt.paid_at && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkDebtPaid(debt, sale, originalCustomer);
                                    }}
                                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center gap-1"
                                  >
                                    💰 {t.markPaid || 'Mark Paid'}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}

      {/* Payment Currency Selection Modal */}
      {showPaymentModal && selectedDebt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                💰 {t.selectPaymentCurrency || 'Select Payment Currency'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {t.markingDebtPaidFor || 'Marking debt as paid for'} <strong>{selectedDebt.originalCustomer}</strong>
              </p>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-1">
                {t.debtAmount || 'Debt Amount'}: {(selectedDebt.sale.currency === 'USD' ? '$' : 'د.ع')}{selectedDebt.sale.total.toFixed(2)}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t.selectCurrencyToDeduct || 'Select which currency to deduct from your balance:'}
                </label>
                
                <div className="space-y-3">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <input
                      type="radio"
                      name="paymentCurrency"
                      value="USD"
                      checked={paymentCurrency === 'USD'}
                      onChange={(e) => setPaymentCurrency(e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-gray-100">💵 {t.usdBalance || 'USD Balance'}</span>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          ${admin.balanceUSD?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      {admin.balanceUSD < selectedDebt.sale.total && selectedDebt.sale.currency === 'USD' && (
                        <div className="text-xs text-red-500 mt-1">
                          ⚠️ {t.insufficientFunds || 'Insufficient funds'}
                        </div>
                      )}
                    </div>
                  </label>
                  
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <input
                      type="radio"
                      name="paymentCurrency"
                      value="IQD"
                      checked={paymentCurrency === 'IQD'}
                      onChange={(e) => setPaymentCurrency(e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-gray-100">💰 {t.iqdBalance || 'IQD Balance'}</span>
                        <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                          د.ع{admin.balanceIQD?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      {admin.balanceIQD < selectedDebt.sale.total && selectedDebt.sale.currency === 'IQD' && (
                        <div className="text-xs text-red-500 mt-1">
                          ⚠️ {t.insufficientFunds || 'Insufficient funds'}
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-4">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedDebt(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                onClick={processPayment}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                💰 {t.markAsPaid || 'Mark as Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDebtsSection;
