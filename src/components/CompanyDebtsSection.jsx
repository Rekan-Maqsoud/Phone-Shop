import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import UniversalPaymentModal from './UniversalPaymentModal';
import ModalBase from './ModalBase';
import { formatCurrency, EXCHANGE_RATES } from '../utils/exchangeRates';
import { Icon } from '../utils/icons.jsx';
import { useLocale } from '../contexts/LocaleContext';
import { getSeparator, getTextAlign, getFlexDirection } from '../utils/rtlUtils';

const CompanyDebtsSection = React.memo(({ 
  t, 
  admin,
  openAddPurchaseModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showCompanyDetailsModal, setShowCompanyDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCompanyForPayment, setSelectedCompanyForPayment] = useState(null);
  const [selectedCompanyForView, setSelectedCompanyForView] = useState(null);
  const [companyPaymentHistory, setCompanyPaymentHistory] = useState([]);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);
  const { 
    companyDebts, 
    refreshCompanyDebts,
    refreshTransactions,
    calculateRemainingCompanyDebt,
    calculateTotalCompanyOutstanding
  } = useData();
  const { isRTL } = useLocale();

  // Force refresh when component mounts ONCE to ensure latest data
  useEffect(() => {
    let isMounted = true;
    
    const refreshData = async () => {
      try {
        if (isMounted) {
          await refreshCompanyDebts();
        }
      } catch (error) {
        console.error('Error refreshing company debts on mount:', error);
      }
    };
    
    refreshData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run on mount

  // Load payment history when viewing company details
  useEffect(() => {
    const loadPaymentHistory = async () => {
      if (!selectedCompanyForView) {
        setCompanyPaymentHistory([]);
        return;
      }

      setLoadingPaymentHistory(true);

      try {
        if (window.api?.getDebtPayments) {
          const payments = await window.api.getDebtPayments(selectedCompanyForView.company_name);
          setCompanyPaymentHistory(payments || []);
        }
      } catch (error) {
        console.error('Error loading payment history:', error);
        setCompanyPaymentHistory([]);
      } finally {
        setLoadingPaymentHistory(false);
      }
    };

    loadPaymentHistory();
  }, [selectedCompanyForView]);

  // Memoize the filtered and calculated debts to ensure they update when data changes
  const { filteredDebts, totals, groupedDebts } = useMemo(() => {
    // Filter debts by search term
    const filtered = companyDebts.filter(debt => 
      debt?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      debt?.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate total REMAINING debt by currency using utility function
    const calculatedTotals = filtered.reduce((acc, debt) => {
      // Skip fully paid debts
      if (debt.paid_at) return acc;
      
      const remaining = calculateRemainingCompanyDebt(debt);
      acc.usd += remaining.USD;
      acc.iqd += remaining.IQD;
      return acc;
    }, { usd: 0, iqd: 0 });

    // Group debts by company name (normalize case)
    const grouped = filtered.reduce((groups, debt) => {
      const companyName = debt.company_name.charAt(0).toUpperCase() + debt.company_name.slice(1).toLowerCase();
      const key = companyName;
      if (!groups[key]) {
        groups[key] = { companyName, debts: [] };
      }
      groups[key].debts.push(debt);
      return groups;
    }, {});

    // Sort companies by unpaid debt amount (highest first), then alphabetically (case-insensitive)
    const sortedCompanies = Object.values(grouped).sort((a, b) => {
      // Calculate REMAINING unpaid amounts for comparison using proper calculation function
      const calculateUnpaidUSDValue = (debts) => {
        return debts.filter(d => !d.paid_at).reduce((sum, d) => {
          const remaining = calculateRemainingCompanyDebt(d);
          // Convert both currencies to USD for comparison using current rates (for sorting only)
          return sum + remaining.USD + (remaining.IQD * EXCHANGE_RATES.IQD_TO_USD);
        }, 0);
      };
      
      const aUnpaidTotal = calculateUnpaidUSDValue(a.debts);
      const bUnpaidTotal = calculateUnpaidUSDValue(b.debts);
      
      // If both have unpaid debts or both don't, sort alphabetically (case-insensitive)
      if ((aUnpaidTotal > 0 && bUnpaidTotal > 0) || (aUnpaidTotal === 0 && bUnpaidTotal === 0)) {
        return a.companyName.toLowerCase().localeCompare(b.companyName.toLowerCase());
      }
      
      // Companies with unpaid debts come first
      return bUnpaidTotal - aUnpaidTotal;
    });

    return { filteredDebts: filtered, totals: calculatedTotals, groupedDebts: sortedCompanies };
  }, [companyDebts, searchTerm, calculateRemainingCompanyDebt]);

  // Helper function to calculate total debt for a company
  const calculateCompanyTotalDebt = (companyDebts) => {
    return companyDebts
      .filter(debt => !debt.paid_at) // Only unpaid debts
      .reduce((total, debt) => {
        const remaining = calculateRemainingCompanyDebt(debt);
        total.usd += remaining.USD;
        total.iqd += remaining.IQD;
        return total;
      }, { usd: 0, iqd: 0 });
  };

  // Helper function to format company total debt
  const formatCompanyDebtAmount = (companyDebts) => {
    const total = calculateCompanyTotalDebt(companyDebts);
    
    if (total.usd > 0 && total.iqd > 0) {
      return `${formatCurrency(total.usd, 'USD')} + ${formatCurrency(total.iqd, 'IQD')}`;
    } else if (total.usd > 0) {
      return formatCurrency(total.usd, 'USD');
    } else if (total.iqd > 0) {
      return formatCurrency(total.iqd, 'IQD');
    } else {
      return null;
    }
  };

  const openCompanyModal = (companyName, companyDebts) => {
    setSelectedCompany({ name: companyName, debts: companyDebts });
    setSelectedCompanyForView({ company_name: companyName, debts: companyDebts });
    setShowCompanyDetailsModal(true);
  };

  const closeCompanyModal = async () => {
    setSelectedCompany(null);
    setSelectedCompanyForView(null);
    setShowCompanyDetailsModal(false);
    // Refresh data after modal closes to ensure we have latest state
    try {
      await refreshCompanyDebts();
    } catch (error) {
      console.error('Error refreshing data after closing company modal:', error);
    }
  };

  const openPaymentModal = (companyName, companyDebts, forceCurrency = null) => {
    // Calculate total debt for this company
    const totalDebt = calculateCompanyTotalDebt(companyDebts);
    
    // Create a unified debt object for UniversalPaymentModal
    const unifiedDebt = {
      company_name: companyName,
      currency: 'MULTI',
      usd_amount: totalDebt.usd,
      iqd_amount: totalDebt.iqd,
      payment_usd_amount: 0,
      payment_iqd_amount: 0,
      forceCurrency: forceCurrency // Add this flag to indicate forced currency deduction
    };
    
    setSelectedCompanyForPayment(unifiedDebt);
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = async () => {
    setSelectedCompanyForPayment(null);
    setShowPaymentModal(false);
    // Refresh data after payment modal closes
    try {
      await refreshCompanyDebts();
    } catch (error) {
      console.error('Error refreshing data after closing payment modal:', error);
    }
  };

  const handlePaymentComplete = async (paymentData) => {
    try {
      if (!paymentData) {
        throw new Error('No payment data received');
      }
      
      if (!paymentData.company_name) {
        throw new Error('Missing company name in payment data');
      }

      // Check if this is a forced currency payment
      const forceCurrency = selectedCompanyForPayment?.forceCurrency;
      
      let result;
      
      // Use appropriate API based on force currency setting
      if (forceCurrency === 'USD') {
        result = await window.api.payCompanyDebtTotalForcedUSD(
          paymentData.company_name,
          {
            payment_usd_amount: paymentData.payment_usd_amount || 0,
            payment_iqd_amount: paymentData.payment_iqd_amount || 0,
            payment_currency_used: paymentData.payment_currency_used
          }
        );
      } else if (forceCurrency === 'IQD') {
        result = await window.api.payCompanyDebtTotalForcedIQD(
          paymentData.company_name,
          {
            payment_usd_amount: paymentData.payment_usd_amount || 0,
            payment_iqd_amount: paymentData.payment_iqd_amount || 0,
            payment_currency_used: paymentData.payment_currency_used
          }
        );
      } else {
        // Regular payment - no forced currency
        result = await window.api.payCompanyDebtTotal(
          paymentData.company_name,
          {
            payment_usd_amount: paymentData.payment_usd_amount || 0,
            payment_iqd_amount: paymentData.payment_iqd_amount || 0,
            payment_currency_used: paymentData.payment_currency_used || 'USD'
          }
        );
      }
      
      if (result.success) {
        // Show detailed payment result
        let message = `Successfully paid debt for ${paymentData.company_name}`;
        if (result.paidDebts && result.paidDebts.length > 0) {
          message += ` (${result.paidDebts.length} debt${result.paidDebts.length > 1 ? 's' : ''} affected)`;
        }
        
        // Add currency force information to the message
        if (forceCurrency) {
          message += ` (forced ${forceCurrency} deduction)`;
        }
        
        // Check for overpayment
        if (result.hasOverpayment && (result.remainingPayment.usd > 0 || result.remainingPayment.iqd > 0)) {
          const overpaymentParts = [];
          if (result.remainingPayment.usd > 0) {
            overpaymentParts.push(formatCurrency(result.remainingPayment.usd, 'USD'));
          }
          if (result.remainingPayment.iqd > 0) {
            overpaymentParts.push(formatCurrency(result.remainingPayment.iqd, 'IQD'));
          }
          
          admin?.setToast?.(`${message}. Overpayment: ${overpaymentParts.join(' + ')} (not deducted from balance)`, 'warning', 8000);
        } else {
          admin?.setToast?.(message, 'success');
        }
        
        setShowPaymentModal(false);
        setSelectedCompanyForPayment(null);
        
        // Refresh data sequentially with small delays to ensure proper update
        try {
          await refreshCompanyDebts();
          await new Promise(resolve => setTimeout(resolve, 100));
          await refreshTransactions();
          
          if (admin?.refreshBalances) {
            await admin.refreshBalances();
          }
        } catch (refreshError) {
          console.error('Error during data refresh after payment:', refreshError);
          // Try to refresh at least the company debts if other refreshes fail
          try {
            await refreshCompanyDebts();
          } catch (fallbackError) {
            console.error('Even fallback refresh failed:', fallbackError);
          }
        }
      } else {
        admin?.setToast?.(`Payment failed: ${result.error}`, 'error');
      }
    } catch (error) {
      admin?.setToast?.(error.message || 'Error processing payment', 'error');
    }
  };

  return (
    <div className="w-full h-full p-8 space-y-8">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-xl">
            <Icon name="companyDebts" size={32} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t.companyDebts || 'Company Debts'}
            </h1>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={() => {
              try {
                openAddPurchaseModal(true);
              } catch (error) {
                console.error('Error opening Add Purchase Modal:', error);
                admin?.setToast?.(t?.errorOpeningPurchaseModal || 'Error opening purchase modal', 'error', 5000);
              }
            }}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold shadow-lg"
          >
            <Icon name="add" size={20} />
            {t.addCompanyDebt || 'Add Company Debt'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="relative mb-6">
          <input
            type="text"
            placeholder={t.searchCompanyDebts || 'Search company debts...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800 dark:text-gray-100"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon name="search" size={20} className="text-gray-400" />
          </div>
        </div>

      {(() => {
        if (filteredDebts.length === 0) {
          return <div className="text-center text-gray-400 py-6">{t.noCompanyDebts || 'No company debts'}</div>;
        }

        if (groupedDebts.length === 0) {
          return <div className="text-center text-gray-400 py-6">{t.noMatchingCompanyDebts || 'No matching company debts found'}</div>;
        }

        return (
          <>
            {/* Total Debt Summary */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
              <div className="flex flex-wrap gap-4">
                {(totals.usd > 0 || totals.iqd > 0) ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">
                      {t.totalCompanyDebt || 'Total Company Debt'}:
                    </span>
                    {totals.usd > 0 && (
                      <span className="text-lg font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(totals.usd, 'USD')}
                      </span>
                    )}
                    {totals.iqd > 0 && (
                      <span className="text-lg font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(totals.iqd, 'IQD')}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {t.noOutstandingDebts || 'No outstanding company debts'}
                  </span>
                )}
              </div>
            </div>
            
            {/* Companies List */}
            <div className="space-y-4">
              {groupedDebts.map(({ companyName, debts }) => {
                const totalDebt = calculateCompanyTotalDebt(debts);
                const unpaidDebtsCount = debts.filter(d => !d.paid_at).length;
                const totalDebtsCount = debts.length;
                const debtAmountText = formatCompanyDebtAmount(debts);

                return (
                  <div key={companyName} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center">
                      {/* Company Info */}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                          {companyName}
                        </h3>
                        <div className={`text-gray-600 dark:text-gray-400 flex items-center gap-2 ${getFlexDirection(isRTL)} mb-3`}>
                          <span>{unpaidDebtsCount} {unpaidDebtsCount === 1 ? (t.unpaidPurchase || 'unpaid purchase') : (t.unpaidPurchases || 'unpaid purchases')}</span>
                          <span className="text-gray-400">{getSeparator(isRTL)}</span>
                          <span>{totalDebtsCount - unpaidDebtsCount} {totalDebtsCount - unpaidDebtsCount === 1 ? (t.paidPurchase || 'paid purchase') : (t.paidPurchases || 'paid purchases')}</span>
                        </div>
                        
                        {/* Total Debt Amount */}
                        <div className="text-lg font-bold">
                          {debtAmountText ? (
                            <span className="text-red-600 dark:text-red-400">
                              {debtAmountText}
                            </span>
                          ) : (
                            <span className="text-green-600 dark:text-green-400">
                              {t.allPaid || 'All Paid'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 ml-6">
                        <button
                          onClick={() => openCompanyModal(companyName, debts)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center min-w-[120px] justify-center"
                        >
                          <Icon name="eye" size={16} className="mr-2" />
                          {t.viewDetails || 'View Details'}
                        </button>
                        
                        {debtAmountText && (
                          <>
                            <button
                              onClick={() => openPaymentModal(companyName, debts)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center min-w-[120px] justify-center"
                            >
                              <Icon name="credit-card" size={16} className="mr-2" />
                              {t.payDebt || 'Pay'}
                            </button>
                            
                            {/* Currency-specific payment buttons - only show if company has BOTH USD and IQD debts */}
                            {totalDebt.usd > 0 && totalDebt.iqd > 0 && (
                              <>
                                <button
                                  onClick={() => openPaymentModal(companyName, debts, 'USD')}
                                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium flex items-center min-w-[120px] justify-center"
                                >
                                  <Icon name="dollar-sign" size={16} className="mr-2" />
                                  {t.payUSD || 'Pay USD'}
                                </button>
                                
                                <button
                                  onClick={() => openPaymentModal(companyName, debts, 'IQD')}
                                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-sm font-medium flex items-center min-w-[120px] justify-center"
                                >
                                  <Icon name="money" size={16} className="mr-2" />
                                  {t.payIQD || 'Pay IQD'}
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}
      </div>

      {/* Company Details Modal */}
      {selectedCompany && (
        <CompanyDetailsModal
          show={showCompanyDetailsModal}
          onClose={closeCompanyModal}
          companyName={selectedCompany.name}
          companyDebts={selectedCompany.debts}
          paymentHistory={companyPaymentHistory}
          loadingPaymentHistory={loadingPaymentHistory}
          t={t}
        />
      )}

      {/* Universal Payment Modal for Company Debts */}
      <UniversalPaymentModal
        show={showPaymentModal}
        onClose={handleClosePaymentModal}
        debtData={selectedCompanyForPayment}
        paymentType="company"
        onPaymentComplete={handlePaymentComplete}
        admin={admin}
        t={t}
      />
    </div>
  );
});

// Simple modal to show company purchase history
function CompanyDetailsModal({ show, onClose, companyName, companyDebts, paymentHistory, loadingPaymentHistory, t }) {
  const [expandedDebtItems, setExpandedDebtItems] = useState(new Set());
  const [expandedPayments, setExpandedPayments] = useState(new Set());
  const [debtPaymentHistory, setDebtPaymentHistory] = useState({});
  const { calculateRemainingCompanyDebt } = useData();

  if (!show || !companyName) return null;

  const sortedDebts = companyDebts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const toggleDebtItems = async (debtId) => {
    const newExpanded = new Set(expandedDebtItems);
    if (newExpanded.has(debtId)) {
      newExpanded.delete(debtId);
    } else {
      newExpanded.add(debtId);
    }
    setExpandedDebtItems(newExpanded);
  };

  const togglePaymentHistory = async (debtId) => {
    const newExpanded = new Set(expandedPayments);
    if (newExpanded.has(debtId)) {
      newExpanded.delete(debtId);
    } else {
      newExpanded.add(debtId);
      // Fetch payment history if not already loaded
      if (!debtPaymentHistory[debtId]) {
        try {
          const payments = await window.api?.getDebtPayments?.('company', debtId);
          setDebtPaymentHistory(prev => ({
            ...prev,
            [debtId]: payments || []
          }));
        } catch (error) {
          console.error('Error fetching payment history:', error);
          setDebtPaymentHistory(prev => ({
            ...prev,
            [debtId]: []
          }));
        }
      }
    }
    setExpandedPayments(newExpanded);
  };

  return (
    <ModalBase show={show} onClose={onClose} title={`${companyName} - ${t?.purchaseHistory || 'Purchase History'}`} maxWidth="4xl">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-4">
          {/* Company Payment History Section */}
          {paymentHistory && paymentHistory.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                <Icon name="creditCard" size={20} className="mr-2" />
                {t?.companyPaymentLog || 'Company Payment Log'}
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {paymentHistory.map((payment, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800 rounded p-3 border border-blue-100 dark:border-blue-800">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {payment.payment_usd_amount > 0 && (
                          <span>{formatCurrency(payment.payment_usd_amount, 'USD')}</span>
                        )}
                        {payment.payment_usd_amount > 0 && payment.payment_iqd_amount > 0 && (
                          <span className="text-gray-500 mx-2">+</span>
                        )}
                        {payment.payment_iqd_amount > 0 && (
                          <span>{formatCurrency(payment.payment_iqd_amount, 'IQD')}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t?.paymentMethod || 'Method'}: {payment.payment_currency_used || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-right text-gray-600 dark:text-gray-300">
                      <div className="text-sm font-medium">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(payment.payment_date).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {loadingPaymentHistory && (
                <div className="text-center py-4">
                  <Icon name="loading" size={20} className="animate-spin mx-auto mb-2" />
                  <span className="text-sm text-gray-500">{t?.loadingPayments || 'Loading payment history...'}</span>
                </div>
              )}
            </div>
          )}

          {/* Individual Purchase History */}
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            {t?.purchaseHistory || 'Purchase History'}
          </h3>
          
          {sortedDebts.map((debt, index) => {
            const isExpanded = expandedDebtItems.has(debt.id);
            const isPaymentExpanded = expandedPayments.has(debt.id);
            const remaining = calculateRemainingCompanyDebt(debt);
            const isFullyPaid = debt.paid_at || (remaining.USD === 0 && remaining.IQD === 0);
            const hasPartialPayment = (debt.payment_usd_amount > 0 || debt.payment_iqd_amount > 0) && !isFullyPaid;
            const debtPayments = debtPaymentHistory[debt.id] || [];
            
            return (
              <div
                key={debt.id}
                className={`bg-gray-50 dark:bg-gray-700 rounded-lg border ${
                  isFullyPaid ? 'border-green-300 dark:border-green-600' : 'border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {t?.purchase || 'Purchase'} #{sortedDebts.length - index}
                      </span>
                      {isFullyPaid && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 text-xs rounded-full font-medium">
                          {t?.paid || 'PAID'}
                        </span>
                      )}
                      {hasPartialPayment && (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300 text-xs rounded-full font-medium">
                          {t?.partial || 'PARTIAL'}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(debt.created_at).toLocaleDateString()} {new Date(debt.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {/* Original Amount */}
                  <div className="mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t?.originalAmount || 'Original Amount'}:</span>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {debt.currency === 'MULTI' ? (
                        <>
                          {debt.usd_amount > 0 && (
                            <span>{formatCurrency(debt.usd_amount, 'USD')}</span>
                          )}
                          {debt.usd_amount > 0 && debt.iqd_amount > 0 && (
                            <span className="text-gray-500 mx-2">+</span>
                          )}
                          {debt.iqd_amount > 0 && (
                            <span>{formatCurrency(debt.iqd_amount, 'IQD')}</span>
                          )}
                        </>
                      ) : (
                        <span>{formatCurrency(debt.amount, debt.currency || 'IQD')}</span>
                      )}
                    </div>
                  </div>

                  {/* Payment Summary */}
                  {(debt.payment_usd_amount > 0 || debt.payment_iqd_amount > 0) && (
                    <div className="mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t?.totalPaid || 'Total Paid'}:</span>
                        <button
                          onClick={() => togglePaymentHistory(debt.id)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                        >
                          {isPaymentExpanded ? (t?.hidePayments || 'Hide Payments') : (t?.viewPayments || 'View Payment History')}
                        </button>
                      </div>
                      <div className="text-sm font-medium text-green-700 dark:text-green-300">
                        {debt.payment_usd_amount > 0 && (
                          <span>{formatCurrency(debt.payment_usd_amount, 'USD')}</span>
                        )}
                        {debt.payment_usd_amount > 0 && debt.payment_iqd_amount > 0 && (
                          <span className="text-gray-500 mx-2">+</span>
                        )}
                        {debt.payment_iqd_amount > 0 && (
                          <span>{formatCurrency(debt.payment_iqd_amount, 'IQD')}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Payment History */}
                  {isPaymentExpanded && (debt.payment_usd_amount > 0 || debt.payment_iqd_amount > 0) && (
                    <div className="mb-2 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                      <h5 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                        {t?.paymentHistory || 'Payment History'}:
                      </h5>
                      {debtPayments.length > 0 ? (
                        <div className="space-y-2">
                          {debtPayments.map((payment, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800 rounded p-2 text-xs">
                              <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {payment.payment_usd_amount > 0 && (
                                    <span>{formatCurrency(payment.payment_usd_amount, 'USD')}</span>
                                  )}
                                  {payment.payment_usd_amount > 0 && payment.payment_iqd_amount > 0 && (
                                    <span className="text-gray-500 mx-1">+</span>
                                  )}
                                  {payment.payment_iqd_amount > 0 && (
                                    <span>{formatCurrency(payment.payment_iqd_amount, 'IQD')}</span>
                                  )}
                                </div>
                                <div className="text-gray-500 dark:text-gray-400">
                                  {payment.payment_currency_used || 'Unknown'}
                                </div>
                              </div>
                              <div className="text-right text-gray-500 dark:text-gray-400">
                                {new Date(payment.payment_date).toLocaleDateString()}
                                <br />
                                {new Date(payment.payment_date).toLocaleTimeString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t?.loadingPayments || 'Loading payment history...'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Remaining Amount */}
                  {!isFullyPaid && (remaining.USD > 0 || remaining.IQD > 0) && (
                    <div className="mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t?.remainingAmount || 'Remaining Amount'}:</span>
                      <div className="text-lg font-bold text-red-600 dark:text-red-400">
                        {remaining.USD > 0 && (
                          <span>{formatCurrency(remaining.USD, 'USD')}</span>
                        )}
                        {remaining.USD > 0 && remaining.IQD > 0 && (
                          <span className="text-gray-500 mx-2">+</span>
                        )}
                        {remaining.IQD > 0 && (
                          <span>{formatCurrency(remaining.IQD, 'IQD')}</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {debt.description && debt.description.trim() && (
                    <div className="mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t?.description || 'Description'}:</span>
                      <p className="text-gray-800 dark:text-gray-200">
                        {debt.description}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    {debt.has_items && (
                      <div className="text-sm text-blue-600 dark:text-blue-400 flex items-center">
                        <Icon name="package" size={16} className="mr-1" />
                        {t?.hasItems || 'Contains items'}
                      </div>
                    )}
                    
                    {debt.has_items && (
                      <button
                        onClick={() => toggleDebtItems(debt.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm flex items-center"
                      >
                        <Icon name="eye" size={14} className="mr-1" />
                        {isExpanded ? (t?.hideItems || 'Hide Items') : (t?.viewItems || 'View Items')}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Expanded Items Section */}
                {debt.has_items && isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
                    <DebtItemsDisplay debtId={debt.id} t={t} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="p-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
          >
            {t?.close || 'Close'}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

// Component to display debt items
function DebtItemsDisplay({ debtId, t }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      try {
        if (window.api?.getCompanyDebtItems) {
          const fetchedItems = await window.api.getCompanyDebtItems(debtId);
          setItems(fetchedItems || []);
        }
      } catch (err) {
        console.error('Error fetching debt items:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [debtId]);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <Icon name="loading" size={20} className="animate-spin mx-auto mb-2" />
        <span className="text-sm text-gray-500">{t?.loadingItems || 'Loading items...'}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600 dark:text-red-400">
        <Icon name="alert" size={20} className="mx-auto mb-2" />
        <span className="text-sm">{t?.errorLoadingItems || 'Error loading items'}</span>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        <Icon name="package" size={20} className="mx-auto mb-2" />
        <span className="text-sm">{t?.noItemsFound || 'No items found for this purchase'}</span>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {t?.purchaseItems || 'Purchase Items'} ({items.length})
      </h4>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {item.product_name || item.name || t?.unknownItem || 'Unknown Item'}
              </div>
              {item.model && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t?.model || 'Model'}: {item.model}
                </div>
              )}
              {item.color && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t?.color || 'Color'}: {item.color}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {t?.qty || 'Qty'}: {item.quantity || 1}
              </div>
              {item.unit_price && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatCurrency(item.unit_price, item.currency || 'IQD')} {t?.each || 'each'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CompanyDebtsSection;
