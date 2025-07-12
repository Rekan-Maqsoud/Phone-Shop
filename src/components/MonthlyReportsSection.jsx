import React from 'react';
import { useLocale } from '../contexts/LocaleContext';

const MonthlyReportsSection = ({ 
  t, 
  admin 
}) => {
  const { getMonthName } = useLocale();
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.monthlyReports || 'Monthly Reports'}</h2>
      </div>

      {(() => {
        const reports = admin.monthlyReports || [];
        if (reports.length === 0) {
          return <div className="text-center text-gray-400 py-6">{t.noReports || 'No monthly reports yet'}</div>;
        }

        // Helper to get sales for a given month/year
        function getSalesForMonth(month, year) {
          return admin.sales.filter(sale => {
            const d = new Date(sale.created_at);
            return d.getMonth() + 1 === month && d.getFullYear() === year;
          });
        }
        // Helper to get total spending for a given month/year by currency
        function getTotalSpentForMonth(month, year) {
          // Use buying history to get actual cash spending for the month
          // This avoids double-counting inventory costs
          let totalSpentUSD = 0;
          let totalSpentIQD = 0;
          if (admin.buyingHistory) {
            admin.buyingHistory.forEach(entry => {
              if (entry.paid_at) {
                const paidDate = new Date(entry.paid_at);
                if (paidDate.getMonth() + 1 === month && paidDate.getFullYear() === year) {
                  const currency = entry.currency || 'USD';
                  if (currency === 'USD') {
                    totalSpentUSD += entry.amount || 0;
                  } else {
                    totalSpentIQD += entry.amount || 0;
                  }
                }
              }
            });
          }
          return { totalSpentUSD, totalSpentIQD };
        }

        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => {
              // Calculate details for this month
              const sales = getSalesForMonth(report.month, report.year);
              let totalProductsSold = 0;
              let totalAccessoriesSold = 0;
              let productProfitUSD = 0;
              let productProfitIQD = 0;
              let accessoryProfitUSD = 0;
              let accessoryProfitIQD = 0;
              sales.forEach(sale => {
                const currency = sale.currency || 'USD';
                (sale.items || []).forEach(item => {
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
                  
                  const profit = (sellingPriceInSaleCurrency - buyingPriceInSaleCurrency) * quantity;
                  
                  if (item.is_accessory) {
                    totalAccessoriesSold += quantity;
                    if (currency === 'USD') {
                      accessoryProfitUSD += profit;
                    } else {
                      accessoryProfitIQD += profit;
                    }
                  } else {
                    totalProductsSold += quantity;
                    if (currency === 'USD') {
                      productProfitUSD += profit;
                    } else {
                      productProfitIQD += profit;
                    }
                  }
                });
              });
              const totalProfitUSD = productProfitUSD + accessoryProfitUSD;
              const totalProfitIQD = productProfitIQD + accessoryProfitIQD;
              const totalTransactions = sales.length;
              const { totalSpentUSD, totalSpentIQD } = getTotalSpentForMonth(report.month, report.year);
              
              return (
                <div key={report.id} className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-6 border border-white/20">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">📅</span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {getMonthName(report.month - 1)} {report.year}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t.generated || 'generated'} {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.salesUSD || 'Sales USD'}:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">${(report.total_sales_usd || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.salesIQD || 'Sales IQD'}:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">د.ع{(report.total_sales_iqd || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.totalTransactions || 'Total Transactions'}:</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">{totalTransactions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.totalProductsSold || 'Total Products Sold'}:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{totalProductsSold}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.totalAccessoriesSold || 'Total Accessories Sold'}:</span>
                      <span className="font-bold text-pink-600 dark:text-pink-400">{totalAccessoriesSold}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.profitUSD || 'Profit USD'}:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">${Number(totalProfitUSD).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.profitIQD || 'Profit IQD'}:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">د.ع{Number(totalProfitIQD).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.spentUSD || 'Spent USD'}:</span>
                      <span className="font-bold text-red-600 dark:text-red-400">${Number(totalSpentUSD).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.spentIQD || 'Spent IQD'}:</span>
                      <span className="font-bold text-red-600 dark:text-red-400">د.ع{Number(totalSpentIQD).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
};

export default MonthlyReportsSection;
