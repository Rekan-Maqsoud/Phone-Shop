import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocale } from '../contexts/LocaleContext';
import { useTheme } from '../contexts/ThemeContext';
import { EXCHANGE_RATES, formatCurrencyWithTranslation } from '../utils/exchangeRates';
import { Icon } from '../utils/icons.jsx';
import { Line, Bar } from 'react-chartjs-2';
import {
  chartColors,
  getBaseChartOptions,
  getMultiLineChartOptions,
  getBarChartOptions,
  processTimeSeriesData,
  aggregateByPeriod,
  calculateGrowthRate,
  generateTrendLine,
  resetChartZoom,
  exportChartAsImage,
  formatChartCurrency,
  convertCurrency
} from '../utils/advancedCharts';

const AdvancedAnalyticsAndReports = ({ admin, t }) => {
  const { sales, products, accessories, inventory } = useData();
  const { currentLocale } = useLocale();
  const { theme } = useTheme();
  
  // Derive isDarkMode from theme
  const isDarkMode = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    // For 'system' theme, check if dark class is present on document
    return document.documentElement.classList.contains('dark');
  }, [theme]);
  
  // State for chart controls
  const [viewPeriod, setViewPeriod] = useState('daily'); // daily, weekly, monthly
  const [comparisonMode, setComparisonMode] = useState('period'); // period, year-over-year
  const [selectedCurrency, setSelectedCurrency] = useState('combined'); // USD, IQD, combined
  const [selectedMetrics, setSelectedMetrics] = useState(['sales', 'profit', 'growth']);
  const [dateRange, setDateRange] = useState('30days'); // 7days, 30days, 90days, 1year, all
  
  // Chart refs for zoom/export functionality
  const salesChartRef = useRef(null);
  const profitChartRef = useRef(null);
  const comparisonChartRef = useRef(null);
  const growthChartRef = useRef(null);

  // Filter data based on date range
  const getDateRangeFilter = useMemo(() => {
    const now = new Date();
    const ranges = {
      '7days': new Date(now.setDate(now.getDate() - 7)),
      '30days': new Date(now.setDate(now.getDate() - 30)),
      '90days': new Date(now.setDate(now.getDate() - 90)),
      '1year': new Date(now.setFullYear(now.getFullYear() - 1)),
      'all': new Date(0)
    };
    return ranges[dateRange] || ranges['30days'];
  }, [dateRange]);

  // Process sales data with profit calculations
  const processedSalesData = useMemo(() => {
    if (!sales || !Array.isArray(sales)) return [];
    
    const filteredSales = sales.filter(sale => 
      new Date(sale.created_at) >= getDateRangeFilter
    );

    return filteredSales.map(sale => {
      let profit = 0;
      let cost = 0;
      
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          const product = products?.find(p => p.id === item.product_id);
          const accessory = accessories?.find(a => a.id === item.accessory_id);
          
          if (product) {
            const itemCost = (product.cost || 0) * item.quantity;
            const itemRevenue = item.unit_price * item.quantity;
            cost += convertCurrency(itemCost, product.currency, sale.currency);
            profit += convertCurrency(itemRevenue, sale.currency, sale.currency) - convertCurrency(itemCost, product.currency, sale.currency);
          }
          
          if (accessory) {
            const itemCost = (accessory.cost || 0) * item.quantity;
            const itemRevenue = item.unit_price * item.quantity;
            cost += convertCurrency(itemCost, accessory.currency, sale.currency);
            profit += convertCurrency(itemRevenue, sale.currency, sale.currency) - convertCurrency(itemCost, accessory.currency, sale.currency);
          }
        });
      }

      return {
        ...sale,
        profit,
        cost,
        revenue: sale.total_amount
      };
    });
  }, [sales, products, accessories, getDateRangeFilter]);

  // Aggregate sales data by period
  const aggregatedSalesData = useMemo(() => {
    const salesTimeSeries = processTimeSeriesData(
      processedSalesData,
      'created_at',
      'total_amount',
      'USD'
    );
    
    return aggregateByPeriod(salesTimeSeries, viewPeriod, 'y');
  }, [processedSalesData, viewPeriod]);

  // Aggregate profit data by period
  const aggregatedProfitData = useMemo(() => {
    const profitTimeSeries = processTimeSeriesData(
      processedSalesData,
      'created_at',
      'profit',
      'USD'
    );
    
    return aggregateByPeriod(profitTimeSeries, viewPeriod, 'y');
  }, [processedSalesData, viewPeriod]);

  // Calculate spending data from inventory
  const spendingData = useMemo(() => {
    if (!inventory || !Array.isArray(inventory)) return [];
    
    const filteredSpending = inventory.filter(item =>
      new Date(item.created_at) >= getDateRangeFilter
    );

    const spendingTimeSeries = processTimeSeriesData(
      filteredSpending,
      'created_at',
      'total_cost',
      'USD'
    );
    
    return aggregateByPeriod(spendingTimeSeries, viewPeriod, 'y');
  }, [inventory, getDateRangeFilter, viewPeriod]);

  // Calculate net growth
  const netGrowthData = useMemo(() => {
    const maxLength = Math.max(
      aggregatedSalesData.length,
      spendingData.length
    );
    
    const growthData = [];
    
    for (let i = 0; i < maxLength; i++) {
      const sales = aggregatedSalesData[i]?.y || 0;
      const spending = spendingData[i]?.y || 0;
      const date = aggregatedSalesData[i]?.x || spendingData[i]?.x;
      
      if (date) {
        growthData.push({
          x: date,
          y: sales - spending,
          currency: 'USD'
        });
      }
    }
    
    return growthData;
  }, [aggregatedSalesData, spendingData]);

  // Products vs Accessories breakdown
  const productAccessoryBreakdown = useMemo(() => {
    const breakdown = { products: [], accessories: [] };
    
    processedSalesData.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          const isProduct = products?.find(p => p.id === item.product_id);
          const isAccessory = accessories?.find(a => a.id === item.accessory_id);
          
          const revenue = item.unit_price * item.quantity;
          const date = new Date(sale.created_at);
          
          if (isProduct) {
            breakdown.products.push({
              x: date,
              y: convertCurrency(revenue, sale.currency, 'USD'),
              currency: 'USD'
            });
          }
          
          if (isAccessory) {
            breakdown.accessories.push({
              x: date,
              y: convertCurrency(revenue, sale.currency, 'USD'),
              currency: 'USD'
            });
          }
        });
      }
    });
    
    return {
      products: aggregateByPeriod(breakdown.products, viewPeriod, 'y'),
      accessories: aggregateByPeriod(breakdown.accessories, viewPeriod, 'y')
    };
  }, [processedSalesData, products, accessories, viewPeriod]);

  // Currency-specific data
  const currencySpecificData = useMemo(() => {
    const usdSales = processedSalesData.filter(sale => sale.currency === 'USD');
    const iqdSales = processedSalesData.filter(sale => sale.currency === 'IQD');
    
    // Convert USD sales to IQD equivalent for better visualization
    const usdSalesData = aggregateByPeriod(processTimeSeriesData(usdSales, 'created_at', 'total_amount', 'USD'), viewPeriod, 'y');
    const usdProfitData = aggregateByPeriod(processTimeSeriesData(usdSales, 'created_at', 'profit', 'USD'), viewPeriod, 'y');
    
    // Convert USD amounts to IQD equivalent for comparison
    const usdToIqdSales = usdSalesData.map(item => ({
      ...item,
      y: item.y * EXCHANGE_RATES.USD_TO_IQD // Convert USD to IQD equivalent
    }));
    
    const usdToIqdProfit = usdProfitData.map(item => ({
      ...item,
      y: item.y * EXCHANGE_RATES.USD_TO_IQD // Convert USD to IQD equivalent
    }));
    
    return {
      USD: {
        sales: usdToIqdSales, // Now showing IQD equivalent of USD
        profit: usdToIqdProfit // Now showing IQD equivalent of USD
      },
      IQD: {
        sales: aggregateByPeriod(processTimeSeriesData(iqdSales, 'created_at', 'total_amount', 'IQD'), viewPeriod, 'y'),
        profit: aggregateByPeriod(processTimeSeriesData(iqdSales, 'created_at', 'profit', 'IQD'), viewPeriod, 'y')
      }
    };
  }, [processedSalesData, viewPeriod]);

  // Chart data configurations
  const salesChartData = {
    datasets: [
      {
        label: 'Total Sales',
        data: aggregatedSalesData,
        borderColor: chartColors.primary.solid,
        backgroundColor: chartColors.primary.lighter,
        fill: true,
        currency: 'USD',
        yAxisID: 'y'
      },
      {
        label: 'Spending',
        data: spendingData,
        borderColor: chartColors.danger.solid,
        backgroundColor: chartColors.danger.lighter,
        fill: true,
        currency: 'USD',
        yAxisID: 'y'
      }
    ]
  };

  const profitChartData = {
    datasets: [
      {
        label: 'Profit',
        data: aggregatedProfitData,
        borderColor: chartColors.success.solid,
        backgroundColor: chartColors.success.lighter,
        fill: true,
        currency: 'USD'
      },
      {
        label: 'Trend',
        data: generateTrendLine(aggregatedProfitData),
        borderColor: chartColors.warning.solid,
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        pointRadius: 0,
        currency: 'USD'
      }
    ]
  };

  const comparisonChartData = {
    datasets: [
      {
        label: 'Products Sales',
        data: productAccessoryBreakdown.products,
        backgroundColor: chartColors.primary.solid,
        currency: 'USD'
      },
      {
        label: 'Accessories Sales',
        data: productAccessoryBreakdown.accessories,
        backgroundColor: chartColors.purple.solid,
        currency: 'USD'
      }
    ]
  };

  const growthChartData = {
    datasets: [
      {
        label: 'Net Growth',
        data: netGrowthData,
        borderColor: netGrowthData.some(d => d.y < 0) ? chartColors.warning.solid : chartColors.success.solid,
        backgroundColor: netGrowthData.some(d => d.y < 0) ? chartColors.warning.lighter : chartColors.success.lighter,
        fill: true,
        currency: 'USD'
      }
    ]
  };

  // Currency-specific chart data
  const currencyChartData = {
    datasets: [
      {
        label: 'USD Sales (IQD Equivalent)',
        data: currencySpecificData.USD.sales,
        borderColor: chartColors.primary.solid,
        backgroundColor: chartColors.primary.lighter,
        yAxisID: 'y',
        currency: 'IQD' // Display as IQD since we converted
      },
      {
        label: 'IQD Sales',
        data: currencySpecificData.IQD.sales,
        borderColor: chartColors.cyan.solid,
        backgroundColor: chartColors.cyan.lighter,
        yAxisID: 'y1',
        currency: 'IQD'
      }
    ]
  };

  // Summary calculations
  const summary = useMemo(() => {
    const totalSales = aggregatedSalesData.reduce((sum, item) => sum + item.y, 0);
    const totalProfit = aggregatedProfitData.reduce((sum, item) => sum + item.y, 0);
    const totalSpending = spendingData.reduce((sum, item) => sum + item.y, 0);
    const netGrowth = totalSales - totalSpending;
    
    const avgSalesPerPeriod = aggregatedSalesData.length > 0 ? totalSales / aggregatedSalesData.length : 0;
    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
    
    const productsSales = productAccessoryBreakdown.products.reduce((sum, item) => sum + item.y, 0);
    const accessoriesSales = productAccessoryBreakdown.accessories.reduce((sum, item) => sum + item.y, 0);
    
    return {
      totalSales,
      totalProfit,
      totalSpending,
      netGrowth,
      avgSalesPerPeriod,
      profitMargin,
      productsSales,
      accessoriesSales,
      growth: calculateGrowthRate(
        aggregatedSalesData[aggregatedSalesData.length - 1]?.y || 0,
        aggregatedSalesData[Math.max(0, aggregatedSalesData.length - 2)]?.y || 0
      )
    };
  }, [aggregatedSalesData, aggregatedProfitData, spendingData, productAccessoryBreakdown]);

  const handleExportChart = (chartRef, name) => {
    exportChartAsImage(chartRef, `${name}-${viewPeriod}-${dateRange}`);
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return formatCurrencyWithTranslation(amount, currency, t);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Advanced Analytics & Reports
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive business insights with interactive charts
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="7days">{t?.last7Days || 'Last 7 Days'}</option>
            <option value="30days">{t?.last30Days || 'Last 30 Days'}</option>
            <option value="90days">{t?.last90Days || 'Last 90 Days'}</option>
            <option value="1year">{t?.lastYear || 'Last Year'}</option>
            <option value="all">{t?.allTime || 'All Time'}</option>
          </select>
          
          <select
            value={viewPeriod}
            onChange={(e) => setViewPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="daily">{t?.daily || 'Daily'}</option>
            <option value="weekly">{t?.weekly || 'Weekly'}</option>
            <option value="monthly">{t?.monthly || 'Monthly'}</option>
          </select>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales vs Spending Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t?.salesVsSpending || 'Sales vs Spending'}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => resetChartZoom(salesChartRef)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title={t?.resetZoom || 'Reset Zoom'}
              >
                <Icon name="RotateCcw" className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleExportChart(salesChartRef, 'sales-spending')}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title={t?.exportChart || 'Export Chart'}
              >
                <Icon name="Download" className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="h-80">
            <Line
              ref={salesChartRef}
              data={salesChartData}
              options={getMultiLineChartOptions('Sales vs Spending Trends', isDarkMode)}
            />
          </div>
        </div>

        {/* Profit Analysis Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t?.profitAnalysis || 'Profit Analysis'}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => resetChartZoom(profitChartRef)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title={t?.resetZoom || 'Reset Zoom'}
              >
                <Icon name="RotateCcw" className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleExportChart(profitChartRef, 'profit-analysis')}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title={t?.exportChart || 'Export Chart'}
              >
                <Icon name="Download" className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="h-80">
            <Line
              ref={profitChartRef}
              data={profitChartData}
              options={getBaseChartOptions('Profit Trends with Forecast', 'Profit Amount', isDarkMode)}
            />
          </div>
        </div>

        {/* Products vs Accessories Comparison */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t?.productsVsAccessories || 'Products vs Accessories'}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => resetChartZoom(comparisonChartRef)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title={t?.resetZoom || 'Reset Zoom'}
              >
                <Icon name="RotateCcw" className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleExportChart(comparisonChartRef, 'products-accessories')}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title={t?.exportChart || 'Export Chart'}
              >
                <Icon name="Download" className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="h-80">
            <Bar
              ref={comparisonChartRef}
              data={comparisonChartData}
              options={getBarChartOptions('Products vs Accessories Sales', isDarkMode)}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>{t?.productsTotal || 'Products Total'}: {formatCurrency(summary.productsSales)}</span>
              <span>{t?.accessoriesTotal || 'Accessories Total'}: {formatCurrency(summary.accessoriesSales)}</span>
            </div>
          </div>
        </div>

        {/* Net Growth Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t?.netGrowthAnalysis || 'Net Growth Analysis'}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => resetChartZoom(growthChartRef)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title={t?.resetZoom || 'Reset Zoom'}
              >
                <Icon name="RotateCcw" className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleExportChart(growthChartRef, 'net-growth')}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title={t?.exportChart || 'Export Chart'}
              >
                <Icon name="Download" className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="h-80">
            <Line
              ref={growthChartRef}
              data={growthChartData}
              options={getBaseChartOptions('Net Growth (Sales - Spending)', 'Net Amount', isDarkMode)}
            />
          </div>
        </div>
      </div>

      {/* Currency Breakdown */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Currency Breakdown
        </h3>
        <div className="h-80">
          <Line
            data={currencyChartData}
            options={getMultiLineChartOptions('USD (IQD Equivalent) vs IQD Sales Comparison', isDarkMode)}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400">{t?.usdSalesTotal || 'USD Sales Total'} ({t?.iqdEquivalent || 'IQD Equivalent'})</p>
            <p className="text-lg font-bold text-blue-600">
              {formatCurrency(currencySpecificData.USD.sales.reduce((sum, item) => sum + item.y, 0), 'IQD')}
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">{t?.iqdSalesTotal || 'IQD Sales Total'}</p>
            <p className="text-lg font-bold text-cyan-600">
              {formatCurrency(currencySpecificData.IQD.sales.reduce((sum, item) => sum + item.y, 0), 'IQD')}
            </p>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Chart Interaction Guide
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• <strong>{t?.chartGuideZoom || 'Zoom: Scroll mouse wheel over chart'}</strong></li>
          <li>• <strong>{t?.chartGuidePan || 'Pan: Hold Ctrl and drag to move around'}</strong></li>
          <li>• <strong>{t?.chartGuideReset || 'Reset: Click the reset button or double-click chart'}</strong></li>
          <li>• <strong>{t?.chartGuideExport || 'Export: Click download button to save as PNG'}</strong></li>
          <li>• <strong>{t?.chartGuideTooltip || 'Tooltip: Hover over data points for details'}</strong></li>
        </ul>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsAndReports;
