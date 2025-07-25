import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { useData } from '../contexts/DataContext';
import HistorySearchFilter from './HistorySearchFilter';
import ConfirmModal from './ConfirmModal';
import { Icon } from '../utils/icons.jsx';
import { getTextAlign } from '../utils/rtlUtils';

// Simplified Buying History Table with proper currency handling and return functionality
const BuyingHistoryTableSimplified = React.memo(function BuyingHistoryTableSimplified({ 
  buyingHistory, 
  t, 
  onAddPurchase, 
  refreshBuyingHistory,
  admin 
}) {
  const [expandedEntries, setExpandedEntries] = useState(new Set());
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);
  const [quantityModal, setQuantityModal] = useState({ 
    isOpen: false, 
    entry: null, 
    item: null, 
    maxQuantity: 0 
  });
  const { isRTL } = useLocale();
  const { refreshProducts, refreshAccessories } = useData() || {};
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Update filtered history when buyingHistory changes
  useEffect(() => {
    setFilteredHistory(buyingHistory || []);
    setCurrentPage(1);
  }, [buyingHistory]);

  // Calculate totals for filtered buying history by currency
  const calculateTotals = useCallback((historyData) => {
    let totalAmountUSD = 0;
    let totalAmountIQD = 0;
    let totalEntries = historyData.length;

    historyData.forEach(entry => {
      const currency = entry.currency || 'IQD';
      
      if (currency === 'MULTI') {
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
      totalRevenueUSD: totalAmountUSD,
      totalRevenueIQD: totalAmountIQD,
      totalSales: totalEntries
    };
  }, []);

  // Handle filtered data change from search component
  const handleFilteredDataChange = useCallback((filtered, calculatedTotals) => {
    setFilteredHistory(filtered);
  }, []);

  // Toggle expanded view for entries with items
  const toggleExpanded = useCallback((entryId) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  }, [expandedEntries]);

  // Handle return entry - complete purchase return
  const handleReturnEntry = useCallback(async (entry) => {
    setConfirmModal({
      isOpen: true,
      message: `${t?.confirmReturnPurchase || 'Are you sure you want to return this purchase?'}\n\n${t?.companyName || 'Company'}: ${entry.supplier || entry.company_name || 'N/A'}\n${t?.amount || 'Amount'}: ${formatCurrency(entry, t)}\n\n${t?.thisWillReturnStock || 'This will return items to stock and refund the amount to your balance.'}`,
      onConfirm: () => processEntryReturn(entry),
      onCancel: () => setConfirmModal(null)
    });
  }, [t]);

  // Handle return individual item
  const handleReturnItem = useCallback(async (entry, item) => {
    // Set up quantity selection
    const availableQuantity = item.quantity || 1;
    
    if (availableQuantity <= 1) {
      // Single item, show confirmation
      setConfirmModal({
        isOpen: true,
        message: `${t?.confirmReturnItem || 'Are you sure you want to return this item?'}\n\n${t?.itemName || 'Item'}: ${item.item_name}\n${t?.quantity || 'Quantity'}: ${item.quantity}\n${t?.amount || 'Amount'}: ${formatItemCurrency(item, t)}\n\n${t?.thisWillReturnStock || 'This will return items to stock and refund the amount to your balance.'}`,
        onConfirm: () => processItemReturn(entry, item, 1),
        onCancel: () => setConfirmModal(null)
      });
    } else {
      // Multiple items, show quantity input
      setQuantityModal({
        isOpen: true,
        entry,
        item,
        maxQuantity: availableQuantity
      });
    }
  }, [t]);

  // Handle quantity modal confirmation
  const handleQuantityConfirm = useCallback((quantity) => {
    const { entry, item } = quantityModal;
    const unitPrice = item.unit_price || 0;
    const totalPrice = quantity * unitPrice;
    const currency = item.currency === 'USD' ? '$' : 'د.ع';
    const formattedAmount = item.currency === 'USD' ? 
      `${currency}${totalPrice.toFixed(2)}` : 
      `${currency}${Math.round(totalPrice).toLocaleString()}`;

    setConfirmModal({
      isOpen: true,
      message: `${t?.confirmReturnItem || 'Are you sure you want to return this item?'}\n\n${t?.itemName || 'Item'}: ${item.item_name}\n${t?.quantity || 'Quantity'}: ${quantity}\n${t?.amount || 'Amount'}: ${formattedAmount}\n\n${t?.thisWillReturnStock || 'This will return items to stock and refund the amount to your balance.'}`,
      onConfirm: () => processItemReturn(entry, item, quantity),
      onCancel: () => {
        setConfirmModal(null);
        setQuantityModal({ isOpen: false, entry: null, item: null, maxQuantity: 0 });
      }
    });
  }, [quantityModal, t]);

  // Process complete entry return
  const processEntryReturn = async (entry) => {
    try {
      const result = await window.api.returnBuyingHistoryEntry(entry.id);
      
      if (result.success) {
        let message = t?.returnSuccess || 'Purchase returned successfully!';
        if (result.refundedUSD > 0) {
          message += `\n${t?.refundedUSD || 'Refunded USD'}: $${result.refundedUSD.toFixed(2)}`;
        }
        if (result.refundedIQD > 0) {
          message += `\n${t?.refundedIQD || 'Refunded IQD'}: د.ع${Math.round(result.refundedIQD).toLocaleString()}`;
        }
        if (result.itemsReturned > 0) {
          message += `\n${t?.itemsReturned || 'Items returned to stock'}: ${result.itemsReturned}`;
        }
        
        admin?.setToast(message, 'success', 5000);
        
        // Refresh data
        refreshBuyingHistory();
        if (refreshProducts) await refreshProducts();
        if (refreshAccessories) await refreshAccessories();
      } else {
        admin?.setToast(result.message || (t?.returnFailed || 'Failed to return purchase'), 'error');
      }
    } catch (error) {
      console.error('Error returning entry:', error);
      admin?.setToast(t?.returnError || 'Error occurred during return', 'error');
    }
    
    setConfirmModal(null);
  };

  // Process individual item return
  const processItemReturn = async (entry, item, quantity = 1) => {
    try {
      const result = await window.api.returnBuyingHistoryItem(entry.id, item.id, quantity);
      
      if (result.success) {
        let message = t?.returnSuccess || 'Item returned successfully!';
        if (result.refundedUSD > 0) {
          message += `\n${t?.refundedUSD || 'Refunded USD'}: $${result.refundedUSD.toFixed(2)}`;
        }
        if (result.refundedIQD > 0) {
          message += `\n${t?.refundedIQD || 'Refunded IQD'}: د.ع${Math.round(result.refundedIQD).toLocaleString()}`;
        }
        
        admin?.setToast(message, 'success', 5000);
        
        // Refresh data
        refreshBuyingHistory();
        if (refreshProducts) await refreshProducts();
        if (refreshAccessories) await refreshAccessories();
      } else {
        admin?.setToast(result.message || (t?.returnFailed || 'Failed to return item'), 'error');
      }
    } catch (error) {
      console.error('Error returning item:', error);
      admin?.setToast(t?.returnError || 'Error occurred during return', 'error');
    }
    
    setConfirmModal(null);
    setQuantityModal({ isOpen: false, entry: null, item: null, maxQuantity: 0 });
  };

  // Format currency display for entries
  const formatCurrency = (entry, t) => {
    if (entry.currency === 'MULTI') {
      const parts = [];
      if ((entry.multi_currency_usd || 0) > 0) {
        parts.push(`$${entry.multi_currency_usd.toFixed(2)}`);
      }
      if ((entry.multi_currency_iqd || 0) > 0) {
        parts.push(`د.ع${Math.round(entry.multi_currency_iqd).toLocaleString()}`);
      }
      return parts.length > 0 ? parts.join(' + ') : (t?.multiCurrency || 'Multi-currency');
    } else {
      const amount = entry.total_price || entry.amount || 0;
      if (entry.currency === 'USD') {
        return `$${amount.toFixed(2)}`;
      } else {
        return `د.ع${Math.round(amount).toLocaleString()}`;
      }
    }
  };

  // Format currency display for individual items
  const formatItemCurrency = (item, t) => {
    const totalPrice = (item.quantity || 1) * (item.unit_price || 0);
    if (item.currency === 'USD') {
      return `$${totalPrice.toFixed(2)}`;
    } else {
      return `د.ع${Math.round(totalPrice).toLocaleString()}`;
    }
  };

  // Pagination logic
  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredHistory.slice(startIndex, endIndex);
  }, [filteredHistory, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  if (!buyingHistory || buyingHistory.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            <Icon name="shoppingBag" size={24} className="inline mr-2" />
            {t?.buyingHistory || 'Buying History'}
          </h2>
          <button
            onClick={onAddPurchase}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition font-semibold shadow-lg"
          >
            <Icon name="plus" size={16} className="inline mr-2" />
            {t?.addPurchase || 'Add Purchase'}
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
      {/* Header */}
      <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-6 border border-white/20">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              <Icon name="shoppingBag" size={24} className="inline mr-2" />
              {t?.buyingHistory || 'Buying History'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t?.buyingHistoryDesc || 'Track all your business purchases and expenses'}
            </p>
          </div>
          
          <button
            onClick={onAddPurchase}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition font-semibold shadow-lg"
          >
            <Icon name="plus" size={16} className="inline mr-2" />
            {t?.addPurchase || 'Add Purchase'}
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <HistorySearchFilter
        data={buyingHistory || []}
        onFilteredDataChange={handleFilteredDataChange}
        t={t}
        searchFields={['supplier', 'item_name', 'company_name', 'description']}
        dateField="date"
        showNameSearch={true}
        showTotals={true}
        calculateTotals={calculateTotals}
        showBrandFilter={false}
      />

      {/* Pagination Controls */}
      {filteredHistory.length > itemsPerPage && (
        <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow-2xl mb-4 p-4 border border-white/20">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t?.showing || 'Showing'} {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredHistory.length)} {t?.of || 'of'} {filteredHistory.length} {t?.entries || 'entries'}
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
      <div className="bg-white/70 dark:bg-gray-800/90 rounded-3xl shadow-2xl overflow-hidden border-2 border-white/30 dark:border-gray-600/30 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-700 via-cyan-600 to-blue-700 text-white">
              <tr>
                <th className={`px-6 py-4 font-bold ${getTextAlign(isRTL, 'center')}`}>
                  <Icon name="calendar" size={16} className="inline mr-2" />
                  {t?.date || 'Date'}
                </th>
                <th className={`px-6 py-4 font-bold ${getTextAlign(isRTL, 'center')}`}>
                  <Icon name="building2" size={16} className="inline mr-2" />
                  {t?.companyName || 'Company'}
                </th>
                <th className={`px-6 py-4 font-bold ${getTextAlign(isRTL, 'center')}`}>
                  <Icon name="fileText" size={16} className="inline mr-2" />
                  {t?.description || 'Description'}
                </th>
                <th className={`px-6 py-4 font-bold ${getTextAlign(isRTL, 'center')}`}>
                  <Icon name="dollarSign" size={16} className="inline mr-2" />
                  {t?.amount || 'Amount'}
                </th>
                <th className={`px-6 py-4 font-bold ${getTextAlign(isRTL, 'center')}`}>
                  <Icon name="package" size={16} className="inline mr-2" />
                  {t?.items || 'Items'}
                </th>
                <th className={`px-6 py-4 font-bold ${getTextAlign(isRTL, 'center')}`}>
                  <Icon name="settings" size={16} className="inline mr-2" />
                  {t?.actions || 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {t?.noPurchasesFound || 'No purchases found'}
                  </td>
                </tr>
              ) : (
                paginatedHistory.map((entry, idx) => (
                  <React.Fragment key={entry.id || idx}>
                    <tr className={`border-b border-gray-200/50 dark:border-gray-600/50 ${idx % 2 === 0 ? 'bg-white/50 dark:bg-gray-800/50' : 'bg-gray-50/50 dark:bg-gray-900/50'} hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors`}>
                      
                      {/* Date */}
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {entry.date ? new Date(entry.date).toLocaleDateString() : '-'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {entry.date ? new Date(entry.date).toLocaleTimeString() : ''}
                        </div>
                      </td>

                      {/* Company */}
                      <td className="px-6 py-4 text-center">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {entry.supplier || entry.company_name || '-'}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4 text-center">
                        <div className="text-gray-700 dark:text-gray-300">
                          {entry.item_name || entry.description || '-'}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 text-center">
                        <div className="font-bold text-lg">
                          {formatCurrency(entry, t)}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="px-6 py-4 text-center">
                        {entry.has_items ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <Icon name="package" size={14} className="inline mr-1" />
                            {t?.withItems || 'With Items'}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            <Icon name="dollarSign" size={14} className="inline mr-1" />
                            {t?.expense || 'Expense'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          {entry.has_items && entry.items && entry.items.length > 0 && (
                            <button
                              onClick={() => toggleExpanded(entry.id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                              title={t?.viewItems || 'View items'}
                            >
                              {expandedEntries.has(entry.id) ? (
                                <Icon name="chevronUp" size={14} />
                              ) : (
                                <Icon name="chevronDown" size={14} />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleReturnEntry(entry)}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                            title={t?.returnPurchase || 'Return purchase'}
                          >
                            <Icon name="undo" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Items View */}
                    {entry.has_items && expandedEntries.has(entry.id) && entry.items && (
                      <tr className="bg-blue-50/50 dark:bg-blue-900/20">
                        <td colSpan="6" className="px-6 py-4">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                              <Icon name="package" size={16} className="mr-2" />
                              {t?.purchasedItems || 'Purchased Items'}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {entry.items.map((item, itemIdx) => (
                                <div key={itemIdx} className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Icon 
                                      name={item.item_type === 'product' ? 'phone' : 'accessories'} 
                                      size={16} 
                                      className="text-blue-600" 
                                    />
                                    <span className="font-medium text-gray-800 dark:text-gray-200">
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
                                      <span className="text-blue-600">
                                        {item.currency === 'USD' ? '$' : 'د.ع'}
                                        {item.currency === 'USD' ? item.unit_price.toFixed(2) : Math.round(item.unit_price).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">{t?.total || 'Total'}:</span>
                                      <span className="font-bold text-green-600">
                                        {formatItemCurrency(item, t)}
                                      </span>
                                    </div>
                                    <div className="mt-2 pt-2 border-t">
                                      <button
                                        onClick={() => handleReturnItem(entry, item)}
                                        className="w-full px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition"
                                      >
                                        <Icon name="undo" size={12} className="inline mr-1" />
                                        {t?.returnItem || 'Return Item'}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quantity Selection Modal */}
      {quantityModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              {t?.selectQuantity || 'Select Quantity to Return'}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>{t?.item || 'Item'}:</strong> {quantityModal.item?.item_name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <strong>{t?.availableQuantity || 'Available'}:</strong> {quantityModal.maxQuantity}
              </p>
              
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t?.quantityToReturn || 'Quantity to Return'}
              </label>
              <select
                id="returnQuantity"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                defaultValue="1"
                onChange={(e) => {
                  const quantity = parseInt(e.target.value);
                  handleQuantityConfirm(quantity);
                }}
              >
                {Array.from({ length: quantityModal.maxQuantity }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? (t?.item || 'item') : (t?.items || 'items')}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setQuantityModal({ isOpen: false, entry: null, item: null, maxQuantity: 0 })}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
              >
                {t?.cancel || 'Cancel'}
              </button>
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

export default BuyingHistoryTableSimplified;
