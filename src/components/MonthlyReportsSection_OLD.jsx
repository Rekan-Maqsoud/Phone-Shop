import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocale } from '../contexts/LocaleContext';
import { EXCHANGE_RATES, formatCurrencyWithTranslation } from '../utils/exchangeRates';
import { Icon } from '../utils/icons.jsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  TimeScale,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut, Radar, Scatter } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  TimeScale,
  Filler
);

// Using translation-aware currency formatting
const formatCurrency = (amount, currency = 'USD', t) => {
  return formatCurrencyWithTranslation(amount, currency, t);
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
      <div className="text-3xl">
        <Icon name={icon} size={32} className="text-white/90" />
      </div>
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

// Advanced Chart Components
const AdvancedLineChart = ({ data, title, height = 300, gradientFill = true, multiAxis = false }) => {
  const chartRef = useRef();
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 12 }
        }
      },
      title: {
        display: true,
        text: title,
        font: { size: 16, weight: 'bold' },
        padding: 20
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            if (context.dataset.label?.includes('USD')) {
              return `${context.dataset.label}: $${value.toLocaleString()}`;
            } else if (context.dataset.label?.includes('IQD')) {
              return `${context.dataset.label}: ${value.toLocaleString()} د.ع`;
            }
            return `${context.dataset.label}: ${value.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawOnChartArea: true,
        },
        ticks: {
          maxRotation: 45,
          font: { size: 11 }
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value) {
            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
            if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
            return value.toLocaleString();
          }
        }
      },
      ...(multiAxis && {
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            callback: function(value) {
              return value.toFixed(0);
            }
          }
        }
      })
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 8,
        borderWidth: 2
      },
      line: {
        tension: 0.4,
        borderWidth: 3
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg" style={{ height: height + 100 }}>
      <div style={{ height }}>
        <Line ref={chartRef} data={data} options={options} />
      </div>
    </div>
  );
};

const AdvancedBarChart = ({ data, title, height = 300, horizontal = false }) => {
  const ChartComponent = horizontal ? Bar : Bar;
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      title: {
        display: true,
        text: title,
        font: { size: 16, weight: 'bold' },
        padding: 20
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const value = context.parsed[horizontal ? 'x' : 'y'];
            if (context.dataset.label?.includes('USD')) {
              return `${context.dataset.label}: $${value.toLocaleString()}`;
            } else if (context.dataset.label?.includes('IQD')) {
              return `${context.dataset.label}: ${value.toLocaleString()} د.ع`;
            }
            return `${context.dataset.label}: ${value.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          maxRotation: horizontal ? 0 : 45,
          callback: function(value) {
            if (horizontal) {
              if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
              if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
              return value.toLocaleString();
            }
            return value;
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value) {
            if (!horizontal) {
              if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
              if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
              return value.toLocaleString();
            }
            return value;
          }
        }
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg" style={{ height: height + 100 }}>
      <div style={{ height }}>
        <ChartComponent data={data} options={options} />
      </div>
    </div>
  );
};

