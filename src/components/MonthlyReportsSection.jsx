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

// Normalize currency values for chart display
const normalizeCurrencyForChart = (amount, fromCurrency) => {
  if (fromCurrency?.toUpperCase() === 'IQD') {
    return amount * EXCHANGE_RATES.IQD_TO_USD; // Convert IQD to USD for chart comparison
  }
  return amount; // USD stays as is
};

// Get appropriate currency symbol for display
const getCurrencySymbol = (currency) => {
  return currency?.toUpperCase() === 'IQD' ? 'IQD' : 'USD';
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
  <div className={`rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300 ${gradient}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="text-3xl">
        <Icon name={icon} size={32} className="text-white/90" />
      </div>
      {change !== undefined && (
        <div className={`text-sm px-3 py-1 rounded-full font-semibold ${
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
            const label = context.dataset.label || '';
            
            // For revenue and profit, show dual currency
            if (label.includes('Revenue') || label.includes('Profit')) {
              const usdValue = formatCurrency(value, 'USD');
              const iqdValue = formatCurrency(value / EXCHANGE_RATES.IQD_TO_USD, 'IQD');
              return `${label}: ${usdValue} (≈${iqdValue})`;
            } else if (label.includes('USD')) {
              return `${label}: ${formatCurrency(value, 'USD')}`;
            } else if (label.includes('IQD')) {
              return `${label}: ${formatCurrency(value / EXCHANGE_RATES.IQD_TO_USD, 'IQD')}`;
            }
            return `${label}: ${value.toLocaleString()}`;
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
  const ChartComponent = Bar;
  
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
            const label = context.dataset.label || '';
            
            // For revenue and profit, show dual currency
            if (label.includes('Revenue') || label.includes('Profit')) {
              const usdValue = formatCurrency(value, 'USD', t);
              const iqdValue = formatCurrency(value / EXCHANGE_RATES.IQD_TO_USD, 'IQD', t);
              return `${label}: ${usdValue} (≈${iqdValue})`;
            } else if (label.includes('USD')) {
              return `${label}: ${formatCurrency(value, 'USD', t)}`;
            } else if (label.includes('IQD')) {
              return `${label}: ${formatCurrency(value / EXCHANGE_RATES.IQD_TO_USD, 'IQD', t)}`;
            }
            return `${label}: ${value.toLocaleString()}`;
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
  const calculateAdvancedAnalytics = useCallback(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStr = selectedMonth;
    
    // Filter data for current month
    const monthSales = (sales || []).filter(s => s.created_at?.startsWith(monthStr));
    const monthBuying = (buyingHistory || []).filter(b => b.date?.startsWith(monthStr));
    const monthDebts = (debts || []).filter(d => d.created_at?.startsWith(monthStr));
    const monthCompanyDebts = (companyDebts || []).filter(cd => cd.created_at?.startsWith(monthStr));

    // Calculate daily trends with advanced smoothing
    const dailyTrends = calculateDailyTrends(monthSales);
    
    // Customer segmentation analysis
    const customerSegmentation = calculateCustomerSegmentation(monthSales);
    
    // Product performance matrix
    const productMatrix = calculateProductPerformanceMatrix(monthSales);
    
    // Financial health score
    const financialHealth = calculateFinancialHealthScore(monthSales, monthBuying, monthDebts);
    
    // Market basket analysis
    const basketAnalysis = calculateMarketBasketAnalysis(monthSales);

    return {
      period: { year, month, monthStr },
      dailyTrends,
      customerSegmentation,
      productMatrix,
      financialHealth,
      basketAnalysis,
      rawData: {
        monthSales,
        monthBuying,
        monthDebts,
        monthCompanyDebts
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
    
    // Calculate moving averages
    dailyArray.forEach((day, index) => {
      const window = 3;
      const start = Math.max(0, index - Math.floor(window / 2));
      const end = Math.min(dailyArray.length, start + window);
      const windowData = dailyArray.slice(start, end);
      
      day.movingAverage = windowData.reduce((sum, d) => sum + d.totalRevenue, 0) / windowData.length;
      
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
          recency: 0,
          frequency: 0,
          monetary: 0,
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
  const calculateProductPerformanceMatrix = (monthSales) => {
    const productData = {};
    
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
        confidence: 0
      }))
      .filter(c => c.support >= 5)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      frequentCombinations,
      itemFrequency,
      totalCombinations: Object.keys(itemCombinations).length,
      avgBasketSize: monthSales.reduce((sum, s) => sum + (s.items?.length || 0), 0) / monthSales.length || 0
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
    
    for (let i = 0; i < 24; i++) {
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
          label: 'Revenue (Normalized to USD)',
          data: detailedReport.dailyTrends.map(d => d.totalRevenue), // Already normalized in data processing
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
      labels: [
        t.vipCustomers || 'VIP Customers', 
        t.highValueCustomers || 'High-Value', 
        t.frequentCustomers || 'Frequent', 
        t.recentCustomers || 'Recent', 
        t.atRiskCustomers || 'At-Risk'
      ],
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
          label: 'Revenue (Normalized)',
          data: products.map(p => normalizeCurrencyForChart(p.revenue, p.currency)),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2
        },
        {
          label: 'Profit (Normalized)',
          data: products.map(p => normalizeCurrencyForChart(p.profit, p.currency)),
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
            {t.advancedMonthlyAnalytics || 'Advanced Monthly Analytics'}
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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-xl p-8 border border-blue-200/20 dark:border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
              <Icon name="monthlyReports" size={40} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {t.advancedMonthlyAnalytics || 'Advanced Monthly Analytics'}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg mt-2">
                {t.comprehensiveBusinessIntelligence || 'Comprehensive business intelligence and performance insights'}
              </p>
              {detailedReport?.financialHealth && (
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t.healthScore || 'Health Score'}: {detailedReport.financialHealth.score.toFixed(0)}/100
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
                    {t.grade || 'Grade'} {detailedReport.financialHealth.grade}
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

      {/* Main Content Based on View Mode */}
      {detailedReport && (
        <>
          {/* Overview Mode */}
          {viewMode === 'overview' && (
            <div className="space-y-8">
              {/* Key Performance Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title={t.totalRevenue || "Total Revenue"}
                  value={formatCurrency(
                    detailedReport.rawData.monthSales.reduce((sum, s) => {
                      const amount = s.total || 0;
                      const currency = s.currency || 'USD';
                      return sum + normalizeCurrencyForChart(amount, currency);
                    }, 0),
                    'USD', t
                  )}
                  icon="dollar-sign"
                  gradient="bg-gradient-to-br from-green-500 to-emerald-600"
                  change={15.2}
                  changeType="positive"
                />
                
                <MetricCard
                  title={t.transactions || "Transactions"}
                  value={formatNumber(detailedReport.rawData.monthSales.length)}
                  icon="shopping-cart"
                  gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                  change={8.7}
                  changeType="positive"
                />
                
                <MetricCard
                  title={t.profitMargin || "Profit Margin"}
                  value={`${detailedReport.financialHealth.metrics.profitMargin.toFixed(1)}%`}
                  icon="trending-up"
                  gradient="bg-gradient-to-br from-purple-500 to-pink-600"
                  change={2.3}
                  changeType="positive"
                />
                
                <MetricCard
                  title={t.healthScore || "Health Score"}
                  value={`${detailedReport.financialHealth.score.toFixed(0)}/100`}
                  icon="heart"
                  gradient="bg-gradient-to-br from-orange-500 to-red-600"
                  change={-1.2}
                  changeType="negative"
                />
              </div>

              {/* Main Analytics Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <AdvancedLineChart
                  data={generateDailyTrendChart()}
                  title={t.dailyRevenueTrends || "Daily Revenue & Transaction Trends"}
                  height={350}
                  multiAxis={true}
                />
                
                <AdvancedDoughnutChart
                  data={generateCustomerSegmentChart()}
                  title={t.customerSegments || "Customer Segmentation"}
                  height={350}
                />
              </div>

              {/* Secondary Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <AdvancedBarChart
                  data={generateProductPerformanceChart()}
                  title={t.topPerformingProducts || "Top Products Performance"}
                  height={300}
                />
                
                <AdvancedRadarChart
                  data={generateFinancialHealthRadar()}
                  title={t.financialHealthAssessment || "Financial Health Assessment"}
                  height={300}
                />
                
                <AdvancedScatterChart
                  data={generateProductBCGMatrix()}
                  title="Product Portfolio Matrix"
                  height={300}
                />
              </div>
            </div>
          )}

          {/* Analytics Mode */}
          {viewMode === 'analytics' && (
            <div className="space-y-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-3">
                  <Icon name="bar-chart" size={24} className="text-blue-600" />
                  {t.advancedBusinessAnalytics || 'Advanced Business Analytics'}
                </h3>
                
                {/* Market Basket Analysis */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
                    🛒 {t.marketBasketAnalysis || 'Market Basket Analysis'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-600 dark:text-gray-400">
                        {t.frequentItemCombinations || 'Frequent Item Combinations'}
                      </h5>
                      {detailedReport.basketAnalysis.frequentCombinations.slice(0, 5).map((combo, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
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
                        📊 {t.insights || 'Insights'}
                      </h5>
                      <div className="space-y-2">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>{t.averageBasketSize || 'Average basket size'}:</strong> {detailedReport.basketAnalysis.avgBasketSize.toFixed(1)} {t.itemsUnits || 'items'}
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-sm text-green-800 dark:text-green-200">
                            <strong>{t.uniqueCombinations || 'Unique combinations'}:</strong> {detailedReport.basketAnalysis.totalCombinations} {t.found || 'found'}
                          </p>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                          <p className="text-sm text-purple-800 dark:text-purple-200">
                            <strong>{t.crossSellingOpportunity || 'Cross-selling opportunity: High potential for bundled offers'}</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Performance Metrics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                      📈 {t.dailyVolatilityAnalysis || 'Daily Volatility Analysis'}
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">{t.highestRevenueDay || 'Highest Revenue Day'}</span>
                        <span className="font-semibold text-green-600">
                          Day {detailedReport.dailyTrends.reduce((max, day, index) => 
                            day.totalRevenue > detailedReport.dailyTrends[max].totalRevenue ? index : max, 0) + 1}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">{t.mostVolatileDay || 'Most Volatile Day'}</span>
                        <span className="font-semibold text-red-600">
                          Day {detailedReport.dailyTrends.reduce((max, day, index) => 
                            day.volatility > detailedReport.dailyTrends[max].volatility ? index : max, 0) + 1}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">{t.avgDailyRevenue || 'Avg Daily Revenue'}</span>
                        <span className="font-semibold text-blue-600">
                          {(() => {
                            const avgRevenue = detailedReport.dailyTrends.reduce((sum, day) => sum + day.totalRevenue, 0) / detailedReport.dailyTrends.length || 0;
                            const usd = formatCurrency(avgRevenue, 'USD', t);
                            const iqd = formatCurrency(avgRevenue / EXCHANGE_RATES.IQD_TO_USD, 'IQD', t);
                            return `${usd} (≈${iqd})`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                      🎯 {t.performanceRecommendations || 'Performance Recommendations'}
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300">
                          📍 {t.focusOnCrossSelling || 'Focus on cross-selling top combinations to increase basket size'}
                        </p>
                      </div>
                      <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300">
                          💡 {t.considerInventoryAdjustments || 'Consider inventory adjustments for slow-moving items'}
                        </p>
                      </div>
                      <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300">
                          🚀 {t.implementLoyaltyPrograms || 'Implement loyalty programs for frequent customers'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Customers Mode */}
          {viewMode === 'customers' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Customer Segments Overview */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-3">
                    <Icon name="users" size={24} className="text-blue-600" />
                    {t.customerSegments || 'Customer Segments'}
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(detailedReport.customerSegmentation.segments).map(([key, customers]) => (
                      <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${
                            key === 'vip' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                            key === 'highValue' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                            key === 'frequent' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                            key === 'recent' ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                            'bg-gradient-to-r from-red-400 to-red-600'
                          }`}></div>
                          <span className="font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-xs text-gray-500 px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-full">
                            {key === 'vip' ? '💎' : key === 'highValue' ? '💰' : key === 'frequent' ? '🔄' : key === 'recent' ? '🆕' : '⚠️'}
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">{customers.length}</span>
                      </div>
                    ))}
                  </div>

                  {/* Customer Insights Summary */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">📊 {t.customerInsights || 'Customer Insights'}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Avg Frequency:</span>
                        <span className="font-semibold ml-2">{detailedReport.customerSegmentation.avgFrequency.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Avg Value:</span>
                        <span className="font-semibold ml-2">
                          {(() => {
                            const avgValue = detailedReport.customerSegmentation.avgMonetary;
                            const usd = formatCurrency(avgValue, 'USD', t);
                            const iqd = formatCurrency(avgValue / EXCHANGE_RATES.IQD_TO_USD, 'IQD', t);
                            return `${usd} (≈${iqd})`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Customers */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-3">
                    <Icon name="star" size={24} className="text-yellow-500" />
                    {t.topCustomersThisMonth || 'Top Customers This Month'}
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {detailedReport.customerSegmentation.customers.slice(0, 12).map((customer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                            {index < 3 && (
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                {index + 1}
                              </div>
                            )}
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
                          <div className="flex gap-1 mt-1 justify-end">
                            {customer.segments.map((segment, i) => (
                              <span key={i} className={`px-2 py-1 text-xs rounded-full font-medium ${
                                segment === 'VIP' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                segment === 'High-Value' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                segment === 'Frequent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                segment === 'Recent' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
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
          {viewMode === 'products' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* BCG Matrix Categories */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-3">
                    <Icon name="package" size={24} className="text-green-600" />
                    {t.productPortfolioAnalysis || 'Product Portfolio Analysis (BCG Matrix)'}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(detailedReport.productMatrix.categories).map(([category, products]) => (
                      <div key={category} className={`p-6 rounded-xl transition-all hover:scale-105 cursor-pointer ${
                        category === 'stars' ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:border-yellow-700' :
                        category === 'cashCows' ? 'bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 dark:from-green-900/30 dark:to-green-800/30 dark:border-green-700' :
                        category === 'questionMarks' ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 dark:from-blue-900/30 dark:to-blue-800/30 dark:border-blue-700' :
                        'bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 dark:from-red-900/30 dark:to-red-800/30 dark:border-red-700'
                      }`}>
                        <h4 className={`font-bold text-lg mb-3 ${
                          category === 'stars' ? 'text-yellow-800 dark:text-yellow-200' :
                          category === 'cashCows' ? 'text-green-800 dark:text-green-200' :
                          category === 'questionMarks' ? 'text-blue-800 dark:text-blue-200' :
                          'text-red-800 dark:text-red-200'
                        }`}>
                          {category === 'stars' ? `⭐ ${t.stars || 'Stars'}` :
                           category === 'cashCows' ? `🐄 ${t.cashCows || 'Cash Cows'}` :
                           category === 'questionMarks' ? `❓ ${t.questionMarks || 'Question Marks'}` :
                           `🐕 ${t.dogs || 'Dogs'}`}
                        </h4>
                        <p className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-200">{products.length}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{t.products || 'Products'}</p>
                        {products.length > 0 && (
                          <p className="text-xs mt-2 text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 p-2 rounded">
                            <strong>Top:</strong> {products[0]?.name.substring(0, 25)}...
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Products Detail */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-3">
                    <Icon name="trending-up" size={24} className="text-blue-600" />
                    {t.topPerformingProducts || 'Top Performing Products'}
                  </h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {detailedReport.productMatrix.products.slice(0, 10).map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </div>
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {product.name}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              product.category === 'Stars' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              product.category === 'Cash Cows' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              product.category === 'Question Marks' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {product.category}
                            </span>
                          </div>
                          <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
                            <span><strong>{product.sales}</strong> {t.sold || 'sold'}</span>
                            <span><strong>{product.marketShare.toFixed(1)}%</strong> {t.marketShare || 'market share'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-gray-800 dark:text-gray-200">
                            {formatCurrency(normalizeCurrencyForChart(product.revenue, product.currency), 'USD', t)}
                          </p>
                          <p className="text-sm text-green-600 font-medium">
                            +{formatCurrency(normalizeCurrencyForChart(product.profit, product.currency), 'USD', t)} profit
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
          {viewMode === 'financial' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Financial Health Score Card */}
                <div className="lg:col-span-1">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-8 text-white shadow-xl transform hover:scale-105 transition-all">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <Icon name="heart" size={24} />
                      {t.financialHealth || 'Financial Health'}
                    </h3>
                    <div className="text-center">
                      <div className="text-6xl font-bold mb-3">
                        {detailedReport.financialHealth.score.toFixed(0)}
                      </div>
                      <div className="text-xl opacity-90 mb-6">/ 100</div>
                      <div className={`inline-block px-6 py-3 rounded-full font-bold text-xl ${
                        detailedReport.financialHealth.grade.startsWith('A') 
                          ? 'bg-green-500 text-white shadow-lg'
                          : detailedReport.financialHealth.grade.startsWith('B')
                          ? 'bg-blue-500 text-white shadow-lg'
                          : detailedReport.financialHealth.grade.startsWith('C')
                          ? 'bg-yellow-500 text-black shadow-lg'
                          : 'bg-red-500 text-white shadow-lg'
                      }`}>
                        {t.grade || 'Grade'} {detailedReport.financialHealth.grade}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Financial Metrics */}
                <div className="lg:col-span-2">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-3">
                      <Icon name="dollar-sign" size={24} className="text-green-600" />
                      {t.keyFinancialMetrics || 'Key Financial Metrics'}
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <ComparisonMetric
                          current={detailedReport.financialHealth.metrics.revenue}
                          previous={0}
                          label={t.totalRevenue || "Total Revenue"}
                          formatter={(val) => {
                            const usd = formatCurrency(val, 'USD', t);
                            const iqd = formatCurrency(val / EXCHANGE_RATES.IQD_TO_USD, 'IQD', t);
                            return `${usd} (≈${iqd})`;
                          }}
                        />
                        <ComparisonMetric
                          current={detailedReport.financialHealth.metrics.profit}
                          previous={0}
                          label={t.netProfit || "Net Profit"}
                          formatter={(val) => {
                            const usd = formatCurrency(val, 'USD', t);
                            const iqd = formatCurrency(val / EXCHANGE_RATES.IQD_TO_USD, 'IQD', t);
                            return `${usd} (≈${iqd})`;
                          }}
                        />
                      </div>
                      <div className="space-y-4">
                        <ComparisonMetric
                          current={detailedReport.financialHealth.metrics.profitMargin}
                          previous={0}
                          label={t.profitMargin || "Profit Margin"}
                          formatter={(val) => `${val.toFixed(1)}%`}
                        />
                        <ComparisonMetric
                          current={detailedReport.financialHealth.metrics.avgTransactionSize}
                          previous={0}
                          label={t.avgTransaction || "Avg Transaction"}
                          formatter={(val) => {
                            const usd = formatCurrency(val, 'USD', t);
                            const iqd = formatCurrency(val / EXCHANGE_RATES.IQD_TO_USD, 'IQD', t);
                            return `${usd} (≈${iqd})`;
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Financial Health Breakdown */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900/30 rounded-lg">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">💡 {t.financialHealthBreakdown || 'Financial Health Breakdown'}</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <AdvancedProgressBar
                            value={Math.min(detailedReport.financialHealth.metrics.profitMargin * 3, 100)}
                            max={100}
                            color="bg-green-500"
                            label={t.profitability || "Profitability"}
                          />
                          <AdvancedProgressBar
                            value={Math.max(100 - detailedReport.financialHealth.metrics.debtToRevenue * 5, 0)}
                            max={100}
                            color="bg-blue-500"
                            label={t.liquidity || "Liquidity"}
                          />
                        </div>
                        <div className="space-y-2">
                          <AdvancedProgressBar
                            value={75}
                            max={100}
                            color="bg-purple-500"
                            label={t.growthPotential || "Growth Potential"}
                          />
                          <AdvancedProgressBar
                            value={Math.min(detailedReport.financialHealth.metrics.avgTransactionSize / 8, 100)}
                            max={100}
                            color="bg-orange-500"
                            label={t.efficiency || "Efficiency"}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other view modes would be implemented similarly... */}
          {!['overview', 'analytics', 'customers', 'products', 'financial'].includes(viewMode) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg text-center">
              <Icon name="construction" size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View Coming Soon
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Advanced {viewMode} analytics are being developed. Switch to Overview for now.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
