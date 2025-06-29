import React, { useState, useMemo } from 'react';

export default function SalesHistoryTable({ sales, t, onView, onPrintLast, onReturn }) {
  const [dateFilter, setDateFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  // Filter and sort sales
  const filteredAndSortedSales = useMemo(() => {
    let filtered = sales;
    
    // Apply date filter
    if (dateFilter) {
      filtered = sales.filter(sale => {
        const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
        return saleDate === dateFilter;
      });
    }
    
    // Sort by date
    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [sales, dateFilter, sortOrder]);

  // Helper to calculate totals for each sale
  const getTotals = (sale) => {
    let totalBuying = 0;
    let totalSelling = 0;
    let totalProfit = 0;
    if (sale.items && sale.items.length) {
      sale.items.forEach(item => {
        const qty = item.quantity || 1;
        // Use sale_items.buying_price as buying price (from database)
        const buyingPrice = typeof item.buying_price === 'number' ? item.buying_price : 0;
        // Use sale_items.selling_price or sale_items.price as selling price
        const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.price === 'number' ? item.price : 0);
        totalBuying += buyingPrice * qty;
        totalSelling += sellingPrice * qty;
        totalProfit += (sellingPrice - buyingPrice) * qty;
      });
    }
    return { totalBuying, totalSelling, totalProfit };
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.salesHistory}</h2>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Date:</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border rounded px-3 py-1 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition"
                title="Clear filter"
              >
                ✕
              </button>
            )}
          </div>
          {onPrintLast && (
            <button
              onClick={onPrintLast}
              className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              title="Print last receipt"
            >
              🖨️ {t.testPrint}
            </button>
          )}
        </div>
      </div>
      
      {dateFilter && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Showing sales for {new Date(dateFilter).toLocaleDateString()} ({filteredAndSortedSales.length} {filteredAndSortedSales.length === 1 ? 'sale' : 'sales'})
          </span>
        </div>
      )}

      {/* Table of sales */}
      <table className="min-w-full text-left border rounded-lg text-gray-800 dark:text-gray-100">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-2 text-gray-800 dark:text-white">#</th>
            <th className="px-4 py-2 text-gray-800 dark:text-white cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}>
              {t.date} {sortOrder === 'desc' ? '↓' : '↑'}
            </th>
            <th className="px-4 py-2 text-gray-800 dark:text-white">Customer</th>
            <th className="px-4 py-2 text-gray-800 dark:text-white">{t.total}</th>
            <th className="px-4 py-2 text-gray-800 dark:text-white">Buying Price</th>
            <th className="px-4 py-2 text-gray-800 dark:text-white">Selling Price</th>
            <th className="px-4 py-2 text-gray-800 dark:text-white">Profit</th>
            <th className="px-4 py-2 text-gray-800 dark:text-white">{t.action}</th>
          </tr>
        </thead>
        <tbody>
          {filteredAndSortedSales.length === 0 ? (
            <tr><td colSpan={8} className="text-center text-gray-400 py-4">No sales</td></tr>
          ) : filteredAndSortedSales.map((s, idx) => {
            const { totalBuying, totalSelling, totalProfit } = getTotals(s);
            const fmt = n => n != null ? `$${(+n).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-';
            return (
              <tr key={s.id} className="border-b last:border-b-0 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 transition group">
                <td className="px-4 py-2">{idx + 1}</td>
                <td className="px-4 py-2">{s.created_at ? s.created_at.slice(0, 19).replace('T', ' ') : ''}</td>
                <td className="px-4 py-2">{s.customer_name || 'Unknown'}</td>
                <td className="px-4 py-2">{fmt(s.total)}</td>
                <td className="px-4 py-2">{fmt(totalBuying)}</td>
                <td className="px-4 py-2">{fmt(totalSelling)}</td>
                <td className="px-4 py-2">{fmt(totalProfit)}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => onView(s.id)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition">{t.view}</button>
                    <button 
                      onClick={() => onReturn && onReturn(s.id)} 
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                      title="Return this sale"
                    >
                      Return
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
