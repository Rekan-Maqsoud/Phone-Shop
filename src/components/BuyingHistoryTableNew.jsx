import React, { useState } from 'react';
import HistorySearchFilter from './HistorySearchFilter';

// Enhanced table for buying history with item details support
export default function BuyingHistoryTable({ buyingHistory, t, onAddPurchase, refreshBuyingHistory }) {
  const [expandedEntries, setExpandedEntries] = useState(new Set());
  const [filteredHistory, setFilteredHistory] = useState(buyingHistory || []);
  const [totals, setTotals] = useState(null);

  // Calculate totals for filtered buying history
  const calculateTotals = (historyData) => {
    let totalAmount = 0;
    let totalEntries = historyData.length;

    historyData.forEach(entry => {
      totalAmount += entry.amount || 0;
    });

    return {
      totalRevenue: totalAmount, // For buying history, this represents total spent
      totalSales: totalEntries // Total number of purchases
    };
  };

  // Handle filtered data change from search component
  const handleFilteredDataChange = (filtered, calculatedTotals) => {
    setFilteredHistory(filtered);
    setTotals(calculatedTotals);
  };

  const toggleExpanded = (entryId) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  if (!buyingHistory || buyingHistory.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t?.buyingHistory || 'Buying History'}</h2>
          <button
            onClick={() => {
              if (onAddPurchase) {
                onAddPurchase();
              } else {
                console.error('[BuyingHistoryTable] onAddPurchase is undefined!');
              }
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition font-semibold shadow-lg"
          >
            ➕ {t?.addPurchase || 'Add Purchase'}
          </button>
        </div>
        <div className="text-center text-gray-400 py-12">
          <p className="text-xl">{t?.noBuyingHistory || 'No buying history yet'}</p>
          <p className="text-sm mt-2">{t?.addFirstPurchase || 'Add your first purchase to get started'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-6 border border-white/20">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              💼 {t?.buyingHistory || 'Buying History'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t?.buyingHistoryDesc || 'Track all your business purchases and expenses'}
            </p>
          </div>
          
          <button
            onClick={() => {
              if (onAddPurchase) {
                onAddPurchase();
              } else {
                console.error('[BuyingHistoryTable] onAddPurchase is undefined! (no data)');
              }
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition font-semibold shadow-lg"
          >
            ➕ {t?.addPurchase || 'Add Purchase'}
          </button>
        </div>
      </div>

      {/* Search and Filter Component */}
      <HistorySearchFilter
        data={buyingHistory || []}
        onFilteredDataChange={handleFilteredDataChange}
        t={t}
        searchFields={['company_name', 'description']}
        dateField="paid_at"
        showNameSearch={true}
        showTotals={true}
        calculateTotals={calculateTotals}
      />

      {/* Main Table */}
      <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow-2xl overflow-hidden border border-white/20">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-bold">{t?.date || 'Date'}</th>
                <th className="px-6 py-4 text-left font-bold">{t?.companyName || 'Company'}</th>
                <th className="px-6 py-4 text-left font-bold">{t?.amount || 'Amount'}</th>
                <th className="px-6 py-4 text-left font-bold">{t?.description || 'Description'}</th>
                <th className="px-6 py-4 text-left font-bold">{t?.items || 'Items'}</th>
                <th className="px-6 py-4 text-left font-bold">{t?.actions || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((entry, idx) => (
                <React.Fragment key={entry.id || idx}>
                  <tr className={`border-b dark:border-gray-700 ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800/50'} hover:bg-blue-50 dark:hover:bg-cyan-900/20 transition-colors`}>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {entry.paid_at ? new Date(entry.paid_at).toLocaleDateString() : '-'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {entry.paid_at ? new Date(entry.paid_at).toLocaleTimeString() : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                      {entry.company_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-bold">
                      ${entry.amount?.toFixed(2) || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {entry.description || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {entry.has_items ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          📦 {t?.withItems || 'With Items'}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                          💰 {t?.cashOnly || 'Cash Only'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {entry.has_items && (
                        <button
                          onClick={() => toggleExpanded(entry.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                        >
                          {expandedEntries.has(entry.id) ? '🔼' : '🔽'} {t?.viewItems || 'View Items'}
                        </button>
                      )}
                    </td>
                  </tr>
                  
                  {/* Expanded row for items */}
                  {entry.has_items && expandedEntries.has(entry.id) && entry.items && (
                    <tr className="bg-blue-50 dark:bg-blue-900/20">
                      <td colSpan="6" className="px-6 py-4">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                            📦 {t?.purchasedItems || 'Purchased Items'}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {entry.items.map((item, itemIdx) => (
                              <div key={itemIdx} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg">{item.item_type === 'product' ? '📱' : '🎧'}</span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {item.item_name}
                                  </span>
                                </div>
                                <div className="text-sm space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t?.quantity || 'Qty'}:</span>
                                    <span className="font-semibold">{item.quantity}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t?.unitPrice || 'Unit Price'}:</span>
                                    <span className="text-blue-600 dark:text-blue-400">${item.unit_price}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t?.total || 'Total'}:</span>
                                    <span className="font-bold text-green-600 dark:text-green-400">${item.total_price}</span>
                                  </div>
                                  {item.ram && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">{t.ram || 'RAM'}:</span>
                                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{item.ram}</span>
                                    </div>
                                  )}
                                  {item.storage && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">{t.storage || 'Storage'}:</span>
                                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{item.storage}</span>
                                    </div>
                                  )}
                                  {item.brand && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">{t.brand || 'Brand'}:</span>
                                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{item.brand}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
