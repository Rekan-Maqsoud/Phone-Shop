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
    return `${amount.toLocaleString()} IQD`;
  }
  return `$${amount.toFixed(2)}`;
};

export default function MultiCurrencyDashboard({ admin, t }) {
  const { products, accessories, sales, debts, buyingHistory, companyDebts, refreshAllData } = useData();
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
      
      // Try getDashboardData if available, but don't rely on it for balances
      if (window.api?.getDashboardData) {
        const fullDashboardData = await window.api.getDashboardData();
        if (fullDashboardData) {
          setDashboardData(fullDashboardData);
        }
      }
      
      if (window.api?.getTransactions) {
        const transactionData = await window.api.getTransactions(20);
        setTransactions(transactionData || []);
      }
      
      if (window.api?.getPersonalLoans) {
        const loansData = await window.api.getPersonalLoans();
        setPersonalLoans(loansData || []);
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

  // Refresh data when sales, buyingHistory, or debts change
  useEffect(() => {
    fetchBalanceData();
  }, [sales, buyingHistory, debts]);

  // Set up periodic refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchBalanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(() => {
    const currentDate = new Date();
    const today = currentDate.toDateString();

    // Today's sales by currency
    const todaysSales = (sales || []).filter(sale => 
      new Date(sale.created_at).toDateString() === today
    );
    
    const todaysUSDSales = todaysSales.filter(s => s.currency === 'USD').reduce((sum, s) => sum + (s.total || 0), 0);
    const todaysIQDSales = todaysSales.filter(s => s.currency === 'IQD').reduce((sum, s) => sum + (s.total || 0), 0);

    // This week's sales by currency
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeeksSales = (sales || []).filter(sale => 
      new Date(sale.created_at) >= oneWeekAgo
    );
    
    const weekUSDSales = thisWeeksSales.filter(s => s.currency === 'USD').reduce((sum, s) => sum + (s.total || 0), 0);
    const weekIQDSales = thisWeeksSales.filter(s => s.currency === 'IQD').reduce((sum, s) => sum + (s.total || 0), 0);

    // Outstanding debts by currency (customer debts)
    const unpaidDebts = (debts || []).filter(debt => !debt.paid_at && !debt.paid);
    const unpaidUSDDebts = unpaidDebts.filter(d => d.currency === 'USD').reduce((sum, d) => sum + (d.total || d.amount || 0), 0);
    const unpaidIQDDebts = unpaidDebts.filter(d => d.currency === 'IQD').reduce((sum, d) => sum + (d.total || d.amount || 0), 0);

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
      totalDebtCount: unpaidDebts.length + unpaidCompanyDebts.length,
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
            usdDebts={metrics.unpaidUSDDebts}
            iqdDebts={metrics.unpaidIQDDebts}
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
    </div>
  );
}

// Sales Chart Component
const SalesChart = ({ sales, t }) => {
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const usdData = last7Days.map(date => {
      return (sales || [])
        .filter(sale => sale.created_at?.split('T')[0] === date && sale.currency === 'USD')
        .reduce((sum, sale) => sum + (sale.total || 0), 0);
    });

    const iqdData = last7Days.map(date => {
      return (sales || [])
        .filter(sale => sale.created_at?.split('T')[0] === date && sale.currency === 'IQD')
        .reduce((sum, sale) => sum + (sale.total || 0), 0);
    });

    return {
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
        {
          label: 'IQD Sales',
          data: iqdData,
          backgroundColor: 'rgba(168, 85, 247, 0.5)',
          borderColor: 'rgba(168, 85, 247, 1)',
          borderWidth: 2,
          tension: 0.1,
        },
      ],
    };
  }, [sales]);

  const options = {
    responsive: true,
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
  };

  return <Line data={chartData} options={options} />;
};

// Balance Chart Component
const BalanceChart = ({ usdBalance, iqdBalance, usdDebts, iqdDebts, t }) => {
  const chartData = useMemo(() => {
    return {
      labels: ['USD Balance', 'IQD Balance', 'USD Debts', 'IQD Debts'],
      datasets: [
        {
          data: [usdBalance || 0, iqdBalance || 0, usdDebts || 0, iqdDebts || 0],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(168, 85, 247, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(245, 101, 101, 0.8)',
          ],
          borderColor: [
            'rgba(34, 197, 94, 1)',
            'rgba(168, 85, 247, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(245, 101, 101, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [usdBalance, iqdBalance, usdDebts, iqdDebts]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  return <Doughnut data={chartData} options={options} />;
};
