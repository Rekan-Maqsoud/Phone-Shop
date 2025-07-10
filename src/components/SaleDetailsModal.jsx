import React, { useState } from 'react';

export default function SaleDetailsModal({ sale, t, onClose, onReturnItem }) {
  const [returnQuantities, setReturnQuantities] = useState({});

  if (!sale) return null;

  // Handle quantity change for partial returns
  const handleQuantityChange = (itemId, quantity) => {
    setReturnQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, parseInt(quantity) || 0)
    }));
  };

  // Get return quantity for an item
  const getReturnQuantity = (itemId, maxQuantity) => {
    return Math.min(returnQuantities[itemId] || 0, maxQuantity);
  };

  // Handle partial return
  const handlePartialReturn = (saleId, itemId, quantity) => {
    if (quantity > 0 && onReturnItem) {
      onReturnItem(saleId, itemId, quantity);
      // Reset the quantity after return
      setReturnQuantities(prev => ({
        ...prev,
        [itemId]: 0
      }));
    }
  };
  const fmt = n => n != null ? `$${(+n).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-';

  // Split items into products and accessories
  const products = (sale.items || []).filter(i => !i.is_accessory);
  const accessories = (sale.items || []).filter(i => i.is_accessory);

  // Calculate profits
  const calcProfit = item => ((item.selling_price ?? item.buying_price) - (item.buying_price ?? 0)) * (item.quantity || 1);
  const totalProductProfit = products.reduce((sum, i) => sum + calcProfit(i), 0);
  const totalAccessoryProfit = accessories.reduce((sum, i) => sum + calcProfit(i), 0);
  const totalProfit = totalProductProfit + totalAccessoryProfit;

  // Responsive, no x-scroll, modern look
  return (
    <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl lg:text-2xl font-bold text-purple-700 dark:text-purple-300 mb-2">{t.saleDetails || 'Sale Details'} #{sale.id}</h2>
            <div className="space-y-1 text-sm">
              <div className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">{t.date || 'Date'}:</span> {sale.created_at ? new Date(sale.created_at).toLocaleString() : '-'}
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">{t.customer || 'Customer'}:</span> {sale.customer_name || t.unknownCustomer || 'Unknown'}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end flex-shrink-0">
            <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{t.total || 'Total'}: {fmt(sale.total)}</div>
            <div className="text-md font-semibold text-emerald-700 dark:text-emerald-300">{t.profit || 'Profit'}: {fmt(totalProfit)}</div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Products Table */}
          {products.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 text-lg border-b border-purple-300 pb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
                {t.products || 'Products'}
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({products.length})</span>
              </h3>
              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-gray-800 dark:text-gray-100 text-sm" dir="auto">
                  <thead className="bg-gradient-to-r from-purple-600 to-pink-500 text-white">
                    <tr>
                      <th className="px-3 py-3 font-medium text-right">#</th>
                      <th className="px-3 py-3 font-medium text-right">{t.name}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.ramSpecs || 'RAM'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.storageSpecs || 'Storage'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.sellingPrice || 'Selling Price'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.buyingPrice || 'Buying Price'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.qty || 'Qty'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.profit || 'Profit'}</th>
                      {onReturnItem && <th className="px-3 py-3 font-medium text-right">{t.returnQty || 'Return Qty'}</th>}
                      {onReturnItem && <th className="px-3 py-3 font-medium text-right">{t.action || 'Action'}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((item, idx) => (
                      <tr key={item.id} className="border-b last:border-b-0 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-3">{idx + 1}</td>
                        <td className="px-3 py-3 font-medium">{item.name}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{item.ram || '-'}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{item.storage || '-'}</td>
                        <td className="px-3 py-3">{fmt(item.selling_price ?? item.buying_price)}</td>
                        <td className="px-3 py-3">{fmt(item.buying_price)}</td>
                        <td className="px-3 py-3">{item.quantity}</td>
                        <td className="px-3 py-3 font-semibold text-green-600 dark:text-green-400">{fmt(calcProfit(item))}</td>
                        {onReturnItem && (
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={getReturnQuantity(item.id, item.quantity)}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              placeholder="0"
                            />
                          </td>
                        )}
                        {onReturnItem && (
                          <td className="px-3 py-3">
                            <button
                              onClick={() => handlePartialReturn(sale.id, item.id, getReturnQuantity(item.id, item.quantity))}
                              disabled={getReturnQuantity(item.id, item.quantity) === 0}
                              className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title={t.returnSelectedQty || 'Return selected quantity'}
                            >
                              {t.returnItems || 'Return'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-right text-emerald-700 dark:text-emerald-300 font-semibold mt-2">
                {t.productProfit || 'Product Profit'}: {fmt(totalProductProfit)}
              </div>
            </div>
          )}

          {/* Divider between products and accessories */}
          {products.length > 0 && accessories.length > 0 && (
            <hr className="my-4 border-t-2 border-dashed border-gray-300 dark:border-gray-700" />
          )}

          {/* Accessories Table */}
          {accessories.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 text-lg border-b border-emerald-300 pb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                {t.accessories || 'Accessories'}
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({accessories.length})</span>
              </h3>
              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-gray-800 dark:text-gray-100 text-sm" dir="auto">
                  <thead className="bg-gradient-to-r from-green-600 to-emerald-500 text-white">
                    <tr>
                      <th className="px-3 py-3 font-medium text-right">#</th>
                      <th className="px-3 py-3 font-medium text-right">{t.name}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.type || 'Type'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.sellingPrice || 'Selling Price'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.buyingPrice || 'Buying Price'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.qty || 'Qty'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.profit || 'Profit'}</th>
                      {onReturnItem && <th className="px-3 py-3 font-medium text-right">{t.returnQty || 'Return Qty'}</th>}
                      {onReturnItem && <th className="px-3 py-3 font-medium text-right">{t.action || 'Action'}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {accessories.map((item, idx) => (
                      <tr key={item.id} className="border-b last:border-b-0 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-3">{idx + 1}</td>
                        <td className="px-3 py-3 font-medium">{item.name}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{item.type || '-'}</td>
                        <td className="px-3 py-3">{fmt(item.selling_price ?? item.buying_price)}</td>
                        <td className="px-3 py-3">{fmt(item.buying_price)}</td>
                        <td className="px-3 py-3">{item.quantity}</td>
                        <td className="px-3 py-3 font-semibold text-green-600 dark:text-green-400">{fmt(calcProfit(item))}</td>
                        {onReturnItem && (
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={getReturnQuantity(item.id, item.quantity)}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              placeholder="0"
                            />
                          </td>
                        )}
                        {onReturnItem && (
                          <td className="px-3 py-3">
                            <button
                              onClick={() => handlePartialReturn(sale.id, item.id, getReturnQuantity(item.id, item.quantity))}
                              disabled={getReturnQuantity(item.id, item.quantity) === 0}
                              className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title={t.returnSelectedQty || 'Return selected quantity'}
                            >
                              {t.returnItems || 'Return'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-right text-emerald-700 dark:text-emerald-300 font-semibold mt-2">
                {t.accessoryProfit || 'Accessory Profit'}: {fmt(totalAccessoryProfit)}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-gray-600 dark:text-gray-300 text-sm">
            <span className="font-medium">{t.totalItems || 'Total Items'}:</span> {sale.items ? sale.items.length : 0}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex flex-col sm:items-end gap-1">
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{t.total || 'Total'}: {fmt(sale.total)}</div>
              <div className="text-md font-semibold text-emerald-700 dark:text-emerald-300">{t.profit || 'Profit'}: {fmt(totalProfit)}</div>
            </div>
            <button 
              onClick={onClose} 
              className="px-6 py-2 rounded-xl bg-purple-600 text-white font-semibold shadow hover:bg-purple-700 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              {t.close || 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
