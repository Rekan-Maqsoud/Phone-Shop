import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Import shared utilities
import { EXCHANGE_RATES, formatCurrencyWithTranslation } from '../utils/exchangeRates';
import { 
  formatCurrency, 
  filterPaidSales, 
  calculateRevenueByCurrency, 
  generateDateRange,
  getCommonChartOptions,
  CHART_COLORS
} from '../utils/chartUtils';
import { Icon } from '../utils/icons.jsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function MultiCurrencyDashboard({ admin, t }) {
  const { products, accessories, sales, debts, buyingHistory, companyDebts, incentives, transactions, refreshAllData, refreshDebts } = useData();
  const [balances, setBalances] = useState({ usd_balance: 0, iqd_balance: 0 });
  const [dashboardData, setDashboardData] = useState(null);
  const [personalLoans, setPersonalLoans] = useState([]);

  // Memoize fetchBalanceData to prevent unnecessary API calls
  const fetchBalanceData = useCallback(async () => {
    try {
      // Try getBalances first as it's more reliable
      if (window.api?.getBalances) {
        const balanceData = await window.api.getBalances();
        setBalances(balanceData || { usd_balance: 0, iqd_balance: 0 });
      } else {
        // Fallback to default values
        setBalances({ usd_balance: 0, iqd_balance: 0 });
      }
      
      if (window.api?.getPersonalLoans) {
        const loansData = await window.api.getPersonalLoans();
        setPersonalLoans(loansData || []);
      }

      // Force refresh customer debts to ensure sync
      if (refreshDebts) {
        await refreshDebts();
      }
    } catch (error) {
      console.error('Error fetching balance data:', error);
      // Set safe defaults on error
      setBalances({ usd_balance: 0, iqd_balance: 0 });
    }
  }, []); // Empty dependency array since we only fetch data, don't depend on external state

  useEffect(() => {
    fetchBalanceData();
  }, [fetchBalanceData]);

  // Refresh data when sales, buyingHistory, debts, or companyDebts change
  // Use a debounced effect to prevent excessive refreshes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchBalanceData();
    }, 500); // Debounce by 500ms
    
    return () => clearTimeout(timeoutId);
  }, [sales, buyingHistory, debts, companyDebts]);

  // Set up periodic refresh every 60 seconds (reduced from 30)
  useEffect(() => {
    const interval = setInterval(fetchBalanceData, 60000);
    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(() => {
    const currentDate = new Date();
    const today = currentDate.toDateString();

    // Today's sales by currency - exclude unpaid debt sales
    const todaysSales = filterPaidSales(sales, debts, today);
    
    // Calculate USD and IQD revenue using shared utility
    const todaysUSDSales = calculateRevenueByCurrency(todaysSales, 'USD');
    const todaysIQDSales = calculateRevenueByCurrency(todaysSales, 'IQD');

    // Add today's incentives as income (but don't affect opening balance)
    const todaysIncentivesUSD = (incentives || []).filter(incentive => {
      if (!incentive.created_at) return false;
      const incentiveDate = new Date(incentive.created_at);
      return incentiveDate.toDateString() === today && incentive.currency === 'USD';
    }).reduce((sum, incentive) => sum + (incentive.amount || 0), 0);

    const todaysIncentivesIQD = (incentives || []).filter(incentive => {
      if (!incentive.created_at) return false;
      const incentiveDate = new Date(incentive.created_at);
      return incentiveDate.toDateString() === today && (incentive.currency === 'IQD' || !incentive.currency);
    }).reduce((sum, incentive) => sum + (incentive.amount || 0), 0);

    // This week's sales by currency - exclude unpaid debt sales
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeeksSales = (sales || []).filter(sale => {
      const isThisWeek = new Date(sale.created_at) >= oneWeekAgo;
      if (!isThisWeek) return false;
      
      // For debt sales, check if the debt is paid by looking up in debts array
      if (sale.is_debt) {
        const debt = (debts || []).find(d => d.sale_id === sale.id);
        return debt && (debt.paid_at || debt.paid);
      }
      
      return true;
    });
    
    // Calculate weekly revenue using shared utility
    const weekUSDSales = calculateRevenueByCurrency(thisWeeksSales, 'USD');
    const weekIQDSales = calculateRevenueByCurrency(thisWeeksSales, 'IQD');

    // Outstanding debts by currency (customer debts)
    // Use debtSales to get all debt sales, then check if they're paid via debts table
    const unpaidDebtSalesUSD = [];
    const unpaidDebtSalesIQD = [];
    
    (sales || []).forEach(sale => {
      if (sale.is_debt) {
        const debt = (debts || []).find(d => d.sale_id === sale.id);
        const isPaid = debt && (debt.paid_at || debt.paid);
        
        if (!isPaid) {
          if (sale.currency === 'USD') {
            unpaidDebtSalesUSD.push(sale);
          } else if (sale.currency === 'IQD') {
            unpaidDebtSalesIQD.push(sale);
          }
        }
      }
    });
    
    const unpaidUSDDebts = unpaidDebtSalesUSD.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const unpaidIQDDebts = unpaidDebtSalesIQD.reduce((sum, sale) => sum + (sale.total || 0), 0);

    // Outstanding company debts by currency
    const unpaidCompanyDebts = (companyDebts || []).filter(debt => !debt.paid_at);
    const unpaidCompanyUSDDebts = unpaidCompanyDebts.reduce((sum, d) => {
      if (d.currency === 'MULTI') {
        return sum + (d.usd_amount || 0);
      } else if (d.currency === 'USD' || !d.currency) {
        return sum + (d.amount || 0);
      }
      return sum;
    }, 0);
    const unpaidCompanyIQDDebts = unpaidCompanyDebts.reduce((sum, d) => {
      if (d.currency === 'MULTI') {
        return sum + (d.iqd_amount || 0);
      } else if (d.currency === 'IQD') {
        return sum + (d.amount || 0);
      }
      return sum;
    }, 0);

    // Outstanding personal loans by currency - use new multi-currency fields
    const unpaidLoans = (personalLoans || []).filter(loan => !loan.paid_at);
    const unpaidUSDLoans = unpaidLoans.reduce((sum, loan) => {
      // Use new multi-currency fields first, fallback to old schema
      const remainingUSD = (loan.usd_amount || 0) - (loan.payment_usd_amount || 0);
      if (loan.usd_amount !== undefined) {
        return sum + Math.max(0, remainingUSD); // Only count positive remaining amounts
      } else if (loan.currency === 'USD') {
        return sum + (loan.amount || 0); // Fallback for old schema
      }
      return sum;
    }, 0);
    const unpaidIQDLoans = unpaidLoans.reduce((sum, loan) => {
      // Use new multi-currency fields first, fallback to old schema  
      const remainingIQD = (loan.iqd_amount || 0) - (loan.payment_iqd_amount || 0);
      if (loan.iqd_amount !== undefined) {
        return sum + Math.max(0, remainingIQD); // Only count positive remaining amounts
      } else if (loan.currency === 'IQD') {
        return sum + (loan.amount || 0); // Fallback for old schema
      }
      return sum;
    }, 0);

    // Net performance (sales - spending) by currency - Include all outgoing payments
    // Note: Multi-currency purchases are tracked in transactions table, so we exclude MULTI from buying_history to avoid double counting
    const todaysSpendingUSD = (buyingHistory || []).filter(entry => {
      if (!entry.paid_at) return false;
      const paidDate = new Date(entry.paid_at);
      return paidDate.toDateString() === today;
    }).reduce((sum, entry) => {
      // Only count single-currency USD purchases from buying_history
      // Multi-currency purchases are handled via transactions table to avoid double counting
      if (entry.currency === 'USD') {
        return sum + (entry.total_price || entry.amount || 0);
      }
      return sum;
    }, 0);

    // Add company debt payments made today in USD (from transactions table)
    const todaysCompanyDebtPaymentsUSD = (transactions || []).filter(transaction => {
      if (!transaction.created_at) return false;
      const transactionDate = new Date(transaction.created_at);
      return transactionDate.toDateString() === today && 
             transaction.type === 'company_debt_payment' && 
             transaction.amount_usd > 0;
    }).reduce((sum, transaction) => sum + transaction.amount_usd, 0);

    // Add today's transactions that are outgoing (negative amounts) - this includes multi-currency purchases
    const todaysTransactionSpendingUSD = (transactions || []).filter(transaction => {
      if (!transaction.created_at) return false;
      const transactionDate = new Date(transaction.created_at);
      return transactionDate.toDateString() === today && transaction.amount_usd < 0;
    }).reduce((sum, transaction) => sum + Math.abs(transaction.amount_usd), 0);

    // Subtract today's buying history returns from spending (returns represent negative spending)
    const todaysReturnsUSD = (transactions || []).filter(transaction => {
      if (!transaction.created_at) return false;
      const transactionDate = new Date(transaction.created_at);
      return transactionDate.toDateString() === today && 
             transaction.type === 'buying_history_return' && 
             transaction.amount_usd > 0;
    }).reduce((sum, transaction) => sum + transaction.amount_usd, 0);

    const todaysSpendingIQD = (buyingHistory || []).filter(entry => {
      if (!entry.paid_at) return false;
      const paidDate = new Date(entry.paid_at);
      return paidDate.toDateString() === today;
    }).reduce((sum, entry) => {
      // Only count single-currency IQD purchases from buying_history
      // Multi-currency purchases are handled via transactions table to avoid double counting
      if (entry.currency === 'IQD' || !entry.currency) {
        return sum + (entry.total_price || entry.amount || 0);
      }
      return sum;
    }, 0);

    // Add company debt payments made today in IQD (from transactions table)
    const todaysCompanyDebtPaymentsIQD = (transactions || []).filter(transaction => {
      if (!transaction.created_at) return false;
      const transactionDate = new Date(transaction.created_at);
      return transactionDate.toDateString() === today && 
             transaction.type === 'company_debt_payment' && 
             transaction.amount_iqd > 0;
    }).reduce((sum, transaction) => sum + transaction.amount_iqd, 0);

    // Add today's transactions that are outgoing (negative amounts) - this includes multi-currency purchases
    const todaysTransactionSpendingIQD = (transactions || []).filter(transaction => {
      if (!transaction.created_at) return false;
      const transactionDate = new Date(transaction.created_at);
      return transactionDate.toDateString() === today && transaction.amount_iqd < 0;
    }).reduce((sum, transaction) => sum + Math.abs(transaction.amount_iqd), 0);

    // Subtract today's buying history returns from spending (returns represent negative spending)
    const todaysReturnsIQD = (transactions || []).filter(transaction => {
      if (!transaction.created_at) return false;
      const transactionDate = new Date(transaction.created_at);
      return transactionDate.toDateString() === today && 
             transaction.type === 'buying_history_return' && 
             transaction.amount_iqd > 0;
    }).reduce((sum, transaction) => sum + transaction.amount_iqd, 0);

    // Add today's personal loan payments to spending (these should be counted as money going out)
    const todaysPersonalLoanPaymentsUSD = (transactions || []).filter(transaction => {
      if (!transaction.created_at) return false;
      const transactionDate = new Date(transaction.created_at);
      return transactionDate.toDateString() === today && 
             transaction.type === 'personal_loan' && 
             transaction.amount_usd > 0; // Positive means money going out (loan given)
    }).reduce((sum, transaction) => sum + transaction.amount_usd, 0);

    const todaysPersonalLoanPaymentsIQD = (transactions || []).filter(transaction => {
      if (!transaction.created_at) return false;
      const transactionDate = new Date(transaction.created_at);
      return transactionDate.toDateString() === today && 
             transaction.type === 'personal_loan' && 
             transaction.amount_iqd > 0; // Positive means money going out (loan given)
    }).reduce((sum, transaction) => sum + transaction.amount_iqd, 0);

    // Total spending includes purchases, debt payments, personal loans, and other outgoing transactions, minus returns
    const totalTodaysSpendingUSD = todaysSpendingUSD + todaysCompanyDebtPaymentsUSD + todaysTransactionSpendingUSD + todaysPersonalLoanPaymentsUSD - todaysReturnsUSD;
    const totalTodaysSpendingIQD = todaysSpendingIQD + todaysCompanyDebtPaymentsIQD + todaysTransactionSpendingIQD + todaysPersonalLoanPaymentsIQD - todaysReturnsIQD;

    // Net performance: USD = native USD sales + incentives - USD spending
    const netPerformanceUSD = todaysUSDSales + todaysIncentivesUSD - totalTodaysSpendingUSD;
    
    // Net performance: IQD = native IQD sales + incentives - IQD spending (no conversion mixing)
    const netPerformanceIQD = todaysIQDSales + todaysIncentivesIQD - totalTodaysSpendingIQD;

    // Calculate inventory values
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

    const totalProductsCount = (products || []).filter(p => !p.archived).length;
    const totalAccessoriesCount = (accessories || []).filter(a => !a.archived).length;
    const totalStockCount = (products || []).filter(p => !p.archived).reduce((sum, p) => sum + (p.stock || 0), 0) +
                           (accessories || []).filter(a => !a.archived).reduce((sum, a) => sum + (a.stock || 0), 0);

    return {
      todaysUSDSales,
      todaysIQDSales,
      weekUSDSales,
      weekIQDSales,
      unpaidUSDDebts,
      unpaidIQDDebts,
      unpaidUSDLoans,
      unpaidIQDLoans,
      netPerformanceUSD,
      netPerformanceIQD,
      totalTodaysSpendingUSD,
      totalTodaysSpendingIQD,
      todaysIncentivesUSD,
      todaysIncentivesIQD,
      totalTransactions: todaysSales.length,
      totalDebtCount: unpaidDebtSalesUSD.length + unpaidDebtSalesIQD.length + unpaidCompanyDebts.length,
      totalLoanCount: unpaidLoans.length,
      unpaidCompanyUSDDebts,
      unpaidCompanyIQDDebts,
      inventoryValueUSD,
      inventoryValueIQD,
      totalProductsCount,
      totalAccessoriesCount,
      totalStockCount,
    };
  }, [sales, debts, buyingHistory, personalLoans, companyDebts, products, accessories, incentives]);

  return (
    <div className="w-full h-full p-8 space-y-6">

      {/* Financial Overview - Balance and Debts */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="mb-6">
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
            </svg>
            {t?.financialOverview || 'Financial Overview'}
          </h3>
        </div>
        
        {/* Financial Summary Table */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Headers */}
            <div className="text-white/80 font-semibold text-sm"></div>
            <div className="text-center text-white/80 font-semibold text-sm">{t?.usd || 'USD'}</div>
            <div className="text-center text-white/80 font-semibold text-sm">{t?.iqd || 'IQD'}</div>
            
            {/* Balance Row */}
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
              </svg>
              <span className="text-white font-medium">{t?.balance || 'Balance'}</span>
            </div>
            <div className="text-center text-xl font-bold text-green-200">
              {formatCurrencyWithTranslation(balances.usd_balance || 0, 'USD', t)}
            </div>
            <div className="text-center text-xl font-bold text-green-200">
              {formatCurrencyWithTranslation(balances.iqd_balance || 0, 'IQD', t)}
            </div>
            
            {/* Customer Debt Row */}
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
              <span className="text-white font-medium">{t?.customerDebt || 'Customer Debt'}</span>
            </div>
            <div className="text-center text-xl font-bold text-red-200">
              {formatCurrencyWithTranslation(metrics.unpaidUSDDebts, 'USD', t)}
            </div>
            <div className="text-center text-xl font-bold text-red-200">
              {formatCurrencyWithTranslation(metrics.unpaidIQDDebts, 'IQD', t)}
            </div>
            
            {/* Company Debt Row */}
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,7V3H2V21H22V7H12M6,19H4V17H6V19M6,15H4V13H6V15M6,11H4V9H6V11M6,7H4V5H6V7M10,19H8V17H10V19M10,15H8V13H10V15M10,11H8V9H10V11M10,7H8V5H10V7M20,19H12V17H20V19M20,15H12V13H20V15M20,11H12V9H20V11Z"/>
              </svg>
              <span className="text-white font-medium">{t?.companyDebt || 'Company Debt'}</span>
            </div>
            <div className="text-center text-xl font-bold text-orange-200">
              {formatCurrencyWithTranslation(metrics.unpaidCompanyUSDDebts, 'USD', t)}
            </div>
            <div className="text-center text-xl font-bold text-orange-200">
              {formatCurrencyWithTranslation(metrics.unpaidCompanyIQDDebts, 'IQD', t)}
            </div>
            
            {/* Personal Loans Row */}
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15,14C17.67,14 23,15.33 23,18V20H7V18C7,15.33 12.33,14 15,14M15,12A4,4 0 0,1 11,8A4,4 0 0,1 15,4A4,4 0 0,1 19,8A4,4 0 0,1 15,12M5,9.59L7.12,7.46L8.54,8.88L5,12.41L2.88,10.29L4.29,8.88L5,9.59Z"/>
              </svg>
              <span className="text-white font-medium">{t?.personalLoans || 'Personal Loans'}</span>
            </div>
            <div className="text-center text-xl font-bold text-purple-200">
              {formatCurrencyWithTranslation(metrics.unpaidUSDLoans, 'USD', t)}
            </div>
            <div className="text-center text-xl font-bold text-purple-200">
              {formatCurrencyWithTranslation(metrics.unpaidIQDLoans, 'IQD', t)}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Balance Check - Physical Money Verification */}
      <div className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,3L2,12H5V20H19V12H22L12,3M12,8.75A2.25,2.25 0 0,1 14.25,11A2.25,2.25 0 0,1 12,13.25A2.25,2.25 0 0,1 9.75,11A2.25,2.25 0 0,1 12,8.75Z"/>
              </svg>
              {t?.dailyBalanceCheck || 'Daily Balance Check'} - USD
            </h3>
            <div className="space-y-3 text-white/90">
              <div className="flex justify-between items-center">
                <span>{t?.openingBalance || 'Opening Balance'}:</span>
                <span className="font-bold">{formatCurrencyWithTranslation(balances.usd_balance - metrics.todaysUSDSales - metrics.todaysIncentivesUSD + metrics.totalTodaysSpendingUSD, 'USD', t)}</span>
              </div>
              <div className="flex justify-between items-center text-green-300">
                <span>+ {t?.todaysSales || "Today's Sales"}:</span>
                <span className="font-bold">{formatCurrencyWithTranslation(metrics.todaysUSDSales, 'USD', t)}</span>
              </div>
              {metrics.todaysIncentivesUSD > 0 && (
                <div className="flex justify-between items-center text-blue-300">
                  <span>+ {t?.todaysIncentives || "Today's Incentives"}:</span>
                  <span className="font-bold">{formatCurrencyWithTranslation(metrics.todaysIncentivesUSD, 'USD', t)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-red-300">
                <span>- {t?.todaysSpending || "Today's Spending"}:</span>
                <span className="font-bold">{formatCurrencyWithTranslation(metrics.totalTodaysSpendingUSD, 'USD', t)}</span>
              </div>
              <hr className="border-white/30" />
              <div className="flex justify-between items-center text-xl font-bold">
                <span>{t?.expectedBalance || 'Expected Balance'}:</span>
                <span>{formatCurrencyWithTranslation(balances.usd_balance, 'USD', t)}</span>
              </div>
              <div className={`flex justify-between items-center text-lg font-semibold ${metrics.netPerformanceUSD >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                <span>{t?.dailyDifference || 'Daily Difference'}:</span>
                <span className="flex items-center gap-2">
                  {metrics.netPerformanceUSD >= 0 ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 13H5v-2h14v2z"/>
                    </svg>
                  )}
                  {formatCurrencyWithTranslation(Math.abs(metrics.netPerformanceUSD), 'USD', t)}
                  {metrics.netPerformanceUSD >= 0 ? ' ↑' : ' ↓'}
                </span>
              </div>
              <div className="text-sm text-white/70 mt-2">
                {t?.physicalMoneyCheck || 'Count your physical USD and compare with this amount'}
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,3L2,12H5V20H19V12H22L12,3M12,8.75A2.25,2.25 0 0,1 14.25,11A2.25,2.25 0 0,1 12,13.25A2.25,2.25 0 0,1 9.75,11A2.25,2.25 0 0,1 12,8.75Z"/>
              </svg>
              {t?.dailyBalanceCheck || 'Daily Balance Check'} - IQD
            </h3>
            <div className="space-y-3 text-white/90">
              <div className="flex justify-between items-center">
                <span>{t?.openingBalance || 'Opening Balance'}:</span>
                <span className="font-bold">{formatCurrencyWithTranslation(balances.iqd_balance - metrics.todaysIQDSales - metrics.todaysIncentivesIQD + metrics.totalTodaysSpendingIQD, 'IQD', t)}</span>
              </div>
              <div className="flex justify-between items-center text-green-300">
                <span>+ {t?.todaysSales || "Today's Sales"}:</span>
                <span className="font-bold">{formatCurrencyWithTranslation(metrics.todaysIQDSales, 'IQD', t)}</span>
              </div>
              {metrics.todaysIncentivesIQD > 0 && (
                <div className="flex justify-between items-center text-blue-300">
                  <span>+ {t?.todaysIncentives || "Today's Incentives"}:</span>
                  <span className="font-bold">{formatCurrencyWithTranslation(metrics.todaysIncentivesIQD, 'IQD', t)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-red-300">
                <span>- {t?.todaysSpending || "Today's Spending"}:</span>
                <span className="font-bold">{formatCurrencyWithTranslation(metrics.totalTodaysSpendingIQD, 'IQD', t)}</span>
              </div>
              <hr className="border-white/30" />
              <div className="flex justify-between items-center text-xl font-bold">
                <span>{t?.expectedBalance || 'Expected Balance'}:</span>
                <span>{formatCurrencyWithTranslation(balances.iqd_balance, 'IQD', t)}</span>
              </div>
              <div className={`flex justify-between items-center text-lg font-semibold ${metrics.netPerformanceIQD >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                <span>{t?.dailyDifference || 'Daily Difference'}:</span>
                <span className="flex items-center gap-2">
                  {metrics.netPerformanceIQD >= 0 ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 13H5v-2h14v2z"/>
                    </svg>
                  )}
                  {formatCurrencyWithTranslation(Math.abs(metrics.netPerformanceIQD), 'IQD', t)}
                  {metrics.netPerformanceIQD >= 0 ? ' ↑' : ' ↓'}
                </span>
              </div>
              <div className="text-sm text-white/70 mt-2">
                {t?.physicalMoneyCheck || 'Count your physical IQD and compare with this amount'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Overview */}
      <div className="grid grid-cols-4 gap-6">
        {/* Total Inventory Value USD */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,15.4L16.2,16.2Z"/>
            </svg>
            <span className="text-blue-100 text-sm">{t?.inventoryValueUSD || 'Inventory Value USD'}</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrencyWithTranslation(metrics.inventoryValueUSD, 'USD', t)}</div>
          <div className="text-blue-100 text-sm">{t?.totalInventoryValue || 'Total Inventory Value'}</div>
        </div>

        {/* Total Inventory Value IQD */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,15.4L16.2,16.2Z"/>
            </svg>
            <span className="text-orange-100 text-sm">{t?.inventoryValueIQD || 'Inventory Value IQD'}</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrencyWithTranslation(metrics.inventoryValueIQD, 'IQD', t)}</div>
          <div className="text-orange-100 text-sm">{t?.totalInventoryValue || 'Total Inventory Value'}</div>
        </div>

        {/* Products Count */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z"/>
            </svg>
            <span className="text-purple-100 text-sm">{t?.productsInventory || 'Products'}</span>
          </div>
          <div className="text-2xl font-bold">{metrics.totalProductsCount}</div>
          <div className="text-purple-100 text-sm">{t?.uniqueProducts || 'Unique Products'}</div>
        </div>

        {/* Accessories Count */}
        <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16,12A2,2 0 0,1 18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12M10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12M4,12A2,2 0 0,1 6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12Z"/>
            </svg>
            <span className="text-teal-100 text-sm">{t?.accessoriesInventory || 'Accessories'}</span>
          </div>
          <div className="text-2xl font-bold">{metrics.totalAccessoriesCount}</div>
          <div className="text-teal-100 text-sm">{t?.uniqueAccessories || 'Unique Accessories'}</div>
        </div>
      </div>

      {/* Combined Inventory Summary */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-2xl font-bold mb-2 flex items-center gap-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,3L2,12H5V20H19V12H22L12,3M12,8.75A2.25,2.25 0 0,1 14.25,11A2.25,2.25 0 0,1 12,13.25A2.25,2.25 0 0,1 9.75,11A2.25,2.25 0 0,1 12,8.75Z"/>
              </svg>
              {t?.totalInventorySummary || 'Total Inventory Summary'}
            </h3>
            <p className="text-white/80">
              {t?.combinedInventoryValue || 'Combined inventory value across all currencies'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold space-y-1">
              <div>{formatCurrencyWithTranslation(metrics.inventoryValueUSD, 'USD', t)}</div>
              <div>{formatCurrencyWithTranslation(metrics.inventoryValueIQD, 'IQD', t)}</div>
            </div>
            <div className="text-white/80 text-sm">
              {metrics.totalStockCount} {t?.totalItems || 'total items in stock'}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sales Performance Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
            </svg>
            {t?.salesPerformance || 'Sales Performance'}
          </h3>
          <SalesChart sales={sales} t={t} />
        </div>

        {/* Balance Overview Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
            </svg>
            {t?.balanceOverview || 'Balance Overview'}
          </h3>
          <BalanceChart 
            usdBalance={balances.usd_balance || 0} 
            iqdBalance={balances.iqd_balance || 0}
            usdCustomerDebts={metrics.unpaidUSDDebts || 0}
            iqdCustomerDebts={metrics.unpaidIQDDebts || 0}
            usdCompanyDebts={metrics.unpaidCompanyUSDDebts || 0}
            iqdCompanyDebts={metrics.unpaidCompanyIQDDebts || 0}
            usdPersonalLoans={metrics.unpaidUSDLoans || 0}
            iqdPersonalLoans={metrics.unpaidIQDLoans || 0}
            t={t} 
          />
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Icon name="fileText" size={20} />
          {t?.recentTransactions || 'Recent Transactions'}
        </h3>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2 flex justify-center">
              <Icon name="fileText" size={32} />
            </div>
            <p>{t?.noTransactions || 'No transactions yet'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 10).map((transaction, idx) => (
              <div key={transaction.id || idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                    transaction.type === 'sale' ? 'bg-green-500' :
                    transaction.type === 'debt_sale' ? 'bg-orange-500' :
                    transaction.type === 'purchase' ? 'bg-red-500' :
                    transaction.type === 'loan' ? 'bg-purple-500' :
                    transaction.type === 'debt_payment' ? 'bg-blue-500' :
                    'bg-gray-500'
                  }`}>
                    <Icon name={
                      transaction.type === 'sale' ? 'dollarSign' :
                      transaction.type === 'debt_sale' ? 'creditCard' :
                      transaction.type === 'purchase' ? 'shoppingCart' :
                      transaction.type === 'loan' ? 'handHeart' :
                      transaction.type === 'debt_payment' ? 'banknote' :
                      'fileText'
                    } size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {transaction.description || (
                        transaction.type === 'sale' ? (t?.sale || 'Sale') :
                        transaction.type === 'debt_sale' ? (t?.debtSale || 'Debt Sale') :
                        transaction.type === 'purchase' ? (t?.purchase || 'Purchase') :
                        transaction.type === 'loan' ? (t?.loan || 'Loan') :
                        transaction.type === 'debt_payment' ? (t?.debtPayment || 'Debt Payment') :
                        transaction.type
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(transaction.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {transaction.amount_usd !== 0 && (
                    <div className={`text-sm font-bold ${
                      transaction.amount_usd > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.amount_usd > 0 ? '+' : ''}{formatCurrencyWithTranslation(transaction.amount_usd, 'USD', t)}
                    </div>
                  )}
                  {transaction.amount_iqd !== 0 && (
                    <div className={`text-sm font-bold ${
                      transaction.amount_iqd > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.amount_iqd > 0 ? '+' : ''}{formatCurrencyWithTranslation(transaction.amount_iqd, 'IQD', t)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Additional Analytics Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Icon name="award" size={20} />
            {t?.topSellingProducts || 'Top Selling Products'}
          </h3>
          <TopSellingProductsChart sales={sales} t={t} />
        </div>

        {/* Monthly Profit Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Icon name="barChart3" size={20} />
            {t?.monthlyProfitTrends || 'Monthly Profit Trends'}
          </h3>
          <MonthlyProfitChart sales={sales} t={t} />
        </div>
      </div>

      {/* Inventory Alerts and Summary */}
      <div className="grid grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Icon name="alertTriangle" size={20} />
            {t?.lowStockAlerts || 'Low Stock Alerts'}
          </h3>
          <LowStockAlerts products={products} accessories={accessories} t={t} />
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Icon name="trendingUp" size={20} />
            {t?.quickStats || 'Quick Stats'}
          </h3>
          <QuickStatsDisplay sales={sales} products={products} accessories={accessories} t={t} />
        </div>
      </div>

    </div>
  );
}

export default React.memo(MultiCurrencyDashboard);

// Sales Chart Component - Single Y-axis with USD equivalent values
const SalesChart = React.memo(({ sales, t }) => {
  const chartData = useMemo(() => {
    const dateRange = generateDateRange(7);

    // Calculate USD sales from actual selling prices
    const usdData = dateRange.map(({ iso }) => {
      return (sales || [])
        .filter(sale => sale.created_at?.split('T')[0] === iso && sale.currency === 'USD')
        .reduce((sum, sale) => sum + (sale.total || 0), 0);
    });

    // Calculate IQD sales converted to USD equivalent for single axis comparison
    const iqdData = dateRange.map(({ iso }) => {
      const iqdTotal = (sales || [])
        .filter(sale => sale.created_at?.split('T')[0] === iso && sale.currency === 'IQD')
        .reduce((sum, sale) => sum + (sale.total || 0), 0);
      return iqdTotal * EXCHANGE_RATES.IQD_TO_USD; // Convert to USD equivalent
    });

    const labels = dateRange.map(({ short }) => short);

    return {
      labels,
      datasets: [
        {
          label: t?.usdSales || 'فرۆشتنی دۆلار',
          data: usdData,
          backgroundColor: CHART_COLORS.USD.secondary,
          borderColor: CHART_COLORS.USD.primary,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
        },
        {
          label: t?.iqdSales || 'فرۆشتنی دینار',
          data: iqdData,
          backgroundColor: CHART_COLORS.IQD.secondary,
          borderColor: CHART_COLORS.IQD.primary,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [sales, t]);

  const options = useMemo(() => ({
    ...getCommonChartOptions(),
    scales: {
      y: {
        type: 'linear',
        display: true,
        beginAtZero: true,
        title: {
          display: true,
          text: t?.usdEquivalent || 'قیمەتی دۆلار',
        },
      },
    },
    plugins: {
      ...getCommonChartOptions().plugins,
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label.includes(t?.iqdSales || 'فرۆشتنی دینار') || label.includes('IQD') || label.includes('دینار')) {
              const originalIQD = value / EXCHANGE_RATES.IQD_TO_USD;
              return `${label}: ${formatCurrency(originalIQD, 'IQD')} (≈${formatCurrency(value, 'USD')})`;
            }
            return `${label}: ${formatCurrency(value, 'USD')}`;
          }
        }
      },
    },
  }), [t]);

  return (
    <div style={{ height: '300px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
});

// Balance Chart Component - Optimized with better USD representation
const BalanceChart = React.memo(({ 
  usdBalance, 
  iqdBalance, 
  usdCustomerDebts, 
  iqdCustomerDebts, 
  usdCompanyDebts, 
  iqdCompanyDebts, 
  usdPersonalLoans, 
  iqdPersonalLoans, 
  t 
}) => {
  const chartData = useMemo(() => {
    // Keep original values for USD, convert IQD to USD equivalent for comparison
    const iqdBalanceUSD = (iqdBalance || 0) * EXCHANGE_RATES.IQD_TO_USD;
    const iqdCustomerDebtsUSD = (iqdCustomerDebts || 0) * EXCHANGE_RATES.IQD_TO_USD;
    const iqdCompanyDebtsUSD = (iqdCompanyDebts || 0) * EXCHANGE_RATES.IQD_TO_USD;
    const iqdPersonalLoansUSD = (iqdPersonalLoans || 0) * EXCHANGE_RATES.IQD_TO_USD;
    
    const data = [
      usdBalance || 0,
      iqdBalanceUSD,
      usdCustomerDebts || 0,
      iqdCustomerDebtsUSD,
      usdCompanyDebts || 0,
      iqdCompanyDebtsUSD,
      usdPersonalLoans || 0,
      iqdPersonalLoansUSD,
    ].filter(value => value > 0); // Only show non-zero values
    
    const labels = [
      usdBalance > 0 ? `${t?.usdBalance || 'USD Balance'} (${formatCurrency(usdBalance, 'USD')})` : null,
      iqdBalance > 0 ? `${t?.iqdBalance || 'IQD Balance'} (${formatCurrency(iqdBalance, 'IQD')})` : null,
      usdCustomerDebts > 0 ? `${t?.customerUSD || 'USD Customer Debts'} (${formatCurrency(usdCustomerDebts, 'USD')})` : null,
      iqdCustomerDebts > 0 ? `${t?.customerIQD || 'IQD Customer Debts'} (${formatCurrency(iqdCustomerDebts, 'IQD')})` : null,
      usdCompanyDebts > 0 ? `${t?.companyUSD || 'USD Company Debts'} (${formatCurrency(usdCompanyDebts, 'USD')})` : null,
      iqdCompanyDebts > 0 ? `${t?.companyIQD || 'IQD Company Debts'} (${formatCurrency(iqdCompanyDebts, 'IQD')})` : null,
      usdPersonalLoans > 0 ? `${t?.loansUSD || 'USD Personal Loans'} (${formatCurrency(usdPersonalLoans, 'USD')})` : null,
      iqdPersonalLoans > 0 ? `${t?.loansIQD || 'IQD Personal Loans'} (${formatCurrency(iqdPersonalLoans, 'IQD')})` : null,
    ].filter(Boolean); // Remove null values

    const colors = [
      CHART_COLORS.USD.primary,     // USD Balance - Green
      CHART_COLORS.IQD.primary,     // IQD Balance - Purple
      CHART_COLORS.danger.primary,  // USD Customer Debts - Red
      '#dc2626',                    // IQD Customer Debts - Dark Red
      '#f59e0b',                    // USD Company Debts - Orange
      '#d97706',                    // IQD Company Debts - Dark Orange
      CHART_COLORS.profit.primary,  // USD Personal Loans - Blue
      '#1d4ed8',                    // IQD Personal Loans - Dark Blue
    ].slice(0, data.length);

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.map(color => color.replace('1)', '0.8)')),
          borderColor: colors,
          borderWidth: 2,
        },
      ],
    };
  }, [usdBalance, iqdBalance, usdCustomerDebts, iqdCustomerDebts, usdCompanyDebts, iqdCompanyDebts, usdPersonalLoans, iqdPersonalLoans]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 200, // Fast animations
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 8,
          font: { size: 10 }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            return `${label}: ~${formatCurrency(value, 'USD')} equivalent`;
          }
        }
      }
    },
  }), []);

  return (
    <div style={{ height: '300px', position: 'relative' }}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
});

// Top Selling Products Chart Component - Optimized
const TopSellingProductsChart = React.memo(({ sales, t }) => {
  const chartData = useMemo(() => {
    const productSales = {};
    
    (sales || []).forEach(sale => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach(item => {
          const productName = item.name || 'Unknown Product';
          const qty = item.quantity || 1;
          
          productSales[productName] = (productSales[productName] || 0) + qty;
        });
      }
    });
    
    // Get top 5 products
    const topProducts = Object.entries(productSales)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    if (topProducts.length === 0) {
      return {
        labels: [t?.noSalesData || 'No sales data'],
        datasets: [{
          data: [1],
          backgroundColor: [CHART_COLORS.USD.secondary],
          borderColor: [CHART_COLORS.USD.primary],
          borderWidth: 1,
        }]
      };
    }
    
    return {
      labels: topProducts.map(([name]) => name.length > 20 ? name.substring(0, 20) + '...' : name),
      datasets: [{
        label: t?.unitsSold || 'Units Sold',
        data: topProducts.map(([, quantity]) => quantity),
        backgroundColor: [
          CHART_COLORS.USD.secondary,
          CHART_COLORS.profit.secondary,
          CHART_COLORS.IQD.secondary,
          CHART_COLORS.danger.secondary,
          'rgba(245, 158, 11, 0.6)',
        ],
        borderColor: [
          CHART_COLORS.USD.primary,
          CHART_COLORS.profit.primary,
          CHART_COLORS.IQD.primary,
          CHART_COLORS.danger.primary,
          'rgba(245, 158, 11, 1)',
        ],
        borderWidth: 2,
      }]
    };
  }, [sales, t]);

  const options = useMemo(() => ({
    ...getCommonChartOptions(),
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.parsed.y} ${t?.unitsSold || 'units sold'}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 }
      }
    }
  }), [t]);

  return (
    <div style={{ height: '250px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
});

// Monthly Profit Chart Component - Fixed USD calculation
const MonthlyProfitChart = React.memo(({ sales, t }) => {
  const { debts, incentives } = useData(); // Get debts and incentives data

  const chartData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        month: date.toISOString().substring(0, 7), // YYYY-MM format
        label: `${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}` // Use numbers like "1/25" instead of "Jan 2025"
      };
    }).reverse();

    const monthlyProfits = last6Months.map(({ month }) => {
      // Calculate profit from sales
      const salesProfit = (sales || [])
        .filter(sale => {
          // Filter by month
          if (sale.created_at?.substring(0, 7) !== month) return false;
          
          // For debt sales, only include if the debt is paid
          if (sale.is_debt) {
            const debt = (debts || []).find(d => d.sale_id === sale.id);
            return debt && (debt.paid_at || debt.paid);
          }
          
          return true;
        })
        .reduce((totalProfit, sale) => {
          if (!sale.items || sale.items.length === 0) return totalProfit;
          
          // Calculate profit based on actual amounts received vs costs
          const saleTotal = sale.total || 0; // This accounts for discounts and actual payment
          let totalCostInSaleCurrency = 0;
          
          // Calculate total cost in the sale's currency
          sale.items.forEach(item => {
            const qty = item.quantity || 1;
            const buyingPrice = Number(item.buying_price) || 0;
            const itemCurrency = item.product_currency || 'IQD';
            
            if (itemCurrency === sale.currency) {
              totalCostInSaleCurrency += buyingPrice * qty;
            } else {
              // Convert cost to sale currency
              if (sale.currency === 'USD' && itemCurrency === 'IQD') {
                totalCostInSaleCurrency += (buyingPrice * qty) * EXCHANGE_RATES.IQD_TO_USD;
              } else if (sale.currency === 'IQD' && itemCurrency === 'USD') {
                totalCostInSaleCurrency += (buyingPrice * qty) * EXCHANGE_RATES.USD_TO_IQD;
              }
            }
          });
          
          // Calculate profit in sale currency
          let profitInSaleCurrency = saleTotal - totalCostInSaleCurrency;
          
          // Convert to USD for chart consistency
          if (sale.currency === 'IQD') {
            profitInSaleCurrency = profitInSaleCurrency * EXCHANGE_RATES.IQD_TO_USD;
          }
          
          return totalProfit + profitInSaleCurrency;
        }, 0);

      // Calculate incentives for this month
      const incentivesProfit = (incentives || [])
        .filter(incentive => {
          return incentive.created_at?.substring(0, 7) === month;
        })
        .reduce((totalIncentives, incentive) => {
          const amount = Number(incentive.amount) || 0;
          // Convert to USD for chart consistency
          if (incentive.currency === 'IQD') {
            return totalIncentives + (amount * EXCHANGE_RATES.IQD_TO_USD);
          }
          return totalIncentives + amount;
        }, 0);

      return salesProfit + incentivesProfit;
    });

    return {
      labels: last6Months.map(({ label }) => label),
      datasets: [{
        label: t?.monthlyProfitUSD || 'Monthly Profit (USD equivalent)',
        data: monthlyProfits,
        backgroundColor: CHART_COLORS.profit.background,
        borderColor: CHART_COLORS.profit.primary,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
      }]
    };
  }, [sales, debts, incentives, t]);

  const options = useMemo(() => ({
    ...getCommonChartOptions(),
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${t?.profit || 'Profit'}: ${formatCurrency(context.parsed.y, 'USD')}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatCurrency(value, 'USD');
          }
        }
      }
    }
  }), [t]);

  return (
    <div style={{ height: '250px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
});

// Low Stock Alerts Component
const LowStockAlerts = React.memo(({ products, accessories, t }) => {
  const lowStockItems = useMemo(() => {
    const items = [];
    
    // Check products
    (products || []).forEach(product => {
      if (product.stock <= 5 && product.stock >= 0) {
        items.push({
          name: product.name,
          stock: product.stock,
          type: 'product',
          urgency: product.stock === 0 ? 'critical' : product.stock <= 2 ? 'high' : 'medium'
        });
      }
    });
    
    // Check accessories
    (accessories || []).forEach(accessory => {
      if (accessory.stock <= 5 && accessory.stock >= 0) {
        items.push({
          name: accessory.name,
          stock: accessory.stock,
          type: 'accessory',
          urgency: accessory.stock === 0 ? 'critical' : accessory.stock <= 2 ? 'high' : 'medium'
        });
      }
    });
    
    return items.sort((a, b) => a.stock - b.stock);
  }, [products, accessories]);

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {lowStockItems.length === 0 ? (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          <div className="text-2xl mb-2 flex justify-center">
            <Icon name="checkCircle" size={24} />
          </div>
          <p>{t?.allStockGood || 'All items in stock'}</p>
        </div>
      ) : (
        lowStockItems.map((item, idx) => (
          <div key={idx} className={`p-3 rounded-lg border-l-4 ${
            item.urgency === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' :
            item.urgency === 'high' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500' :
            'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
          }`}>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {item.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {item.type}
                </div>
              </div>
              <div className={`text-sm font-bold ${
                item.urgency === 'critical' ? 'text-red-600 dark:text-red-400' :
                item.urgency === 'high' ? 'text-orange-600 dark:text-orange-400' :
                'text-yellow-600 dark:text-yellow-400'
              }`}>
                {item.stock === 0 ? 'OUT OF STOCK' : `${item.stock} left`}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
});

// Quick Stats Display Component
const QuickStatsDisplay = React.memo(({ sales, products, accessories, t }) => {
  const stats = useMemo(() => {
    const totalProducts = (products || []).length;
    const totalAccessories = (accessories || []).length;
    const totalSales = (sales || []).length;
    const todaySales = (sales || []).filter(sale => 
      new Date(sale.created_at).toDateString() === new Date().toDateString()
    ).length;
    
    return {
      totalProducts,
      totalAccessories,
      totalSales,
      todaySales
    };
  }, [sales, products, accessories]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400">{t?.totalProducts || 'Total Products'}</div>
        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.totalProducts}</div>
      </div>
      
      <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400">{t?.totalAccessories || 'Total Accessories'}</div>
        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{stats.totalAccessories}</div>
      </div>
      
      <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400">{t?.totalSales || 'Total Sales'}</div>
        <div className="text-lg font-bold text-green-600 dark:text-green-400">{stats.totalSales}</div>
      </div>
      
      <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400">Today's Sales</div>
        <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.todaySales}</div>
      </div>
    </div>
  );
});
