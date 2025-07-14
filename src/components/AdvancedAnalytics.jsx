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
  RadialLinearScale,
} from 'chart.js';
import { Bar, Line, Doughnut, Radar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale
);

const formatCurrency = (amount, currency = 'USD') => {
  if (currency === 'IQD') {
    return `${Math.round(amount).toLocaleString()} IQD`;
  }
  // Format with 2 decimal places for USD, but remove .00 for whole numbers
  const formatted = Number(amount).toFixed(2);
  const cleanFormatted = formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted;
  return `$${cleanFormatted}`;
};

export default function AdvancedAnalytics({ admin, t }) {
  const { products, accessories, sales, debts, buyingHistory, refreshAllData } = useData();
  const [timeRange, setTimeRange] = useState('7days');
  const [chartType, setChartType] = useState('revenue');
  const [balances, setBalances] = useState({ usd_balance: 0, iqd_balance: 0 });
  const [personalLoans, setPersonalLoans] = useState([]);

  const fetchData = async () => {
    try {
      if (window.api?.getBalances) {
        const balanceData = await window.api.getBalances();
        setBalances(balanceData || { usd_balance: 0, iqd_balance: 0 });
      }
      
      if (window.api?.getPersonalLoans) {
        const loansData = await window.api.getPersonalLoans();
        setPersonalLoans(loansData || []);
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh data when sales, buyingHistory, or debts change
  useEffect(() => {
    fetchData();
  }, [sales, buyingHistory, debts]);

  // Set up periodic refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Advanced metrics calculation
  const analytics = useMemo(() => {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    // Filter data by time range
    const allFilteredSales = sales.filter(sale => new Date(sale.created_at) >= startDate);
    
    // Exclude unpaid debt sales from revenue calculations
    const filteredSales = allFilteredSales.filter(sale => {
      // If this is a debt sale, check if the debt is paid
      if (sale.is_debt) {
        const debt = debts.find(d => d.sale_id === sale.id);
        // Only include if debt exists and is paid, or if no debt record exists (consider as paid)
        return debt ? Boolean(debt.paid_at) : false;
      }
      // Include all non-debt sales
      return true;
    });
    
    const filteredPurchases = buyingHistory.filter(purchase => new Date(purchase.paid_at || purchase.created_at) >= startDate);
    const filteredLoans = personalLoans.filter(loan => new Date(loan.created_at) >= startDate);

    // Revenue analysis - properly convert USD sales to IQD for accurate IQD totals
    const revenueUSD = filteredSales.reduce((sum, sale) => {
      // For revenue calculations, use sale.total based on sale currency, not payment amounts
      // This ensures overpayments don't inflate revenue figures
      if (sale.currency === 'USD') {
        return sum + (sale.total || 0);
      }
      return sum;
    }, 0);
    
    const revenueIQD = filteredSales.reduce((sum, sale) => {
      // For revenue calculations, use sale.total based on sale currency, not payment amounts
      // This ensures overpayments don't inflate revenue figures
      if (sale.currency === 'IQD') {
        return sum + (sale.total || 0);
      } else if (sale.currency === 'USD') {
        // Convert USD sales to IQD equivalent for accurate IQD revenue totals
        const exchangeRate = sale.exchange_rates?.usd_to_iqd || 1440;
        return sum + ((sale.total || 0) * exchangeRate);
      }
      return sum;
    }, 0);

    // Profit analysis
    let profitUSD = 0;
    let profitIQD = 0;
    filteredSales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          const buyingPrice = item.buying_price || 0;
          const sellingPrice = item.selling_price || item.buying_price || 0;
          const quantity = item.quantity || 1;
          const productCurrency = item.product_currency || 'IQD';
          const saleCurrency = sale.currency || 'USD';
          
          // CRITICAL FIX: selling_price is stored in product's original currency
          // Need to convert both prices to sale currency for proper profit calculation
          let sellingPriceInSaleCurrency = sellingPrice;
          let buyingPriceInSaleCurrency = buyingPrice;
          
          // Get exchange rates from sale or use current rates
          const saleExchangeRates = sale.exchange_rates || {
            usd_to_iqd: 1440,
            iqd_to_usd: 0.000694
          };
          
          // Convert selling price to sale currency if needed
          if (productCurrency !== saleCurrency) {
            if (saleCurrency === 'USD' && productCurrency === 'IQD') {
              sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.iqd_to_usd;
            } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
              sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.usd_to_iqd;
            }
          }
          
          // Convert buying price to sale currency if needed  
          if (productCurrency !== saleCurrency) {
            if (saleCurrency === 'USD' && productCurrency === 'IQD') {
              buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.iqd_to_usd;
            } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
              buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.usd_to_iqd;
            }
          }
          
          // Calculate profit correctly
          let profit = (sellingPriceInSaleCurrency - buyingPriceInSaleCurrency) * quantity;
          
          if (saleCurrency === 'USD') {
            profitUSD += profit;
          } else {
            profitIQD += profit;
          }
        });
      }
    });

    // Spending analysis - use total_price instead of amount
    const spendingUSD = filteredPurchases.filter(p => p.currency === 'USD').reduce((sum, p) => sum + (p.total_price || p.amount || 0), 0);
    const spendingIQD = filteredPurchases.filter(p => p.currency === 'IQD').reduce((sum, p) => sum + (p.total_price || p.amount || 0), 0);

    // Outstanding debt analysis - use debt sales approach
    const outstandingDebtUSD = sales.filter(sale => {
      if (!sale.is_debt || sale.currency !== 'USD') return false;
      const debt = debts.find(d => d.sale_id === sale.id);
      return debt ? !debt.paid_at : true; // Unpaid if no debt record or unpaid debt record
    }).reduce((sum, sale) => sum + (sale.total || 0), 0);
    
    const outstandingDebtIQD = sales.filter(sale => {
      if (!sale.is_debt || sale.currency !== 'IQD') return false;
      const debt = debts.find(d => d.sale_id === sale.id);
      return debt ? !debt.paid_at : true; // Unpaid if no debt record or unpaid debt record
    }).reduce((sum, sale) => sum + (sale.total || 0), 0);

    // Personal loans analysis
    const activeLoanUSD = filteredLoans.filter(l => !l.paid_at && l.currency === 'USD').reduce((sum, l) => sum + (l.amount || 0), 0);
    const activeLoanIQD = filteredLoans.filter(l => !l.paid_at && l.currency === 'IQD').reduce((sum, l) => sum + (l.amount || 0), 0);

    // Product performance analysis
    const productPerformance = {};
    filteredSales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          const name = item.name || 'Unknown';
          if (!productPerformance[name]) {
            productPerformance[name] = {
              quantity: 0,
              revenueUSD: 0,
              revenueIQD: 0,
              profitUSD: 0,
              profitIQD: 0
            };
          }
          productPerformance[name].quantity += item.quantity || 1;
          
          const buyingPrice = item.buying_price || 0;
          const sellingPrice = item.selling_price || item.buying_price || 0;
          const quantity = item.quantity || 1;
          const productCurrency = item.product_currency || 'IQD';
          const saleCurrency = sale.currency || 'USD';
          
          // CRITICAL FIX: selling_price is stored in product's original currency
          // Need to convert both prices to sale currency for proper profit calculation
          let sellingPriceInSaleCurrency = sellingPrice;
          let buyingPriceInSaleCurrency = buyingPrice;
          
          // Get exchange rates from sale or use current rates
          const saleExchangeRates = sale.exchange_rates || {
            usd_to_iqd: 1440,
            iqd_to_usd: 0.000694
          };
          
          // Convert selling price to sale currency if needed
          if (productCurrency !== saleCurrency) {
            if (saleCurrency === 'USD' && productCurrency === 'IQD') {
              sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.iqd_to_usd;
            } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
              sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.usd_to_iqd;
            }
          }
          
          // Convert buying price to sale currency if needed  
          if (productCurrency !== saleCurrency) {
            if (saleCurrency === 'USD' && productCurrency === 'IQD') {
              buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.iqd_to_usd;
            } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
              buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.usd_to_iqd;
            }
          }
          
          const revenue = sellingPriceInSaleCurrency * quantity;
          const profit = (sellingPriceInSaleCurrency - buyingPriceInSaleCurrency) * quantity;
          
          if (saleCurrency === 'USD') {
            productPerformance[name].revenueUSD += revenue;
            productPerformance[name].profitUSD += profit;
            // Also add to IQD totals (converted) for accurate IQD revenue tracking
            const exchangeRate = saleExchangeRates.usd_to_iqd;
            productPerformance[name].revenueIQD += (revenue * exchangeRate);
            productPerformance[name].profitIQD += (profit * exchangeRate);
          } else {
            productPerformance[name].revenueIQD += revenue;
            productPerformance[name].profitIQD += profit;
          }
        });
      }
    });

    // Top performing products
    const topProducts = Object.entries(productPerformance)
      .sort(([,a], [,b]) => (b.revenueUSD + b.revenueIQD) - (a.revenueUSD + a.revenueIQD))
      .slice(0, 10);

    // Daily breakdown for chart
    const days = Math.min(timeRange === '24h' ? 24 : (timeRange === '7days' ? 7 : 30), 30);
    const dailyData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStr = date.toISOString().split('T')[0];
      
      const daySales = filteredSales.filter(sale => 
        sale.created_at.split('T')[0] === dayStr
      );
      
      const dayRevenueUSD = daySales.reduce((sum, sale) => {
        // For revenue calculations, use sale.total based on sale currency, not payment amounts
        if (sale.currency === 'USD') {
          return sum + (sale.total || 0);
        }
        return sum;
      }, 0);
      
      const dayRevenueIQD = daySales.reduce((sum, sale) => {
        // For revenue calculations, use sale.total based on sale currency, not payment amounts
        if (sale.currency === 'IQD') {
          return sum + (sale.total || 0);
        } else if (sale.currency === 'USD') {
          // Convert USD sales to IQD equivalent for accurate IQD revenue totals
          const exchangeRate = sale.exchange_rates?.usd_to_iqd || 1440;
          return sum + ((sale.total || 0) * exchangeRate);
        }
        return sum;
      }, 0);
      
      let dayProfitUSD = 0;
      let dayProfitIQD = 0;
      daySales.forEach(sale => {
        if (sale.items) {
          sale.items.forEach(item => {
            const buyingPrice = item.buying_price || 0;
            const sellingPrice = item.selling_price || item.buying_price || 0;
            const quantity = item.quantity || 1;
            const productCurrency = item.product_currency || 'IQD';
            const saleCurrency = sale.currency || 'USD';
            
            // CRITICAL FIX: selling_price is stored in product's original currency
            // Need to convert both prices to sale currency for proper profit calculation
            let sellingPriceInSaleCurrency = sellingPrice;
            let buyingPriceInSaleCurrency = buyingPrice;
            
            // Get exchange rates from sale or use current rates
            const saleExchangeRates = sale.exchange_rates || {
              usd_to_iqd: 1440,
              iqd_to_usd: 0.000694
            };
            
            // Convert selling price to sale currency if needed
            if (productCurrency !== saleCurrency) {
              if (saleCurrency === 'USD' && productCurrency === 'IQD') {
                sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.iqd_to_usd;
              } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
                sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.usd_to_iqd;
              }
            }
            
            // Convert buying price to sale currency if needed  
            if (productCurrency !== saleCurrency) {
              if (saleCurrency === 'USD' && productCurrency === 'IQD') {
                buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.iqd_to_usd;
              } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
                buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.usd_to_iqd;
              }
            }
            
            // Calculate profit correctly
            const profit = (sellingPriceInSaleCurrency - buyingPriceInSaleCurrency) * quantity;
            
            if (saleCurrency === 'USD') {
              dayProfitUSD += profit;
            } else {
              dayProfitIQD += profit;
            }
          });
        }
      });

      dailyData.push({
        date: date.toLocaleDateString(),
        revenueUSD: dayRevenueUSD,
        revenueIQD: dayRevenueIQD,
        profitUSD: dayProfitUSD,
        profitIQD: dayProfitIQD,
        transactions: daySales.length
      });
    }

    return {
      revenueUSD,
      revenueIQD,
      profitUSD,
      profitIQD,
      spendingUSD,
      spendingIQD,
      outstandingDebtUSD,
      outstandingDebtIQD,
      activeLoanUSD,
      activeLoanIQD,
      netProfitUSD: profitUSD - spendingUSD,
      netProfitIQD: profitIQD - spendingIQD,
      totalTransactions: filteredSales.length,
      averageOrderValue: filteredSales.length > 0 ? (revenueUSD + revenueIQD) / filteredSales.length : 0,
      topProducts,
      dailyData,
      productPerformance
    };
  }, [sales, buyingHistory, debts, personalLoans, timeRange]);

  // Chart configurations
  const getChartData = () => {
    switch (chartType) {
      case 'revenue':
        return {
          labels: analytics.dailyData.map(d => d.date),
          datasets: [
            {
              label: 'USD Revenue',
              data: analytics.dailyData.map(d => d.revenueUSD),
              borderColor: 'rgb(34, 197, 94)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              tension: 0.1,
            },
            {
              label: 'IQD Revenue',
              data: analytics.dailyData.map(d => d.revenueIQD),
              borderColor: 'rgb(168, 85, 247)',
              backgroundColor: 'rgba(168, 85, 247, 0.1)',
              tension: 0.1,
            }
          ]
        };
      
      case 'profit':
        return {
          labels: analytics.dailyData.map(d => d.date),
          datasets: [
            {
              label: 'USD Profit',
              data: analytics.dailyData.map(d => d.profitUSD),
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.1,
            },
            {
              label: 'IQD Profit',
              data: analytics.dailyData.map(d => d.profitIQD),
              borderColor: 'rgb(245, 101, 101)',
              backgroundColor: 'rgba(245, 101, 101, 0.1)',
              tension: 0.1,
            }
          ]
        };
      
      case 'transactions':
        return {
          labels: analytics.dailyData.map(d => d.date),
          datasets: [
            {
              label: 'Daily Transactions',
              data: analytics.dailyData.map(d => d.transactions),
              backgroundColor: 'rgba(147, 51, 234, 0.8)',
              borderColor: 'rgba(147, 51, 234, 1)',
              borderWidth: 1,
            }
          ]
        };
      
      default:
        return { labels: [], datasets: [] };
    }
  };

  const pieChartData = {
    labels: ['USD Revenue', 'IQD Revenue', 'USD Spending', 'IQD Spending'],
    datasets: [
      {
        data: [analytics.revenueUSD, analytics.revenueIQD, analytics.spendingUSD, analytics.spendingIQD],
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

  const topProductsChart = {
    labels: analytics.topProducts.slice(0, 5).map(([name]) => name.length > 15 ? name.substring(0, 15) + '...' : name),
    datasets: [
      {
        label: 'Revenue (Combined)',
        data: analytics.topProducts.slice(0, 5).map(([, data]) => data.revenueUSD + data.revenueIQD),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(245, 101, 101, 0.8)',
          'rgba(251, 191, 36, 0.8)',
        ],
        borderWidth: 1,
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              📊 {t?.advancedAnalytics || 'Advanced Analytics'}
            </h1>
            <p className="text-blue-100 text-lg">
              {t?.comprehensiveBusinessInsights || 'Comprehensive business insights and performance metrics'}
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex flex-col gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="24h" className="text-gray-900">Last 24 Hours</option>
              <option value="7days" className="text-gray-900">Last 7 Days</option>
              <option value="30days" className="text-gray-900">Last 30 Days</option>
              <option value="90days" className="text-gray-900">Last 90 Days</option>
              <option value="1year" className="text-gray-900">Last Year</option>
              <option value="all" className="text-gray-900">All Time</option>
            </select>
            
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="revenue" className="text-gray-900">Revenue Trend</option>
              <option value="profit" className="text-gray-900">Profit Trend</option>
              <option value="transactions" className="text-gray-900">Transaction Volume</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">💰</span>
            <span className="text-green-100 text-sm">{t?.totalRevenue || 'Total Revenue'}</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(analytics.revenueUSD, 'USD')}</div>
          <div className="text-xl font-bold">{formatCurrency(analytics.revenueIQD, 'IQD')}</div>
          <div className="text-green-100 text-sm">{timeRange.replace(/(\d+)/, '$1 ')}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">📈</span>
            <span className="text-blue-100 text-sm">{t?.netProfit || 'Net Profit'}</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(analytics.netProfitUSD, 'USD')}</div>
          <div className="text-xl font-bold">{formatCurrency(analytics.netProfitIQD, 'IQD')}</div>
          <div className="text-blue-100 text-sm">{t?.afterExpenses || 'After Expenses'}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">🛒</span>
            <span className="text-purple-100 text-sm">{t?.transactions || 'Transactions'}</span>
          </div>
          <div className="text-3xl font-bold">{analytics.totalTransactions.toLocaleString()}</div>
          <div className="text-purple-100 text-sm">{t?.averageValue || 'Avg Value'}: {formatCurrency(analytics.averageOrderValue)}</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">💳</span>
            <span className="text-yellow-100 text-sm">{t?.outstandingDebts || 'Outstanding Debts'}</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(analytics.outstandingDebtUSD, 'USD')}</div>
          <div className="text-xl font-bold">{formatCurrency(analytics.outstandingDebtIQD, 'IQD')}</div>
          <div className="text-yellow-100 text-sm">{t?.customerDebts || 'Customer Debts'}</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Trend Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            📊 {chartType === 'revenue' ? (t?.revenueTrend || 'Revenue Trend') : 
                chartType === 'profit' ? (t?.profitTrend || 'Profit Trend') : 
                (t?.transactionTrend || 'Transaction Trend')}
          </h3>
          <div className="h-80">
            {chartType === 'transactions' ? (
              <Bar data={getChartData()} options={{ responsive: true, maintainAspectRatio: false }} />
            ) : (
              <Line data={getChartData()} options={{ responsive: true, maintainAspectRatio: false }} />
            )}
          </div>
        </div>

        {/* Financial Overview Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            🥧 {t?.financialBreakdown || 'Financial Breakdown'}
          </h3>
          <div className="h-80">
            <Pie data={pieChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            🏆 {t?.topProducts || 'Top Products'}
          </h3>
          <div className="h-80">
            <Bar data={topProductsChart} options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              indexAxis: 'y',
            }} />
          </div>
        </div>

        {/* Business Health Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            🏥 {t?.businessHealth || 'Business Health'}
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">{t?.currentBalance || 'Current Balance'}:</span>
              <div className="text-right">
                <div className="font-bold text-green-600">{formatCurrency(balances.usd_balance || 0, 'USD')}</div>
                <div className="font-bold text-purple-600">{formatCurrency(balances.iqd_balance || 0, 'IQD')}</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">{t?.activeLoans || 'Active Loans'}:</span>
              <div className="text-right">
                <div className="font-bold text-red-600">{formatCurrency(analytics.activeLoanUSD, 'USD')}</div>
                <div className="font-bold text-red-600">{formatCurrency(analytics.activeLoanIQD, 'IQD')}</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">{t?.profitMargin || 'Profit Margin'}:</span>
              <div className="text-right">
                <div className="font-bold text-blue-600">
                  {analytics.revenueUSD > 0 ? ((analytics.profitUSD / analytics.revenueUSD) * 100).toFixed(1) : 0}% USD
                </div>
                <div className="font-bold text-indigo-600">
                  {analytics.revenueIQD > 0 ? ((analytics.profitIQD / analytics.revenueIQD) * 100).toFixed(1) : 0}% IQD
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">{t?.cashFlow || 'Cash Flow'}:</span>
              <div className="text-right">
                <div className={`font-bold ${analytics.netProfitUSD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(analytics.netProfitUSD, 'USD')}
                </div>
                <div className={`font-bold ${analytics.netProfitIQD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(analytics.netProfitIQD, 'IQD')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Product Performance */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          📋 {t?.detailedProductPerformance || 'Detailed Product Performance'}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-3">{t?.product || 'Product'}</th>
                <th className="text-center p-3">{t?.quantity || 'Qty'}</th>
                <th className="text-right p-3">{t?.revenueUSD || 'Revenue USD'}</th>
                <th className="text-right p-3">{t?.revenueIQD || 'Revenue IQD'}</th>
                <th className="text-right p-3">{t?.profitUSD || 'Profit USD'}</th>
                <th className="text-right p-3">{t?.profitIQD || 'Profit IQD'}</th>
              </tr>
            </thead>
            <tbody>
              {analytics.topProducts.slice(0, 10).map(([name, data], idx) => (
                <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="p-3 font-medium">{name}</td>
                  <td className="p-3 text-center">{data.quantity}</td>
                  <td className="p-3 text-right">{formatCurrency(data.revenueUSD, 'USD')}</td>
                  <td className="p-3 text-right">{formatCurrency(data.revenueIQD, 'IQD')}</td>
                  <td className="p-3 text-right text-green-600">{formatCurrency(data.profitUSD, 'USD')}</td>
                  <td className="p-3 text-right text-green-600">{formatCurrency(data.profitIQD, 'IQD')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
