import React, { useState, useCallback, useEffect } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { useData } from '../contexts/DataContext';
import HistorySearchFilter from './HistorySearchFilter';
import ConfirmModal from './ConfirmModal';
import { Icon } from '../utils/icons.jsx';
import { getTextAlign } from '../utils/rtlUtils';

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
  const { isRTL } = useLocale();
  const [returnModalData, setReturnModalData] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  
  // Import refresh functions from data context
  const { refreshProducts, refreshAccessories } = useData() || {};
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
  const handleReturnEntry = useCallback((entry) => {
    const isMultiCurrency = entry.currency === 'MULTI' && ((entry.multi_currency_usd || 0) > 0 || (entry.multi_currency_iqd || 0) > 0);
    
    let amountDisplay = '';
    if (isMultiCurrency) {
      const amounts = [];
      if ((entry.multi_currency_usd || 0) > 0) amounts.push(`$${(entry.multi_currency_usd || 0).toFixed(2)}`);
      if ((entry.multi_currency_iqd || 0) > 0) amounts.push(`د.ع${(entry.multi_currency_iqd || 0).toFixed(2)}`);
      amountDisplay = amounts.join(' + ');
    } else {
      const currency = entry.currency || 'IQD';
      const amount = entry.total_price || entry.amount || 0;
      amountDisplay = `${currency === 'USD' ? '$' : 'د.ع'}${amount.toFixed(2)}`;
    }
    
    setConfirmModal({
      isOpen: true,
      title: t?.returnEntry || 'Return Purchase',
      message: t?.confirmReturnEntry || `Are you sure you want to return this purchase?\n\nRefund amount: ${amountDisplay}`,
      onConfirm: async () => {
        try {
          const result = await window.api.returnBuyingHistoryEntry(entry.id);
          if (result.success) {
            let toastMessage = t?.returnSuccess || 'Purchase returned successfully!';
            
            // Build refund amount display
            const refundAmounts = [];
            if (result.returnedAmountUSD > 0) refundAmounts.push(`$${result.returnedAmountUSD.toFixed(2)}`);
            if (result.returnedAmountIQD > 0) refundAmounts.push(`د.ع${result.returnedAmountIQD.toFixed(2)}`);
            
            if (refundAmounts.length > 0) {
              toastMessage += ` Amount refunded: ${refundAmounts.join(' + ')}`;
            }
            
            if (result.hasStockIssues) {
              toastMessage += '\n\nNote: Some items had insufficient stock. Only available quantities were returned.';
            }
            
            // Use ToastUnified instead of alert
            if (window.showToast) {
              window.showToast(toastMessage, result.hasStockIssues ? 'warning' : 'success');
            }
            refreshBuyingHistory();
            // Also refresh products and accessories to show updated stock levels
            if (refreshProducts) await refreshProducts();
            if (refreshAccessories) await refreshAccessories();
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
        let toastMessage = t?.returnSuccess || 'Item returned successfully!';
        
        // Build refund amount display
        const refundAmounts = [];
        if (result.returnedAmountUSD > 0) refundAmounts.push(`$${result.returnedAmountUSD.toFixed(2)}`);
        if (result.returnedAmountIQD > 0) refundAmounts.push(`د.ع${result.returnedAmountIQD.toFixed(2)}`);
        
        if (refundAmounts.length > 0) {
          toastMessage += ` Amount refunded: ${refundAmounts.join(' + ')}`;
        }
        
        if (result.hasStockIssue) {
          toastMessage += `\n\nNote: Only ${result.actualReturnQty} items were returned due to insufficient stock (${result.availableStock} available).`;
        }
        
        if (window.showToast) {
          window.showToast(toastMessage, result.hasStockIssue ? 'warning' : 'success');
        }
        refreshBuyingHistory();
        // Also refresh products and accessories to show updated stock levels
        if (refreshProducts) await refreshProducts();
        if (refreshAccessories) await refreshAccessories();
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
            <div className="bg-white/70 dark:bg-gray-800/90 rounded-3xl shadow-2xl overflow-hidden border-2 border-white/30 dark:border-gray-600/30 backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full" dir="auto">
                  <thead className="bg-gradient-to-r from-blue-700 via-cyan-600 to-blue-700 text-white relative">
                    <tr>
                      <th className={`px-6 py-6 font-bold text-lg ${getTextAlign(isRTL, 'right')} border-r border-white/20 relative`}>
                        <div className="flex items-center gap-2 justify-center">
                          <Icon name="calendar" size={16} />
                          {t?.date || 'Date'}
                        </div>
                      </th>
                      <th className={`px-6 py-6 font-bold text-lg ${getTextAlign(isRTL, 'right')} border-r border-white/20`}>
                        <div className="flex items-center gap-2 justify-center">
                          <Icon name="building2" size={16} />
                          {t?.companyName || 'Company'}
                        </div>
                      </th>
                      <th className={`px-6 py-6 font-bold text-lg ${getTextAlign(isRTL, 'right')} border-r border-white/20`}>
                        <div className="flex items-center gap-2 justify-center">
                          <Icon name="banknote" size={16} />
                          {t?.currency || 'Currency'}
                        </div>
                      </th>
                      <th className={`px-6 py-6 font-bold text-lg ${getTextAlign(isRTL, 'right')} border-r border-white/20`}>
                        <div className="flex items-center gap-2 justify-center">
                          <Icon name="dollarSign" size={16} />
                          {t?.amount || 'Amount'}
                        </div>
                      </th>
                      <th className={`px-6 py-6 font-bold text-lg ${getTextAlign(isRTL, 'right')} border-r border-white/20`}>
                        <div className="flex items-center gap-2 justify-center">
                          <Icon name="fileText" size={16} />
                          {t?.description || 'Description'}
                        </div>
                      </th>
                      <th className={`px-6 py-6 font-bold text-lg ${getTextAlign(isRTL, 'right')} border-r border-white/20`}>
                        <div className="flex items-center gap-2 justify-center">
                          <Icon name="package" size={16} />
                          {t?.items || 'Items'}
                        </div>
                      </th>
                      <th className={`px-6 py-6 font-bold text-lg ${getTextAlign(isRTL, 'right')}`}>
                        <div className="flex items-center gap-2 justify-center">
                          <Icon name="settings" size={16} />
                          {t?.actions || 'Actions'}
                        </div>
                      </th>
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
                  <tr className={`border-b-2 border-gray-200/50 dark:border-gray-600/50 ${idx % 2 === 0 ? 'bg-gradient-to-r from-white to-gray-50 dark:from-gray-800/80 dark:to-gray-900/60' : 'bg-gradient-to-r from-gray-50 to-white dark:from-gray-900/60 dark:to-gray-800/80'} hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 dark:hover:from-cyan-900/30 dark:hover:to-blue-900/30 transition-all duration-200 transform hover:scale-[1.001] hover:shadow-md`}>
                    <td className="px-6 py-5 border-r border-gray-200/30 dark:border-gray-600/30">
                      <div className="flex flex-col space-y-1">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {entry.date ? new Date(entry.date).toLocaleDateString() : '-'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-700/50 px-2 py-1 rounded-full w-fit">
                          {entry.date ? new Date(entry.date).toLocaleTimeString() : ''}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 border-r border-gray-200/30 dark:border-gray-600/30">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-cyan-400">
                        {(entry.supplier || entry.company_name || '-').toString().charAt(0).toUpperCase() + (entry.supplier || entry.company_name || '-').toString().slice(1).toLowerCase()}
                      </div>
                    </td>
                    <td className="px-6 py-5 border-r border-gray-200/30 dark:border-gray-600/30">
                      <div className="flex justify-center">
                        <span className={`px-3 py-2 rounded-xl text-xs font-bold shadow-lg ${
                          entry.currency === 'MULTI' 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-purple-200 dark:shadow-purple-800'
                            : entry.currency === 'USD'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-200 dark:shadow-green-800'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-blue-200 dark:shadow-blue-800'
                        }`}>
                          {entry.currency === 'MULTI' ? 'Multi' : (entry.currency || 'USD')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 border-r border-gray-200/30 dark:border-gray-600/30">
                      <div className="text-right">
                        {entry.currency === 'MULTI' ? (
                          <div className="flex flex-col gap-2">
                            {(entry.multi_currency_usd || 0) > 0 && (
                              <div className="bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg border-l-4 border-green-500">
                                <span className="text-green-700 dark:text-green-400 font-bold text-lg">
                                  ${(() => {
                                    const formatted = (entry.multi_currency_usd || 0).toFixed(2);
                                    return formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted;
                                  })()}
                                </span>
                              </div>
                            )}
                            {(entry.multi_currency_iqd || 0) > 0 && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border-l-4 border-blue-500">
                                <span className="text-blue-700 dark:text-blue-400 font-bold text-lg">
                                  د.ع{Math.round(entry.multi_currency_iqd || 0).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {(entry.multi_currency_usd || 0) === 0 && 
                             (entry.multi_currency_iqd || 0) === 0 && (
                              <span className="text-gray-500 italic">{t?.multiCurrency || 'Multi-currency'}</span>
                            )}
                          </div>
                        ) : (
                          <div className={`px-4 py-3 rounded-xl font-bold text-xl ${
                            entry.currency === 'USD' 
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-2 border-green-200 dark:border-green-600/50'
                              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-600/50'
                          }`}>
                            {entry.currency === 'USD' 
                              ? (() => {
                                  const amount = entry.total_price || entry.amount || 0;
                                  const formatted = amount.toFixed(2);
                                  return `$${formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted}`;
                                })()
                              : `د.ع${Math.round(entry.total_price || entry.amount || 0).toLocaleString()}`
                            }
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 border-r border-gray-200/30 dark:border-gray-600/30">
                      <div className="text-gray-700 dark:text-gray-300 font-medium bg-gray-50/80 dark:bg-gray-700/50 px-3 py-2 rounded-lg">
                        {entry.item_name || entry.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-5 border-r border-gray-200/30 dark:border-gray-600/30">
                      <div className="flex justify-center">
                        {!!entry.has_items ? (
                          <span className="px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-green-200 dark:shadow-green-800 flex items-center gap-2">
                            <Icon name="package" size={18} /> {t?.withItems || 'With Items'}
                          </span>
                        ) : (
                          <span className="px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-lg shadow-gray-200 dark:shadow-gray-800 flex items-center gap-2">
                            <Icon name="money" size={18} /> {t?.cashOnly || 'Cash Only'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex gap-3 justify-center">
                        {!!entry.has_items && (
                          <button
                            onClick={() => toggleExpanded(entry.id)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 transform hover:scale-105 shadow-lg shadow-blue-200 dark:shadow-blue-800 font-medium text-sm flex items-center gap-2"
                          >
                            <span className="text-lg">{expandedEntries.has(entry.id) ? '🔼' : '🔽'}</span>
                            {t?.viewItems || 'View Items'}
                          </button>
                        )}
                        <button
                          onClick={() => handleReturnEntry(entry)}
                          className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 transition-all duration-200 transform hover:scale-105 shadow-lg shadow-red-200 dark:shadow-red-800 font-medium text-sm flex items-center gap-2"
                          title={t?.returnEntry || 'Return this purchase'}
                        >
                          <span className="text-lg">↩️</span>
                          {t?.returnEntry || 'Return'}
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
