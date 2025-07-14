import React, { useState, useEffect, useMemo } from 'react';
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

// Exchange rates - should match the rates in exchangeRates.js
const EXCHANGE_RATES = {
  USD_TO_IQD: 1440,
  IQD_TO_USD: 1 / 1440
};

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

const formatCurrency = (amount, currency = 'USD') => {
  if (currency === 'IQD') {
    // IQD always shows as whole numbers (no decimals ever)
    return `${Math.round(amount).toLocaleString()} IQD`;
  }
  
  // For USD: Show whole numbers when possible, otherwise show minimal decimals
  const numAmount = Number(amount);
  if (numAmount === Math.floor(numAmount)) {
    // It's a whole number, show without decimals
    return `$${Math.floor(numAmount).toLocaleString()}`;
  } else {
    // It has decimals, format with minimal decimal places
    const formatted = numAmount.toFixed(2);
    const cleanFormatted = formatted.replace(/\.?0+$/, '');
    return `$${cleanFormatted}`;
  }
};

function MultiCurrencyDashboard({ admin, t }) {
  const { products, accessories, sales, debts, buyingHistory, companyDebts, refreshAllData, refreshDebts } = useData();
  const [balances, setBalances] = useState({ usd_balance: 0, iqd_balance: 0 });
  const [dashboardData, setDashboardData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [personalLoans, setPersonalLoans] = useState([]);

  const fetchBalanceData = async () => {
    try {
      // Try getBalances first as it's more reliable
      if (window.api?.getBalances) {
        const balanceData = await window.api.getBalances();
        setBalances(balanceData || { usd_balance: 0, iqd_balance: 0 });
      } else {
        // Fallback to default values
        setBalances({ usd_balance: 0, iqd_balance: 0 });
      }
      
      if (window.api?.getTransactions) {
        const transactionData = await window.api.getTransactions(20);
        setTransactions(transactionData || []);
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
  };

  useEffect(() => {
    fetchBalanceData();
  }, []);

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
    const todaysSales = (sales || []).filter(sale => {
      const isToday = new Date(sale.created_at).toDateString() === today;
      if (!isToday) return false;
      
      // For debt sales, check if the debt is paid by looking up in debts array
      if (sale.is_debt) {
        const debt = (debts || []).find(d => d.sale_id === sale.id);
        if (!debt || (!debt.paid_at && !debt.paid)) return false; // Skip unpaid debts
      }
      
      return true;
    });
    
    const todaysUSDSales = todaysSales.reduce((sum, sale) => {
      // Calculate revenue from actual selling prices (before discount)
      if (sale.currency === 'USD') {
        if (sale.items && sale.items.length > 0) {
          const itemsTotal = sale.items.reduce((itemSum, item) => {
            const qty = item.quantity || 1;
            const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.buying_price === 'number' ? item.buying_price : 0);
            return itemSum + (sellingPrice * qty);
          }, 0);
          return sum + itemsTotal;
        } else {
          return sum + (sale.total || 0);
        }
      }
      return sum;
    }, 0);
    
    const todaysIQDSales = todaysSales.reduce((sum, sale) => {
      // Calculate revenue from actual selling prices (before discount)
      if (sale.currency === 'IQD') {
        if (sale.items && sale.items.length > 0) {
          const itemsTotal = sale.items.reduce((itemSum, item) => {
            const qty = item.quantity || 1;
            const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.buying_price === 'number' ? item.buying_price : 0);
            return itemSum + (sellingPrice * qty);
          }, 0);
          return sum + itemsTotal;
        } else {
          return sum + (sale.total || 0);
        }
      } else if (sale.currency === 'USD') {
        // Convert USD sales to IQD equivalent for accurate IQD revenue totals
        const exchangeRate = sale.exchange_rates?.usd_to_iqd || EXCHANGE_RATES.USD_TO_IQD;
        if (sale.items && sale.items.length > 0) {
          const itemsTotal = sale.items.reduce((itemSum, item) => {
            const qty = item.quantity || 1;
            const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.buying_price === 'number' ? item.buying_price : 0);
            return itemSum + (sellingPrice * qty);
          }, 0);
          return sum + (itemsTotal * exchangeRate);
        } else {
          return sum + ((sale.total || 0) * exchangeRate);
        }
      }
      return sum;
    }, 0);

    // This week's sales by currency - exclude unpaid debt sales
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeeksSales = (sales || []).filter(sale => {
      const isThisWeek = new Date(sale.created_at) >= oneWeekAgo;
      if (!isThisWeek) return false;
      
      // For debt sales, check if the debt is paid by looking up in debts array
      if (sale.is_debt) {
        const debt = (debts || []).find(d => d.sale_id === sale.id);
        if (!debt || (!debt.paid_at && !debt.paid)) return false; // Skip unpaid debts
      }
      
      return true;
    });
    
    const weekUSDSales = thisWeeksSales.reduce((sum, sale) => {
      // Calculate revenue from actual selling prices (before discount)
      if (sale.currency === 'USD') {
        if (sale.items && sale.items.length > 0) {
          const itemsTotal = sale.items.reduce((itemSum, item) => {
            const qty = item.quantity || 1;
            const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.buying_price === 'number' ? item.buying_price : 0);
            return itemSum + (sellingPrice * qty);
          }, 0);
          return sum + itemsTotal;
        } else {
          return sum + (sale.total || 0);
        }
      }
      return sum;
    }, 0);
    
    const weekIQDSales = thisWeeksSales.reduce((sum, sale) => {
      // Calculate revenue from actual selling prices (before discount)
      if (sale.currency === 'IQD') {
        if (sale.items && sale.items.length > 0) {
          const itemsTotal = sale.items.reduce((itemSum, item) => {
            const qty = item.quantity || 1;
            const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.buying_price === 'number' ? item.buying_price : 0);
            return itemSum + (sellingPrice * qty);
          }, 0);
          return sum + itemsTotal;
        } else {
          return sum + (sale.total || 0);
        }
      } else if (sale.currency === 'USD') {
        // Convert USD sales to IQD equivalent for accurate IQD revenue totals
        const exchangeRate = sale.exchange_rates?.usd_to_iqd || EXCHANGE_RATES.USD_TO_IQD;
        if (sale.items && sale.items.length > 0) {
          const itemsTotal = sale.items.reduce((itemSum, item) => {
            const qty = item.quantity || 1;
            const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.buying_price === 'number' ? item.buying_price : 0);
            return itemSum + (sellingPrice * qty);
          }, 0);
          return sum + (itemsTotal * exchangeRate);
        } else {
          return sum + ((sale.total || 0) * exchangeRate);
        }
      }
      return sum;
    }, 0);

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

    // Outstanding personal loans by currency
    const unpaidLoans = (personalLoans || []).filter(loan => !loan.paid_at);
    const unpaidUSDLoans = unpaidLoans.filter(l => l.currency === 'USD').reduce((sum, l) => sum + (l.amount || 0), 0);
    const unpaidIQDLoans = unpaidLoans.filter(l => l.currency === 'IQD').reduce((sum, l) => sum + (l.amount || 0), 0);

    // Net performance (sales - spending) by currency
    const todaysSpendingUSD = (buyingHistory || []).filter(entry => {
      if (!entry.paid_at) return false;
      const paidDate = new Date(entry.paid_at);
      return paidDate.toDateString() === today && entry.currency === 'USD';
    }).reduce((sum, entry) => sum + (entry.amount || 0), 0);

    const todaysSpendingIQD = (buyingHistory || []).filter(entry => {
      if (!entry.paid_at) return false;
      const paidDate = new Date(entry.paid_at);
      return paidDate.toDateString() === today && entry.currency === 'IQD';
    }).reduce((sum, entry) => sum + (entry.amount || 0), 0);

    const netPerformanceUSD = todaysUSDSales - todaysSpendingUSD;
    const netPerformanceIQD = todaysIQDSales - todaysSpendingIQD;

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
      totalTransactions: todaysSales.length,
      totalDebtCount: unpaidDebtSalesUSD.length + unpaidDebtSalesIQD.length + unpaidCompanyDebts.length,
      totalLoanCount: unpaidLoans.length,
      unpaidCompanyUSDDebts,
      unpaidCompanyIQDDebts,
    };
  }, [sales, debts, buyingHistory, personalLoans, companyDebts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              📊 {t?.multiCurrencyDashboard || 'Multi-Currency Dashboard'}
            </h1>
            <p className="text-blue-100 text-lg">
              {t?.realTimeBusinessMetrics || 'Real-time business metrics across USD and IQD'}
            </p>
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">💵</span>
            <span className="text-green-100 text-sm">{t?.currentBalance || 'Current Balance'}</span>
          </div>
          <div className="text-3xl font-bold">{formatCurrency(balances.usd_balance || 0, 'USD')}</div>
          <div className="text-green-100 text-sm">{t?.usdBalance || 'USD Balance'}</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">💰</span>
            <span className="text-orange-100 text-sm">{t?.currentBalance || 'Current Balance'}</span>
          </div>
          <div className="text-3xl font-bold">{formatCurrency(balances.iqd_balance || 0, 'IQD')}</div>
          <div className="text-orange-100 text-sm">{t?.iqdBalance || 'IQD Balance'}</div>
        </div>
      </div>

      {/* Sales Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's USD Sales */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🇺🇸</span>
            <span className="text-gray-500 dark:text-gray-400 text-sm">{t?.todayUSD || "Today's USD"}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(metrics.todaysUSDSales, 'USD')}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{t?.salesRevenue || 'Sales Revenue'}</div>
        </div>

        {/* Today's IQD Sales */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🇮🇶</span>
            <span className="text-gray-500 dark:text-gray-400 text-sm">{t?.todayIQD || "Today's IQD"}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(metrics.todaysIQDSales, 'IQD')}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{t?.salesRevenue || 'Sales Revenue'}</div>
        </div>

        {/* Weekly USD Sales */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📈</span>
            <span className="text-gray-500 dark:text-gray-400 text-sm">{t?.weeklyUSD || 'Weekly USD'}</span>
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(metrics.weekUSDSales, 'USD')}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{t?.weeklyRevenue || 'Weekly Revenue'}</div>
        </div>

        {/* Weekly IQD Sales */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📊</span>
            <span className="text-gray-500 dark:text-gray-400 text-sm">{t?.weeklyIQD || 'Weekly IQD'}</span>
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatCurrency(metrics.weekIQDSales, 'IQD')}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{t?.weeklyRevenue || 'Weekly Revenue'}</div>
        </div>
      </div>

      {/* Debt and Loan Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {/* USD Customer Debts */}
        <div className="bg-gradient-to-br from-red-400 to-red-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">⚠️</span>
            <span className="text-red-100 text-sm">{t?.customerUSD || 'Customer USD'}</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(metrics.unpaidUSDDebts, 'USD')}</div>
          <div className="text-red-100 text-sm">{t?.customerDebts || 'Customer Debts'}</div>
        </div>

        {/* IQD Customer Debts */}
        <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">💳</span>
            <span className="text-orange-100 text-sm">{t?.customerIQD || 'Customer IQD'}</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(metrics.unpaidIQDDebts, 'IQD')}</div>
          <div className="text-orange-100 text-sm">{t?.customerDebts || 'Customer Debts'}</div>
        </div>

        {/* USD Company Debts */}
        <div className="bg-gradient-to-br from-pink-400 to-red-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🏢</span>
            <span className="text-pink-100 text-sm">{t?.companyUSD || 'Company USD'}</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(metrics.unpaidCompanyUSDDebts, 'USD')}</div>
          <div className="text-pink-100 text-sm">{t?.companyDebts || 'Company Debts'}</div>
        </div>

        {/* IQD Company Debts */}
        <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🏭</span>
            <span className="text-purple-100 text-sm">{t?.companyIQD || 'Company IQD'}</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(metrics.unpaidCompanyIQDDebts, 'IQD')}</div>
          <div className="text-purple-100 text-sm">{t?.companyDebts || 'Company Debts'}</div>
        </div>

        {/* USD Loans */}
        <div className="bg-gradient-to-br from-indigo-400 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🤝</span>
            <span className="text-indigo-100 text-sm">{t?.loansUSD || 'Loans USD'}</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(metrics.unpaidUSDLoans, 'USD')}</div>
          <div className="text-indigo-100 text-sm">{t?.personalLoans || 'Personal Loans'}</div>
        </div>

        {/* IQD Loans */}
        <div className="bg-gradient-to-br from-pink-400 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">💎</span>
            <span className="text-pink-100 text-sm">{t?.loansIQD || 'Loans IQD'}</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(metrics.unpaidIQDLoans, 'IQD')}</div>
          <div className="text-pink-100 text-sm">{t?.personalLoans || 'Personal Loans'}</div>
        </div>
      </div>

      {/* Net Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`rounded-2xl p-6 text-white shadow-lg ${
          metrics.netPerformanceUSD >= 0 
            ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
            : 'bg-gradient-to-br from-red-500 to-red-600'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">{metrics.netPerformanceUSD >= 0 ? '📈' : '📉'}</span>
            <span className="text-green-100 text-sm">{t?.netPerformanceUSD || 'Net Performance USD'}</span>
          </div>
          <div className="text-3xl font-bold">{formatCurrency(Math.abs(metrics.netPerformanceUSD), 'USD')}</div>
          <div className="text-green-100 text-sm">
            {metrics.netPerformanceUSD >= 0 ? (t?.profit || 'Profit') : (t?.loss || 'Loss')} {t?.today || 'Today'}
          </div>
        </div>

        <div className={`rounded-2xl p-6 text-white shadow-lg ${
          metrics.netPerformanceIQD >= 0 
            ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
            : 'bg-gradient-to-br from-red-500 to-red-600'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">{metrics.netPerformanceIQD >= 0 ? '📈' : '📉'}</span>
            <span className="text-green-100 text-sm">{t?.netPerformanceIQD || 'Net Performance IQD'}</span>
          </div>
          <div className="text-3xl font-bold">{formatCurrency(Math.abs(metrics.netPerformanceIQD), 'IQD')}</div>
          <div className="text-green-100 text-sm">
            {metrics.netPerformanceIQD >= 0 ? (t?.profit || 'Profit') : (t?.loss || 'Loss')} {t?.today || 'Today'}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Performance Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            📈 {t?.salesPerformance || 'Sales Performance'}
          </h3>
          <SalesChart sales={sales} t={t} />
        </div>

        {/* Balance Overview Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            💰 {t?.balanceOverview || 'Balance Overview'}
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
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          📝 {t?.recentTransactions || 'Recent Transactions'}
        </h3>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">📄</div>
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
                    {transaction.type === 'sale' ? '💰' :
                     transaction.type === 'debt_sale' ? '💳' :
                     transaction.type === 'purchase' ? '🛒' :
                     transaction.type === 'loan' ? '🤝' :
                     transaction.type === 'debt_payment' ? '💸' :
                     '📄'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {transaction.description || transaction.type}
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
                      {transaction.amount_usd > 0 ? '+' : ''}{formatCurrency(transaction.amount_usd, 'USD')}
                    </div>
                  )}
                  {transaction.amount_iqd !== 0 && (
                    <div className={`text-sm font-bold ${
                      transaction.amount_iqd > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.amount_iqd > 0 ? '+' : ''}{formatCurrency(transaction.amount_iqd, 'IQD')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Additional Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            🏆 {t?.topSellingProducts || 'Top Selling Products'}
          </h3>
          <TopSellingProductsChart sales={sales} t={t} />
        </div>

        {/* Monthly Profit Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            📊 {t?.monthlyProfitTrends || 'Monthly Profit Trends'}
          </h3>
          <MonthlyProfitChart sales={sales} t={t} />
        </div>
      </div>

      {/* Inventory Alerts and Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            ⚠️ {t?.lowStockAlerts || 'Low Stock Alerts'}
          </h3>
          <LowStockAlerts products={products} accessories={accessories} t={t} />
        </div>

        {/* Sales Summary by Currency */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            💱 {t?.salesByCurrency || 'Sales by Currency'}
          </h3>
          <SalesByCurrencyChart sales={sales} t={t} />
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            📈 {t?.quickStats || 'Quick Stats'}
          </h3>
          <QuickStatsDisplay sales={sales} products={products} accessories={accessories} t={t} />
        </div>
      </div>

    </div>
  );
}

