import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocale } from '../contexts/LocaleContext';
import { EXCHANGE_RATES } from '../utils/exchangeRates';

const formatCurrency = (amount, currency = 'USD') => {
  if (currency === 'IQD') {
    return `${Math.round(amount).toLocaleString()} IQD`;
  }
  return `$${Number(amount).toFixed(2)}`;
};

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const AdvancedProgressBar = ({ value, max, color, label, showPercentage = true }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        {showPercentage && (
          <span className="text-gray-800 dark:text-gray-200 font-semibold">
            {percentage.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, change, changeType, icon, gradient, children }) => (
  <div className={`rounded-2xl p-6 text-white shadow-xl ${gradient}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="text-3xl">{icon}</div>
      {change !== undefined && (
        <div className={`text-sm px-2 py-1 rounded-full ${
          changeType === 'positive' 
            ? 'bg-green-500/20 text-green-100' 
            : changeType === 'negative'
            ? 'bg-red-500/20 text-red-100'
            : 'bg-gray-500/20 text-gray-100'
        }`}>
          {changeType === 'positive' ? '↗' : changeType === 'negative' ? '↘' : '→'} {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
    <h3 className="text-lg font-semibold mb-2 opacity-90">{title}</h3>
    <div className="text-3xl font-bold mb-2">{value}</div>
    {children}
  </div>
);

const TrendChart = ({ data, label, color = 'blue' }) => {
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  
  const colorClasses = {
    blue: { 
      bg: 'bg-blue-500', 
      hover: 'hover:bg-blue-600',
      shadow: 'shadow-blue-200'
    },
    indigo: { 
      bg: 'bg-indigo-500', 
      hover: 'hover:bg-indigo-600',
      shadow: 'shadow-indigo-200'
    },
    green: { 
      bg: 'bg-green-500', 
      hover: 'hover:bg-green-600',
      shadow: 'shadow-green-200'
    },
    purple: { 
      bg: 'bg-purple-500', 
      hover: 'hover:bg-purple-600',
      shadow: 'shadow-purple-200'
    },
    orange: { 
      bg: 'bg-orange-500', 
      hover: 'hover:bg-orange-600',
      shadow: 'shadow-orange-200'
    }
  };
  
  const colorClass = colorClasses[color] || colorClasses.blue;
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700`}>
      <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{label}</h4>
      <div className="h-32 flex items-end justify-center space-x-1">
        {data.map((point, index) => {
          const height = ((point.value - min) / range) * 100;
          return (
            <div key={index} className="flex-1 max-w-8 flex flex-col items-center group relative">
              <div 
                className={`w-full ${colorClass.bg} ${colorClass.hover} rounded-t transition-all duration-500 cursor-pointer transform group-hover:scale-105 ${colorClass.shadow}`}
                style={{ 
                  height: `${Math.max(height, 5)}%`,
                  minHeight: '2px'
                }}
                title={`${point.label}: ${formatNumber(point.value)}`}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 whitespace-nowrap transform rotate-45 origin-left max-w-6 overflow-hidden">
                {point.label.length > 3 ? point.label.slice(0, 3) : point.label}
              </span>
              
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                {point.label}: {formatNumber(point.value)}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Chart Legend */}
      <div className="mt-4 flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Min: {formatNumber(min)}</span>
        <span>Max: {formatNumber(max)}</span>
      </div>
    </div>
  );
};

const ComparisonMetric = ({ current, previous, label, formatter = formatNumber }) => {
  const change = previous ? ((current - previous) / previous) * 100 : 0;
  const changeType = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
  
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{formatter(current)}</p>
      </div>
      <div className={`text-right ${
        changeType === 'positive' ? 'text-green-600' : 
        changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
      }`}>
        <p className="text-sm">vs. Last Month</p>
        <p className="font-semibold">
          {changeType === 'positive' ? '+' : ''}{change.toFixed(1)}%
        </p>
      </div>
    </div>
  );
};

export default function MonthlyReportsSection({ admin, t, showConfirm }) {
  const { sales, products, accessories, debts, companyDebts, buyingHistory, personalLoans } = useData();
  const { locale } = useLocale();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [detailedReport, setDetailedReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'sales', 'inventory', 'financial'

  // Generate detailed report for selected month
  const generateDetailedReport = useCallback(async (monthYear) => {
    setIsGenerating(true);
    try {
      const [year, month] = monthYear.split('-').map(Number);
      
      if (window.api?.getMonthlyReport) {
        const report = await window.api.getMonthlyReport(year, month);
        
        // Enhance with additional calculations
        const enhancedReport = enhanceReportData(report, {
          sales, products, accessories, debts, companyDebts, 
          buyingHistory, personalLoans, year, month
        });
        
        setDetailedReport(enhancedReport);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      admin.setToast?.('Failed to generate detailed report', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [sales, products, accessories, debts, companyDebts, buyingHistory, personalLoans, admin]);

  // Enhanced report data calculation
  const enhanceReportData = (baseReport, dataContext) => {
    const { sales, products, accessories, debts, companyDebts, buyingHistory, personalLoans, year, month } = dataContext;
    
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    const startDate = `${monthStr}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    // Filter data for this month
    const monthSales = sales.filter(s => s.created_at?.startsWith(monthStr));
    const monthBuying = buyingHistory.filter(b => b.date?.startsWith(monthStr));
    const monthDebts = debts.filter(d => d.created_at?.startsWith(monthStr));
    const monthCompanyDebts = companyDebts.filter(cd => cd.created_at?.startsWith(monthStr));
    const monthLoans = personalLoans.filter(pl => pl.created_at?.startsWith(monthStr));
    
    // Calculate detailed metrics
    const salesByDay = calculateDailySales(monthSales);
    const topProducts = calculateTopProducts(monthSales);
    const customerInsights = calculateCustomerInsights(monthSales);
    const profitAnalysis = calculateProfitAnalysis(monthSales, monthBuying);
    const cashFlow = calculateCashFlow(monthSales, monthBuying, monthLoans, monthCompanyDebts);
    const inventoryTurnover = calculateInventoryTurnover(monthSales, products, accessories);
    const debtAnalysis = calculateDebtAnalysis(monthDebts, monthCompanyDebts);
    const marketingEfficiency = calculateMarketingEfficiency(monthSales);
    const operationalMetrics = calculateOperationalMetrics(monthSales, monthBuying);
    
    return {
      ...baseReport,
      enhanced: {
        salesByDay,
        topProducts,
        customerInsights,
        profitAnalysis,
        cashFlow,
        inventoryTurnover,
        debtAnalysis,
        marketingEfficiency,
        operationalMetrics,
        monthSales,
        monthBuying,
        monthDebts,
        monthCompanyDebts,
        monthLoans
      }
    };
  };

  // Daily sales calculation
  const calculateDailySales = (monthSales) => {
    const dailyData = {};
    monthSales.forEach(sale => {
      const day = sale.created_at?.split(' ')[0] || sale.created_at?.split('T')[0];
      if (!dailyData[day]) {
        dailyData[day] = { 
          usd: 0, iqd: 0, count: 0, profit: 0,
          avgTransaction: 0, topSale: 0
        };
      }
      
      const amount = sale.total || 0;
      if (sale.currency === 'IQD') {
        dailyData[day].iqd += amount;
      } else {
        dailyData[day].usd += amount;
      }
      
      dailyData[day].count++;
      dailyData[day].profit += calculateSaleProfit(sale);
      dailyData[day].topSale = Math.max(dailyData[day].topSale, amount);
    });
    
    // Calculate averages
    Object.keys(dailyData).forEach(day => {
      const data = dailyData[day];
      data.avgTransaction = data.count > 0 ? (data.usd + data.iqd * EXCHANGE_RATES.IQD_TO_USD) / data.count : 0;
    });
    
    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Top products calculation
  const calculateTopProducts = (monthSales) => {
    const productData = {};
    
    monthSales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          const key = `${item.name}-${item.currency || sale.currency}`;
          if (!productData[key]) {
            productData[key] = {
              name: item.name,
              currency: item.currency || sale.currency,
              quantity: 0,
              revenue: 0,
              profit: 0,
              transactions: 0,
              avgPrice: 0
            };
          }
          
          const quantity = item.quantity || 1;
          const price = item.price || 0;
          const profit = (item.profit || 0) * quantity;
          
          productData[key].quantity += quantity;
          productData[key].revenue += price * quantity;
          productData[key].profit += profit;
          productData[key].transactions++;
        });
      }
    });
    
    // Calculate averages and sort
    return Object.values(productData)
      .map(product => ({
        ...product,
        avgPrice: product.quantity > 0 ? product.revenue / product.quantity : 0,
        profitMargin: product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  // Customer insights calculation
  const calculateCustomerInsights = (monthSales) => {
    const customerData = {};
    let totalCustomers = 0;
    let newCustomers = 0;
    
    monthSales.forEach(sale => {
      const customer = sale.customer_name || 'Walk-in Customer';
      if (!customerData[customer]) {
        customerData[customer] = {
          name: customer,
          transactions: 0,
          totalSpent: 0,
          avgTransaction: 0,
          currency: sale.currency,
          lastPurchase: sale.created_at,
          isDebt: false
        };
        if (customer !== 'Walk-in Customer') {
          totalCustomers++;
        }
      }
      
      customerData[customer].transactions++;
      customerData[customer].totalSpent += sale.total || 0;
      customerData[customer].isDebt = customerData[customer].isDebt || sale.is_debt;
      
      if (sale.created_at > customerData[customer].lastPurchase) {
        customerData[customer].lastPurchase = sale.created_at;
      }
    });
    
    // Calculate customer metrics
    const customers = Object.values(customerData);
    customers.forEach(customer => {
      customer.avgTransaction = customer.transactions > 0 ? customer.totalSpent / customer.transactions : 0;
    });
    
    const topCustomers = customers
      .filter(c => c.name !== 'Walk-in Customer')
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
    
    return {
      totalCustomers,
      newCustomers,
      topCustomers,
      avgTransactionValue: customers.length > 0 ? 
        customers.reduce((sum, c) => sum + c.avgTransaction, 0) / customers.length : 0,
      repeatCustomerRate: totalCustomers > 0 ? 
        (customers.filter(c => c.transactions > 1 && c.name !== 'Walk-in Customer').length / totalCustomers) * 100 : 0
    };
  };

  // Profit analysis calculation
  const calculateProfitAnalysis = (monthSales, monthBuying) => {
    let totalRevenue = { usd: 0, iqd: 0 };
    let totalCost = { usd: 0, iqd: 0 };
    let totalProfit = { usd: 0, iqd: 0 };
    
    // Calculate sales revenue and profit
    monthSales.forEach(sale => {
      const currency = sale.currency || 'USD';
      const amount = sale.total || 0;
      totalRevenue[currency.toLowerCase()] += amount;
      
      const saleProfit = calculateSaleProfit(sale);
      totalProfit[currency.toLowerCase()] += saleProfit;
    });
    
    // Calculate buying costs
    monthBuying.forEach(purchase => {
      const currency = purchase.currency || 'USD';
      const amount = purchase.total_price || 0;
      totalCost[currency.toLowerCase()] += amount;
    });
    
    // Calculate margins
    const usdMargin = totalRevenue.usd > 0 ? (totalProfit.usd / totalRevenue.usd) * 100 : 0;
    const iqdMargin = totalRevenue.iqd > 0 ? (totalProfit.iqd / totalRevenue.iqd) * 100 : 0;
    
    return {
      totalRevenue,
      totalCost,
      totalProfit,
      margins: { usd: usdMargin, iqd: iqdMargin },
      roi: {
        usd: totalCost.usd > 0 ? (totalProfit.usd / totalCost.usd) * 100 : 0,
        iqd: totalCost.iqd > 0 ? (totalProfit.iqd / totalCost.iqd) * 100 : 0
      }
    };
  };

  // Cash flow calculation
  const calculateCashFlow = (monthSales, monthBuying, monthLoans, monthCompanyDebts) => {
    let inflow = { usd: 0, iqd: 0 };
    let outflow = { usd: 0, iqd: 0 };
    
    // Sales inflow
    monthSales.forEach(sale => {
      if (!sale.is_debt) { // Only count paid sales
        const currency = sale.currency || 'USD';
        inflow[currency.toLowerCase()] += sale.total || 0;
      }
    });
    
    // Buying outflow
    monthBuying.forEach(purchase => {
      const currency = purchase.currency || 'USD';
      outflow[currency.toLowerCase()] += purchase.total_price || 0;
    });
    
    // Loans outflow
    monthLoans.forEach(loan => {
      outflow.usd += loan.usd_amount || 0;
      outflow.iqd += loan.iqd_amount || 0;
    });
    
    // Company debts outflow
    monthCompanyDebts.forEach(debt => {
      const currency = debt.currency || 'USD';
      outflow[currency.toLowerCase()] += debt.amount || 0;
    });
    
    return {
      inflow,
      outflow,
      netFlow: {
        usd: inflow.usd - outflow.usd,
        iqd: inflow.iqd - outflow.iqd
      }
    };
  };

  // Inventory turnover calculation
  const calculateInventoryTurnover = (monthSales, products, accessories) => {
    const productTurnover = {};
    const accessoryTurnover = {};
    
    // Calculate product turnover
    products.forEach(product => {
      const soldThisMonth = monthSales.reduce((total, sale) => {
        if (sale.items) {
          return total + sale.items.reduce((itemTotal, item) => {
            return item.name === product.name ? itemTotal + (item.quantity || 1) : itemTotal;
          }, 0);
        }
        return total;
      }, 0);
      
      productTurnover[product.name] = {
        currentStock: product.stock || 0,
        soldThisMonth,
        turnoverRate: product.stock > 0 ? soldThisMonth / product.stock : 0,
        daysToSellOut: soldThisMonth > 0 ? (product.stock / soldThisMonth) * 30 : Infinity
      };
    });
    
    // Calculate accessory turnover
    accessories.forEach(accessory => {
      const soldThisMonth = monthSales.reduce((total, sale) => {
        if (sale.items) {
          return total + sale.items.reduce((itemTotal, item) => {
            return item.name === accessory.name ? itemTotal + (item.quantity || 1) : itemTotal;
          }, 0);
        }
        return total;
      }, 0);
      
      accessoryTurnover[accessory.name] = {
        currentStock: accessory.stock || 0,
        soldThisMonth,
        turnoverRate: accessory.stock > 0 ? soldThisMonth / accessory.stock : 0,
        daysToSellOut: soldThisMonth > 0 ? (accessory.stock / soldThisMonth) * 30 : Infinity
      };
    });
    
    return { products: productTurnover, accessories: accessoryTurnover };
  };

  // Debt analysis calculation
  const calculateDebtAnalysis = (monthDebts, monthCompanyDebts) => {
    const customerDebtTotal = monthDebts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
    const companyDebtTotal = monthCompanyDebts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
    
    return {
      newCustomerDebt: customerDebtTotal,
      newCompanyDebt: companyDebtTotal,
      totalNewDebt: customerDebtTotal + companyDebtTotal,
      debtToSalesRatio: 0 // Will be calculated with sales data
    };
  };

  // Marketing efficiency calculation
  const calculateMarketingEfficiency = (monthSales) => {
    const brandPerformance = {};
    
    monthSales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          const brand = item.brand || 'Unknown';
          if (!brandPerformance[brand]) {
            brandPerformance[brand] = {
              revenue: 0,
              quantity: 0,
              transactions: 0,
              avgPrice: 0
            };
          }
          
          brandPerformance[brand].revenue += (item.price || 0) * (item.quantity || 1);
          brandPerformance[brand].quantity += item.quantity || 1;
          brandPerformance[brand].transactions++;
        });
      }
    });
    
    // Calculate averages
    Object.keys(brandPerformance).forEach(brand => {
      const data = brandPerformance[brand];
      data.avgPrice = data.quantity > 0 ? data.revenue / data.quantity : 0;
    });
    
    return brandPerformance;
  };

  // Operational metrics calculation
  const calculateOperationalMetrics = (monthSales, monthBuying) => {
    const totalTransactions = monthSales.length;
    const totalPurchases = monthBuying.length;
    
    // Calculate transaction frequency per day
    const daysInMonth = new Date().getDate(); // Current day for current month
    const avgTransactionsPerDay = totalTransactions / daysInMonth;
    const avgPurchasesPerDay = totalPurchases / daysInMonth;
    
    // Calculate efficiency metrics
    const avgItemsPerTransaction = monthSales.reduce((sum, sale) => {
      return sum + (sale.items ? sale.items.length : 0);
    }, 0) / (totalTransactions || 1);
    
    return {
      totalTransactions,
      totalPurchases,
      avgTransactionsPerDay,
      avgPurchasesPerDay,
      avgItemsPerTransaction,
      businessDaysActive: daysInMonth // Simplified
    };
  };

  // Helper function to calculate sale profit
  const calculateSaleProfit = (sale) => {
    if (!sale.items) return 0;
    return sale.items.reduce((total, item) => {
      const profit = item.profit || 0;
      const quantity = item.quantity || 1;
      return total + (profit * quantity);
    }, 0);
  };

  // Auto-generate report when month changes
  useEffect(() => {
    if (selectedMonth) {
      generateDetailedReport(selectedMonth);
    }
  }, [selectedMonth]); // Removed generateDetailedReport dependency to prevent unnecessary re-renders

  // Get available months for selection
  const availableMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    
    // Generate last 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({ value: monthStr, label: monthName });
    }
    
    return months;
  }, []);

  // Current month overview metrics
  const overviewMetrics = useMemo(() => {
    if (!detailedReport?.enhanced) return null;
    
    const { enhanced } = detailedReport;
    const { profitAnalysis, cashFlow, operationalMetrics, topProducts } = enhanced;
    
    return {
      totalRevenue: profitAnalysis.totalRevenue,
      totalProfit: profitAnalysis.totalProfit,
      netCashFlow: cashFlow.netFlow,
      transactionCount: operationalMetrics.totalTransactions,
      avgTransaction: operationalMetrics.totalTransactions > 0 ? 
        ((profitAnalysis.totalRevenue.usd + profitAnalysis.totalRevenue.iqd * EXCHANGE_RATES.IQD_TO_USD) / operationalMetrics.totalTransactions) : 0,
      topProduct: topProducts[0] || null,
      profitMargin: {
        usd: profitAnalysis.margins.usd,
        iqd: profitAnalysis.margins.iqd
      }
    };
  }, [detailedReport]);

  if (!detailedReport && isGenerating) {
    return (
      <div className="space-y-6">
        <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            📊 {t?.monthlyReports || 'Monthly Reports'}
          </h2>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-lg text-gray-600 dark:text-gray-400">
              Generating comprehensive report...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-6 border border-white/20">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              📊 {t?.monthlyReports || 'Monthly Reports'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Advanced analytics and insights for business performance tracking
            </p>
          </div>
          
          <div className="flex gap-4 items-center">
            {/* Month Selector */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableMonths.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            
            {/* View Mode Selector */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {[
                { key: 'overview', label: `📈 ${locale.reportsOverview}`, icon: '📈' },
                { key: 'sales', label: `💰 ${locale.reportsSales}`, icon: '💰' },
                { key: 'inventory', label: `📦 ${locale.reportsInventory}`, icon: '📦' },
                { key: 'financial', label: `💼 ${locale.reportsFinancial}`, icon: '💼' }
              ].map(mode => (
                <button
                  key={mode.key}
                  onClick={() => setViewMode(mode.key)}
                  className={`px-3 py-1 rounded text-sm font-medium transition ${
                    viewMode === mode.key
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {mode.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && overviewMetrics && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title={locale.monthlyTotalRevenue}
              value={`${formatCurrency(overviewMetrics.totalRevenue.usd, 'USD')} / ${formatCurrency(overviewMetrics.totalRevenue.iqd, 'IQD')}`}
              icon="💵"
              gradient="bg-gradient-to-br from-green-500 to-emerald-600"
            />
            
            <MetricCard
              title={locale.monthlyNetProfit}
              value={`${formatCurrency(overviewMetrics.totalProfit.usd, 'USD')} / ${formatCurrency(overviewMetrics.totalProfit.iqd, 'IQD')}`}
              icon="💎"
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            />
            
            <MetricCard
              title={locale.monthlyTransactions}
              value={formatNumber(overviewMetrics.transactionCount)}
              icon="🛒"
              gradient="bg-gradient-to-br from-purple-500 to-pink-600"
            />
            
            <MetricCard
              title={locale.monthlyAvgTransaction}
              value={formatCurrency(overviewMetrics.avgTransaction, 'USD')}
              icon="📊"
              gradient="bg-gradient-to-br from-orange-500 to-red-600"
            />
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Sales Trend */}
            {detailedReport.enhanced.salesByDay && (
              <TrendChart
                data={detailedReport.enhanced.salesByDay.map(day => ({
                  label: new Date(day.date).getDate().toString(),
                  value: day.usd + (day.iqd * EXCHANGE_RATES.IQD_TO_USD)
                }))}
                label="Daily Sales Trend (USD Equivalent)"
                color="blue"
              />
            )}
            
            {/* Top Products */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Top Products</h4>
              <div className="space-y-3">
                {detailedReport.enhanced.topProducts.slice(0, 5).map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{product.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {product.quantity} units • {product.profitMargin.toFixed(1)}% margin
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {formatCurrency(product.revenue, product.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Profit Margins</h4>
              <div className="space-y-3">
                <AdvancedProgressBar
                  value={overviewMetrics.profitMargin.usd}
                  max={100}
                  color="bg-green-500"
                  label="USD Margin"
                />
                <AdvancedProgressBar
                  value={overviewMetrics.profitMargin.iqd}
                  max={100}
                  color="bg-orange-500"
                  label="IQD Margin"
                />
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Cash Flow</h4>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(overviewMetrics.netCashFlow.usd, 'USD')}
                </p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(overviewMetrics.netCashFlow.iqd, 'IQD')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Net Flow This Month</p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Customer Insights</h4>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-purple-600">
                  {detailedReport.enhanced.customerInsights.totalCustomers}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Customers</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {detailedReport.enhanced.customerInsights.repeatCustomerRate.toFixed(1)}% Repeat Rate
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sales Mode */}
      {viewMode === 'sales' && detailedReport?.enhanced && (
        <div className="space-y-6">
          {/* Sales Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Performance Chart */}
            <TrendChart
              data={detailedReport.enhanced.salesByDay.map(day => ({
                label: new Date(day.date).getDate().toString(),
                value: day.count
              }))}
              label="Daily Transaction Count"
              color="indigo"
            />
            
            {/* Revenue Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Revenue Breakdown</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">USD Sales</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(detailedReport.enhanced.profitAnalysis.totalRevenue.usd, 'USD')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">IQD Sales</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(detailedReport.enhanced.profitAnalysis.totalRevenue.iqd, 'IQD')}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between items-center">
                  <span className="font-medium text-gray-800 dark:text-gray-200">Total (USD Equiv.)</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(
                      detailedReport.enhanced.profitAnalysis.totalRevenue.usd + 
                      (detailedReport.enhanced.profitAnalysis.totalRevenue.iqd * EXCHANGE_RATES.IQD_TO_USD),
                      'USD'
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Customers and Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Customers */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Top Customers</h4>
              <div className="space-y-3">
                {detailedReport.enhanced.customerInsights.topCustomers.slice(0, 8).map((customer, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{customer.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {customer.transactions} transactions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {formatCurrency(customer.totalSpent, customer.currency)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Avg: {formatCurrency(customer.avgTransaction, customer.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Product Performance */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Product Performance</h4>
              <div className="space-y-3">
                {detailedReport.enhanced.topProducts.slice(0, 8).map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{product.name}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{product.quantity} sold</span>
                        <span>{product.transactions} orders</span>
                        <span className={`${product.profitMargin > 20 ? 'text-green-600' : product.profitMargin > 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {product.profitMargin.toFixed(1)}% margin
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {formatCurrency(product.revenue, product.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Mode */}
      {viewMode === 'inventory' && detailedReport?.enhanced && (
        <div className="space-y-6">
          {/* Inventory Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title={locale.monthlyProductLines}
              value={Object.keys(detailedReport.enhanced.inventoryTurnover.products).length}
              icon="📦"
              gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
            />
            
            <MetricCard
              title={locale.monthlyAccessories}
              value={Object.keys(detailedReport.enhanced.inventoryTurnover.accessories).length}
              icon="🎧"
              gradient="bg-gradient-to-br from-purple-500 to-violet-600"
            />
            
            <MetricCard
              title={locale.monthlyTotalItemsSold}
              value={detailedReport.enhanced.topProducts.reduce((sum, p) => sum + p.quantity, 0)}
              icon="📈"
              gradient="bg-gradient-to-br from-green-500 to-teal-600"
            />
          </div>

          {/* Inventory Turnover Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fast Moving Products */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                🚀 Fast Moving Products
              </h4>
              <div className="space-y-3">
                {Object.entries(detailedReport.enhanced.inventoryTurnover.products)
                  .filter(([_, data]) => data.turnoverRate > 0.1)
                  .sort((a, b) => b[1].turnoverRate - a[1].turnoverRate)
                  .slice(0, 8)
                  .map(([name, data], index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {data.soldThisMonth} sold / {data.currentStock} in stock
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          {(data.turnoverRate * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {data.daysToSellOut === Infinity ? '∞' : Math.round(data.daysToSellOut)} days
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            
            {/* Slow Moving Inventory */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                🐌 Slow Moving Inventory
              </h4>
              <div className="space-y-3">
                {Object.entries(detailedReport.enhanced.inventoryTurnover.products)
                  .filter(([_, data]) => data.currentStock > 0 && data.turnoverRate < 0.05)
                  .sort((a, b) => a[1].turnoverRate - b[1].turnoverRate)
                  .slice(0, 8)
                  .map(([name, data], index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {data.soldThisMonth} sold / {data.currentStock} in stock
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600">
                          {(data.turnoverRate * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {data.daysToSellOut === Infinity ? '∞' : Math.round(data.daysToSellOut)} days
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financial Mode */}
      {viewMode === 'financial' && detailedReport?.enhanced && (
        <div className="space-y-6">
          {/* Financial Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title={locale.monthlyGrossProfit}
              value={`${formatCurrency(detailedReport.enhanced.profitAnalysis.totalProfit.usd, 'USD')}`}
              icon="💰"
              gradient="bg-gradient-to-br from-green-500 to-emerald-600"
            />
            
            <MetricCard
              title={locale.monthlyOperatingCosts}
              value={`${formatCurrency(detailedReport.enhanced.profitAnalysis.totalCost.usd, 'USD')}`}
              icon="💸"
              gradient="bg-gradient-to-br from-red-500 to-pink-600"
            />
            
            <MetricCard
              title={locale.monthlyRoi}
              value={`${detailedReport.enhanced.profitAnalysis.roi.usd.toFixed(1)}%`}
              icon="📊"
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            />
            
            <MetricCard
              title={locale.monthlyNetCashFlow}
              value={`${formatCurrency(detailedReport.enhanced.cashFlow.netFlow.usd, 'USD')}`}
              icon="🏦"
              gradient="bg-gradient-to-br from-purple-500 to-violet-600"
            />
          </div>

          {/* Detailed Financial Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profit Analysis */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Profit Analysis</h4>
              <div className="space-y-4">
                <div>
                  <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">USD Operations</h5>
                  <div className="space-y-2">
                    <ComparisonMetric
                      current={detailedReport.enhanced.profitAnalysis.totalRevenue.usd}
                      previous={0} // Could be enhanced with previous month data
                      label="Revenue"
                      formatter={(val) => formatCurrency(val, 'USD')}
                    />
                    <ComparisonMetric
                      current={detailedReport.enhanced.profitAnalysis.totalProfit.usd}
                      previous={0}
                      label="Profit"
                      formatter={(val) => formatCurrency(val, 'USD')}
                    />
                    <ComparisonMetric
                      current={detailedReport.enhanced.profitAnalysis.margins.usd}
                      previous={0}
                      label="Margin"
                      formatter={(val) => `${val.toFixed(1)}%`}
                    />
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">IQD Operations</h5>
                  <div className="space-y-2">
                    <ComparisonMetric
                      current={detailedReport.enhanced.profitAnalysis.totalRevenue.iqd}
                      previous={0}
                      label="Revenue"
                      formatter={(val) => formatCurrency(val, 'IQD')}
                    />
                    <ComparisonMetric
                      current={detailedReport.enhanced.profitAnalysis.totalProfit.iqd}
                      previous={0}
                      label="Profit"
                      formatter={(val) => formatCurrency(val, 'IQD')}
                    />
                    <ComparisonMetric
                      current={detailedReport.enhanced.profitAnalysis.margins.iqd}
                      previous={0}
                      label="Margin"
                      formatter={(val) => `${val.toFixed(1)}%`}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Cash Flow Analysis */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Cash Flow Analysis</h4>
              <div className="space-y-4">
                <div>
                  <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Inflows</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Sales (USD)</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(detailedReport.enhanced.cashFlow.inflow.usd, 'USD')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Sales (IQD)</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(detailedReport.enhanced.cashFlow.inflow.iqd, 'IQD')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Outflows</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Purchases (USD)</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(detailedReport.enhanced.cashFlow.outflow.usd, 'USD')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Purchases (IQD)</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(detailedReport.enhanced.cashFlow.outflow.iqd, 'IQD')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Net Position</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">USD Net</span>
                      <span className={`font-bold ${detailedReport.enhanced.cashFlow.netFlow.usd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(detailedReport.enhanced.cashFlow.netFlow.usd, 'USD')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">IQD Net</span>
                      <span className={`font-bold ${detailedReport.enhanced.cashFlow.netFlow.iqd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(detailedReport.enhanced.cashFlow.netFlow.iqd, 'IQD')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
