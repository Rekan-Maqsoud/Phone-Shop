import React from 'react';

export default function ProductSelectModal({ show, options, t, onSelect, onCancel }) {
  if (!show) return null;
  
  // Helper function to create a more descriptive product name
  const getProductDisplayName = (product) => {
    const parts = [];
    if (product.name) parts.push(product.name);
    if (product.model && product.model !== product.name) parts.push(product.model);
    if (product.ram) parts.push(product.ram);
    if (product.storage) parts.push(product.storage);
    return parts.join(' | ');
  };
  
  return (
    <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-4xl flex flex-col gap-4">
        <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t.multipleProductsFound}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t.selectCorrectProduct || 'Please select the correct product with matching specifications:'}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border rounded-lg text-gray-800 dark:text-gray-100">
            <thead className="bg-gray-800 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-2 text-white">{t.name}</th>
                <th className="px-3 py-2 text-white">{t.brand}</th>
                <th className="px-3 py-2 text-white">{t.model}</th>
                <th className="px-3 py-2 text-white">{t.ram}</th>
                <th className="px-3 py-2 text-white">{t.storage}</th>
                <th className="px-3 py-2 text-white">{t.stock}</th>
                <th className="px-3 py-2 text-white">{t.price}</th>
                <th className="px-3 py-2 text-white">{t.selectAction}</th>
              </tr>
            </thead>
            <tbody>
              {options.map((p) => (
                <tr key={p.uniqueId || `${p.itemType || 'product'}_${p.id}`} className="border-b last:border-b-0 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{p.brand || '-'}</td>
                  <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{p.model || '-'}</td>
                  <td className="px-3 py-2">
                    {p.ram ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs font-medium">
                        {p.ram}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2">
                    {p.storage ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs font-medium">
                        {p.storage}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2 font-medium">{p.stock}</td>
                  <td className="px-3 py-2 text-green-600 dark:text-green-400 font-semibold">${p.buying_price}</td>
                  <td className="px-3 py-2">
                    <button 
                      onClick={() => onSelect(p)} 
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm font-medium"
                    >
                      {t.select}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end">
          <button onClick={onCancel} className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition">{t.cancel}</button>
        </div>
      </div>
    </div>
  );
}