export default React.memo(MultiCurrencyDashboard);

// Sales Chart Component - Separate charts for USD and IQD
const SalesChart = React.memo(({ sales, t }) => {
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    // Calculate USD sales from actual selling prices
    const usdData = last7Days.map(date => {
      return (sales || [])
        .filter(sale => sale.created_at?.split('T')[0] === date && sale.currency === 'USD')
        .reduce((sum, sale) => {
          if (sale.items && sale.items.length > 0) {
            const itemsTotal = sale.items.reduce((itemSum, item) => {
              const qty = item.quantity || 1;
              const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.buying_price === 'number' ? item.buying_price : 0);
              return itemSum + (sellingPrice * qty);
            }, 0);
            return sum + itemsTotal;
          } else {
            return sum + (sale.total || 0);
          }
        }, 0);
    });

    // Calculate IQD sales from actual selling prices  
    const iqdData = last7Days.map(date => {
      return (sales || [])
        .filter(sale => sale.created_at?.split('T')[0] === date && sale.currency === 'IQD')
        .reduce((sum, sale) => {
          if (sale.items && sale.items.length > 0) {
            const itemsTotal = sale.items.reduce((itemSum, item) => {
              const qty = item.quantity || 1;
              const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.buying_price === 'number' ? item.buying_price : 0);
              return itemSum + (sellingPrice * qty);
            }, 0);
            return sum + itemsTotal;
          } else {
            return sum + (sale.total || 0);
          }
        }, 0);
    });

    return {
      usd: {
        labels: last7Days.map(date => new Date(date).toLocaleDateString()),
        datasets: [
          {
            label: 'USD Sales',
            data: usdData,
            backgroundColor: 'rgba(34, 197, 94, 0.5)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 2,
            tension: 0.1,
          },
        ],
      },
      iqd: {
        labels: last7Days.map(date => new Date(date).toLocaleDateString()),
        datasets: [
          {
            label: 'IQD Sales',
            data: iqdData,
            backgroundColor: 'rgba(168, 85, 247, 0.5)',
            borderColor: 'rgba(168, 85, 247, 1)',
            borderWidth: 2,
            tension: 0.1,
          },
        ],
      },
    };
  }, [sales]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300, // Faster animations
    },
    interaction: {
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }), []);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg" style={{ height: '300px' }}>
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">USD Sales (7 Days)</h3>
        <div style={{ height: '250px' }}>
          <Line data={chartData.usd} options={options} />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg" style={{ height: '300px' }}>
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">IQD Sales (7 Days)</h3>
        <div style={{ height: '250px' }}>
          <Line data={chartData.iqd} options={options} />
        </div>
      </div>
    </div>
  );
});