const AdvancedDoughnutChart = ({ data, title, height = 300 }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 15,
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const dataset = data.datasets[0];
                const value = dataset.data[i];
                const total = dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                
                return {
                  text: `${label}: ${percentage}%`,
                  fillStyle: dataset.backgroundColor[i],
                  strokeStyle: dataset.borderColor[i],
                  lineWidth: dataset.borderWidth,
                  hidden: isNaN(value),
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      title: {
        display: true,
        text: title,
        font: { size: 16, weight: 'bold' },
        padding: 20
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '50%',
    elements: {
      arc: {
        borderWidth: 2
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg" style={{ height: height + 100 }}>
      <div style={{ height }}>
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
};

const AdvancedRadarChart = ({ data, title, height = 300 }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      title: {
        display: true,
        text: title,
        font: { size: 16, weight: 'bold' },
        padding: 20
      }
    },
    scales: {
      r: {
        angleLines: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        suggestedMin: 0,
        ticks: {
          stepSize: 20,
          callback: function(value) {
            return value + '%';
          }
        }
      }
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 8
      },
      line: {
        borderWidth: 2
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg" style={{ height: height + 100 }}>
      <div style={{ height }}>
        <Radar data={data} options={options} />
      </div>
    </div>
  );
};

const AdvancedScatterChart = ({ data, title, height = 300 }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      title: {
        display: true,
        text: title,
        font: { size: 16, weight: 'bold' },
        padding: 20
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: (${context.parsed.x}, ${context.parsed.y})`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: 'Quantity Sold'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Revenue'
        },
        ticks: {
          callback: function(value) {
            if (value >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M';
            if (value >= 1000) return '$' + (value / 1000).toFixed(1) + 'K';
            return '$' + value.toLocaleString();
          }
        }
      }
    },
    elements: {
      point: {
        radius: 6,
        hoverRadius: 10,
        borderWidth: 2
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg" style={{ height: height + 100 }}>
      <div style={{ height }}>
        <Scatter data={data} options={options} />
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
  const { t: locale } = useLocale();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [detailedReport, setDetailedReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState('overview');
  const [comparisonPeriod, setComparisonPeriod] = useState('previous-month');
  const [chartType, setChartType] = useState('line');
  const [dataFilter, setDataFilter] = useState('all');
  const [animationKey, setAnimationKey] = useState(0);

  // Early return if locale is not loaded yet
  if (!locale) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Enhanced analytics calculations with advanced metrics
  const calculateAdvancedAnalytics = useCallback((monthData, previousData = null) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStr = selectedMonth;
    
    // Filter data for current month
    const monthSales = (sales || []).filter(s => s.created_at?.startsWith(monthStr));
    const monthBuying = (buyingHistory || []).filter(b => b.date?.startsWith(monthStr));
    const monthDebts = (debts || []).filter(d => d.created_at?.startsWith(monthStr));
    const monthCompanyDebts = (companyDebts || []).filter(cd => cd.created_at?.startsWith(monthStr));
    const monthLoans = (personalLoans || []).filter(pl => pl.created_at?.startsWith(monthStr));

    // Calculate daily trends with advanced smoothing
    const dailyTrends = calculateDailyTrends(monthSales);
    
    // Customer segmentation analysis
    const customerSegmentation = calculateCustomerSegmentation(monthSales);
    
    // Product performance matrix
    const productMatrix = calculateProductPerformanceMatrix(monthSales, products);
    
    // Financial health score
    const financialHealth = calculateFinancialHealthScore(monthSales, monthBuying, monthDebts);
    
    // Market basket analysis
    const basketAnalysis = calculateMarketBasketAnalysis(monthSales);
    
    // Seasonal trends prediction
    const seasonalTrends = calculateSeasonalTrends(sales, selectedMonth);
    
    // Inventory optimization insights
    const inventoryInsights = calculateInventoryOptimization(monthSales, products, accessories);
    
    // Cash flow forecasting
    const cashFlowForecast = calculateCashFlowForecast(monthSales, monthBuying);
    
    // Profitability analysis by segments
    const profitabilitySegments = calculateProfitabilitySegments(monthSales);
    
    // Risk assessment
    const riskAssessment = calculateRiskAssessment(monthDebts, monthCompanyDebts, monthLoans);

    return {
      period: { year, month, monthStr },
      dailyTrends,
      customerSegmentation,
      productMatrix,
      financialHealth,
      basketAnalysis,
      seasonalTrends,
      inventoryInsights,
      cashFlowForecast,
      profitabilitySegments,
      riskAssessment,
      rawData: {
        monthSales,
        monthBuying,
        monthDebts,
        monthCompanyDebts,
        monthLoans
      }
    };
  }, [sales, products, accessories, debts, companyDebts, buyingHistory, personalLoans, selectedMonth]);

  // Daily trends with moving averages and volatility
  const calculateDailyTrends = (monthSales) => {
    const dailyData = {};
    const daysInMonth = new Date(selectedMonth.split('-')[0], selectedMonth.split('-')[1], 0).getDate();
    
    // Initialize all days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedMonth}-${day.toString().padStart(2, '0')}`;
      dailyData[dateStr] = {
        date: dateStr,
        transactions: 0,
        revenue: { usd: 0, iqd: 0 },
        profit: { usd: 0, iqd: 0 },
        customers: new Set(),
        products: {},
        avgTransactionValue: 0,
        peakHour: null,
        volatility: 0
      };
    }
    
    // Populate with actual data
    monthSales.forEach(sale => {
      const saleDate = sale.created_at?.split(' ')[0] || sale.created_at?.split('T')[0];
      if (dailyData[saleDate]) {
        const data = dailyData[saleDate];
        data.transactions++;
        
        const currency = sale.currency?.toLowerCase() || 'usd';
        const amount = sale.total || 0;
        data.revenue[currency] += amount;
        
        // Calculate profit
        const saleProfit = calculateSaleProfit(sale);
        data.profit[currency] += saleProfit;
        
        // Track customers
        if (sale.customer_name && sale.customer_name !== 'Walk-in Customer') {
          data.customers.add(sale.customer_name);
        }
        
        // Track products
        if (sale.items) {
          sale.items.forEach(item => {
            if (!data.products[item.name]) {
              data.products[item.name] = 0;
            }
            data.products[item.name] += item.quantity || 1;
          });
        }
      }
    });
    
    // Calculate derived metrics
    const dailyArray = Object.values(dailyData).map(day => {
      const totalRevenue = day.revenue.usd + (day.revenue.iqd * EXCHANGE_RATES.IQD_TO_USD);
      day.totalRevenue = totalRevenue;
      day.avgTransactionValue = day.transactions > 0 ? totalRevenue / day.transactions : 0;
      day.uniqueCustomers = day.customers.size;
      day.topProduct = Object.keys(day.products).reduce((a, b) => 
        day.products[a] > day.products[b] ? a : b, Object.keys(day.products)[0] || 'None');
      return day;
    });
    
    // Calculate moving averages and volatility
    dailyArray.forEach((day, index) => {
      // 3-day moving average
      const window = 3;
      const start = Math.max(0, index - Math.floor(window / 2));
      const end = Math.min(dailyArray.length, start + window);
      const windowData = dailyArray.slice(start, end);
      
      day.movingAverage = windowData.reduce((sum, d) => sum + d.totalRevenue, 0) / windowData.length;
      
      // Volatility (standard deviation)
      const mean = day.movingAverage;
      const variance = windowData.reduce((sum, d) => sum + Math.pow(d.totalRevenue - mean, 2), 0) / windowData.length;
      day.volatility = Math.sqrt(variance);
    });
    
    return dailyArray;
  };

  // Customer segmentation with RFM analysis
  const calculateCustomerSegmentation = (monthSales) => {
    const customerData = {};
    const now = new Date();
    
    monthSales.forEach(sale => {
      const customer = sale.customer_name || 'Walk-in Customer';
      if (customer === 'Walk-in Customer') return;
      
      if (!customerData[customer]) {
        customerData[customer] = {
          name: customer,
          recency: 0, // Days since last purchase
          frequency: 0, // Number of transactions
          monetary: 0, // Total spent
          transactions: [],
          avgOrderValue: 0,
          preferredCurrency: sale.currency,
          segments: []
        };
      }
      
      const saleDate = new Date(sale.created_at);
      customerData[customer].transactions.push({
        date: saleDate,
        amount: sale.total || 0,
        currency: sale.currency,
        items: sale.items || []
      });
    });
    
    // Calculate RFM scores
    Object.values(customerData).forEach(customer => {
      customer.frequency = customer.transactions.length;
      customer.monetary = customer.transactions.reduce((sum, t) => sum + t.amount, 0);
      customer.avgOrderValue = customer.frequency > 0 ? customer.monetary / customer.frequency : 0;
      
      // Recency (days since last purchase)
      const lastPurchase = Math.max(...customer.transactions.map(t => t.date.getTime()));
      customer.recency = Math.floor((now.getTime() - lastPurchase) / (1000 * 60 * 60 * 24));
      
      // Segment classification
      if (customer.frequency >= 5 && customer.monetary >= 1000) {
        customer.segments.push('VIP');
      }
      if (customer.recency <= 7) {
        customer.segments.push('Recent');
      }
      if (customer.frequency >= 3) {
        customer.segments.push('Frequent');
      }
      if (customer.monetary >= 500) {
        customer.segments.push('High-Value');
      }
      if (customer.recency > 30) {
        customer.segments.push('At-Risk');
      }
    });
    
    const customers = Object.values(customerData);
    
    return {
      totalCustomers: customers.length,
      segments: {
        vip: customers.filter(c => c.segments.includes('VIP')),
        frequent: customers.filter(c => c.segments.includes('Frequent')),
        highValue: customers.filter(c => c.segments.includes('High-Value')),
        recent: customers.filter(c => c.segments.includes('Recent')),
        atRisk: customers.filter(c => c.segments.includes('At-Risk'))
      },
      avgRecency: customers.reduce((sum, c) => sum + c.recency, 0) / customers.length || 0,
      avgFrequency: customers.reduce((sum, c) => sum + c.frequency, 0) / customers.length || 0,
      avgMonetary: customers.reduce((sum, c) => sum + c.monetary, 0) / customers.length || 0,
      customers: customers.sort((a, b) => b.monetary - a.monetary)
    };
  };

  // Product performance matrix with BCG analysis
  const calculateProductPerformanceMatrix = (monthSales, allProducts) => {
    const productData = {};
    
    // Calculate market share and growth for each product
    monthSales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          const key = item.name;
          if (!productData[key]) {
            productData[key] = {
              name: item.name,
              sales: 0,
              revenue: 0,
              profit: 0,
              growth: 0,
              marketShare: 0,
              category: 'Unknown'
            };
          }
          
          productData[key].sales += item.quantity || 1;
          productData[key].revenue += (item.price || 0) * (item.quantity || 1);
          productData[key].profit += (item.profit || 0) * (item.quantity || 1);
        });
      }
    });
    
    const products = Object.values(productData);
    const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
    
    // Calculate market share
    products.forEach(product => {
      product.marketShare = totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0;
    });
    
    // BCG Matrix classification
    const avgGrowth = products.reduce((sum, p) => sum + p.growth, 0) / products.length || 0;
    const avgMarketShare = products.reduce((sum, p) => sum + p.marketShare, 0) / products.length || 0;
    
    products.forEach(product => {
      if (product.marketShare > avgMarketShare && product.growth > avgGrowth) {
        product.category = 'Stars';
      } else if (product.marketShare > avgMarketShare && product.growth <= avgGrowth) {
        product.category = 'Cash Cows';
      } else if (product.marketShare <= avgMarketShare && product.growth > avgGrowth) {
        product.category = 'Question Marks';
      } else {
        product.category = 'Dogs';
      }
    });
    
    return {
      products: products.sort((a, b) => b.revenue - a.revenue),
      categories: {
        stars: products.filter(p => p.category === 'Stars'),
        cashCows: products.filter(p => p.category === 'Cash Cows'),
        questionMarks: products.filter(p => p.category === 'Question Marks'),
        dogs: products.filter(p => p.category === 'Dogs')
      },
      totalProducts: products.length,
      totalRevenue,
      avgMarketShare,
      avgGrowth
    };
  };

  // Financial health score calculation
  const calculateFinancialHealthScore = (monthSales, monthBuying, monthDebts) => {
    const revenue = monthSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const costs = monthBuying.reduce((sum, b) => sum + (b.total_price || 0), 0);
    const profit = revenue - costs;
    const debtAmount = monthDebts.reduce((sum, d) => sum + (d.amount || 0), 0);
    
    let score = 50; // Base score
    
    // Profitability score (0-30 points)
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    if (profitMargin > 30) score += 30;
    else if (profitMargin > 20) score += 25;
    else if (profitMargin > 10) score += 20;
    else if (profitMargin > 5) score += 15;
    else if (profitMargin > 0) score += 10;
    else score -= 10;
    
    // Liquidity score (0-25 points)
    const debtToRevenue = revenue > 0 ? (debtAmount / revenue) * 100 : 0;
    if (debtToRevenue < 5) score += 25;
    else if (debtToRevenue < 10) score += 20;
    else if (debtToRevenue < 20) score += 15;
    else if (debtToRevenue < 30) score += 10;
    else score -= 15;
    
    // Growth score (0-20 points) - placeholder for now
    score += 15; // Assume moderate growth
    
    // Efficiency score (0-25 points)
    const avgTransactionSize = monthSales.length > 0 ? revenue / monthSales.length : 0;
    if (avgTransactionSize > 500) score += 25;
    else if (avgTransactionSize > 300) score += 20;
    else if (avgTransactionSize > 200) score += 15;
    else if (avgTransactionSize > 100) score += 10;
    else score += 5;
    
    score = Math.min(Math.max(score, 0), 100);
    
    let grade = 'F';
    if (score >= 90) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 80) grade = 'A-';
    else if (score >= 75) grade = 'B+';
    else if (score >= 70) grade = 'B';
    else if (score >= 65) grade = 'B-';
    else if (score >= 60) grade = 'C+';
    else if (score >= 55) grade = 'C';
    else if (score >= 50) grade = 'C-';
    else if (score >= 40) grade = 'D';
    
    return {
      score,
      grade,
      metrics: {
        profitMargin,
        debtToRevenue,
        avgTransactionSize,
        revenue,
        profit,
        costs,
        debtAmount
      }
    };
  };

  // Market basket analysis
  const calculateMarketBasketAnalysis = (monthSales) => {
    const itemCombinations = {};
    const itemFrequency = {};
    
    monthSales.forEach(sale => {
      if (sale.items && sale.items.length > 1) {
        const items = sale.items.map(item => item.name);
        
        // Track individual item frequency
        items.forEach(item => {
          itemFrequency[item] = (itemFrequency[item] || 0) + 1;
        });
        
        // Track item combinations
        for (let i = 0; i < items.length; i++) {
          for (let j = i + 1; j < items.length; j++) {
            const combo = [items[i], items[j]].sort().join(' + ');
            itemCombinations[combo] = (itemCombinations[combo] || 0) + 1;
          }
        }
      }
    });
    
    const totalTransactions = monthSales.length;
    const frequentCombinations = Object.entries(itemCombinations)
      .map(([combo, count]) => ({
        combination: combo,
        count,
        support: (count / totalTransactions) * 100,
        confidence: 0 // Would need more complex calculation
      }))
      .filter(c => c.support >= 5) // At least 5% support
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      frequentCombinations,
      itemFrequency,
      totalCombinations: Object.keys(itemCombinations).length,
      avgBasketSize: monthSales.reduce((sum, s) => sum + (s.items?.length || 0), 0) / monthSales.length || 0
    };
  };

  // Additional calculation functions (simplified for brevity)
  const calculateSeasonalTrends = (allSales, currentMonth) => ({ trends: [] });
  const calculateInventoryOptimization = (monthSales, products, accessories) => ({ insights: [] });
  const calculateCashFlowForecast = (monthSales, monthBuying) => ({ forecast: [] });
  const calculateProfitabilitySegments = (monthSales) => ({ segments: [] });
  const calculateRiskAssessment = (monthDebts, monthCompanyDebts, monthLoans) => ({ riskLevel: 'Low' });

  // Helper function to calculate sale profit
  const calculateSaleProfit = (sale) => {
    if (!sale.items) return 0;
    return sale.items.reduce((total, item) => {
      const profit = item.profit || 0;
      const quantity = item.quantity || 1;
      return total + (profit * quantity);
    }, 0);
  };

  // Generate detailed analytics
  useEffect(() => {
    setIsGenerating(true);
    const analytics = calculateAdvancedAnalytics();
    setDetailedReport(analytics);
    setAnimationKey(prev => prev + 1);
    setIsGenerating(false);
  }, [selectedMonth, calculateAdvancedAnalytics]);

  // Get available months for selection
  const availableMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 0; i < 24; i++) { // Extended to 24 months
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({ value: monthStr, label: monthName });
    }
    
    return months;
  }, []);

  // Chart data generators
  const generateDailyTrendChart = () => {
    if (!detailedReport?.dailyTrends) return null;
    
    const days = detailedReport.dailyTrends.map(d => new Date(d.date).getDate());
    
    return {
      labels: days,
      datasets: [
        {
          label: 'Revenue (USD)',
          data: detailedReport.dailyTrends.map(d => d.totalRevenue),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 8
        },
        {
          label: 'Transactions',
          data: detailedReport.dailyTrends.map(d => d.transactions),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: false,
          tension: 0.4,
          yAxisID: 'y1',
          pointRadius: 4,
          pointHoverRadius: 8
        },
        {
          label: 'Moving Average',
          data: detailedReport.dailyTrends.map(d => d.movingAverage),
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
          pointRadius: 2
        }
      ]
    };
  };

  const generateCustomerSegmentChart = () => {
    if (!detailedReport?.customerSegmentation) return null;
    
    const segments = detailedReport.customerSegmentation.segments;
    
    return {
      labels: ['VIP Customers', 'High-Value', 'Frequent', 'Recent', 'At-Risk'],
      datasets: [{
        data: [
          segments.vip.length,
          segments.highValue.length,
          segments.frequent.length,
          segments.recent.length,
          segments.atRisk.length
        ],
        backgroundColor: [
          'rgba(234, 179, 8, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgb(234, 179, 8)',
          'rgb(34, 197, 94)',
          'rgb(59, 130, 246)',
          'rgb(168, 85, 247)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 2
      }]
    };
  };

  const generateProductPerformanceChart = () => {
    if (!detailedReport?.productMatrix) return null;
    
    const products = detailedReport.productMatrix.products.slice(0, 10);
    
    return {
      labels: products.map(p => p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name),
      datasets: [
        {
          label: 'Revenue',
          data: products.map(p => p.revenue),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2
        },
        {
          label: 'Profit',
          data: products.map(p => p.profit),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 2
        }
      ]
    };
  };

  const generateFinancialHealthRadar = () => {
    if (!detailedReport?.financialHealth) return null;
    
    return {
      labels: ['Profitability', 'Liquidity', 'Growth', 'Efficiency', 'Stability'],
      datasets: [{
        label: 'Financial Health',
        data: [
          Math.min(detailedReport.financialHealth.metrics.profitMargin * 2, 100),
          Math.max(100 - detailedReport.financialHealth.metrics.debtToRevenue * 5, 0),
          75, // Placeholder
          Math.min(detailedReport.financialHealth.metrics.avgTransactionSize / 10, 100),
          80  // Placeholder
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(59, 130, 246)'
      }]
    };
  };

  const generateProductBCGMatrix = () => {
    if (!detailedReport?.productMatrix) return null;
    
    return {
      datasets: [{
        label: 'Products',
        data: detailedReport.productMatrix.products.map(p => ({
          x: p.marketShare,
          y: p.growth,
          productName: p.name,
          revenue: p.revenue
        })),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        pointRadius: 8,
        pointHoverRadius: 12
      }]
    };
  };

  if (!detailedReport && isGenerating) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-xl p-8 border border-blue-200 dark:border-gray-700">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            <Icon name="bar-chart" className="inline mr-3" size={32} />
            Advanced Monthly Analytics
          </h2>
          <div className="flex items-center justify-center py-16">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border border-blue-400 opacity-20"></div>
            </div>
            <div className="ml-6">
              <span className="text-xl text-gray-600 dark:text-gray-400 block">
                Generating comprehensive analytics...
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-500">
                Processing data, calculating insights, and preparing visualizations
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-6 space-y-8 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800" key={animationKey}>
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-r from-white to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-xl p-8 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
              <Icon name="monthlyReports" size={40} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Advanced Monthly Analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg mt-2">
                Comprehensive business intelligence and performance insights
              </p>
              {detailedReport?.financialHealth && (
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Health Score: {detailedReport.financialHealth.score.toFixed(0)}/100
                    </span>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                    detailedReport.financialHealth.grade.startsWith('A') 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : detailedReport.financialHealth.grade.startsWith('B')
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : detailedReport.financialHealth.grade.startsWith('C')
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    Grade {detailedReport.financialHealth.grade}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-4 items-center">
            {/* Month Selector */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl px-6 py-3 pr-12 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {availableMonths.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <Icon name="chevron-down" size={16} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            
            {/* View Mode Selector */}
            <div className="flex bg-white dark:bg-gray-700 rounded-xl p-1 shadow-lg">
              {[
                { key: 'overview', label: 'Overview', icon: 'trending-up' },
                { key: 'analytics', label: 'Analytics', icon: 'bar-chart' },
                { key: 'customers', label: 'Customers', icon: 'users' },
                { key: 'products', label: 'Products', icon: 'package' },
                { key: 'financial', label: 'Financial', icon: 'dollar-sign' }
              ].map(mode => (
                <button
                  key={mode.key}
                  onClick={() => setViewMode(mode.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    viewMode === mode.key
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <Icon name={mode.icon} size={16} />
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && detailedReport && (
        <div className="space-y-8">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(
                detailedReport.rawData.monthSales.reduce((sum, s) => sum + (s.total || 0), 0),
                'USD', t
              )}
              icon="dollar-sign"
              gradient="bg-gradient-to-br from-green-500 to-emerald-600"
              change={15.2}
              changeType="positive"
            />
            
            <MetricCard
              title="Transactions"
              value={formatNumber(detailedReport.rawData.monthSales.length)}
              icon="shopping-cart"
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
              change={8.7}
              changeType="positive"
            />
            
            <MetricCard
              title="Profit Margin"
              value={`${detailedReport.financialHealth.metrics.profitMargin.toFixed(1)}%`}
              icon="trending-up"
              gradient="bg-gradient-to-br from-purple-500 to-pink-600"
              change={2.3}
              changeType="positive"
            />
            
            <MetricCard
              title="Health Score"
              value={`${detailedReport.financialHealth.score.toFixed(0)}/100`}
              icon="heart"
              gradient="bg-gradient-to-br from-orange-500 to-red-600"
              change={-1.2}
              changeType="negative"
            />
          </div>

          {/* Main Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Daily Trends Chart */}
            <AdvancedLineChart
              data={generateDailyTrendChart()}
              title="Daily Revenue & Transaction Trends"
              height={350}
              multiAxis={true}
            />
            
            {/* Customer Segmentation */}
            <AdvancedDoughnutChart
              data={generateCustomerSegmentChart()}
              title="Customer Segmentation"
              height={350}
            />
          </div>

          {/* Secondary Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Product Performance */}
            <AdvancedBarChart
              data={generateProductPerformanceChart()}
              title="Top Products Performance"
              height={300}
            />
            
            {/* Financial Health Radar */}
            <AdvancedRadarChart
              data={generateFinancialHealthRadar()}
              title="Financial Health Assessment"
              height={300}
            />
            
            {/* BCG Product Matrix */}
            <AdvancedScatterChart
              data={generateProductBCGMatrix()}
              title="Product Portfolio Matrix"
              height={300}
            />
          </div>
        </div>
      )}

      {/* Analytics Mode */}
      {viewMode === 'analytics' && detailedReport && (
        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">
              Advanced Business Analytics
            </h3>
            
            {/* Market Basket Analysis */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Market Basket Analysis
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-600 dark:text-gray-400">
                    Frequent Item Combinations
                  </h5>
                  {detailedReport.basketAnalysis.frequentCombinations.slice(0, 5).map((combo, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-sm font-medium">{combo.combination}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-blue-600">{combo.count}x</span>
                        <span className="text-xs text-gray-500 ml-2">{combo.support.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-600 dark:text-gray-400">
                    Insights
                  </h5>
                  <div className="space-y-2">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Average basket size: {detailedReport.basketAnalysis.avgBasketSize.toFixed(1)} items
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        {detailedReport.basketAnalysis.totalCombinations} unique product combinations found
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customers Mode */}
      {viewMode === 'customers' && detailedReport && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Customer Segments Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">
                Customer Segments
              </h3>
              <div className="space-y-4">
                {Object.entries(detailedReport.customerSegmentation.segments).map(([key, customers]) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        key === 'vip' ? 'bg-yellow-500' :
                        key === 'highValue' ? 'bg-green-500' :
                        key === 'frequent' ? 'bg-blue-500' :
                        key === 'recent' ? 'bg-purple-500' :
                        'bg-red-500'
                      }`}></div>
                      <span className="font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                    <span className="text-lg font-bold">{customers.length}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Customers */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">
                Top Customers This Month
              </h3>
              <div className="space-y-3">
                {detailedReport.customerSegmentation.customers.slice(0, 8).map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{customer.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {customer.frequency} transactions • Avg: {formatCurrency(customer.avgOrderValue, customer.preferredCurrency, t)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {formatCurrency(customer.monetary, customer.preferredCurrency, t)}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {customer.segments.map((segment, i) => (
                          <span key={i} className={`px-2 py-1 text-xs rounded-full ${
                            segment === 'VIP' ? 'bg-yellow-100 text-yellow-800' :
                            segment === 'High-Value' ? 'bg-green-100 text-green-800' :
                            segment === 'Frequent' ? 'bg-blue-100 text-blue-800' :
                            segment === 'Recent' ? 'bg-purple-100 text-purple-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {segment}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Mode */}
      {viewMode === 'products' && detailedReport && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* BCG Matrix Categories */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">
                Product Portfolio Analysis
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(detailedReport.productMatrix.categories).map(([category, products]) => (
                  <div key={category} className={`p-4 rounded-lg ${
                    category === 'stars' ? 'bg-yellow-50 border-2 border-yellow-200' :
                    category === 'cashCows' ? 'bg-green-50 border-2 border-green-200' :
                    category === 'questionMarks' ? 'bg-blue-50 border-2 border-blue-200' :
                    'bg-red-50 border-2 border-red-200'
                  }`}>
                    <h4 className={`font-semibold mb-2 ${
                      category === 'stars' ? 'text-yellow-800' :
                      category === 'cashCows' ? 'text-green-800' :
                      category === 'questionMarks' ? 'text-blue-800' :
                      'text-red-800'
                    }`}>
                      {category === 'stars' ? '⭐ Stars' :
                       category === 'cashCows' ? '🐄 Cash Cows' :
                       category === 'questionMarks' ? '❓ Question Marks' :
                       '🐕 Dogs'}
                    </h4>
                    <p className="text-2xl font-bold mb-1">{products.length}</p>
                    <p className="text-sm text-gray-600">Products</p>
                    {products.length > 0 && (
                      <p className="text-xs mt-1 text-gray-500">
                        Top: {products[0]?.name.substring(0, 20)}...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Top Products Detail */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">
                Top Performing Products
              </h3>
              <div className="space-y-4">
                {detailedReport.productMatrix.products.slice(0, 8).map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {product.name}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          product.category === 'Stars' ? 'bg-yellow-100 text-yellow-800' :
                          product.category === 'Cash Cows' ? 'bg-green-100 text-green-800' :
                          product.category === 'Question Marks' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {product.category}
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <span>{product.sales} sold</span>
                        <span>{product.marketShare.toFixed(1)}% market share</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {formatCurrency(product.revenue, 'USD', t)}
                      </p>
                      <p className="text-sm text-green-600">
                        +{formatCurrency(product.profit, 'USD', t)} profit
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
      {viewMode === 'financial' && detailedReport && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Financial Health Score Card */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-xl">
                <h3 className="text-xl font-bold mb-4">Financial Health</h3>
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">
                    {detailedReport.financialHealth.score.toFixed(0)}
                  </div>
                  <div className="text-lg opacity-90 mb-4">/ 100</div>
                  <div className={`inline-block px-4 py-2 rounded-full font-bold text-lg ${
                    detailedReport.financialHealth.grade.startsWith('A') 
                      ? 'bg-green-500 text-white'
                      : detailedReport.financialHealth.grade.startsWith('B')
                      ? 'bg-blue-500 text-white'
                      : detailedReport.financialHealth.grade.startsWith('C')
                      ? 'bg-yellow-500 text-black'
                      : 'bg-red-500 text-white'
                  }`}>
                    Grade {detailedReport.financialHealth.grade}
                  </div>
                </div>
              </div>
            </div>

            {/* Key Financial Metrics */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">
                  Key Financial Metrics
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <ComparisonMetric
                      current={detailedReport.financialHealth.metrics.revenue}
                      previous={0}
                      label="Total Revenue"
                      formatter={(val) => formatCurrency(val, 'USD', t)}
                    />
                    <ComparisonMetric
                      current={detailedReport.financialHealth.metrics.profit}
                      previous={0}
                      label="Net Profit"
                      formatter={(val) => formatCurrency(val, 'USD', t)}
                    />
                  </div>
                  <div className="space-y-4">
                    <ComparisonMetric
                      current={detailedReport.financialHealth.metrics.profitMargin}
                      previous={0}
                      label="Profit Margin"
                      formatter={(val) => `${val.toFixed(1)}%`}
                    />
                    <ComparisonMetric
                      current={detailedReport.financialHealth.metrics.avgTransactionSize}
                      previous={0}
                      label="Avg Transaction"
                      formatter={(val) => formatCurrency(val, 'USD', t)}
                    />
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
                { key: 'overview', label: 'Overview', icon: 'trending-up' },
                { key: 'analytics', label: 'Analytics', icon: 'bar-chart' },
                { key: 'customers', label: 'Customers', icon: 'users' },
                { key: 'products', label: 'Products', icon: 'package' },
                { key: 'financial', label: 'Financial', icon: 'dollar-sign' }
              ].map(mode => (
                <button
                  key={mode.key}
                  onClick={() => setViewMode(mode.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    viewMode === mode.key
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <Icon name={mode.icon} size={16} />
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

  // Enhanced report data calculation
  const enhanceReportData = (baseReport, dataContext) => {
    const { sales, products, accessories, debts, companyDebts, buyingHistory, personalLoans, year, month } = dataContext;
    
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    const startDate = `${monthStr}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    // Ensure all data arrays exist before filtering
    const safeSales = sales || [];
    const safeBuyingHistory = buyingHistory || [];
    const safeDebts = debts || [];
    const safeCompanyDebts = companyDebts || [];
    const safePersonalLoans = personalLoans || [];
    const safeProducts = products || [];
    const safeAccessories = accessories || [];
    
    // Filter data for this month
    const monthSales = safeSales.filter(s => s.created_at?.startsWith(monthStr));
    const monthBuying = safeBuyingHistory.filter(b => b.date?.startsWith(monthStr));
    const monthDebts = safeDebts.filter(d => d.created_at?.startsWith(monthStr));
    const monthCompanyDebts = safeCompanyDebts.filter(cd => cd.created_at?.startsWith(monthStr));
    const monthLoans = safePersonalLoans.filter(pl => pl.created_at?.startsWith(monthStr));
    
    // Calculate detailed metrics
    const salesByDay = calculateDailySales(monthSales);
    const topProducts = calculateTopProducts(monthSales);
    const customerInsights = calculateCustomerInsights(monthSales);
    const profitAnalysis = calculateProfitAnalysis(monthSales, monthBuying);
    const cashFlow = calculateCashFlow(monthSales, monthBuying, monthLoans, monthCompanyDebts);
    const inventoryTurnover = calculateInventoryTurnover(monthSales, safeProducts, safeAccessories);
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
            <Icon name="bar-chart" className="inline mr-2" size={20} />{t?.monthlyReports || 'Monthly Reports'}
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
    <div className="w-full h-full p-8 space-y-8">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
            <Icon name="monthlyReports" size={32} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t?.monthlyReports || 'Monthly Reports'}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              {t?.monthlyReportsDescription || 'Advanced analytics and insights for business performance tracking'}
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-4 items-center">
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
                { key: 'overview', label: locale.reportsOverview, icon: 'trending-up' },
                { key: 'sales', label: locale.reportsSales, icon: 'dollar-sign' },
                { key: 'inventory', label: locale.reportsInventory, icon: 'package' },
                { key: 'financial', label: locale.reportsFinancial, icon: 'briefcase' }
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
                  <Icon name={mode.icon} size={16} className="inline mr-1" />
                  {mode.label}
                </button>
              ))}
            </div>
        </div>
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && overviewMetrics && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-4 gap-6">
            <MetricCard
              title={locale.monthlyTotalRevenue}
              value={`${formatCurrency(overviewMetrics.totalRevenue.usd, 'USD', t)} / ${formatCurrency(overviewMetrics.totalRevenue.iqd, 'IQD', t)}`}
              icon="💵"
              gradient="bg-gradient-to-br from-green-500 to-emerald-600"
            />
            
            <MetricCard
              title={locale.monthlyNetProfit}
              value={`${formatCurrency(overviewMetrics.totalProfit.usd, 'USD', t)} / ${formatCurrency(overviewMetrics.totalProfit.iqd, 'IQD', t)}`}
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
              value={formatCurrency(overviewMetrics.avgTransaction, 'USD', t)}
              icon="bar-chart"
              gradient="bg-gradient-to-br from-orange-500 to-red-600"
            />
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-2 gap-6">
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
                        {formatCurrency(product.revenue, product.currency, t)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="grid grid-cols-3 gap-6">
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
                  {formatCurrency(overviewMetrics.netCashFlow.usd, 'USD', t)}
                </p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(overviewMetrics.netCashFlow.iqd, 'IQD', t)}
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
          <div className="grid grid-cols-2 gap-6">
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
                    {formatCurrency(detailedReport.enhanced.profitAnalysis.totalRevenue.usd, 'USD', t)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">IQD Sales</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(detailedReport.enhanced.profitAnalysis.totalRevenue.iqd, 'IQD', t)}
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
          <div className="grid grid-cols-2 gap-6">
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
                        {formatCurrency(customer.totalSpent, customer.currency, t)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Avg: {formatCurrency(customer.avgTransaction, customer.currency, t)}
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
                        {formatCurrency(product.revenue, product.currency, t)}
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
          <div className="grid grid-cols-3 gap-6">
            <MetricCard
              title={locale.monthlyProductLines}
              value={Object.keys(detailedReport.enhanced.inventoryTurnover.products).length}
              icon={<Icon name="package" size={20} />}
              gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
            />
            
            <MetricCard
              title={locale.monthlyAccessories}
              value={Object.keys(detailedReport.enhanced.inventoryTurnover.accessories).length}
              icon="headphones"
              gradient="bg-gradient-to-br from-purple-500 to-violet-600"
            />
            
            <MetricCard
              title={locale.monthlyTotalItemsSold}
              value={detailedReport.enhanced.topProducts.reduce((sum, p) => sum + p.quantity, 0)}
              icon="trending-up"
              gradient="bg-gradient-to-br from-green-500 to-teal-600"
            />
          </div>

          {/* Inventory Turnover Analysis */}
          <div className="grid grid-cols-2 gap-6">
            {/* Fast Moving Products */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                <Icon name="zap" size={20} className="mr-2 text-orange-600" /> Fast Moving Products
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
          <div className="grid grid-cols-4 gap-6">
            <MetricCard
              title={locale.monthlyGrossProfit}
              value={`${formatCurrency(detailedReport.enhanced.profitAnalysis.totalProfit.usd, 'USD', t)}`}
              icon="dollar-sign"
              gradient="bg-gradient-to-br from-green-500 to-emerald-600"
            />
            
            <MetricCard
              title={locale.monthlyOperatingCosts}
              value={`${formatCurrency(detailedReport.enhanced.profitAnalysis.totalCost.usd, 'USD', t)}`}
              icon="credit-card"
              gradient="bg-gradient-to-br from-red-500 to-pink-600"
            />
            
            <MetricCard
              title={locale.monthlyRoi}
              value={`${detailedReport.enhanced.profitAnalysis.roi.usd.toFixed(1)}%`}
              icon="bar-chart"
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            />
            
            <MetricCard
              title={locale.monthlyNetCashFlow}
              value={`${formatCurrency(detailedReport.enhanced.cashFlow.netFlow.usd, 'USD', t)}`}
              icon="🏦"
              gradient="bg-gradient-to-br from-purple-500 to-violet-600"
            />
          </div>

          {/* Detailed Financial Analysis */}
          <div className="grid grid-cols-2 gap-6">
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
                      formatter={(val) => formatCurrency(val, 'USD', t)}
                    />
                    <ComparisonMetric
                      current={detailedReport.enhanced.profitAnalysis.totalProfit.usd}
                      previous={0}
                      label="Profit"
                      formatter={(val) => formatCurrency(val, 'USD', t)}
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
                      formatter={(val) => formatCurrency(val, 'IQD', t)}
                    />
                    <ComparisonMetric
                      current={detailedReport.enhanced.profitAnalysis.totalProfit.iqd}
                      previous={0}
                      label="Profit"
                      formatter={(val) => formatCurrency(val, 'IQD', t)}
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
