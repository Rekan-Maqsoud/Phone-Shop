import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import { EXCHANGE_RATES, formatCurrencyWithTranslation } from '../utils/exchangeRates';
import { Icon } from '../utils/icons.jsx';

const MonthlyReport = ({ admin, t }) => {
  const { sales, products, accessories, debts, buyingHistory } = useData();
  const { theme } = useTheme();
  const [selectedMonth, setSelectedMonth] = useState('');

  // Get available months from sales data
  const availableMonths = useMemo(() => {
    if (!sales || !Array.isArray(sales)) return [];
    
    const monthsSet = new Set();
    sales.forEach(sale => {
      const date = new Date(sale.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(monthKey);
    });
    
    // Add months from buying history as well
    if (buyingHistory && Array.isArray(buyingHistory)) {
      buyingHistory.forEach(purchase => {
        const date = new Date(purchase.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthsSet.add(monthKey);
      });
    }
    
    const months = Array.from(monthsSet).sort().reverse();
    return months.map(monthKey => {
      const [year, month] = monthKey.split('-');
      const date = new Date(year, month - 1);
      return {
        key: monthKey,
        label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      };
    });
  }, [sales, buyingHistory]);

  // Set default selected month to current month if available
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      const currentDate = new Date();
      const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const hasCurrentMonth = availableMonths.find(m => m.key === currentMonthKey);
      setSelectedMonth(hasCurrentMonth ? currentMonthKey : availableMonths[0].key);
    }
  }, [availableMonths, selectedMonth]);

  // Calculate monthly metrics
  const monthlyMetrics = useMemo(() => {
    if (!selectedMonth || !sales || !buyingHistory) {
      return {
        totalSales: { USD: 0, IQD: 0 },
        totalSpending: { USD: 0, IQD: 0 },
        totalProfit: { USD: 0, IQD: 0 },
        totalProductsSold: 0,
        totalAccessoriesSold: 0,
        totalProductProfit: { USD: 0, IQD: 0 },
        totalAccessoryProfit: { USD: 0, IQD: 0 },
        outstanding: { USD: 0, IQD: 0 }
      };
    }

    const [year, month] = selectedMonth.split('-');
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Filter data for selected month
    const monthSales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= startDate && saleDate <= endDate;
    });

    const monthPurchases = buyingHistory.filter(purchase => {
      const purchaseDate = new Date(purchase.created_at);
      return purchaseDate >= startDate && purchaseDate <= endDate;
    });

    // Calculate total sales
    const totalSales = { USD: 0, IQD: 0 };
    const totalProfit = { USD: 0, IQD: 0 };
    const totalProductProfit = { USD: 0, IQD: 0 };
    const totalAccessoryProfit = { USD: 0, IQD: 0 };
    let totalProductsSold = 0;
    let totalAccessoriesSold = 0;

    monthSales.forEach(sale => {
      // Only count paid sales for revenue
      const isPaid = !sale.is_debt || (debts && debts.find(d => d.sale_id === sale.id && d.paid_at));
      
      if (isPaid) {
        if (sale.multi_currency_payment) {
          totalSales.USD += sale.multi_currency_payment.usd_amount || 0;
          totalSales.IQD += sale.multi_currency_payment.iqd_amount || 0;
        } else {
          if (sale.currency === 'USD') {
            totalSales.USD += sale.total || 0;
          } else {
            totalSales.IQD += sale.total || 0;
          }
        }
      }

      // Calculate profit and quantities regardless of payment status
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          const quantity = item.quantity || 1;
          const sellingPrice = item.selling_price || 0;  
          const buyingPrice = item.buying_price || 0;
          const itemProfit = (sellingPrice - buyingPrice) * quantity;
          
          // Determine if it's a product or accessory
          const isProduct = products && products.find(p => p.id === item.product_id);
          const isAccessory = accessories && accessories.find(a => a.id === item.accessory_id);
          
          if (isProduct) {
            totalProductsSold += quantity;
            const itemCurrency = item.product_currency || isProduct.currency || 'USD';
            if (itemCurrency === 'USD') {
              totalProductProfit.USD += itemProfit;
            } else {
              totalProductProfit.IQD += itemProfit;
            }
          }
          
          if (isAccessory) {
            totalAccessoriesSold += quantity;
            const itemCurrency = item.accessory_currency || isAccessory.currency || 'USD';
            if (itemCurrency === 'USD') {
              totalAccessoryProfit.USD += itemProfit;
            } else {
              totalAccessoryProfit.IQD += itemProfit;
            }
          }

          // Add to total profit
          const itemCurrency = item.product_currency || item.accessory_currency || sale.currency || 'USD';
          if (itemCurrency === 'USD') {
            totalProfit.USD += itemProfit;
          } else {
            totalProfit.IQD += itemProfit;
          }
        });
      }
    });

    // Calculate total spending
    const totalSpending = { USD: 0, IQD: 0 };
    monthPurchases.forEach(purchase => {
      const amount = purchase.total_price || purchase.amount || 0;
      if (purchase.currency === 'USD') {
        totalSpending.USD += amount;
      } else {
        totalSpending.IQD += amount;
      }
    });

    // Calculate outstanding for the month (debts created in this month that are still unpaid)
    const outstanding = { USD: 0, IQD: 0 };
    const monthDebts = monthSales.filter(sale => sale.is_debt);
    monthDebts.forEach(sale => {
      const debt = debts && debts.find(d => d.sale_id === sale.id);
      if (!debt || !debt.paid_at) {
        if (sale.currency === 'USD') {
          outstanding.USD += sale.total || 0;
        } else {
          outstanding.IQD += sale.total || 0;
        }
      }
    });

    return {
      totalSales,
      totalSpending,
      totalProfit,
      totalProductsSold,
      totalAccessoriesSold,
      totalProductProfit,
      totalAccessoryProfit,
      outstanding
    };
  }, [selectedMonth, sales, buyingHistory, debts, products, accessories]);

  const formatCurrency = (amount, currency = 'USD') => {
    return formatCurrencyWithTranslation(amount, currency, t);
  };

  const isDarkMode = theme === 'dark' || (theme === 'system' && document.documentElement.classList.contains('dark'));

  return (
    <div className="p-6 space-y-6">
      {/* Header with Month Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t.monthlyReport || 'Monthly Report'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t.monthlyReportDesc || 'Comprehensive monthly business overview'}
          </p>
        </div>
        
        {/* Month Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t.selectMonth || 'Select Month'}:
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">{t.selectMonth || 'Select Month'}</option>
            {availableMonths.map(month => (
              <option key={month.key} value={month.key}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Monthly Metrics Grid */}
      {selectedMonth && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Total Sales */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Icon name="dollarSign" size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t.totalSales || 'Total Sales'}
                </h3>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(monthlyMetrics.totalSales.USD, 'USD')}
              </div>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(monthlyMetrics.totalSales.IQD, 'IQD')}
              </div>
            </div>
          </div>

          {/* Total Spending */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <Icon name="minus" size={20} className="text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t.totalSpending || 'Total Spending'}
                </h3>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(monthlyMetrics.totalSpending.USD, 'USD')}
              </div>
              <div className="text-xl font-bold text-red-600">
                {formatCurrency(monthlyMetrics.totalSpending.IQD, 'IQD')}
              </div>
            </div>
          </div>

          {/* Total Profit */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Icon name="trendingUp" size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t.totalProfit || 'Total Profit'}
                </h3>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(monthlyMetrics.totalProfit.USD, 'USD')}
              </div>
              <div className="text-xl font-bold text-blue-600">
                {formatCurrency(monthlyMetrics.totalProfit.IQD, 'IQD')}
              </div>
            </div>
          </div>

          {/* Total Products Sold */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Icon name="smartphone" size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t.totalProductsSold || 'Total Products Sold'}
                </h3>
              </div>
            </div>
            <div className="text-3xl font-bold text-purple-600">
              {monthlyMetrics.totalProductsSold.toLocaleString()}
            </div>
          </div>

          {/* Total Accessories Sold */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Icon name="package" size={20} className="text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t.totalAccessoriesSold || 'Total Accessories Sold'}
                </h3>
              </div>
            </div>
            <div className="text-3xl font-bold text-orange-600">
              {monthlyMetrics.totalAccessoriesSold.toLocaleString()}
            </div>
          </div>

          {/* Total Product Profit */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-900/20 rounded-lg">
                  <Icon name="smartphone" size={20} className="text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t.totalProductProfit || 'Total Product Profit'}
                </h3>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-cyan-600">
                {formatCurrency(monthlyMetrics.totalProductProfit.USD, 'USD')}
              </div>
              <div className="text-xl font-bold text-cyan-600">
                {formatCurrency(monthlyMetrics.totalProductProfit.IQD, 'IQD')}
              </div>
            </div>
          </div>

          {/* Total Accessory Profit */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 dark:bg-pink-900/20 rounded-lg">
                  <Icon name="package" size={20} className="text-pink-600 dark:text-pink-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t.totalAccessoryProfit || 'Total Accessory Profit'}
                </h3>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-pink-600">
                {formatCurrency(monthlyMetrics.totalAccessoryProfit.USD, 'USD')}
              </div>
              <div className="text-xl font-bold text-pink-600">
                {formatCurrency(monthlyMetrics.totalAccessoryProfit.IQD, 'IQD')}
              </div>
            </div>
          </div>

          {/* Outstanding of the Month */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <Icon name="alertCircle" size={20} className="text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t.outstandingOfMonth || 'Outstanding of the Month'}
                </h3>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(monthlyMetrics.outstanding.USD, 'USD')}
              </div>
              <div className="text-xl font-bold text-yellow-600">
                {formatCurrency(monthlyMetrics.outstanding.IQD, 'IQD')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!selectedMonth && (
        <div className="text-center py-12">
          <Icon name="calendar" size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t.selectMonthToView || 'Select a month to view report'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {t.selectMonthDesc || 'Choose a month from the dropdown above to see the detailed monthly report'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {selectedMonth && availableMonths.length === 0 && (
        <div className="text-center py-12">
          <Icon name="barChart3" size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t.noDataAvailable || 'No data available'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {t.noDataDesc || 'There is no sales or purchase data available for reporting'}
          </p>
        </div>
      )}
    </div>
  );
};

export default MonthlyReport;