// Balance Chart Component - All balances in one pie chart with exchange rate scaling
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
    // Convert everything to USD equivalent for proper visualization
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
    ];
    
    const labels = [
      `USD Balance (${formatCurrency(usdBalance || 0, 'USD')})`,
      `IQD Balance (${formatCurrency(iqdBalance || 0, 'IQD')})`,
      `USD Customer Debts (${formatCurrency(usdCustomerDebts || 0, 'USD')})`,
      `IQD Customer Debts (${formatCurrency(iqdCustomerDebts || 0, 'IQD')})`,
      `USD Company Debts (${formatCurrency(usdCompanyDebts || 0, 'USD')})`,
      `IQD Company Debts (${formatCurrency(iqdCompanyDebts || 0, 'IQD')})`,
      `USD Personal Loans (${formatCurrency(usdPersonalLoans || 0, 'USD')})`,
      `IQD Personal Loans (${formatCurrency(iqdPersonalLoans || 0, 'IQD')})`,
    ];

    return {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',    // USD Balance - Green
            'rgba(168, 85, 247, 0.8)',   // IQD Balance - Purple
            'rgba(239, 68, 68, 0.8)',    // USD Customer Debts - Red
            'rgba(220, 38, 127, 0.8)',   // IQD Customer Debts - Pink
            'rgba(245, 158, 11, 0.8)',   // USD Company Debts - Orange
            'rgba(217, 119, 6, 0.8)',    // IQD Company Debts - Dark Orange
            'rgba(59, 130, 246, 0.8)',   // USD Personal Loans - Blue
            'rgba(29, 78, 216, 0.8)',    // IQD Personal Loans - Dark Blue
          ],
          borderColor: [
            'rgba(34, 197, 94, 1)',
            'rgba(168, 85, 247, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(220, 38, 127, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(217, 119, 6, 1)',
            'rgba(59, 130, 246, 1)',
            'rgba(29, 78, 216, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [usdBalance, iqdBalance, usdCustomerDebts, iqdCustomerDebts, usdCompanyDebts, iqdCompanyDebts, usdPersonalLoans, iqdPersonalLoans]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 200, // Reduce animation time for better performance
    },
    interaction: {
      intersect: false, // Faster hover detection
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 8,
          font: {
            size: 10
          }
        }
      },
      tooltip: {
        enabled: true,
        mode: 'nearest',
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            // Show the value in USD equivalent for comparison
            return `${label}: ~${formatCurrency(value, 'USD')} equiv`;
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

// Top Selling Products Chart Component
const TopSellingProductsChart = React.memo(({ sales, t }) => {
  const chartData = useMemo(() => {
    const productSales = {};
    
    (sales || []).forEach(sale => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach(item => {
          const productName = item.name || 'Unknown Product';
          const qty = item.quantity || 1;
          
          if (!productSales[productName]) {
            productSales[productName] = 0;
          }
          productSales[productName] += qty;
        });
      }
    });
    
    // Get top 5 products
    const topProducts = Object.entries(productSales)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    if (topProducts.length === 0) {
      return {
        labels: ['No sales data'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(156, 163, 175, 0.5)'],
          borderColor: ['rgba(156, 163, 175, 1)'],
          borderWidth: 1,
        }]
      };
    }
    
    return {
      labels: topProducts.map(([name]) => name.length > 20 ? name.substring(0, 20) + '...' : name),
      datasets: [{
        label: 'Units Sold',
        data: topProducts.map(([, quantity]) => quantity),
        backgroundColor: [
          'rgba(34, 197, 94, 0.6)',
          'rgba(59, 130, 246, 0.6)',
          'rgba(168, 85, 247, 0.6)',
          'rgba(245, 158, 11, 0.6)',
          'rgba(239, 68, 68, 0.6)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      }]
    };
  }, [sales]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.parsed.y} units sold`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  }), []);

  return (
    <div style={{ height: '250px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
});

// Monthly Profit Chart Component
const MonthlyProfitChart = React.memo(({ sales, t }) => {
  const chartData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        month: date.toISOString().substring(0, 7), // YYYY-MM format
        label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      };
    }).reverse();

    const monthlyProfits = last6Months.map(({ month }) => {
      return (sales || [])
        .filter(sale => sale.created_at?.substring(0, 7) === month)
        .reduce((totalProfit, sale) => {
          if (sale.items && sale.items.length > 0) {
            const saleProfit = sale.items.reduce((itemProfit, item) => {
              const qty = item.quantity || 1;
              const buyingPrice = typeof item.buying_price === 'number' ? item.buying_price : 0;
              const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : buyingPrice;
              
              // Convert to USD for consistency
              const saleCurrency = sale.currency || 'USD';
              let profitInUSD = (sellingPrice - buyingPrice) * qty;
              
              if (saleCurrency === 'IQD') {
                profitInUSD = profitInUSD * EXCHANGE_RATES.IQD_TO_USD;
              }
              
              return itemProfit + profitInUSD;
            }, 0);
            return totalProfit + saleProfit;
          }
          return totalProfit;
        }, 0);
    });

    return {
      labels: last6Months.map(({ label }) => label),
      datasets: [{
        label: 'Monthly Profit (USD)',
        data: monthlyProfits,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
      }]
    };
  }, [sales]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Profit: ${formatCurrency(context.parsed.y, 'USD')}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toFixed(0);
          }
        }
      }
    }
  }), []);

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
          <div className="text-2xl mb-2">✅</div>
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

// Sales by Currency Chart Component
const SalesByCurrencyChart = React.memo(({ sales, t }) => {
  const chartData = useMemo(() => {
    let usdSales = 0;
    let iqdSales = 0;
    
    (sales || []).forEach(sale => {
      if (sale.currency === 'USD') {
        usdSales++;
      } else {
        iqdSales++;
      }
    });
    
    const total = usdSales + iqdSales;
    if (total === 0) {
      return {
        labels: ['No sales'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(156, 163, 175, 0.5)'],
        }]
      };
    }
    
    return {
      labels: [`USD Sales (${usdSales})`, `IQD Sales (${iqdSales})`],
      datasets: [{
        data: [usdSales, iqdSales],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(168, 85, 247, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(168, 85, 247, 1)',
        ],
        borderWidth: 2,
      }]
    };
  }, [sales]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { size: 12 }
        }
      }
    }
  }), []);

  return (
    <div style={{ height: '200px' }}>
      <Doughnut data={chartData} options={options} />
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
        <div className="text-sm text-gray-600 dark:text-gray-400">Total Products</div>
        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.totalProducts}</div>
      </div>
      
      <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400">Total Accessories</div>
        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{stats.totalAccessories}</div>
      </div>
      
      <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400">Total Sales</div>
        <div className="text-lg font-bold text-green-600 dark:text-green-400">{stats.totalSales}</div>
      </div>
      
      <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400">Today's Sales</div>
        <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.todaySales}</div>
      </div>
    </div>
  );
});
