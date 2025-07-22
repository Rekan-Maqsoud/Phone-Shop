import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, EXCHANGE_RATES } from '../utils/exchangeRates';
import { Icon } from '../utils/icons.jsx';
import { useLocale } from '../contexts/LocaleContext';
import { getSeparator, getTextAlign, formatCompoundText, getFlexDirection } from '../utils/rtlUtils';

const CompanyDebtsSection = ({ 
  t, 
  admin, 
  openEnhancedCompanyDebtModal, 
  openAddPurchaseModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { companyDebts, refreshCompanyDebts, refreshBuyingHistory } = useData();
  const { isRTL } = useLocale();

  // Helper function to format debt amount (simplified - all debts are in USD)
  const formatDebtAmount = (debt) => {
    return formatCurrency(debt.amount, 'USD');
  };

  // Helper function to calculate total debt amount (simplified - all debts are in USD)
  const getDebtTotalValue = (debt) => {
    return debt.amount;
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
                if (openAddPurchaseModal) {
                  openAddPurchaseModal(true); // Pass true for company debt mode
                } else {
                  console.error('Add Purchase Modal function not available');
                  admin.setToast?.('Error: Cannot open add purchase modal', 'error', 5000);
                }
              } catch (error) {
                console.error('Error opening Add Purchase Modal:', error);
                admin.setToast?.('Error opening purchase modal', 'error', 5000);
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
        // Filter debts by search term
        const filteredDebts = companyDebts.filter(debt => 
          debt?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          debt?.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (filteredDebts.length === 0) {
          return <div className="text-center text-gray-400 py-6">{t.noCompanyDebts || 'No company debts'}</div>;
        }

        // Group debts by company name (normalize case, ignore currency since all are USD now)
        const groupedDebts = filteredDebts.reduce((groups, debt) => {
          const companyName = debt.company_name.charAt(0).toUpperCase() + debt.company_name.slice(1).toLowerCase();
          const key = companyName; // No need for currency grouping since all are USD
          if (!groups[key]) {
            groups[key] = { companyName, debts: [] };
          }
          groups[key].debts.push(debt);
          return groups;
        }, {});

        // Sort companies by unpaid debt amount (highest first), then alphabetically (case-insensitive)
        const sortedCompanies = Object.values(groupedDebts).sort((a, b) => {
          const aUnpaidTotal = a.debts.filter(d => !d.paid_at).reduce((sum, d) => sum + d.amount, 0);
          const bUnpaidTotal = b.debts.filter(d => !d.paid_at).reduce((sum, d) => sum + d.amount, 0);
          
          // If both have unpaid debts or both don't, sort alphabetically (case-insensitive)
          if ((aUnpaidTotal > 0 && bUnpaidTotal > 0) || (aUnpaidTotal === 0 && bUnpaidTotal === 0)) {
            return a.companyName.toLowerCase().localeCompare(b.companyName.toLowerCase());
          }
          
          // Companies with unpaid debts come first
          return bUnpaidTotal - aUnpaidTotal;
        });

        // Calculate total unpaid debt (all are in USD now)
        const totalCompanyDebtUSD = filteredDebts.filter(d => !d.paid_at).reduce((sum, d) => sum + d.amount, 0);

        if (filteredDebts.length === 0) {
          return <div className="text-center text-gray-400 py-6">{t.noMatchingDebts || 'No matching company debts found'}</div>;
        }

        return (
          <>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
              <div className="flex flex-wrap gap-4">
                {totalCompanyDebtUSD > 0 ? (
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">
                    {t.totalCompanyDebtUSD || 'Total Company Debt'}: {formatCurrency(totalCompanyDebtUSD, 'USD')}
                  </span>
                ) : (
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {t.noOutstandingDebts || 'No outstanding company debts'}
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-6">
              {sortedCompanies.map(({ companyName, debts }) => {
                const companyDebts = debts;
                // Sort this company's debts: unpaid first (newest to oldest), then paid (newest to oldest)
                const sortedCompanyDebts = companyDebts.sort((a, b) => {
                  // If one is paid and other is not, unpaid comes first
                  if (!a.paid_at && b.paid_at) return -1;
                  if (a.paid_at && !b.paid_at) return 1;
                  
                  // If both have same payment status, sort by date (newest first)
                  return new Date(b.created_at) - new Date(a.created_at);
                });
                
                // Calculate total unpaid debt for this company
                const unpaidDebts = sortedCompanyDebts.filter(d => !d.paid_at);
                const totalUnpaidForCompany = unpaidDebts.reduce((sum, d) => sum + getDebtTotalValue(d), 0);
                
                return (
                  <div key={companyName} className="bg-gray-50 dark:bg-gray-700 rounded-xl shadow-lg overflow-hidden mb-6">
                    {/* Company Header */}
                    <div className="bg-white dark:bg-gray-800 rounded-t-xl shadow p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                            {companyName}
                          </h3>
                          <div className={`text-gray-600 dark:text-gray-400 flex items-center gap-2 ${getFlexDirection(isRTL)}`}>
                            <span>{unpaidDebts.length} {unpaidDebts.length === 1 ? (t.unpaidDebt || 'unpaid debt') : (t.unpaidDebts || 'unpaid debts')}</span>
                            <span className="text-gray-400">{getSeparator(isRTL)}</span>
                            <span>{sortedCompanyDebts.length - unpaidDebts.length} {sortedCompanyDebts.length - unpaidDebts.length === 1 ? (t.paidDebt || 'paid debt') : (t.paidDebts || 'paid debts')}</span>
                          </div>
                        </div>
                        <div className={getTextAlign(isRTL, 'right')}>
                          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                            {formatCurrency(totalUnpaidForCompany, 'USD')}
                          </div>
                          <div className="text-red-600 dark:text-red-400 text-sm">
                            {t.totalOwed || 'Total Owed'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Company Debts List */}
                    <div className="p-6 space-y-4">
                      {sortedCompanyDebts.map((debt) => (
                        <div 
                          key={debt.id} 
                          className={`rounded-xl p-4 border-2 transition-all hover:shadow-md ${
                            debt.paid_at 
                              ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20' 
                              : 'border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`w-3 h-3 rounded-full ${debt.paid_at ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                <span className={`text-lg font-bold ${debt.paid_at ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                  {formatDebtAmount(debt)}
                                </span>
                                {debt.paid_at && (
                                  <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full">
                                    <Icon name="checkCircle" size={16} className="mr-2 text-green-600" /> {t.paid || 'Paid'}
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-gray-700 dark:text-gray-300 mb-2">
                                {debt.description || t.noDescription || 'No description'}
                              </p>
                              
                              <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                                <div>
                                  {t.created || 'Created'}: {new Date(debt.created_at).toLocaleDateString()} {new Date(debt.created_at).toLocaleTimeString()}
                                </div>
                                {debt.paid_at && (
                                  <div className="text-green-600 dark:text-green-400">
                                    {t.paidOn || 'Paid on'}: {new Date(debt.paid_at).toLocaleDateString()} {new Date(debt.paid_at).toLocaleTimeString()}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 ml-4">
                              {debt.has_items && (
                                <button
                                  onClick={() => {
                                    admin.setSelectedCompanyDebt(debt);
                                    admin.setShowEnhancedCompanyDebtModal(true);
                                  }}
                                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                                >
                                  <Icon name="eye" size={16} className="mr-2" /> {t.viewDetails || 'View Details'}
                                </button>
                              )}
                              {!debt.paid_at && (
                                <button
                                  onClick={() => {
                                    admin.setSelectedCompanyDebt(debt);
                                    admin.setShowEnhancedCompanyDebtModal(true);
                                  }}
                                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                                >
                                  <Icon name="checkCircle" size={16} className="mr-2" /> {t.markAsPaid || 'Mark as Paid'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}
      </div>
    </div>
  );
};

export default CompanyDebtsSection;
