import React from 'react';

export default function SaleDetailsModal({ sale, t, onClose, onReturnItem }) {
  if (!sale) return null;

  // Helper: format currency
  const fmt = n => n != null ? `$${(+n).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-';

  // Split items into products and accessories
  const products = (sale.items || []).filter(i => !i.is_accessory);
  const accessories = (sale.items || []).filter(i => i.is_accessory);

  // Calculate profits
  const calcProfit = item => ((item.selling_price ?? item.price) - (item.buying_price ?? 0)) * (item.quantity || 1);
  const totalProductProfit = products.reduce((sum, i) => sum + calcProfit(i), 0);
  const totalAccessoryProfit = accessories.reduce((sum, i) => sum + calcProfit(i), 0);
  const totalProfit = totalProductProfit + totalAccessoryProfit;

  // Responsive, no x-scroll, modern look
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-0 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="px-8 pt-8 pb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-1">{t.saleDetails || 'Sale Details'} #{sale.id}</h2>
            <div className="text-gray-600 dark:text-gray-300 text-sm">
              <span className="font-medium">{t.date || 'Date'}:</span> {sale.created_at ? new Date(sale.created_at).toLocaleString() : '-'}
            </div>
            <div className="text-gray-600 dark:text-gray-300 text-sm">
              <span className="font-medium">{t.customer || 'Customer'}:</span> {sale.customer_name || t.unknown || 'Unknown'}
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{t.total || 'Total'}: {fmt(sale.total)}</div>
            <div className="text-md font-semibold text-emerald-700 dark:text-emerald-300">{t.profit || 'Profit'}: {fmt(totalProfit)}</div>
          </div>
        </div>

        {/* Products Table */}
        {products.length > 0 && (
          <div className="px-8 pt-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2 text-lg border-b border-purple-300 pb-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
              {t.products || 'Products'}
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({products.length})</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border rounded-lg text-gray-800 dark:text-gray-100 mb-4">
                <thead className="bg-gradient-to-r from-purple-600 to-pink-500 text-white">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">{t.name}</th>
                    <th className="px-3 py-2">{t.ram || 'RAM'}</th>
                    <th className="px-3 py-2">{t.storage || 'Storage'}</th>
                    <th className="px-3 py-2">{t.sellingPrice || 'Selling Price'}</th>
                    <th className="px-3 py-2">{t.buyingPrice || 'Buying Price'}</th>
                    <th className="px-3 py-2">{t.qty || 'Qty'}</th>
                    <th className="px-3 py-2">{t.profit || 'Profit'}</th>
                    {onReturnItem && <th className="px-3 py-2">{t.action || 'Action'}</th>}
                  </tr>
                </thead>
                <tbody>
                  {products.map((item, idx) => (
                    <tr key={item.id} className="border-b last:border-b-0 dark:border-gray-700">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{item.ram || '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{item.storage || '-'}</td>
                      <td className="px-3 py-2">{fmt(item.selling_price ?? item.price)}</td>
                      <td className="px-3 py-2">{fmt(item.buying_price)}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{fmt(calcProfit(item))}</td>
                      {onReturnItem && (
                        <td className="px-3 py-2">
                          <button
                            onClick={() => onReturnItem(sale.id, item.id)}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition"
                            title={t.returnItem || 'Return this item'}
                          >
                            {t.returnItem || 'Return'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-right text-emerald-700 dark:text-emerald-300 font-semibold mb-2">
              {t.productProfit || 'Product Profit'}: {fmt(totalProductProfit)}
            </div>
          </div>
        )}

        {/* Divider between products and accessories */}
        {products.length > 0 && accessories.length > 0 && (
          <div className="px-8"><hr className="my-2 border-t-2 border-dashed border-gray-300 dark:border-gray-700" /></div>
        )}

        {/* Accessories Table */}
        {accessories.length > 0 && (
          <div className="px-8 pt-2">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2 text-lg border-b border-emerald-300 pb-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              {t.accessories || 'Accessories'}
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({accessories.length})</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border rounded-lg text-gray-800 dark:text-gray-100 mb-4">
                <thead className="bg-gradient-to-r from-green-600 to-emerald-500 text-white">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">{t.name}</th>
                    <th className="px-3 py-2">{t.type || 'Type'}</th>
                    <th className="px-3 py-2">{t.sellingPrice || 'Selling Price'}</th>
                    <th className="px-3 py-2">{t.buyingPrice || 'Buying Price'}</th>
                    <th className="px-3 py-2">{t.qty || 'Qty'}</th>
                    <th className="px-3 py-2">{t.profit || 'Profit'}</th>
                    {onReturnItem && <th className="px-3 py-2">{t.action || 'Action'}</th>}
                  </tr>
                </thead>
                <tbody>
                  {accessories.map((item, idx) => (
                    <tr key={item.id} className="border-b last:border-b-0 dark:border-gray-700">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{item.type || '-'}</td>
                      <td className="px-3 py-2">{fmt(item.selling_price ?? item.price)}</td>
                      <td className="px-3 py-2">{fmt(item.buying_price)}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{fmt(calcProfit(item))}</td>
                      {onReturnItem && (
                        <td className="px-3 py-2">
                          <button
                            onClick={() => onReturnItem(sale.id, item.id)}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition"
                            title={t.returnItem || 'Return this item'}
                          >
                            {t.returnItem || 'Return'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-right text-emerald-700 dark:text-emerald-300 font-semibold mb-2">
              {t.accessoryProfit || 'Accessory Profit'}: {fmt(totalAccessoryProfit)}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="px-8 pb-6 pt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-t border-gray-100 dark:border-gray-800 mt-2">
          <div className="text-gray-600 dark:text-gray-300 text-sm">
            <span className="font-medium">{t.totalItems || 'Total Items'}:</span> {sale.items ? sale.items.length : 0}
          </div>
          <div className="flex flex-col md:items-end">
            <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{t.total || 'Total'}: {fmt(sale.total)}</div>
            <div className="text-md font-semibold text-emerald-700 dark:text-emerald-300">{t.profit || 'Profit'}: {fmt(totalProfit)}</div>
          </div>
        </div>
        <div className="px-8 pb-6 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 rounded-xl bg-purple-600 text-white font-semibold shadow hover:bg-purple-700 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400">{t.close || 'Close'}</button>
        </div>
      </div>
    </div>
  );
}
