import React, { useState } from 'react';

const CompanyDebtsSection = ({ 
  t, 
  admin, 
  setShowAddCompanyDebt, 
  setSelectedCompanyDebt, 
  setShowEnhancedCompanyDebtModal, 
  showConfirm, 
  setConfirm, 
  triggerCloudBackup 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.companyDebts || 'Company Debts'} - We owe them</h2>
        <button
          onClick={() => setShowAddCompanyDebt(true)}
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
        const companyDebts = admin.companyDebts || [];
        
        if (companyDebts.length === 0) {
          return <div className="text-center text-gray-400 py-6">{t.noCompanyDebts || 'No company debts'}</div>;
        }

        // Filter debts by search term
        const filteredDebts = companyDebts.filter(debt => 
          debt.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (debt.description && debt.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        // Group debts by company name
        const groupedDebts = filteredDebts.reduce((groups, debt) => {
          const companyName = debt.company_name;
          if (!groups[companyName]) {
            groups[companyName] = [];
          }
          groups[companyName].push(debt);
          return groups;
        }, {});

        // Sort companies by unpaid debt amount (highest first), then alphabetically
        const sortedCompanies = Object.keys(groupedDebts).sort((a, b) => {
          const aUnpaidTotal = groupedDebts[a].filter(d => !d.paid_at).reduce((sum, d) => sum + d.amount, 0);
          const bUnpaidTotal = groupedDebts[b].filter(d => !d.paid_at).reduce((sum, d) => sum + d.amount, 0);
          
          // If both have unpaid debts or both don't, sort alphabetically
          if ((aUnpaidTotal > 0 && bUnpaidTotal > 0) || (aUnpaidTotal === 0 && bUnpaidTotal === 0)) {
            return a.localeCompare(b);
          }
          
          // Companies with unpaid debts come first
          return bUnpaidTotal - aUnpaidTotal;
        });

        // Calculate total unpaid debt across all filtered companies
        const totalCompanyDebt = filteredDebts.filter(d => !d.paid_at).reduce((sum, d) => sum + d.amount, 0);

        if (filteredDebts.length === 0) {
          return <div className="text-center text-gray-400 py-6">{t.noMatchingDebts || 'No matching company debts found'}</div>;
        }

        return (
          <>
            <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl p-4 mb-6 shadow border border-white/20">
              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                Total Company Debt: ${totalCompanyDebt.toFixed(2)}
              </span>
            </div>
            
            <div className="space-y-6">
              {sortedCompanies.map((companyName) => {
                const companyDebts = groupedDebts[companyName];
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
                const totalUnpaidForCompany = unpaidDebts.reduce((sum, d) => sum + d.amount, 0);
                
                return (
                  <div key={companyName} className="bg-white/70 dark:bg-gray-800/90 rounded-2xl shadow-lg border border-white/30 overflow-hidden">
                    {/* Company Header */}
                    <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-6 border border-white/20">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-bold">{companyName}</h3>
                          <p className="text-red-100">
                            {unpaidDebts.length} unpaid debt{unpaidDebts.length !== 1 ? 's' : ''} • 
                            {sortedCompanyDebts.length - unpaidDebts.length} paid debt{sortedCompanyDebts.length - unpaidDebts.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ${totalUnpaidForCompany.toFixed(2)}
                          </div>
                          <div className="text-red-100 text-sm">
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
                                  ${debt.amount.toFixed(2)}
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
                                    showConfirm(
                                      `Mark debt to ${debt.company_name} ($${debt.amount.toFixed(2)}) as paid?`,
                                      () => {
                                        setConfirm({ open: false, message: '', onConfirm: null });
                                        window.api?.markCompanyDebtPaid?.(debt.id);
                                        admin.fetchCompanyDebts?.();
                                        admin.fetchBuyingHistory?.();
                                        triggerCloudBackup();
                                      }
                                    );
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
