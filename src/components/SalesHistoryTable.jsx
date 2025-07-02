import React, { useState, useMemo } from 'react';
import HistorySearchFilter from './HistorySearchFilter';

export default function SalesHistoryTable({ sales, t, onView, onPrintLast, onReturn }) {
  const [filteredSales, setFilteredSales] = useState(sales);
  const [totals, setTotals] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  // Calculate totals for filtered sales
  const calculateTotals = (salesData) => {
    let totalProfit = 0;
    let totalRevenue = 0;
    let totalSales = salesData.length;
    let totalProducts = 0;

    salesData.forEach(sale => {
      totalRevenue += sale.total || 0;
      
      if (sale.items && sale.items.length) {
        sale.items.forEach(item => {
          const qty = item.quantity || 1;
          const buyingPrice = typeof item.buying_price === 'number' ? item.buying_price : 0;
          const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.price === 'number' ? item.price : 0);
          totalProfit += (sellingPrice - buyingPrice) * qty;
          totalProducts += qty;
        });
      }
    });

    return {
      totalProfit,
      totalRevenue,
      totalSales,
      totalProducts
    };
  };

  // Handle filtered data change from search component
  const handleFilteredDataChange = (filtered, calculatedTotals) => {
    setFilteredSales(filtered);
    setTotals(calculatedTotals);
  };

  // Sort filtered sales
  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [filteredSales, sortOrder]);

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
    <div className="space-y-6">
      {/* Search and Filter Component */}
      <HistorySearchFilter
        data={sales}
        onFilteredDataChange={handleFilteredDataChange}
        t={t}
        searchFields={['customer_name']}
        dateField="created_at"
        showNameSearch={true}
        showTotals={true}
        calculateTotals={calculateTotals}
      />

      {/* Sales Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.salesHistory}</h2>
          <div className="flex gap-4 items-center">
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

        {/* Table of sales */}
        <div className="overflow-x-auto">
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
              {sortedSales.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-gray-400 py-4">No sales</td></tr>
              ) : sortedSales.map((s, idx) => {
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
      </div>
    </div>
  );
}
