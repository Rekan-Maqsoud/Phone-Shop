import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { EXCHANGE_RATES, formatCurrencyWithTranslation } from '../utils/exchangeRates';
import { Icon } from '../utils/icons.jsx';

const FinancialSummaryModal = ({ isOpen, onClose, t }) => {
  const { 
    products, 
    accessories, 
    debts, 
    companyDebts, 
    personalLoans, 
    sales,
    refreshProducts,
    refreshAccessories,
    refreshDebts,
    refreshCompanyDebts,
    refreshPersonalLoans,
    refreshSales,
    refreshTransactions
  } = useData();
  
  const [balances, setBalances] = useState({ usd_balance: 0, iqd_balance: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataVersion, setDataVersion] = useState(0); // Force re-calculation
  
  // Use refs to store latest refresh functions without causing re-renders
  const refreshFunctionsRef = useRef({
    refreshProducts,
    refreshAccessories,
    refreshDebts,
    refreshCompanyDebts,
    refreshPersonalLoans,
    refreshSales,
    refreshTransactions
  });
  
  // Update refs when functions change
  useEffect(() => {
    refreshFunctionsRef.current = {
      refreshProducts,
      refreshAccessories,
      refreshDebts,
      refreshCompanyDebts,
      refreshPersonalLoans,
      refreshSales,
      refreshTransactions
    };
  }, [refreshProducts, refreshAccessories, refreshDebts, refreshCompanyDebts, refreshPersonalLoans, refreshSales, refreshTransactions]);

  // Comprehensive refresh function to get all latest data
  const refreshAllData = useCallback(async () => {
    // Early return if already refreshing (check current state without dependency)
    if (!isOpen) return;
    
    setIsRefreshing(current => {
      if (current) {
        return current; // Already refreshing, don't restart
      }
      return true;
    });

    try {
      // Get current refresh functions from ref
      const {
        refreshProducts,
        refreshAccessories,
        refreshDebts,
        refreshCompanyDebts,
        refreshPersonalLoans,
        refreshSales,
        refreshTransactions
      } = refreshFunctionsRef.current;
      
      // Refresh all financial data in parallel for better performance
      const refreshPromises = [
        // Refresh balances first (most critical)
        window.api?.getBalances?.()
          .then(balanceData => {
            setBalances(balanceData || { usd_balance: 0, iqd_balance: 0 });
            return balanceData;
          })
          .catch(error => {
            return null;
          }),
        
        // Refresh all DataContext data
        refreshProducts?.().catch(error => {}),
        refreshAccessories?.().catch(error => {}),
        refreshSales?.().catch(error => {}),
        refreshDebts?.().catch(error => {}),
        refreshCompanyDebts?.().catch(error => {}),
        refreshPersonalLoans?.().catch(error => {}),
        refreshTransactions?.().catch(error => {})
      ].filter(Boolean); // Filter out undefined functions

      await Promise.allSettled(refreshPromises);
      
      // Force recalculation by incrementing version
      setDataVersion(prev => {
        const newVersion = prev + 1;
        return newVersion;
      });
    } catch (error) {
    } finally {
      setIsRefreshing(false);
    }
  }, [isOpen]); // Only depend on isOpen

  // Refresh all data when modal opens
  useEffect(() => {
    if (isOpen) {
      refreshAllData();
    }
  }, [isOpen, refreshAllData]);

  // Memoize expensive calculations with stable dependencies
  const financialSummary = useMemo(() => {
    if (!isOpen) return null;

    // Calculate total balances in USD equivalent
    const usdBalance = balances?.usd_balance || 0;
    const iqdBalance = balances?.iqd_balance || 0;
    
    // Use the actual balances without any adjustments
    // The shop balance already reflects the current state including paid debts
    const totalBalanceUSD = usdBalance + (iqdBalance * EXCHANGE_RATES.IQD_TO_USD);

    // Calculate customer debts (unpaid debt sales) in USD equivalent
    const unpaidDebtSalesUSD = [];
    const unpaidDebtSalesIQD = [];
    
    // DEBUG: Log all sales data for customer debt analysis
    console.log('=== CUSTOMER DEBT DEBUG ===');
    console.log('Total sales:', (sales || []).length);
    console.log('Total debts:', (debts || []).length);
    
    const debtSales = (sales || []).filter(sale => sale.is_debt);
    console.log('Total debt sales:', debtSales.length);
    debtSales.forEach(sale => {
      console.log(`Debt Sale ID ${sale.id}:`, {
        customer_name: sale.customer_name,
        total: sale.total,
        currency: sale.currency,
        is_debt: sale.is_debt
      });
    });
    
    (sales || []).forEach(sale => {
      if (sale.is_debt) {
        const debt = (debts || []).find(d => d.sale_id === sale.id);
        
        console.log(`Processing debt sale ${sale.id}:`, {
          sale_currency: sale.currency,
          sale_total: sale.total,
          debt_record: debt ? { id: debt.id, paid: debt.paid, paid_at: debt.paid_at } : 'NOT_FOUND',
        });
        
        // FIX: If no debt record exists, treat the sale as an unpaid debt
        // This handles cases where the debt sale was created but the debt record creation failed
        const isPaid = debt ? (debt.paid_at || debt.paid) : false;
        
        if (!isPaid) {
          if (sale.currency === 'USD') {
            unpaidDebtSalesUSD.push(sale);
            console.log(`Added USD debt: $${sale.total} ${debt ? '(has debt record)' : '(missing debt record - treating as unpaid)'}`);
          } else if (sale.currency === 'IQD') {
            unpaidDebtSalesIQD.push(sale);
            console.log(`Added IQD debt: ${sale.total} IQD ${debt ? '(has debt record)' : '(missing debt record - treating as unpaid)'}`);
          } else {
            console.log(`Unknown currency for debt sale ${sale.id}:`, sale.currency);
          }
        } else {
          console.log(`Skipping paid debt sale ${sale.id}: ${sale.currency} ${sale.total}`);
        }
      }
    });
    
    console.log('Final unpaid debt sales USD:', unpaidDebtSalesUSD.length, unpaidDebtSalesUSD.map(s => `$${s.total}`));
    console.log('Final unpaid debt sales IQD:', unpaidDebtSalesIQD.length, unpaidDebtSalesIQD.map(s => `${s.total} IQD`));
    
    const customerDebtsUSD = unpaidDebtSalesUSD.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const customerDebtsIQD = unpaidDebtSalesIQD.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalCustomerDebtsUSD = customerDebtsUSD + (customerDebtsIQD * EXCHANGE_RATES.IQD_TO_USD);
    
    console.log('Customer Debts Summary:');
    console.log('- USD Amount:', customerDebtsUSD);
    console.log('- IQD Amount:', customerDebtsIQD);
    console.log('- Total USD Equivalent:', totalCustomerDebtsUSD);
    console.log('=== END CUSTOMER DEBT DEBUG ===');

    // Calculate personal loans in USD equivalent - FIXED: Use correct data structure  
    const unpaidLoans = (personalLoans || []).filter(loan => !loan.paid_at && !loan.paid);
    
    // USD personal loans - using multi-currency fields correctly
    const personalLoansUSD = unpaidLoans.reduce((sum, loan) => {
      if (loan.usd_amount !== undefined && loan.usd_amount > 0) {
        // Multi-currency loan - use remaining USD amount
        const remaining = (loan.usd_amount || 0) - (loan.payment_usd_amount || 0);
        return sum + Math.max(0, remaining);
      } else if (loan.currency === 'USD' && !loan.is_multi_currency) {
        // Single currency USD loan
        const remaining = (loan.amount || 0) - (loan.payment_usd_amount || 0);
        return sum + Math.max(0, remaining);
      }
      return sum;
    }, 0);

    // IQD personal loans - using multi-currency fields correctly
    const personalLoansIQD = unpaidLoans.reduce((sum, loan) => {
      if (loan.iqd_amount !== undefined && loan.iqd_amount > 0) {
        // Multi-currency loan - use remaining IQD amount
        const remaining = (loan.iqd_amount || 0) - (loan.payment_iqd_amount || 0);
        return sum + Math.max(0, remaining);
      } else if ((loan.currency === 'IQD' || !loan.currency) && !loan.is_multi_currency) {
        // Single currency IQD loan (or legacy loan without currency)
        const remaining = (loan.amount || 0) - (loan.payment_iqd_amount || 0);
        return sum + Math.max(0, remaining);
      }
      return sum;
    }, 0);

    const totalPersonalLoansUSD = personalLoansUSD + (personalLoansIQD * EXCHANGE_RATES.IQD_TO_USD);

    // Calculate company debts in USD equivalent - FIXED: Use correct data structure
    const unpaidCompanyDebts = (companyDebts || []).filter(debt => !debt.paid_at && !debt.paid);
    
    // USD company debts - using multi-currency fields correctly
    const companyDebtsUSD = unpaidCompanyDebts.reduce((sum, debt) => {
      if (debt.usd_amount !== undefined && debt.usd_amount > 0) {
        // Multi-currency debt - use remaining USD amount  
        const remaining = (debt.usd_amount || 0) - (debt.payment_usd_amount || 0);
        return sum + Math.max(0, remaining);
      } else if (debt.currency === 'USD' && !debt.is_multi_currency) {
        // Single currency USD debt
        const remaining = (debt.amount || 0) - (debt.payment_usd_amount || 0);
        return sum + Math.max(0, remaining);
      }
      return sum;
    }, 0);

    // IQD company debts - using multi-currency fields correctly
    const companyDebtsIQD = unpaidCompanyDebts.reduce((sum, debt) => {
      if (debt.iqd_amount !== undefined && debt.iqd_amount > 0) {
        // Multi-currency debt - use remaining IQD amount
        const remaining = (debt.iqd_amount || 0) - (debt.payment_iqd_amount || 0);
        return sum + Math.max(0, remaining);
      } else if ((debt.currency === 'IQD' || !debt.currency) && !debt.is_multi_currency) {
        // Single currency IQD debt (or legacy debt without currency)
        const remaining = (debt.amount || 0) - (debt.payment_iqd_amount || 0);
        return sum + Math.max(0, remaining);
      }
      return sum;
    }, 0);

    const totalCompanyDebtsUSD = companyDebtsUSD + (companyDebtsIQD * EXCHANGE_RATES.IQD_TO_USD);

    // Calculate inventory value in USD equivalent
    const inventoryValueUSD = (products || [])
      .filter(p => !p.archived && p.currency === 'USD')
      .reduce((sum, p) => sum + ((p.buying_price || 0) * (p.stock || 0)), 0) +
      (accessories || [])
      .filter(a => !a.archived && a.currency === 'USD')
      .reduce((sum, a) => sum + ((a.buying_price || 0) * (a.stock || 0)), 0);

    const inventoryValueIQD = (products || [])
      .filter(p => !p.archived && (p.currency === 'IQD' || !p.currency))
      .reduce((sum, p) => sum + ((p.buying_price || 0) * (p.stock || 0)), 0) +
      (accessories || [])
      .filter(a => !a.archived && (a.currency === 'IQD' || !a.currency))
      .reduce((sum, a) => sum + ((a.buying_price || 0) * (a.stock || 0)), 0);

    const totalInventoryValueUSD = inventoryValueUSD + (inventoryValueIQD * EXCHANGE_RATES.IQD_TO_USD);

    // Calculate final result: Balance + Customer Debts + Personal Loans + Inventory - Company Debts
    const finalResult = totalBalanceUSD + totalCustomerDebtsUSD + totalPersonalLoansUSD + totalInventoryValueUSD - totalCompanyDebtsUSD;

    return {
      totalBalanceUSD,
      totalCustomerDebtsUSD,
      totalPersonalLoansUSD,
      totalCompanyDebtsUSD,
      totalInventoryValueUSD,
      finalResult,
      // Individual currency amounts for display (using original balances)
      balances: { 
        usd: usdBalance, 
        iqd: iqdBalance
      },
      customerDebts: { usd: customerDebtsUSD, iqd: customerDebtsIQD },
      personalLoans: { usd: personalLoansUSD, iqd: personalLoansIQD },
      companyDebts: { usd: companyDebtsUSD, iqd: companyDebtsIQD },
      inventory: { usd: inventoryValueUSD, iqd: inventoryValueIQD }
    };
  }, [
    isOpen,
    dataVersion, // This will force recalculation when data is refreshed
    balances?.usd_balance,
    balances?.iqd_balance,
    products,
    accessories,
    sales,
    debts,
    companyDebts,
    personalLoans
  ]);

  if (!isOpen || !financialSummary) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Icon name="calculator" size={24} />
            {t?.financialSummary || t?.netWorth || 'Financial Summary'}
            {isRefreshing && (
              <div className="animate-spin">
                <Icon name="refreshCw" size={20} className="text-blue-500" />
              </div>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshAllData}
              disabled={isRefreshing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title={t?.refreshData || 'Refresh Data'}
            >
              <Icon name="refreshCw" size={18} className={`text-gray-600 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Icon name="x" size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className={`space-y-6 relative ${isRefreshing ? 'opacity-75 pointer-events-none' : ''}`}>
          {isRefreshing && (
            <div className="absolute inset-0 bg-white bg-opacity-75 dark:bg-gray-800 dark:bg-opacity-75 flex items-center justify-center z-10 rounded-xl">
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <div className="animate-spin">
                  <Icon name="refreshCw" size={24} />
                </div>
                <span className="text-lg font-medium">{t?.refreshingData || 'Refreshing data...'}</span>
              </div>
            </div>
          )}
          
          {/* Total Balances */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Icon name="wallet" size={18} />
              {t?.totalBalances || 'Total Balances'}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-green-100">USD:</span> ${financialSummary.balances.usd.toFixed(2)}
              </div>
              <div>
                <span className="text-green-100">IQD:</span> {financialSummary.balances.iqd.toLocaleString()} IQD
              </div>
            </div>
            <div className="mt-2 text-xl font-bold border-t border-green-400 pt-2">
              {t?.totalUSDEquivalent || 'Total (USD Equivalent)'}: ${financialSummary.totalBalanceUSD.toFixed(2)}
            </div>
          </div>

          {/* Customer Debts */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Icon name="users" size={18} />
              {t?.customerDebts || 'Customer Debts'}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-100">USD:</span> ${financialSummary.customerDebts.usd.toFixed(2)}
              </div>
              <div>
                <span className="text-blue-100">IQD:</span> {financialSummary.customerDebts.iqd.toLocaleString()} IQD
              </div>
            </div>
            <div className="mt-2 text-xl font-bold border-t border-blue-400 pt-2">
              {t?.totalUSDEquivalent || 'Total (USD Equivalent)'}: ${financialSummary.totalCustomerDebtsUSD.toFixed(2)}
            </div>
          </div>

          {/* Personal Loans */}
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Icon name="handHeart" size={18} />
              {t?.personalLoans || 'Personal Loans'}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-purple-100">USD:</span> ${financialSummary.personalLoans.usd.toFixed(2)}
              </div>
              <div>
                <span className="text-purple-100">IQD:</span> {financialSummary.personalLoans.iqd.toLocaleString()} IQD
              </div>
            </div>
            <div className="mt-2 text-xl font-bold border-t border-purple-400 pt-2">
              {t?.totalUSDEquivalent || 'Total (USD Equivalent)'}: ${financialSummary.totalPersonalLoansUSD.toFixed(2)}
            </div>
          </div>

          {/* Company Debts */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 text-white">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Icon name="building" size={18} />
              {t?.companyDebts || 'Company Debts'}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-red-100">USD:</span> ${financialSummary.companyDebts.usd.toFixed(2)}
              </div>
              <div>
                <span className="text-red-100">IQD:</span> {financialSummary.companyDebts.iqd.toLocaleString()} IQD
              </div>
            </div>
            <div className="mt-2 text-xl font-bold border-t border-red-400 pt-2">
              {t?.totalUSDEquivalent || 'Total (USD Equivalent)'}: ${financialSummary.totalCompanyDebtsUSD.toFixed(2)}
            </div>
          </div>

          {/* Inventory Value */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Icon name="package" size={18} />
              {t?.inventoryValue || 'Inventory Value'}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-orange-100">USD:</span> ${financialSummary.inventory.usd.toFixed(2)}
              </div>
              <div>
                <span className="text-orange-100">IQD:</span> {financialSummary.inventory.iqd.toLocaleString()} IQD
              </div>
            </div>
            <div className="mt-2 text-xl font-bold border-t border-orange-400 pt-2">
              {t?.totalUSDEquivalent || 'Total (USD Equivalent)'}: ${financialSummary.totalInventoryValueUSD.toFixed(2)}
            </div>
          </div>

          {/* Final Result */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Icon name="trendingUp" size={20} />
              {t?.netWorth || t?.netFinancialPosition || 'Net Financial Position'}
            </h3>
            <div className="text-sm text-indigo-100 mb-2">
              {t?.calculationFormula || t?.balanceFormula || 'Balance + Customer Debts + Personal Loans + Inventory - Company Debts'}
            </div>
            <div className="text-3xl font-bold text-center bg-white bg-opacity-20 rounded-lg py-4">
              ${financialSummary.finalResult.toFixed(2)}
            </div>
            <div className="text-xs text-indigo-100 mt-2 text-center">
              {t?.exchangeRateNote || `Exchange Rate: 1 USD = ${EXCHANGE_RATES.USD_TO_IQD} IQD`}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {t?.close || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummaryModal;
