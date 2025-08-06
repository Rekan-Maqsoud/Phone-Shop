import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { EXCHANGE_RATES, formatCurrencyWithTranslation } from '../utils/exchangeRates';
import { Icon } from '../utils/icons.jsx';

const MonthlyReport = ({ t }) => {
  const { 
    sales, 
    products, 
    accessories, 
    debts, 
    buyingHistory, 
    companyDebts, 
    incentives, 
    transactions,
    calculateRemainingCustomerDebt,
    calculateRemainingCompanyDebt
  } = useData();
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
        const date = new Date(purchase.date || purchase.created_at);
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
        totalPersonalLoans: { USD: 0, IQD: 0 },
        totalProfit: { USD: 0, IQD: 0 },
        totalProductsSold: 0,
        totalAccessoriesSold: 0,
        totalProductProfit: { USD: 0, IQD: 0 },
        totalAccessoryProfit: { USD: 0, IQD: 0 },
        outstanding: { USD: 0, IQD: 0 },
        companyOutstanding: { USD: 0, IQD: 0 }
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

      // Count products and accessories only for paid sales (same logic as Sales History)
      if (isPaid && sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          const quantity = item.quantity || 1;
          
          // Determine if it's a product or accessory
          const isProduct = !item.is_accessory && products && products.find(p => p.id === item.product_id);
          const isAccessory = item.is_accessory && accessories && accessories.find(a => a.id === item.product_id);
          
          if (isProduct) {
            totalProductsSold += quantity;
          }
          
          if (isAccessory) {
            totalAccessoriesSold += quantity;
          }
        });
      }

      // Calculate profit for this sale - Include ALL sales for profit calculation (paid + unpaid debts)
      // This ensures total profit includes future profits from unpaid customer debts
      if (sale.items && Array.isArray(sale.items)) {
          // Calculate total buying cost for this sale
          let totalBuyingCostUSD = 0;
          let totalBuyingCostIQD = 0;
          let productBuyingCostUSD = 0;
          let productBuyingCostIQD = 0;
          let accessoryBuyingCostUSD = 0;
          let accessoryBuyingCostIQD = 0;
          
          sale.items.forEach(item => {
            const quantity = item.quantity || 1;
            const buyingPrice = item.buying_price || 0;
            const itemCurrency = item.product_currency || 'IQD';
            const isProduct = !item.is_accessory && products && products.find(p => p.id === item.product_id);
            const isAccessory = item.is_accessory && accessories && accessories.find(a => a.id === item.product_id);
            
            const totalBuyingForItem = buyingPrice * quantity;
            
            if (itemCurrency === 'USD') {
              totalBuyingCostUSD += totalBuyingForItem;
              if (isProduct) productBuyingCostUSD += totalBuyingForItem;
              if (isAccessory) accessoryBuyingCostUSD += totalBuyingForItem;
            } else {
              totalBuyingCostIQD += totalBuyingForItem;
              if (isProduct) productBuyingCostIQD += totalBuyingForItem;
              if (isAccessory) accessoryBuyingCostIQD += totalBuyingForItem;
            }
          });
          
          // Calculate profit based on sale total (includes unpaid debt profits)
          let actualSaleProfitUSD = 0;
          let actualSaleProfitIQD = 0;
          
          if (sale.multi_currency_payment) {
            // For multi-currency sales
            const totalBuyingInUSD = totalBuyingCostUSD + (totalBuyingCostIQD * (sale.exchange_rate_iqd_to_usd || 0.000694));
            const totalPaidInUSD = (sale.multi_currency_payment.usd_amount || 0) + 
                                  ((sale.multi_currency_payment.iqd_amount || 0) * (sale.exchange_rate_iqd_to_usd || 0.000694));
            
            const totalProfitUSD = totalPaidInUSD - totalBuyingInUSD;
            
            // Split profit proportionally between currencies based on payment
            const totalPaidAmount = totalPaidInUSD || 1; // Avoid division by zero
            const usdRatio = (sale.multi_currency_payment.usd_amount || 0) / totalPaidAmount;
            const iqdRatio = ((sale.multi_currency_payment.iqd_amount || 0) * (sale.exchange_rate_iqd_to_usd || 0.000694)) / totalPaidAmount;
            
            actualSaleProfitUSD = totalProfitUSD * usdRatio;
            actualSaleProfitIQD = (totalProfitUSD * iqdRatio) / (sale.exchange_rate_iqd_to_usd || 0.000694);
          } else {
            // Single currency sale - use sale.total which accounts for discounts
            const saleTotal = sale.total || 0;
            if (sale.currency === 'USD') {
              actualSaleProfitUSD = saleTotal - totalBuyingCostUSD - (totalBuyingCostIQD * (sale.exchange_rate_iqd_to_usd || 0.000694));
            } else {
              actualSaleProfitIQD = saleTotal - totalBuyingCostIQD - (totalBuyingCostUSD * (sale.exchange_rate_usd_to_iqd || 1390));
            }
          }
          
          // Add to total profits (now includes unpaid debt profits)
          totalProfit.USD += actualSaleProfitUSD;
          totalProfit.IQD += actualSaleProfitIQD;
          
          // Calculate product and accessory profits proportionally
          const totalBuyingCostAllUSD = totalBuyingCostUSD + (totalBuyingCostIQD * (sale.exchange_rate_iqd_to_usd || 0.000694));
          const productBuyingCostAllUSD = productBuyingCostUSD + (productBuyingCostIQD * (sale.exchange_rate_iqd_to_usd || 0.000694));
          const accessoryBuyingCostAllUSD = accessoryBuyingCostUSD + (accessoryBuyingCostIQD * (sale.exchange_rate_iqd_to_usd || 0.000694));
          
          if (totalBuyingCostAllUSD > 0) {
            const productProfitRatio = productBuyingCostAllUSD / totalBuyingCostAllUSD;
            const accessoryProfitRatio = accessoryBuyingCostAllUSD / totalBuyingCostAllUSD;
            
            // Allocate profits proportionally (now includes unpaid debt profits)
            totalProductProfit.USD += actualSaleProfitUSD * productProfitRatio;
            totalProductProfit.IQD += actualSaleProfitIQD * productProfitRatio;
            totalAccessoryProfit.USD += actualSaleProfitUSD * accessoryProfitRatio;
            totalAccessoryProfit.IQD += actualSaleProfitIQD * accessoryProfitRatio;
          }
      }
    });

    // Calculate total spending - use EXACT same logic as BuyingHistoryTable calculateTotals
    const totalSpending = { USD: 0, IQD: 0 };
    
    // Filter buying history for the selected month
    if (buyingHistory && Array.isArray(buyingHistory)) {
      const monthBuyingHistory = buyingHistory.filter(purchase => {
        if (!purchase.date && !purchase.created_at) return false;
        const purchaseDate = new Date(purchase.date || purchase.created_at);
        return purchaseDate >= startDate && purchaseDate <= endDate;
      });

      // Use EXACT same calculation logic as BuyingHistoryTable
      monthBuyingHistory.forEach(entry => {
        const currency = entry.currency || 'IQD';
        
        if (currency === 'MULTI') {
          // For multi-currency entries, add the actual amounts to their respective totals
          totalSpending.USD += entry.multi_currency_usd || 0;
          totalSpending.IQD += entry.multi_currency_iqd || 0;
        } else {
          const amount = entry.total_price || entry.amount || 0;
          if (currency === 'USD') {
            totalSpending.USD += amount;
          } else {
            totalSpending.IQD += amount;
          }
        }
      });
    }

    // DO NOT ADD TRANSACTIONS - only use buying history for spending
    // Adding transactions was causing double counting since buying history already includes all purchases

    // Calculate personal loans given out during the month (separate from operational spending)
    const totalPersonalLoans = { USD: 0, IQD: 0 };
    if (transactions && Array.isArray(transactions)) {
      const monthTransactions = transactions.filter(transaction => {
        if (!transaction.created_at) return false;
        const transactionDate = new Date(transaction.created_at);
        return transactionDate >= startDate && transactionDate <= endDate;
      });

      monthTransactions.forEach(transaction => {
        // Only include personal loan transactions (money lent out)
        if (transaction.type === 'personal_loan' && (transaction.amount_usd < 0 || transaction.amount_iqd < 0)) {
          if (transaction.amount_usd < 0) {
            totalPersonalLoans.USD += Math.abs(transaction.amount_usd);
          }
          if (transaction.amount_iqd < 0) {
            totalPersonalLoans.IQD += Math.abs(transaction.amount_iqd);
          }
        }
      });
    }

    // Helper function to calculate remaining debt amount using utility from DataContext
    const calculateRemainingDebtAmount = (sale, debt) => {
      return calculateRemainingCustomerDebt(sale, debt);
    };

    // Calculate outstanding for the month (debts created in this month that are still unpaid)
    // Use REMAINING debt amounts instead of total amounts
    const outstanding = { USD: 0, IQD: 0 };
    const monthDebts = monthSales.filter(sale => sale.is_debt);
    monthDebts.forEach(sale => {
      const debt = debts && debts.find(d => d.sale_id === sale.id);
      const remaining = calculateRemainingDebtAmount(sale, debt);
      
      if (remaining.amount > 0) {
        if (remaining.currency === 'USD') {
          outstanding.USD += remaining.amount;
        } else if (remaining.currency === 'IQD') {
          outstanding.IQD += remaining.amount;
        }
      }
    });

    // Calculate company debts for the month (company debts created in this month with remaining amounts)
    // Use REMAINING debt amounts instead of total amounts using utility function
    const companyOutstanding = { USD: 0, IQD: 0 };
    if (companyDebts && Array.isArray(companyDebts)) {
      const monthCompanyDebts = companyDebts.filter(debt => {
        const debtDate = new Date(debt.created_at);
        const debtMonthKey = `${debtDate.getFullYear()}-${String(debtDate.getMonth() + 1).padStart(2, '0')}`;
        return debtMonthKey === selectedMonth && !debt.paid_at;
      });

      monthCompanyDebts.forEach(debt => {
        const remaining = calculateRemainingCompanyDebt(debt);
        companyOutstanding.USD += remaining.USD;
        companyOutstanding.IQD += remaining.IQD;
      });
    }

    // Add incentives to profit
    if (incentives && Array.isArray(incentives)) {
      const monthIncentives = incentives.filter(incentive => {
        const incentiveDate = new Date(incentive.created_at);
        const incentiveMonthKey = `${incentiveDate.getFullYear()}-${String(incentiveDate.getMonth() + 1).padStart(2, '0')}`;
        return incentiveMonthKey === selectedMonth;
      });

      monthIncentives.forEach(incentive => {
        if (incentive.currency === 'USD') {
          totalProfit.USD += incentive.amount || 0;
        } else if (incentive.currency === 'IQD') {
          totalProfit.IQD += incentive.amount || 0;
        }
      });
    }

    return {
      totalSales,
      totalSpending, // Includes all purchases + debt payments
      totalPersonalLoans, // Personal loans given out
      totalProfit,
      totalProductsSold,
      totalAccessoriesSold,
      totalProductProfit,
      totalAccessoryProfit,
      outstanding,
      companyOutstanding
    };
  }, [selectedMonth, sales, buyingHistory, debts, products, accessories, companyDebts, incentives, transactions]);

  const formatCurrency = (amount, currency = 'USD') => {
    return formatCurrencyWithTranslation(amount, currency, t);
  };

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
        <div className="space-y-6">
          {/* Row 1: Main Financial Metrics (3 items) */}
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
          </div>

          {/* Row 2: Sales and Profit Details (4 items) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          </div>

          {/* Row 3: Outstanding and Personal Loans (3 items) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Outstanding of the Month (Customer Debts) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                    <Icon name="alertCircle" size={20} className="text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t?.customerOutstandingOfMonth || 'Customer Outstanding'}
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

          {/* Company Outstanding of the Month */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Icon name="building" size={20} className="text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t?.companyOutstandingOfMonth || 'Company Outstanding'}
                </h3>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(monthlyMetrics.companyOutstanding.USD, 'USD')}
              </div>
              <div className="text-xl font-bold text-orange-600">
                {formatCurrency(monthlyMetrics.companyOutstanding.IQD, 'IQD')}
              </div>
            </div>
          </div>

          {/* Total Personal Loans - Moved to the end */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/20 rounded-lg">
                  <Icon name="handshake" size={20} className="text-teal-600 dark:text-teal-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t.totalPersonalLoans || 'Personal Loans Given'}
                </h3>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t.moneyLentOut || 'Money Lent Out'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-teal-600">
                {formatCurrency(monthlyMetrics.totalPersonalLoans.USD, 'USD')}
              </div>
              <div className="text-xl font-bold text-teal-600">
                {formatCurrency(monthlyMetrics.totalPersonalLoans.IQD, 'IQD')}
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              {t.personalLoansNote || 'These are assets (money owed to you), not expenses'}
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
