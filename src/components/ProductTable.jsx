import React, { useState, useMemo } from 'react';

const ProductTable = React.memo(function ProductTable({
  title,
  products,
  t,
  lowStockThreshold,
  onEdit,
  onArchive,
  onUnarchive,
  isArchived
}) {
  const [search, setSearch] = useState("");

  // Memoize filtered products to prevent recalculation on every render
  const filtered = useMemo(() => 
    products.filter(p =>
      p.name && p.name.toLowerCase().includes(search.toLowerCase())
    ), [products, search]
  );
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8 w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
        <input
          type="text"
          className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder={t.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 180 }}
        />
      </div>
      <table className="min-w-full w-full text-left border rounded-lg text-gray-800 dark:text-gray-100">
        <thead className="bg-gray-800 dark:bg-gray-700">
          <tr>
            <th className="px-4 py-2 text-white">#</th>
            <th className="px-4 py-2 text-white">{t.name}</th>
            <th className="px-4 py-2 text-white">{t.ram}</th>
            <th className="px-4 py-2 text-white">{t.storage}</th>
            <th className="px-4 py-2 text-white">{t.price}</th>
            <th className="px-4 py-2 text-white">{t.stock}</th>
            <th className="px-4 py-2 text-white">{t.action}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={7} className="text-center text-gray-400 py-4">{isArchived ? t.noArchivedProducts : t.noProducts}</td></tr>
          ) : filtered.map((p, idx) => (
            <tr key={p.id} className={`border-b last:border-b-0 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 transition group`}>
              <td className="px-4 py-2">{idx + 1}</td>
              <td className="px-4 py-2 flex items-center gap-2">
                {p.name}
                {!isArchived && p.stock < lowStockThreshold && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">{t.low}</span>
                )}
              </td>
              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{p.ram || '-'}</td>
              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{p.storage || '-'}</td>
              <td className="px-4 py-2">${p.price}</td>
              <td className={`px-4 py-2 ${!isArchived && p.stock < lowStockThreshold ? 'text-red-600 font-bold' : ''}`}>{p.stock}</td>
              <td className="px-4 py-2 flex gap-2">
                {!isArchived ? (
                  <>
                    <button onClick={() => onEdit(p)} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 transition">{t.edit}</button>
                    <button disabled={false} onClick={() => { onArchive(p); }} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition">
                      {t.archive} 
                    </button>
                  </>
                ) : (
                  <button onClick={() => onUnarchive(p)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition">{t.unarchive}</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default ProductTable;
