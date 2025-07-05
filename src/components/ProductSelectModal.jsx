import React from 'react';

export default function ProductSelectModal({ show, options, t, onSelect, onCancel }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md flex flex-col gap-4">
        <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t.multipleProductsFound}</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border rounded-lg text-gray-800 dark:text-gray-100">
            <thead className="bg-gray-800 dark:bg-gray-700">
              <tr>
                <th className="px-2 py-1 text-white">{t.name}</th>
                <th className="px-2 py-1 text-white">{t.model}</th>
                <th className="px-2 py-1 text-white">{t.ram}</th>
                <th className="px-2 py-1 text-white">{t.storage}</th>
                <th className="px-2 py-1 text-white">{t.price}</th>
                <th className="px-2 py-1 text-white">{t.selectAction}</th>
              </tr>
            </thead>
            <tbody>
              {options.map((p) => (
                <tr key={p.uniqueId || `${p.itemType || 'product'}_${p.id}`} className="border-b last:border-b-0 dark:border-gray-700">
                  <td className="px-2 py-1">{p.name}</td>
                  <td className="px-2 py-1">{p.model}</td>
                  <td className="px-2 py-1">{p.ram}</td>
                  <td className="px-2 py-1">{p.storage}</td>
                  <td className="px-2 py-1">${p.price}</td>
                  <td className="px-2 py-1">
                    <button onClick={() => onSelect(p)} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition">{t.select}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={onCancel} className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 px-3 py-1 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition">{t.cancel}</button>
      </div>
    </div>
  );
}
