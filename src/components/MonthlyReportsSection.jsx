import React from 'react';

const MonthlyReportsSection = ({ 
  t, 
  admin 
}) => {
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
        // Helper to get total spending for a given month/year
        function getTotalSpentForMonth(month, year) {
          // Use buying history to get actual cash spending for the month
          // This avoids double-counting inventory costs
          let totalSpent = 0;
          if (admin.buyingHistory) {
            admin.buyingHistory.forEach(entry => {
              if (entry.paid_at) {
                const paidDate = new Date(entry.paid_at);
                if (paidDate.getMonth() + 1 === month && paidDate.getFullYear() === year) {
                  totalSpent += entry.amount || 0;
                }
              }
            });
          }
          return totalSpent;
        }

        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => {
              // Calculate details for this month
              const sales = getSalesForMonth(report.month, report.year);
              let totalProductsSold = 0;
              let totalAccessoriesSold = 0;
              let productProfit = 0;
              let accessoryProfit = 0;
              sales.forEach(sale => {
                (sale.items || []).forEach(item => {
                  if (item.is_accessory) {
                    totalAccessoriesSold += item.quantity || 1;
                    accessoryProfit += (item.profit || ((item.price || 0) - (item.buying_price || 0))) * (item.quantity || 1);
                  } else {
                    totalProductsSold += item.quantity || 1;
                    productProfit += (item.profit || ((item.price || 0) - (item.buying_price || 0))) * (item.quantity || 1);
                  }
                });
              });
              const totalProfit = productProfit + accessoryProfit;
              const totalTransactions = sales.length;
              const actualTotalSpent = getTotalSpentForMonth(report.month, report.year);
              
              return (
                <div key={report.id} className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-6 border border-white/20">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">📅</span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {t.months && t.months[report.month - 1]
                          ? `${t.months[report.month - 1]} (${report.month})`
                          : `${new Date(report.year, report.month - 1).toLocaleDateString(undefined, { month: 'long' })} (${report.month})`}
                        {' '}{report.year}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t.generated || 'generated'} {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.sales || 'Sales'}:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">${report.total_sales}</span>
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
                      <span className="text-gray-600 dark:text-gray-400">{t.productProfit || 'Product Profit'}:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">${productProfit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.accessoryProfit || 'Accessory Profit'}:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">${accessoryProfit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.totalProfit || 'Total Profit'}:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">${totalProfit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t.totalSpent || 'Total Spent'}:</span>
                      <span className="font-bold text-red-600 dark:text-red-400">${actualTotalSpent.toFixed(2)}</span>
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
