import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, EXCHANGE_RATES } from '../utils/exchangeRates';

const CompanyDebtsSection = ({ 
  t, 
  admin, 
  openAddCompanyDebtModal, 
  setSelectedCompanyDebt, 
  setShowEnhancedCompanyDebtModal, 
  showConfirm, 
  setConfirm, 
  triggerCloudBackup 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { companyDebts, refreshCompanyDebts, refreshBuyingHistory } = useData();

  // Helper function to format debt amount (handles multi-currency)
  const formatDebtAmount = (debt) => {
    if (debt.currency === 'MULTI' && (debt.usd_amount > 0 || debt.iqd_amount > 0)) {
      const parts = [];
      if (debt.usd_amount > 0) {
        parts.push(`$${debt.usd_amount.toFixed(2)}`);
      }
      if (debt.iqd_amount > 0) {
        parts.push(`د.ع${debt.iqd_amount.toFixed(2)}`);
      }
      return parts.join(' + ');
    } else {
      return formatCurrency(debt.amount, debt.currency || 'USD');
    }
  };

  // Helper function to calculate total debt amount (for sorting and totals)
  const getDebtTotalValue = (debt) => {
    if (debt.currency === 'MULTI' && (debt.usd_amount > 0 || debt.iqd_amount > 0)) {
      // Convert to USD equivalent for sorting/totaling - use dynamic exchange rate
      return debt.usd_amount + (debt.iqd_amount / EXCHANGE_RATES.USD_TO_IQD);
    } else {
      return debt.amount;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.companyDebts || 'Company Debts'}</h2>
        <button
          onClick={() => openAddCompanyDebtModal()}
          className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold"
        >
          ➕ {t.addCompanyDebt || 'Add Company Debt'}
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white/70 dark:bg-gray-800/90 rounded-xl p-4 shadow border border-white/30">
        <div className="relative">
          <input
            type="text"
            placeholder={t.searchCompanyDebts || 'Search company debts...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800 dark:text-gray-100"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
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

        // Group debts by company name and currency (normalize case)
        const groupedDebts = filteredDebts.reduce((groups, debt) => {
          const companyName = debt.company_name.charAt(0).toUpperCase() + debt.company_name.slice(1).toLowerCase();
          const currency = debt.currency || 'USD';
          const key = `${companyName}__${currency}`;
          if (!groups[key]) {
            groups[key] = { companyName, currency, debts: [] };
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
            const nameCompare = a.companyName.toLowerCase().localeCompare(b.companyName.toLowerCase());
            return nameCompare !== 0 ? nameCompare : a.currency.localeCompare(b.currency);
          }
          
          // Companies with unpaid debts come first
          return bUnpaidTotal - aUnpaidTotal;
        });

        // Calculate total unpaid debt by currency across all filtered companies
        const totalCompanyDebtUSD = filteredDebts.filter(d => !d.paid_at).reduce((sum, d) => {
          if (d.currency === 'MULTI') {
            return sum + (d.usd_amount || 0);
          } else if (d.currency === 'USD' || !d.currency) {
            return sum + d.amount;
          }
          return sum;
        }, 0);
        
        const totalCompanyDebtIQD = filteredDebts.filter(d => !d.paid_at).reduce((sum, d) => {
          if (d.currency === 'MULTI') {
            return sum + (d.iqd_amount || 0);
          } else if (d.currency === 'IQD') {
            return sum + d.amount;
          }
          return sum;
        }, 0);

        if (filteredDebts.length === 0) {
          return <div className="text-center text-gray-400 py-6">{t.noMatchingDebts || 'No matching company debts found'}</div>;
        }

        return (
          <>
            <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl p-4 mb-6 shadow border border-white/20">
              <div className="flex flex-wrap gap-4">
                {totalCompanyDebtUSD > 0 && (
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">
                    {t.totalCompanyDebtUSD || 'Total Company Debt USD'}: {formatCurrency(totalCompanyDebtUSD, 'USD')}
                  </span>
                )}
                {totalCompanyDebtIQD > 0 && (
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">
                    {t.totalCompanyDebtIQD || 'Total Company Debt IQD'}: {formatCurrency(totalCompanyDebtIQD, 'IQD')}
                  </span>
                )}
                {totalCompanyDebtUSD === 0 && totalCompanyDebtIQD === 0 && (
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {t.noOutstandingDebts || 'No outstanding company debts'}
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-6">
              {sortedCompanies.map(({ companyName, currency, debts }) => {
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
                
                // For display, show either single currency total or "Mixed Currencies"
                const getCompanyTotalDisplay = () => {
                  const hasMultiCurrency = unpaidDebts.some(d => d.currency === 'MULTI');
                  const hasMixedCurrencies = unpaidDebts.some(d => d.currency === 'USD') && unpaidDebts.some(d => d.currency === 'IQD');
                  
                  if (hasMultiCurrency || hasMixedCurrencies) {
                    const totalUSD = unpaidDebts.reduce((sum, d) => {
                      if (d.currency === 'MULTI') return sum + (d.usd_amount || 0);
                      if (d.currency === 'USD') return sum + d.amount;
                      return sum;
                    }, 0);
                    const totalIQD = unpaidDebts.reduce((sum, d) => {
                      if (d.currency === 'MULTI') return sum + (d.iqd_amount || 0);
                      if (d.currency === 'IQD') return sum + d.amount;
                      return sum;
                    }, 0);
                    
                    const parts = [];
                    if (totalUSD > 0) parts.push(`$${totalUSD.toFixed(2)}`);
                    if (totalIQD > 0) parts.push(`د.ع${totalIQD.toFixed(2)}`);
                    return parts.join(' + ') || formatCurrency(0, currency);
                  } else {
                    return formatCurrency(totalUnpaidForCompany, currency);
                  }
                };
                
                return (
                  <div key={`${companyName}-${currency}`} className="bg-white/70 dark:bg-gray-800/90 rounded-2xl shadow-lg border border-white/30 overflow-hidden">
                    {/* Company Header */}
                    <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-6 border border-white/20">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                            {companyName} ({currency})
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            {unpaidDebts.length} {unpaidDebts.length === 1 ? (t.unpaidDebt || 'unpaid debt') : (t.unpaidDebts || 'unpaid debts')} • 
                            {sortedCompanyDebts.length - unpaidDebts.length} {sortedCompanyDebts.length - unpaidDebts.length === 1 ? (t.paidDebt || 'paid debt') : (t.paidDebts || 'paid debts')}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                            {getCompanyTotalDisplay()}
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
                                    ✅ {t.paid || 'Paid'}
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
                                    setSelectedCompanyDebt(debt);
                                    setShowEnhancedCompanyDebtModal(true);
                                  }}
                                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                                >
                                  📦 {t.viewDetails || 'View Details'}
                                </button>
                              )}
                              {!debt.paid_at && (
                                <button
                                  onClick={() => {
                                    setSelectedCompanyDebt(debt);
                                    setShowEnhancedCompanyDebtModal(true);
                                  }}
                                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                                >
                                  ✅ {t.markAsPaid || 'Mark as Paid'}
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
  );
};

export default CompanyDebtsSection;
