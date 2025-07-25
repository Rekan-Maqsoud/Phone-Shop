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
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { formatCurrency } from '../utils/chartUtils';
import { EXCHANGE_RATES } from '../utils/exchangeRates';
import { Icon } from '../utils/icons';

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
  Filler
);

export default function AdvancedAnalytics({ admin, t }) {
  const { products, accessories, sales, debts, buyingHistory } = useData();
  const [timeRange, setTimeRange] = useState('30days');
  const [viewMode, setViewMode] = useState('overview');
  const [balances, setBalances] = useState({ usd_balance: 0, iqd_balance: 0 });
  const [totalProfitWithIncentives, setTotalProfitWithIncentives] = useState({ USD: 0, IQD: 0 });

  const fetchBalances = async () => {
    try {
      if (window.api?.getBalances) {
        const balanceData = await window.api.getBalances();
        setBalances(balanceData || { usd_balance: 0, iqd_balance: 0 });
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  const fetchTotalProfitWithIncentives = async () => {
    try {
      if (window.api?.getTotalProfitWithIncentives) {
        const profitData = await window.api.getTotalProfitWithIncentives();
        setTotalProfitWithIncentives(profitData || { USD: 0, IQD: 0 });
      }
    } catch (error) {
      console.error('Error fetching total profit with incentives:', error);
    }
  };

  useEffect(() => {
    fetchBalances();
    fetchTotalProfitWithIncentives();
  }, [sales, debts]);

  // Calculate business metrics
  const businessMetrics = useMemo(() => {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Filter sales by time range (only include paid sales for revenue calculations)
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      const isInRange = saleDate >= startDate;
      
      // If it's a debt sale, check if it's paid
      if (sale.is_debt) {
        const debt = debts.find(d => d.sale_id === sale.id);
        return isInRange && debt && debt.paid_at;
      }
      
      return isInRange;
    });

    const filteredPurchases = buyingHistory.filter(purchase => 
      new Date(purchase.created_at) >= startDate
    );

    // Revenue and profit calculations based on actual sales
    let revenueUSD = 0;
    let revenueIQD = 0;
    let profitUSD = 0;
    let profitIQD = 0;

    filteredSales.forEach(sale => {
      // Calculate revenue based on payment received
      if (sale.multi_currency_payment) {
        revenueUSD += sale.multi_currency_payment.usd_amount || 0;
        revenueIQD += sale.multi_currency_payment.iqd_amount || 0;
      } else {
        const saleTotal = sale.total || 0;
        if (sale.currency === 'USD') {
          revenueUSD += saleTotal;
        } else {
          revenueIQD += saleTotal;
        }
      }

      // Calculate profit from actual items sold
      if (sale.items && Array.isArray(sale.items)) {
        let totalBuyingCostUSD = 0;
        let totalBuyingCostIQD = 0;

        sale.items.forEach(item => {
          const qty = item.quantity || 1;
          const buyingPrice = item.buying_price || 0;
          const itemCurrency = item.product_currency || 
                             item.product_currency_from_table || 
                             item.accessory_currency_from_table || 
                             'IQD';

          if (itemCurrency === 'USD') {
            totalBuyingCostUSD += buyingPrice * qty;
          } else {
            totalBuyingCostIQD += buyingPrice * qty;
          }
        });

        // Calculate actual profit based on payment received minus buying costs
        if (sale.multi_currency_payment) {
          profitUSD += (sale.multi_currency_payment.usd_amount || 0) - totalBuyingCostUSD;
          profitIQD += (sale.multi_currency_payment.iqd_amount || 0) - totalBuyingCostIQD;
        } else {
          const saleTotal = sale.total || 0;
          if (sale.currency === 'USD') {
            const totalBuyingInUSD = totalBuyingCostUSD + (totalBuyingCostIQD * (sale.exchange_rate_iqd_to_usd || 0.000694));
            profitUSD += saleTotal - totalBuyingInUSD;
          } else {
            const totalBuyingInIQD = totalBuyingCostIQD + (totalBuyingCostUSD * (sale.exchange_rate_usd_to_iqd || 1440));
            profitIQD += saleTotal - totalBuyingInIQD;
          }
        }
      }
    });

    // Cost calculations for operational costs (buying history)
    const costUSD = filteredPurchases
      .filter(purchase => purchase.currency === 'USD')
      .reduce((sum, purchase) => sum + (purchase.total_price || purchase.amount || 0), 0);

    const costIQD = filteredPurchases
      .filter(purchase => purchase.currency === 'IQD')
      .reduce((sum, purchase) => sum + (purchase.total_price || purchase.amount || 0), 0);

    // Outstanding debts
    const outstandingUSD = sales
      .filter(sale => sale.is_debt && sale.currency === 'USD')
      .filter(sale => {
        const debt = debts.find(d => d.sale_id === sale.id);
        return !debt || !debt.paid_at;
      })
      .reduce((sum, sale) => sum + (sale.total || 0), 0);

    const outstandingIQD = sales
      .filter(sale => sale.is_debt && sale.currency === 'IQD')
      .filter(sale => {
        const debt = debts.find(d => d.sale_id === sale.id);
        return !debt || !debt.paid_at;
      })
      .reduce((sum, sale) => sum + (sale.total || 0), 0);

    // Product performance with actual profit calculations
    const productPerformance = {};
    filteredSales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          const name = item.name || 'Unknown Product';
          if (!productPerformance[name]) {
            productPerformance[name] = {
              quantity: 0,
              revenue: 0,
              profit: 0,
              sales: 0
            };
          }
          
          const qty = item.quantity || 1;
          const sellingPrice = item.selling_price || 0;
          const buyingPrice = item.buying_price || 0;
          
          productPerformance[name].quantity += qty;
          productPerformance[name].revenue += sellingPrice * qty;
          productPerformance[name].profit += (sellingPrice - buyingPrice) * qty;
          productPerformance[name].sales += 1;
        });
      }
    });

    // Top performing products based on profit
    const topProducts = Object.entries(productPerformance)
      .sort(([,a], [,b]) => b.profit - a.profit)
      .slice(0, 10);

    // Daily breakdown for charts
    const days = timeRange === '7days' ? 7 : timeRange === '90days' ? 90 : 30;
    const dailyData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const daySales = filteredSales.filter(sale => 
        sale.created_at.startsWith(dateStr)
      );
      
      const dayRevenueUSD = daySales
        .filter(sale => sale.currency === 'USD')
        .reduce((sum, sale) => sum + (sale.total || 0), 0);
      
      const dayRevenueIQD = daySales
        .filter(sale => sale.currency === 'IQD')
        .reduce((sum, sale) => sum + (sale.total || 0), 0);

      dailyData.push({
        date: date.toLocaleDateString(),
        dateStr,
        revenueUSD: dayRevenueUSD,
        revenueIQD: dayRevenueIQD,
        transactions: daySales.length
      });
    }

    // Stock analysis
    const lowStockItems = products.filter(p => p.stock <= 5 && !p.archived);
    const highValueStock = products.filter(p => p.stock > 0 && !p.archived)
      .sort((a, b) => (b.selling_price * b.stock) - (a.selling_price * a.stock))
      .slice(0, 10);

    return {
      revenueUSD,
      revenueIQD,
      profitUSD,
      profitIQD,
      costUSD,
      costIQD,
      outstandingUSD,
      outstandingIQD,
      totalTransactions: filteredSales.length,
      averageOrderValue: filteredSales.length > 0 ? 
        (revenueUSD + (revenueIQD / EXCHANGE_RATES.usd_to_iqd)) / filteredSales.length : 0,
      topProducts,
      dailyData,
      lowStockItems,
      highValueStock,
      profitMarginUSD: revenueUSD > 0 ? (profitUSD / revenueUSD) * 100 : 0,
      profitMarginIQD: revenueIQD > 0 ? (profitIQD / revenueIQD) * 100 : 0
    };
  }, [sales, buyingHistory, debts, products, timeRange]);

  // Chart configurations
  const revenueChartData = {
    labels: businessMetrics.dailyData.map(d => d.date),
    datasets: [
      {
        label: 'USD Revenue',
        data: businessMetrics.dailyData.map(d => d.revenueUSD),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1,
      },
      {
        label: 'IQD Revenue',
        data: businessMetrics.dailyData.map(d => d.revenueIQD),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.1,
      }
    ]
  };

  const transactionChartData = {
    labels: businessMetrics.dailyData.map(d => d.date),
    datasets: [
      {
        label: 'Daily Transactions',
        data: businessMetrics.dailyData.map(d => d.transactions),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      }
    ]
  };

  const financialBreakdownData = {
    labels: ['USD Revenue', 'IQD Revenue', 'USD Costs', 'IQD Costs'],
    datasets: [
      {
        data: [
          businessMetrics.revenueUSD, 
          businessMetrics.revenueIQD / 1000, // Scale down for better visualization
          businessMetrics.costUSD,
          businessMetrics.costIQD / 1000
        ],
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

  const topProductsChartData = {
    labels: businessMetrics.topProducts.slice(0, 5).map(([name]) => 
      name.length > 15 ? name.substring(0, 15) + '...' : name
    ),
    datasets: [
      {
        label: 'Revenue',
        data: businessMetrics.topProducts.slice(0, 5).map(([, data]) => data.revenue),
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
    <div className="w-full h-full p-8 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Icon name="barChart3" size={32} />
              {t?.businessAnalytics}
            </h1>
            <p className="text-purple-100 text-lg">
              {t?.practicalInsights}
            </p>
          </div>
          
          {/* Time Range Control */}
          <div className="flex gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="7days" className="text-gray-900">{t?.last7Days}</option>
              <option value="30days" className="text-gray-900">{t?.last30Days}</option>
              <option value="90days" className="text-gray-900">{t?.last90Days}</option>
            </select>
            
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="overview" className="text-gray-900">{t?.overview}</option>
              <option value="products" className="text-gray-900">{t?.productsView}</option>
              <option value="inventory" className="text-gray-900">{t?.inventoryView}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-3">
            <Icon name="dollarSign" size={24} />
            <span className="text-green-100 text-sm font-medium">{t?.totalRevenue}</span>
          </div>
          <div className="text-2xl font-bold mb-1">{formatCurrency(businessMetrics.revenueUSD, 'USD')}</div>
          <div className="text-xl font-bold mb-2">{formatCurrency(businessMetrics.revenueIQD, 'IQD')}</div>
          <div className="text-green-100 text-sm">
            {timeRange === '7days' ? t?.last7Days : timeRange === '90days' ? t?.last90Days : t?.last30Days}
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-3">
            <Icon name="trendingUp" size={24} />
            <span className="text-blue-100 text-sm font-medium">{t?.netProfit}</span>
          </div>
          <div className="text-2xl font-bold mb-1">{formatCurrency(businessMetrics.profitUSD, 'USD')}</div>
          <div className="text-xl font-bold mb-2">{formatCurrency(businessMetrics.profitIQD, 'IQD')}</div>
          <div className="text-blue-100 text-sm">
            {t?.margin}: {businessMetrics.profitMarginUSD.toFixed(1)}% / {businessMetrics.profitMarginIQD.toFixed(1)}%
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-3">
            <Icon name="shoppingCart" size={24} />
            <span className="text-purple-100 text-sm font-medium">{t?.transactions}</span>
          </div>
          <div className="text-3xl font-bold mb-2">{businessMetrics.totalTransactions.toLocaleString()}</div>
          <div className="text-purple-100 text-sm">
            {t?.avg}: {formatCurrency(businessMetrics.averageOrderValue, 'USD')}
          </div>
        </div>

        {/* Outstanding Debts */}
        <div className="bg-gradient-to-br from-red-400 to-pink-500 rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-3">
            <Icon name="alertTriangle" size={24} />
            <span className="text-red-100 text-sm font-medium">{t?.outstandingDebts}</span>
          </div>
          <div className="text-2xl font-bold mb-1">{formatCurrency(businessMetrics.outstandingUSD, 'USD')}</div>
          <div className="text-xl font-bold mb-2">{formatCurrency(businessMetrics.outstandingIQD, 'IQD')}</div>
          <div className="text-red-100 text-sm">{t?.needsCollection}</div>
        </div>
      </div>

      {/* Charts Section */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Icon name="barChart3" size={20} />
              {t?.revenueTrend}
            </h3>
            <div className="h-80">
              <Line data={revenueChartData} options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }} />
            </div>
          </div>

          {/* Transaction Volume */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Icon name="package" size={20} />
              {t?.transactionVolume}
            </h3>
            <div className="h-80">
              <Bar data={transactionChartData} options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Products View */}
      {viewMode === 'products' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Icon name="award" size={20} />
              {t?.topSellingProducts}
            </h3>
            <div className="h-80">
              <Bar data={topProductsChartData} options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                indexAxis: 'y',
              }} />
            </div>
          </div>

          {/* Product Performance Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Icon name="fileText" size={20} />
              {t?.productPerformance}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-2">{t?.product}</th>
                    <th className="text-center p-2">{t?.sold}</th>
                    <th className="text-right p-2">{t?.revenue}</th>
                  </tr>
                </thead>
                <tbody>
                  {businessMetrics.topProducts.slice(0, 8).map(([name, data], idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="p-2 font-medium">{name.length > 20 ? name.substring(0, 20) + '...' : name}</td>
                      <td className="p-2 text-center">{data.quantity}</td>
                      <td className="p-2 text-right">{formatCurrency(data.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Inventory View */}
      {viewMode === 'inventory' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Low Stock Alert */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Icon name="alertTriangle" size={20} />
              {t?.lowStockAlert} 
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {businessMetrics.lowStockItems.length}
              </span>
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {businessMetrics.lowStockItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">{t?.noLowStock}</p>
              ) : (
                businessMetrics.lowStockItems.map((product, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{product.name}</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{product.brand || t?.noBrand}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-red-600 font-bold">{product.stock} {t?.left}</div>
                      <div className="text-sm text-gray-500">{formatCurrency(product.selling_price, product.currency)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* High Value Inventory */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Icon name="star" size={20} />
              {t?.highValueStock}
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {businessMetrics.highValueStock.map((product, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{product.name}</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{product.brand || t?.noBrand}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-blue-600 font-bold">
                      {formatCurrency(product.selling_price * product.stock, product.currency)}
                    </div>
                    <div className="text-sm text-gray-500">{product.stock} {t?.units}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Financial Overview */}
      <div className="grid grid-cols-3 gap-6">
        {/* Financial Breakdown Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Icon name="dollarSign" size={20} />
            {t?.financialBreakdown}
          </h3>
          <div className="h-64">
            <Doughnut data={financialBreakdownData} options={{ 
              responsive: true, 
              maintainAspectRatio: false 
            }} />
          </div>
        </div>

        {/* Current Financial Position */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Icon name="building2" size={20} />
            {t?.currentPosition}
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">{t?.cashOnHand}:</span>
              <div className="text-right">
                <div className="font-bold text-green-600">{formatCurrency(balances.usd_balance || 0, 'USD')}</div>
                <div className="font-bold text-green-600">{formatCurrency(balances.iqd_balance || 0, 'IQD')}</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">{t?.totalProfit} (Sales):</span>
              <div className="text-right">
                <div className="font-bold text-blue-600">{formatCurrency(businessMetrics.profitUSD, 'USD')}</div>
                <div className="font-bold text-blue-600">{formatCurrency(businessMetrics.profitIQD, 'IQD')}</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">{t?.totalProfit} (+ Incentives):</span>
              <div className="text-right">
                <div className="font-bold text-purple-600">{formatCurrency(totalProfitWithIncentives.USD, 'USD')}</div>
                <div className="font-bold text-purple-600">{formatCurrency(totalProfitWithIncentives.IQD, 'IQD')}</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">{t?.moneyOwed}:</span>
              <div className="text-right">
                <div className="font-bold text-red-600">{formatCurrency(businessMetrics.outstandingUSD, 'USD')}</div>
                <div className="font-bold text-red-600">{formatCurrency(businessMetrics.outstandingIQD, 'IQD')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Icon name="zap" size={20} />
            {t?.quickActions}
          </h3>
          <div className="space-y-3">
            <button 
              onClick={() => admin.setActiveSection('customerDebts')}
              className="w-full p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-lg border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors text-left flex items-center gap-2"
            >
              <Icon name="creditCard" size={16} />
              <div>
                <div className="font-medium">{t?.collectDebts}</div>
                <div className="text-sm opacity-75 flex flex-col gap-1">
                  <div>{formatCurrency(businessMetrics.outstandingUSD, 'USD')}</div>
                  <div>{formatCurrency(businessMetrics.outstandingIQD, 'IQD')}</div>
                </div>
              </div>
            </button>
            
            <button 
              onClick={() => admin.setActiveSection('active')}
              className="w-full p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-left flex items-center gap-2"
            >
              <Icon name="package" size={16} />
              <div>
                <div className="font-medium">{t?.restockItems}</div>
                <div className="text-sm opacity-75">{businessMetrics.lowStockItems.length} items need attention</div>
              </div>
            </button>
            
            <button 
              onClick={() => admin.setActiveSection('monthlyReports')}
              className="w-full p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left flex items-center gap-2"
            >
              <Icon name="barChart3" size={16} />
              <div>
                <div className="font-medium">{t?.viewReports}</div>
                <div className="text-sm opacity-75">{t?.comprehensiveAnalysis}</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
