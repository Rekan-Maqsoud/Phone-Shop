import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { useData } from '../contexts/DataContext';
import HistorySearchFilter from './HistorySearchFilter';
import ConfirmModal from './ConfirmModal';
import ReturnModal from './ReturnModal';
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
  const [confirmModal, _setConfirmModal] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnModalData, setReturnModalData] = useState(null);
  const { isRTL } = useLocale();
  const { refreshProducts, refreshAccessories, refreshTransactions } = useData() || {};
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
      
      if (currency === 'MULTI' || entry.multi_currency_usd !== null || entry.multi_currency_iqd !== null) {
        // For MULTI currency entries OR entries with multi-currency data, use the actual amounts stored in multi_currency fields
        totalAmountUSD += entry.multi_currency_usd || 0;
        totalAmountIQD += entry.multi_currency_iqd || 0;
      } else {
        const amount = entry.total_price || entry.amount || 0;
        if (currency === 'USD') {
          totalAmountUSD += amount;
        } else if (currency === 'IQD') {
          // Ensure IQD amounts are not accidentally converted
          totalAmountIQD += amount;
        }
      }
    });

    // Add debugging to track total calculations
    console.log('🔍 [BUYING HISTORY TOTALS DEBUG]:', {
      totalEntries,
      totalAmountUSD,
      totalAmountIQD,
      entries: historyData.map(entry => ({
        id: entry.id,
        currency: entry.currency,
        total_price: entry.total_price,
        multi_currency_usd: entry.multi_currency_usd,
        multi_currency_iqd: entry.multi_currency_iqd
      }))
    });

    return {
      totalRevenueUSD: totalAmountUSD,
      totalRevenueIQD: totalAmountIQD,
      totalSales: totalEntries
    };
  }, []);

  // Handle filtered data change from search component
  const handleFilteredDataChange = useCallback((filtered) => {
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

  // Handle return entry with new ReturnModal
  const handleReturnEntry = useCallback((entry) => {
    setReturnModalData({
      type: 'entry', // Mark as full entry return
      entry: entry,
      quantity: entry.quantity || 1,
      maxQuantity: entry.quantity || 1,
    });
    setShowReturnModal(true);
  }, []);

  // Handle return item with quantity
  const handleReturnItem = useCallback((entry, item) => {
    setReturnModalData({
      type: 'item', // Mark as individual item return
      entryId: entry.id,
      itemId: item.id,
      itemName: item.item_name,
      currentQuantity: item.quantity,
      unitPrice: item.unit_price,
      maxReturnQuantity: item.quantity,
      entry: entry, // Include full entry for currency context
      currency: item.currency || 'IQD', // Use item's currency instead of entry currency
      itemData: {
        unitPrice: item.unit_price,
        currency: item.currency || 'IQD',
        itemName: item.item_name
      },
      isItemReturn: true
    });
    setShowReturnModal(true);
  }, []);

  // Process return with proper currency handling
  const processReturn = useCallback(async (returnInfo) => {
    if (!returnModalData || returnModalData.type !== 'entry') return;
    
    // Prevent multiple simultaneous calls
    if (processReturn.isProcessing) {
      console.log('🚫 Return already in progress, ignoring duplicate call');
      return;
    }
    
    processReturn.isProcessing = true;
    
    try {
      console.log('🔄 Processing return with info:', returnInfo);
      const result = await window.api.returnBuyingHistoryEntry(returnModalData.entry.id, {
        quantity: returnInfo.returnQuantity,
        returnAmounts: returnInfo.returnAmounts
      });
      
      console.log('📋 Return result:', result);
      
      if (result.success) {
        let toastMessage = result.isPartialReturn 
          ? (t?.partialReturnSuccess || 'Partial return completed successfully!')
          : (t?.returnSuccess || 'Purchase returned successfully!');
        
        // Build refund amount display
        const refundAmounts = [];
        if (result.refundedUSD > 0) {
          const formatted = result.refundedUSD.toFixed(2);
          const cleanFormatted = formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted;
          refundAmounts.push(`$${cleanFormatted}`);
        }
        if (result.refundedIQD > 0) refundAmounts.push(`د.ع${result.refundedIQD.toFixed(0)}`);
        
        if (refundAmounts.length > 0) {
          toastMessage += ` Amount refunded: ${refundAmounts.join(' + ')}`;
        }
        
        // Add partial return information
        if (result.isPartialReturn && result.remainingQuantity > 0) {
          toastMessage += `\n\nRemaining quantity: ${result.remainingQuantity}`;
        }
        
        if (result.hasStockIssues) {
          toastMessage += '\n\nNote: Some items had insufficient stock. Only available quantities were returned.';
        }
        
        admin?.setToast(toastMessage, result.hasStockIssues ? 'warning' : 'success');
        
        // Close modal
        setShowReturnModal(false);
        setReturnModalData(null);
        
        refreshBuyingHistory();
        // Also refresh products and accessories to show updated stock levels
        if (refreshProducts) await refreshProducts();
        if (refreshAccessories) await refreshAccessories();
        // CRITICAL: Refresh transactions to update "Today's Returns" in dashboard
        if (refreshTransactions) await refreshTransactions();
      } else {
        console.error('❌ Return failed:', result.message);
        admin?.setToast(result.message || t?.returnFailed || 'Failed to return purchase', 'error');
      }
    } catch (error) {
      console.error('❌ Error returning entry:', error);
      // Show more specific error message if available
      const errorMessage = error.message || error.toString();
      if (errorMessage.includes('Invalid return amount') || errorMessage.includes('Maximum refundable')) {
        admin?.setToast(errorMessage, 'error');
      } else {
        admin?.setToast(t?.returnError || 'Error occurred during return', 'error');
      }
    } finally {
      processReturn.isProcessing = false;
    }
  }, [t, refreshBuyingHistory, refreshProducts, refreshAccessories, refreshTransactions, admin, returnModalData]);

  const executeItemReturn = async (returnInfo) => {
    if (!returnModalData || returnModalData.type !== 'item') return;

    // Prevent multiple simultaneous calls
    if (executeItemReturn.isProcessing) {
      console.log('🚫 Item return already in progress, ignoring duplicate call');
      return;
    }
    
    executeItemReturn.isProcessing = true;
    console.log('🔄 Starting item return...', returnInfo);

    try {
      const result = await window.api.returnBuyingHistoryItem(
        returnModalData.entryId,
        returnModalData.itemId,
        returnInfo.returnQuantity,
        {
          returnAmounts: returnInfo.returnAmounts
        }
      );
      
      console.log('📤 Item return API result:', result);
      
      if (result.success) {
        let toastMessage = t?.returnSuccess || 'Item returned successfully!';
        
        // Build refund amount display
        const refundAmounts = [];
        if (result.returnedAmountUSD > 0) {
          const formatted = result.returnedAmountUSD.toFixed(2);
          const cleanFormatted = formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted;
          refundAmounts.push(`$${cleanFormatted}`);
        }
        if (result.returnedAmountIQD > 0) refundAmounts.push(`د.ع${Math.round(result.returnedAmountIQD).toLocaleString()}`);
        
        if (refundAmounts.length > 0) {
          toastMessage += ` Amount refunded: ${refundAmounts.join(' + ')}`;
        }
        
        if (result.hasStockIssue) {
          toastMessage += `\n\nNote: Only ${result.actualReturnQty} items were returned due to insufficient stock (${result.availableStock} available).`;
        }
        
        admin?.setToast(toastMessage, result.hasStockIssue ? 'warning' : 'success');
        
        // Close modal first
        setShowReturnModal(false);
        setReturnModalData(null);
        
        // Then refresh data
        refreshBuyingHistory();
        // Also refresh products and accessories to show updated stock levels
        if (refreshProducts) await refreshProducts();
        if (refreshAccessories) await refreshAccessories();
        // CRITICAL: Refresh transactions to update "Today's Returns" in dashboard
        if (refreshTransactions) await refreshTransactions();
      } else {
        console.error('❌ Item return failed:', result.message);
        admin?.setToast(result.message || t?.returnError || 'Failed to return item', 'error');
      }
    } catch (error) {
      console.error('❌ Error returning item:', error);
      // Show more specific error message if available
      const errorMessage = error.message || error.toString();
      if (errorMessage.includes('Invalid return amount') || errorMessage.includes('Maximum refundable')) {
        admin?.setToast(errorMessage, 'error');
      } else {
        admin?.setToast(t?.returnError || 'Error occurred during item return', 'error');
      }
    } finally {
      executeItemReturn.isProcessing = false;
    }
  };

  // Format currency display for individual items
  const formatItemCurrency = (item) => {
    const totalPrice = (item.quantity || 1) * (item.unit_price || 0);
    if (item.currency === 'USD') {
      const formatted = totalPrice.toFixed(2);
      const cleanFormatted = formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted;
      return `$${cleanFormatted}`;
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
                        <div className="flex flex-col gap-1">
                          {(() => {
                            // Check if this is truly a multi-currency purchase with actual amounts in both currencies
                            const hasUSD = (entry.multi_currency_usd || 0) > 0;
                            const hasIQD = (entry.multi_currency_iqd || 0) > 0;
                            
                            // If it has multi-currency data with at least one positive amount, show multi-currency layout
                            if ((entry.currency === 'MULTI' || entry.multi_currency_usd !== null || entry.multi_currency_iqd !== null) && (hasUSD || hasIQD)) {
                              return (
                                <div className="space-y-1">
                                  {hasUSD && (
                                    <div className="bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg border-l-2 border-orange-500">
                                      <span className="text-orange-700 dark:text-orange-400 font-bold text-sm">
                                        ${(() => {
                                          const formatted = entry.multi_currency_usd.toFixed(2);
                                          return formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted;
                                        })()}
                                      </span>
                                    </div>
                                  )}
                                  {hasIQD && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg border-l-2 border-blue-500">
                                      <span className="text-blue-700 dark:text-blue-400 font-bold text-sm">
                                        د.ع{Math.round(entry.multi_currency_iqd).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            } else {
                              // Single currency purchase - use regular amount/total_price
                              const amount = entry.total_price || entry.amount || 0;
                              const currency = entry.currency || 'IQD';
                              
                              return (
                                <div className={`px-2 py-1 rounded-lg font-bold text-sm ${
                                  currency === 'USD' 
                                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-l-2 border-orange-500'
                                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-l-2 border-blue-500'
                                }`}>
                                  {currency === 'USD' 
                                    ? (() => {
                                        const formatted = amount.toFixed(2);
                                        return `$${formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted}`;
                                      })()
                                    : `د.ع${Math.round(amount).toLocaleString()}`
                                  }
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="px-6 py-4 text-center">
                        {(() => {
                          const hasItemsActually = entry.has_items && entry.items && Array.isArray(entry.items) && entry.items.length > 0;
                          
                          if (hasItemsActually) {
                            return (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <Icon name="package" size={14} className="inline mr-1" />
                                {entry.items.length} {entry.items.length === 1 ? (t?.item || 'Item') : (t?.items || 'Items')}
                              </span>
                            );
                          } else {
                            return (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                <Icon name="dollarSign" size={14} className="inline mr-1" />
                                {t?.expense || 'Expense'}
                              </span>
                            );
                          }
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          {(() => {
                            // Use same logic as Items column to ensure consistency
                            const hasItemsActually = entry.has_items && entry.items && Array.isArray(entry.items) && entry.items.length > 0;
                            
                            return hasItemsActually && (
                              <button
                                onClick={() => toggleExpanded(entry.id)}
                                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm flex items-center gap-1"
                                title={t?.viewItems || 'View items'}
                              >
                                {expandedEntries.has(entry.id) ? (
                                  <>
                                    <Icon name="chevronUp" size={14} />
                                    <span>{t?.hideItems || 'Hide'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Icon name="chevronDown" size={14} />
                                    <span>{t?.viewItems || 'View'}</span>
                                  </>
                                )}
                              </button>
                            );
                          })()}
                          <button
                            onClick={() => handleReturnEntry(entry)}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                            title={t?.returnPurchase || 'Return purchase'}
                          >
                            <Icon name="undo" size={14} className="inline mr-1" />
                            {t?.returnEntry || 'Return'}
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
                                      <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                        item.currency === 'USD' 
                                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                      }`}>
                                        {item.currency === 'USD' 
                                          ? (() => {
                                              const formatted = item.unit_price.toFixed(2);
                                              return `$${formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted}`;
                                            })()
                                          : `د.ع${Math.round(item.unit_price).toLocaleString()}`
                                        }
                                      </div>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">{t?.total || 'Total'}:</span>
                                      <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                        item.currency === 'USD' 
                                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                      }`}>
                                        {formatItemCurrency(item, t)}
                                      </div>
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

      {/* Enhanced Return Modal */}
      {showReturnModal && returnModalData && (
        <ReturnModal
          show={showReturnModal}
          onClose={() => {
            setShowReturnModal(false);
            setReturnModalData(null);
          }}
          onConfirm={returnModalData.type === 'item' ? executeItemReturn : processReturn}
          returnData={returnModalData}
          admin={admin}
          t={t}
        />
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
