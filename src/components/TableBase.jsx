import React from 'react';

export default function TableBase({ columns, data, renderRow, className = '' }) {
  return (
    <table className={`min-w-full rounded-2xl overflow-hidden shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl ${className}`}>
      <thead className="bg-gradient-to-r from-blue-900 to-blue-700 dark:from-gray-900 dark:to-gray-800">
        <tr>
          {columns.map((col, idx) => (
            <th key={idx} className="px-6 py-4 text-white text-lg font-bold">{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="text-center text-gray-400 py-10 text-xl font-semibold">No data</td>
          </tr>
        ) : (
          data.map((row, idx) => renderRow(row, idx))
        )}
      </tbody>
    </table>
  );
}
