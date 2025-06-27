import React from 'react';

export default function SalesHistoryTable({ sales, t, onView, onPrintLast }) {
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.salesHistory}</h2>
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
      <table className="min-w-full text-left border rounded-lg text-gray-800 dark:text-gray-100">
        <thead className="bg-gray-800 dark:bg-gray-700">
          <tr>
            <th className="px-4 py-2 text-white">#</th>
            <th className="px-4 py-2 text-white">{t.date}</th>
            <th className="px-4 py-2 text-white">{t.total}</th>
            <th className="px-4 py-2 text-white">Buying Price</th>
            <th className="px-4 py-2 text-white">Selling Price</th>
            <th className="px-4 py-2 text-white">Profit</th>
            <th className="px-4 py-2 text-white">{t.action}</th>
          </tr>
        </thead>
        <tbody>
          {sales.length === 0 ? (
            <tr><td colSpan={7} className="text-center text-gray-400 py-4">No sales</td></tr>
          ) : sales.map((s, idx) => {
            const { totalBuying, totalSelling, totalProfit } = getTotals(s);
            return (
              <tr key={s.id} className="border-b last:border-b-0 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 transition group">
                <td className="px-4 py-2">{idx + 1}</td>
                <td className="px-4 py-2">{s.created_at ? s.created_at.slice(0, 19).replace('T', ' ') : ''}</td>
                <td className="px-4 py-2">${s.total}</td>
                <td className="px-4 py-2">${totalBuying}</td>
                <td className="px-4 py-2">${totalSelling}</td>
                <td className="px-4 py-2">${totalProfit}</td>
                <td className="px-4 py-2">
                  <button onClick={() => onView(s.id)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition">{t.view}</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
