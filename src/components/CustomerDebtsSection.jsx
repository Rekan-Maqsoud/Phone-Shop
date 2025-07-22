import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import CustomerDebtPaymentModal from './CustomerDebtPaymentModal';
import UniversalPaymentModal from './UniversalPaymentModal';
import { Icon } from '../utils/icons.jsx';
import { useLocale } from '../contexts/LocaleContext';
import { getSeparator, getTextAlign, formatCompoundText } from '../utils/rtlUtils';

const CustomerDebtsSection = ({ 
  t, 
  admin, 
  debtSearch, 
  setDebtSearch, 
  showPaidDebts, 
  setShowPaidDebts, 
  showConfirm,
  setConfirm,
  triggerCloudBackup 
}) => {
  const { refreshDebts, refreshDebtSales, refreshSales } = useData();
  const { isRTL } = useLocale();
  const [sortBy, setSortBy] = useState('date'); // 'date', 'amount', 'customer'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);

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

  const handlePaymentComplete = async () => {
    // Refresh all debt-related data
    await Promise.all([
      refreshDebts(),
      refreshDebtSales(),
      refreshSales()
    ]);
   
    triggerCloudBackup();
  };

  return (
    <div className="w-full h-full p-8 space-y-8">
      {/* Header and Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              {t.searchAndFilters || 'Search and Filters'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t.searchDebtsDesc || 'Search and filter customer debts'}
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
              <Icon name="search" className="absolute left-3 top-2.5 text-gray-400" size={20} />
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
              <option value="date-desc">{t.newestFirst || 'Newest First'}</option>
              <option value="date-asc">{t.oldestFirst || 'Oldest First'}</option>
              <option value="amount-desc">{t.highestAmount || 'Highest Amount'}</option>
              <option value="amount-asc">{t.lowestAmount || 'Lowest Amount'}</option>
              <option value="customer-asc">{t.customerAZ || 'Customer A-Z'}</option>
              <option value="customer-desc">{t.customerZA || 'Customer Z-A'}</option>
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
              {showPaidDebts ? (
                <>
                  <Icon name="check" size={16} className="mr-2" />
                  {t.paidDebts || 'Paid Debts'}
                </>
              ) : (
                <>
                  <Icon name="creditCard" size={16} className="mr-2" />
                  {t.outstandingDebts || 'Outstanding Debts'}
                </>
              )}
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
          
          // Check paid status correctly - a debt sale is unpaid if:
          // 1. There's no debt record, OR
          // 2. There's a debt record but it's not marked as paid
          const isPaid = debt ? Boolean(debt.paid_at) : false;
          
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
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center">
                <Icon name="wallet" size={32} className="text-gray-400" />
              </div>
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
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center">
                <Icon name="search" size={32} className="text-gray-400" />
              </div>
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
              <div className="grid grid-cols-4 gap-4">
                <div className="text-left">
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
                  <div key={normalizedCustomer} className="bg-gray-50 dark:bg-gray-700 rounded-xl shadow overflow-hidden mb-6">
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
                                <span>{getSeparator(isRTL)}{new Date(data.oldestDate).toLocaleDateString()} - {new Date(data.latestDate).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className={getTextAlign(isRTL, 'right')}>
                            <div className={`text-lg font-bold ${showPaidDebts ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCompoundText(isRTL, [
                                data.totalAmountUSD > 0 ? `$${data.totalAmountUSD.toFixed(2)}` : '',
                                data.totalAmountIQD > 0 ? `د.ع${data.totalAmountIQD.toFixed(2)}` : ''
                              ].filter(Boolean))}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {showPaidDebts ? (t.paidAmount || 'Paid Amount') : (t.outstandingAmount || 'Outstanding')}
                            </div>
                          </div>
                          
                          {/* Pay All Debts Button - only for unpaid debts */}
                          {!showPaidDebts && data.sales.some(({ debt, sale }) => {
                            // Show pay button if debt sale is unpaid (no debt record or unpaid debt record)
                            return debt ? !debt.paid_at : true;
                          }) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Find the first unpaid debt and open payment modal
                                const firstUnpaidDebt = data.sales.find(({ debt, sale }) => {
                                  return debt ? !debt.paid_at : true;
                                });
                                if (firstUnpaidDebt) {
                                  handleMarkDebtPaid(firstUnpaidDebt.debt, firstUnpaidDebt.sale, firstUnpaidDebt.originalCustomer);
                                }
                              }}
                              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center gap-1 whitespace-nowrap"
                            >
                              <Icon name="dollar-sign" size={16} className="mr-2" />
                              {t.payDebt || 'Pay Debt'}
                            </button>
                          )}
                          
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
                                    <Icon name="calendar" size={12} className="mr-1" />
                                    {new Date(sale.created_at).toLocaleDateString()} at {new Date(sale.created_at).toLocaleTimeString()}
                                  </div>
                                  <div className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    {sale.currency || 'USD'}
                                  </div>
                                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    debt?.paid_at 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}>
                                    {debt?.paid_at ? (
                                      <>
                                        <Icon name="check" size={12} className="mr-1" />
                                        {t.paid || 'Paid'}
                                      </>
                                    ) : (
                                      <>
                                        <Icon name="creditCard" size={12} className="mr-1" />
                                        {t.unpaid || 'Unpaid'}
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1 flex flex-col">
                                  <div>{(sale.currency === 'USD' ? '$' : 'د.ع')}{sale.total.toFixed(2)}</div>
                                  <div className="text-sm opacity-75">{sale.items?.length || 0} {t.itemsCount || 'items'}</div>
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
                                
                                {(debt ? !debt.paid_at : true) && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        showConfirm(
                                          t.confirmReturnSale || 'Are you sure you want to return this entire sale? This will restore stock and remove the sale from records.',
                                          async () => {
                                            try {
                                              const result = await window.api?.returnSale?.(sale.id);
                                              if (result?.success) {
                                                admin.setToast?.('Sale returned successfully. Stock has been restored.');
                                                // Refresh all relevant data
                                                await Promise.all([
                                                  refreshSales(),
                                                  refreshDebts(),
                                                  refreshDebtSales()
                                                ]);
                                                triggerCloudBackup();
                                              } else {
                                                admin.setToast?.('Failed to return sale: ' + (result?.message || 'Unknown error'));
                                              }
                                            } catch (error) {
                                              admin.setToast?.('Error returning sale: ' + error.message);
                                            }
                                          }
                                        );
                                      }}
                                      className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm flex items-center gap-1"
                                      title={t.returnSale || 'Return Sale'}
                                    >
                                      ↩️ {t.returnSale || 'Return'}
                                    </button>
                                    
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkDebtPaid(debt, sale, originalCustomer);
                                      }}
                                      className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center gap-1"
                                    >
                                      <Icon name="check" size={16} className="mr-2" />
                                      {t.markPaid || 'Mark Paid'}
                                    </button>
                                  </>
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

      {/* Universal Payment Modal */}
      <UniversalPaymentModal
        show={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedDebt(null);
        }}
        debtData={selectedDebt}
        paymentType="customer"
        onPaymentComplete={handlePaymentComplete}
        admin={admin}
        t={t}
      />
    </div>
  );
};

export default CustomerDebtsSection;
