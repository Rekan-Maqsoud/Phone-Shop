import React, { useState, useCallback, useEffect } from 'react';
import HistorySearchFilter from './HistorySearchFilter';
import ConfirmModal from './ConfirmModal';
import { Icon } from '../utils/icons.jsx';

// Enhanced table for buying history with item details support - Memoized for performance
const BuyingHistoryTable = React.memo(function BuyingHistoryTable({ 
  buyingHistory, 
  t, 
  onAddPurchase, 
  refreshBuyingHistory, 
  getBrandFromBuyingHistory, 
  showBrandFilter = true 
}) {
  const [expandedEntries, setExpandedEntries] = useState(new Set());
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [totals, setTotals] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnModalData, setReturnModalData] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // Performance optimization: limit to 50 items per page

  // Update filtered history when buyingHistory changes
  useEffect(() => {
    setFilteredHistory(buyingHistory || []);
    setCurrentPage(1); // Reset to first page when data changes
  }, [buyingHistory]);

  // Calculate totals for filtered buying history by currency
  const calculateTotals = useCallback((historyData) => {
    let totalAmountUSD = 0;
    let totalAmountIQD = 0;
    let totalEntries = historyData.length;

    historyData.forEach(entry => {
      const currency = entry.currency || 'USD';
      
      if (currency === 'MULTI') {
        // For multi-currency entries, add the actual amounts to their respective totals
        totalAmountUSD += entry.multi_currency_usd || 0;
        totalAmountIQD += entry.multi_currency_iqd || 0;
      } else {
        const amount = entry.total_price || entry.amount || 0;
        if (currency === 'USD') {
          totalAmountUSD += amount;
        } else {
          totalAmountIQD += amount;
        }
      }
    });

    return {
      totalRevenueUSD: totalAmountUSD, // For buying history, this represents total spent in USD
      totalRevenueIQD: totalAmountIQD, // For buying history, this represents total spent in IQD
      totalSales: totalEntries // Total number of purchases
    };
  }, []);

  // Extract brand from buying history entry
  const getBrandFromBuyingHistoryInternal = useCallback((item) => {
    // Use external function if provided, otherwise use default logic
    if (getBrandFromBuyingHistory) {
      return getBrandFromBuyingHistory(item);
    }
    
    // Check items array first
    if (item.items && Array.isArray(item.items)) {
      const brands = item.items
        .map(historyItem => historyItem.brand)
        .filter(brand => brand && brand.trim())
        .join(', ');
      if (brands) return brands;
    }
    
    // Fallback to direct brand property
    return item.brand || null;
  }, [getBrandFromBuyingHistory]);

  // Handle filtered data change from search component - wrapped with useCallback to prevent infinite re-renders
  const handleFilteredDataChange = useCallback((filtered, calculatedTotals) => {
    setFilteredHistory(filtered);
    setTotals(calculatedTotals);
  }, []);

  // Memoize toggleExpanded to prevent unnecessary re-renders
  const toggleExpanded = useCallback((entryId) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  }, [expandedEntries]);

  // Handle return entry with confirmation modal
  const handleReturnEntry = useCallback((entryId, amount) => {
    setConfirmModal({
      isOpen: true,
      title: t?.returnEntry || 'Return Purchase',
      message: t?.confirmReturnEntry || `Are you sure you want to return this purchase? You will get back ${(entryId.currency === 'USD' ? '$' : 'د.ع')}${amount.toFixed(2)}`,
      onConfirm: async () => {
        try {
          const result = await window.api.returnBuyingHistoryEntry(entryId);
          if (result.success) {
            // Use ToastUnified instead of alert
            if (window.showToast) {
              window.showToast(t?.returnSuccess || `Purchase returned successfully! Amount refunded: $${result.returnedAmount.toFixed(2)}`, 'success');
            }
            refreshBuyingHistory();
          } else {
            if (window.showToast) {
              window.showToast(t?.returnError || `Failed to return purchase: ${result.message}`, 'error');
            }
          }
        } catch (error) {
          console.error('Error returning purchase:', error);
          if (window.showToast) {
            window.showToast(t?.returnError || 'Failed to return purchase', 'error');
          }
        }
        setConfirmModal(null);
      },
      onCancel: () => setConfirmModal(null)
    });
  }, [t, refreshBuyingHistory]);

  // Handle return item with quantity
  const handleReturnItem = (entryId, itemId, itemName, currentQuantity, unitPrice) => {
    setReturnModalData({
      entryId,
      itemId,
      itemName,
      currentQuantity,
      unitPrice,
      maxReturnQuantity: currentQuantity
    });
    setShowReturnModal(true);
  };

  const executeItemReturn = async (quantity) => {
    if (!returnModalData) return;

    try {
      const result = await window.api.returnBuyingHistoryItem(
        returnModalData.entryId,
        returnModalData.itemId,
        quantity
      );
      
      if (result.success) {
        if (window.showToast) {
          window.showToast(t?.returnSuccess || `Item returned successfully! Amount refunded: $${result.returnedAmount.toFixed(2)}`, 'success');
        }
        refreshBuyingHistory();
        setShowReturnModal(false);
        setReturnModalData(null);
      } else {
        if (window.showToast) {
          window.showToast(t?.returnError || `Failed to return item: ${result.message}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error returning item:', error);
      if (window.showToast) {
        window.showToast(t?.returnError || 'Failed to return item', 'error');
      }
    }
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
        searchFields={['supplier', 'item_name', 'company_name', 'description']}
        dateField="date"
        showNameSearch={true}
        showTotals={true}
        calculateTotals={calculateTotals}
        showBrandFilter={showBrandFilter}
        getBrandFromItem={getBrandFromBuyingHistoryInternal}
      />

      {/* Pagination controls */}
      {(() => {
        const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

        return (
          <>
            {filteredHistory.length > itemsPerPage && (
              <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow-2xl mb-4 p-4 border border-white/20">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredHistory.length)} of {filteredHistory.length} entries
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← {t?.previous || 'Previous'}
                    </button>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t?.next || 'Next'} →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Main Table */}
            <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow-2xl overflow-hidden border border-white/20">
              <div className="overflow-x-auto">
                <table className="w-full" dir="auto">
                  <thead className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                    <tr>
                      <th className="px-6 py-4 text-right font-bold">{t?.date || 'Date'}</th>
                      <th className="px-6 py-4 text-right font-bold">{t?.companyName || 'Company'}</th>
                      <th className="px-6 py-4 text-right font-bold">{t?.currency || 'Currency'}</th>
                      <th className="px-6 py-4 text-right font-bold">{t?.amount || 'Amount'}</th>
                      <th className="px-6 py-4 text-right font-bold">{t?.description || 'Description'}</th>
                      <th className="px-6 py-4 text-right font-bold">{t?.items || 'Items'}</th>
                      <th className="px-6 py-4 text-right font-bold">{t?.actions || 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistory.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                          {t?.noPurchasesFound || 'No purchases found'}
                        </td>
                      </tr>
                    ) : (
                      paginatedHistory.map((entry, idx) => (
                <React.Fragment key={entry.id || idx}>
                  <tr className={`border-b dark:border-gray-700 ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800/50'} hover:bg-blue-50 dark:hover:bg-cyan-900/20 transition-colors`}>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {entry.date ? new Date(entry.date).toLocaleDateString() : '-'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {entry.date ? new Date(entry.date).toLocaleTimeString() : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                      {(entry.supplier || entry.company_name || '-').toString().charAt(0).toUpperCase() + (entry.supplier || entry.company_name || '-').toString().slice(1).toLowerCase()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {entry.currency === 'MULTI' ? 'Multi' : (entry.currency || 'USD')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-bold">
                      {entry.currency === 'MULTI' ? (
                        // For multi-currency entries, display both amounts
                        <div className="text-sm">
                          {entry.multi_currency_usd > 0 && (
                            <div>${entry.multi_currency_usd.toFixed(2)}</div>
                          )}
                          {entry.multi_currency_iqd > 0 && (
                            <div>د.ع{entry.multi_currency_iqd.toFixed(2)}</div>
                          )}
                          {(!entry.multi_currency_usd || entry.multi_currency_usd === 0) && 
                           (!entry.multi_currency_iqd || entry.multi_currency_iqd === 0) && (
                            <div className="text-gray-500">Multi-currency</div>
                          )}
                        </div>
                      ) : (
                        `${(entry.currency === 'USD' ? '$' : 'د.ع')}${(entry.total_price || entry.amount || 0).toFixed(2)}`
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {entry.item_name || entry.description || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {!!entry.has_items ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <Icon name="package" size={16} className="mr-2" /> {t?.withItems || 'With Items'}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                          <Icon name="money" size={16} className="mr-2" /> {t?.cashOnly || 'Cash Only'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {!!entry.has_items && (
                          <button
                            onClick={() => toggleExpanded(entry.id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                          >
                            {expandedEntries.has(entry.id) ? '🔼' : '🔽'} {t?.viewItems || 'View Items'}
                          </button>
                        )}
                        <button
                          onClick={() => handleReturnEntry(entry.id, entry.amount)}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                          title={t?.returnEntry || 'Return this purchase'}
                        >
                          ↩️ {t?.returnEntry || 'Return'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded row for items */}
                  {!!entry.has_items && expandedEntries.has(entry.id) && entry.items && (
                    <tr className="bg-blue-50 dark:bg-blue-900/20">
                      <td colSpan="6" className="px-6 py-4">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                            <Icon name="package" size={16} className="mr-2" /> {t?.purchasedItems || 'Purchased Items'}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {entry.items.map((item, itemIdx) => (
                              <div key={itemIdx} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                                <div className="flex items-center gap-2 mb-2">
                                  <Icon name={item.item_type === 'product' ? 'phone' : 'accessories'} size={18} className="text-blue-600 dark:text-blue-400" />
                                  <span className="font-medium text-gray-800 dark:text-gray-200">
                                    {item.item_name}
                                  </span>
                                </div>
                                <div className="text-sm space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t?.quantity || 'Qty'}:</span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{item.quantity}</span>
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
                                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1 rounded">{item.ram}</span>
                                    </div>
                                  )}
                                  {item.storage && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">{t.storage || 'Storage'}:</span>
                                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1 rounded">{item.storage}</span>
                                    </div>
                                  )}
                                  {item.brand && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">{t.brand || 'Brand'}:</span>
                                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1 rounded">{item.brand}</span>
                                    </div>
                                  )}
                                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <button
                                      onClick={() => handleReturnItem(entry.id, item.id, item.item_name, item.quantity, item.unit_price)}
                                      className="w-full px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition"
                                      title={t?.returnItem || 'Return this item'}
                                    >
                                      ↩️ {t?.returnItem || 'Return Item'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )))}
            </tbody>
          </table>
        </div>
      </div>
          </>
        );
      })()}
      
      {/* Return Quantity Modal */}
      {showReturnModal && returnModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-2xl mx-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
              {t?.returnItem || 'Return Item'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {t?.itemName || 'Item'}: <span className="font-medium">{returnModalData.itemName}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {t?.availableQuantity || 'Available'}: <span className="font-medium">{returnModalData.currentQuantity}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {t?.unitPrice || 'Unit Price'}: <span className="font-medium">${returnModalData.unitPrice}</span>
                </p>
              </div>
              
              <ReturnQuantityForm
                maxQuantity={returnModalData.maxReturnQuantity}
                unitPrice={returnModalData.unitPrice}
                onReturn={executeItemReturn}
                onCancel={() => {
                  setShowReturnModal(false);
                  setReturnModalData(null);
                }}
                t={t}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmModal
          open={confirmModal.isOpen}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
          t={t}
        />
      )}
    </div>
  );
});

// Return Quantity Form Component
function ReturnQuantityForm({ maxQuantity, unitPrice, onReturn, onCancel, t }) {
  const [quantity, setQuantity] = useState(1);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (quantity > 0 && quantity <= maxQuantity) {
      onReturn(quantity);
    }
  };
  
  const totalRefund = quantity * unitPrice;
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t?.returnQuantity || 'Return Quantity'}:
        </label>
        <input
          type="number"
          min="1"
          max={maxQuantity}
          value={quantity}
          onChange={(e) => setQuantity(Math.min(maxQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {t?.refundAmount || 'Refund Amount'}: <span className="font-bold text-green-600 dark:text-green-400">${totalRefund.toFixed(2)}</span>
        </p>
      </div>
      
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition"
        >
          {t?.cancel || 'Cancel'}
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          {t?.returnItem || 'Return'}
        </button>
      </div>
    </form>
  );
}

export default BuyingHistoryTable;
