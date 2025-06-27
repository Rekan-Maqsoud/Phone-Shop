import React from 'react';

export default function SaleDetailsModal({ viewSale, t, onClose }) {
  if (!viewSale) return null;
  // Calculate total profit for this sale
  let totalProfit = 0;
  if (viewSale.items && viewSale.items.length) {
    totalProfit = viewSale.items.reduce((sum, item) => {
      const sellingPrice = item.selling_price ?? item.price;
      const buyingPrice = item.buying_price ?? 0;
      return sum + ((sellingPrice - buyingPrice) * (item.quantity || 1));
    }, 0);
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Sale #{viewSale.id}</h2>
        <div className="mb-2 text-gray-700 dark:text-gray-200">Date: {viewSale.created_at ? viewSale.created_at.slice(0, 19).replace('T', ' ') : ''}</div>
        <div className="mb-2 text-gray-700 dark:text-gray-200">Total: ${viewSale.total}</div>
        <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Items</h3>
        <table className="min-w-full text-left border rounded-lg text-gray-800 dark:text-gray-100 mb-4">
          <thead className="bg-gray-800 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-2 text-white">#</th>
              <th className="px-4 py-2 text-white">{t.name}</th>
              <th className="px-4 py-2 text-white">{t.ram || 'RAM'}</th>
              <th className="px-4 py-2 text-white">{t.storage || 'Storage'}</th>
              <th className="px-4 py-2 text-white">Selling Price</th>
              <th className="px-4 py-2 text-white">Buying Price</th>
              <th className="px-4 py-2 text-white">Qty</th>
              <th className="px-4 py-2 text-white">Profit</th>
            </tr>
          </thead>
          <tbody>
            {viewSale.items && viewSale.items.length ? viewSale.items.map((item, idx) => (
              <tr key={item.id} className="border-b last:border-b-0 dark:border-gray-700">
                <td className="px-4 py-2">{idx + 1}</td>
                <td className="px-4 py-2">{item.name}</td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{item.ram || '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{item.storage || '-'}</td>
                <td className="px-4 py-2">${item.selling_price ?? item.price}</td>
                <td className="px-4 py-2">${item.buying_price ?? 0}</td>
                <td className="px-4 py-2">{item.quantity}</td>
                <td className="px-4 py-2">${((item.selling_price ?? item.price) - (item.buying_price ?? 0)) * (item.quantity || 1)}</td>
              </tr>
            )) : (
              <tr><td colSpan={8} className="text-center text-gray-400 py-4">No items</td></tr>
            )}
          </tbody>
        </table>
        <div className="mb-2 text-gray-700 dark:text-gray-200 font-semibold">Total Profit: ${totalProfit}</div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 transition">{t.close}</button>
        </div>
      </div>
    </div>
  );
}
