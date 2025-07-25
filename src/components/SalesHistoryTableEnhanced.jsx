import React, { useState, useMemo, useCallback, useEffect } from 'react';
import HistorySearchFilter from './HistorySearchFilter';
import { Icon } from '../utils/icons.jsx';

// Enhanced Sales History Table with performance optimizations
const SalesHistoryTableEnhanced = React.memo(function SalesHistoryTableEnhanced({ sales, t, onView, onPrintLast, onReturn }) {
  const [filteredSales, setFilteredSales] = useState(sales || []);
  const [totals, setTotals] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedSales, setExpandedSales] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // Performance optimization: limit to 50 items per page

  // Reset pagination when sales data changes
  useEffect(() => {
    setFilteredSales(sales || []);
    setCurrentPage(1); // Reset to first page when data changes
  }, [sales]);

  // Simple currency formatter with proper decimal handling
  const formatCurrency = (amount, currency) => {
    const symbol = currency === 'USD' ? '$' : 'د.ع';
    
    if (currency === 'IQD') {
      // IQD should never show decimals
      const rounded = Math.round(amount || 0);
      return `${symbol}${rounded.toLocaleString()}`;
    }
    
    // For USD: show 2 decimals, but remove .00 for whole numbers
    const formatted = Number(amount || 0).toFixed(2);
    const cleanFormatted = formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted;
    return `${symbol}${cleanFormatted}`;
  };

  // Calculate totals for filtered sales
  const calculateTotals = useCallback((salesData) => {
    let totalRevenueUSD = 0;
    let totalRevenueIQD = 0;
    let totalProfitUSD = 0;
    let totalProfitIQD = 0;
    let totalSales = salesData.length;
    let totalProducts = 0;

    salesData.forEach(sale => {
      // Calculate revenue based on actual payment
      if (sale.multi_currency_payment) {
        totalRevenueUSD += sale.multi_currency_payment.usd_amount || 0;
        totalRevenueIQD += sale.multi_currency_payment.iqd_amount || 0;
      } else {
        const saleTotal = sale.total || 0;
        if (sale.currency === 'USD') {
          totalRevenueUSD += saleTotal;
        } else {
          totalRevenueIQD += saleTotal;
        }
      }

      // Calculate actual profit considering discounts and change given
      let totalBuyingCostUSD = 0;
      let totalBuyingCostIQD = 0;
      
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          const qty = item.quantity || 1;
          const buyingPrice = item.buying_price || 0;
          // Use the correct product currency fields - prioritize stored currency over fallback
          const itemCurrency = item.product_currency || 
                             item.product_currency_from_table || 
                             item.accessory_currency_from_table || 
                             'IQD';
          
          if (itemCurrency === 'USD') {
            totalBuyingCostUSD += buyingPrice * qty;
          } else {
            totalBuyingCostIQD += buyingPrice * qty;
          }
        });
        totalProducts += sale.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      }
      
      // Calculate actual profit from revenue minus buying costs
      if (sale.multi_currency_payment) {
        // Multi-currency: profit = payment - buying costs in respective currencies
        totalProfitUSD += (sale.multi_currency_payment.usd_amount || 0) - totalBuyingCostUSD;
        totalProfitIQD += (sale.multi_currency_payment.iqd_amount || 0) - totalBuyingCostIQD;
      } else {
        // Single currency: convert buying costs to sale currency and subtract
        const saleTotal = sale.total || 0;
        if (sale.currency === 'USD') {
          const totalBuyingInUSD = totalBuyingCostUSD + (totalBuyingCostIQD * (sale.exchange_rate_iqd_to_usd || 0.000694));
          totalProfitUSD += saleTotal - totalBuyingInUSD;
        } else {
          const totalBuyingInIQD = totalBuyingCostIQD + (totalBuyingCostUSD * (sale.exchange_rate_usd_to_iqd || 1440));
          totalProfitIQD += saleTotal - totalBuyingInIQD;
        }
      }
    });

    return {
      totalProfitUSD,
      totalProfitIQD,
      totalRevenueUSD,
      totalRevenueIQD,
      totalSales,
      totalProducts
    };
  }, []);

  // Extract brand from sales history entry
  const getBrandFromSalesHistory = useCallback((sale) => {
    if (sale.items && Array.isArray(sale.items)) {
      const brands = sale.items
        .map(item => item.brand)
        .filter(brand => brand && brand.trim())
        .join(', ');
      if (brands) return brands;
    }
    return sale.brand || null;
  }, []);

  // Handle filtered data change from search component
  const handleFilteredDataChange = useCallback((filtered, calculatedTotals) => {
    setFilteredSales(filtered);
    setTotals(calculatedTotals);
  }, []);

  // Sort filtered sales
  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [filteredSales, sortOrder]);

  // Pagination calculations for performance
  const totalPages = Math.ceil(sortedSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = sortedSales.slice(startIndex, endIndex);

  // Toggle sale expansion
  const toggleSaleExpansion = (saleId) => {
    const newExpanded = new Set(expandedSales);
    if (newExpanded.has(saleId)) {
      newExpanded.delete(saleId);
    } else {
      newExpanded.add(saleId);
    }
    setExpandedSales(newExpanded);
  };

  // Calculate currency breakdown for each sale with proper profit accounting for discounts
  const getSaleCurrencyBreakdown = (sale) => {
    let usdData = {
      buyingTotal: 0,
      sellingTotal: 0,
      profit: 0,
      items: []
    };
    let iqdData = {
      buyingTotal: 0,
      sellingTotal: 0,
      profit: 0,
      items: []
    };

    // Process items by their original product currency
    if (sale.items && Array.isArray(sale.items)) {
      sale.items.forEach(item => {
        const qty = item.quantity || 1;
        const sellingPrice = item.selling_price || item.price || 0;
        const buyingPrice = item.buying_price || 0;
        // Use the correct product currency fields - prioritize stored currency over fallback
        const itemCurrency = item.product_currency || 
                           item.product_currency_from_table || 
                           item.accessory_currency_from_table || 
                           'IQD';
        const profit = (sellingPrice - buyingPrice) * qty;
        
        if (itemCurrency === 'USD') {
          usdData.buyingTotal += buyingPrice * qty;
          usdData.sellingTotal += sellingPrice * qty;
          usdData.profit += profit;
          usdData.items.push({...item, totalBuying: buyingPrice * qty, totalSelling: sellingPrice * qty, profit});
        } else {
          iqdData.buyingTotal += buyingPrice * qty;
          iqdData.sellingTotal += sellingPrice * qty;
          iqdData.profit += profit;
          iqdData.items.push({...item, totalBuying: buyingPrice * qty, totalSelling: sellingPrice * qty, profit});
        }
      });
    }

    // Calculate actual profit based on payment received (accounts for discounts and change)
    let actualUsdProfit = 0;
    let actualIqdProfit = 0;
    
    if (sale.multi_currency_payment) {
      // For multi-currency sales, use actual payment amounts
      const totalBuyingInUSD = usdData.buyingTotal + (iqdData.buyingTotal * (sale.exchange_rate_iqd_to_usd || 0.000694));
      const totalPaidInUSD = (sale.multi_currency_payment.usd_amount || 0) + 
                            ((sale.multi_currency_payment.iqd_amount || 0) * (sale.exchange_rate_iqd_to_usd || 0.000694));
      
      const totalProfitUSD = totalPaidInUSD - totalBuyingInUSD;
      
      // Split profit proportionally between currencies based on payment
      const usdRatio = (sale.multi_currency_payment.usd_amount || 0) / totalPaidInUSD;
      const iqdRatio = ((sale.multi_currency_payment.iqd_amount || 0) * (sale.exchange_rate_iqd_to_usd || 0.000694)) / totalPaidInUSD;
      
      actualUsdProfit = totalProfitUSD * usdRatio;
      actualIqdProfit = (totalProfitUSD * iqdRatio) / (sale.exchange_rate_iqd_to_usd || 0.000694);
    } else {
      // Single currency sale - use sale.total which accounts for discounts and actual payment
      const saleTotal = sale.total || 0;
      if (sale.currency === 'USD') {
        actualUsdProfit = saleTotal - usdData.buyingTotal - (iqdData.buyingTotal * (sale.exchange_rate_iqd_to_usd || 0.000694));
      } else {
        actualIqdProfit = saleTotal - iqdData.buyingTotal - (usdData.buyingTotal * (sale.exchange_rate_usd_to_iqd || 1440));
      }
    }

    // Calculate payment breakdown - show actual amounts paid
    let usdPaid = 0;
    let iqdPaid = 0;

    if (sale.multi_currency_payment) {
      // For multi-currency sales, show the actual amounts paid
      usdPaid = sale.multi_currency_payment.usd_amount || 0;
      iqdPaid = sale.multi_currency_payment.iqd_amount || 0;
    } else {
      const saleTotal = sale.total || 0;
      if (sale.currency === 'USD') {
        usdPaid = saleTotal;
      } else {
        iqdPaid = saleTotal;
      }
    }

    const breakdown = {
      usd: { ...usdData, paid: usdPaid, actualProfit: actualUsdProfit },
      iqd: { ...iqdData, paid: iqdPaid, actualProfit: actualIqdProfit }
    };
    return breakdown;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Component */}
      <HistorySearchFilter
        data={sales}
        onFilteredDataChange={handleFilteredDataChange}
        t={t}
        searchFields={['customer_name']}
        dateField="created_at"
        showNameSearch={true}
        showTotals={true}
        calculateTotals={calculateTotals}
        showBrandFilter={true}
        getBrandFromItem={getBrandFromSalesHistory}
      />

      {/* Pagination controls */}
      {sortedSales.length > itemsPerPage && (
        <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow-2xl mb-4 p-4 border border-white/20">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Showing {startIndex + 1}-{Math.min(endIndex, sortedSales.length)} of {sortedSales.length} entries
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

      {/* Sales Table */}
      <div className="bg-white/70 dark:bg-gray-800/90 rounded-3xl shadow-2xl overflow-hidden border-2 border-white/30 dark:border-gray-600/30 backdrop-blur-sm">
        <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-6 border border-white/20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                📊 {t.salesHistory}
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {t?.salesHistoryDesc || 'Track all your business sales and revenue'}
              </p>
            </div>
            
            {onPrintLast && (
              <button
                onClick={onPrintLast}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 transition font-semibold shadow-lg flex items-center gap-2"
                title={t?.printLastReceipt || 'Print last receipt'}
              >
                <Icon name="printer" size={16} />
                {t.testPrint}
              </button>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full" dir="auto">
            <thead className="bg-gradient-to-r from-blue-700 via-cyan-600 to-blue-700 text-white relative">
              <tr>
                <th className="px-3 py-3 font-bold text-xs text-center border-r border-white/20 relative">
                  <div className="flex items-center gap-1 justify-center">
                    <Icon name="expand" size={12} />
                    {t?.expand || 'Expand'}
                  </div>
                </th>
                <th 
                  className="px-3 py-3 font-bold text-xs text-center border-r border-white/20 cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                >
                  <div className="flex items-center gap-1 justify-center">
                    <Icon name="calendar" size={12} />
                    {t.date}
                    <Icon name={sortOrder === 'desc' ? "arrowDown" : "arrowUp"} size={10} />
                  </div>
                </th>
                <th className="px-3 py-3 font-bold text-xs text-center border-r border-white/20">
                  <div className="flex items-center gap-1 justify-center">
                    <Icon name="user" size={12} />
                    {t.customer_name || 'Customer'}
                  </div>
                </th>
                <th className="px-3 py-3 font-bold text-xs text-center border-r border-white/20">
                  <div className="flex items-center gap-1 justify-center">
                    <Icon name="package" size={12} />
                    {t.items || 'Items'}
                  </div>
                </th>
                <th className="px-3 py-3 font-bold text-xs text-center border-r border-white/20">
                  <div className="flex items-center gap-1 justify-center">
                    <Icon name="dollarSign" size={12} />
                    {t.buyingPrice || 'Cost'}
                  </div>
                </th>
                <th className="px-3 py-3 font-bold text-xs text-center border-r border-white/20">
                  <div className="flex items-center gap-1 justify-center">
                    <Icon name="tag" size={12} />
                    {t.sellingPrice || 'Price'}
                  </div>
                </th>
                <th className="px-3 py-3 font-bold text-xs text-center border-r border-white/20">
                  <div className="flex items-center gap-1 justify-center">
                    <Icon name="banknote" size={12} />
                    {t.totalPaid || 'Total Paid'}
                  </div>
                </th>
                <th className="px-3 py-3 font-bold text-xs text-center border-r border-white/20">
                  <div className="flex items-center gap-1 justify-center">
                    <Icon name="trendingUp" size={12} />
                    {t.profit || 'Profit'}
                  </div>
                </th>
                <th className="px-3 py-3 font-bold text-xs text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <Icon name="settings" size={12} />
                    {t.actions || 'Actions'}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {t.noSalesFound || 'No sales found'}
                  </td>
                </tr>
              ) : (
                paginatedSales.map((sale, idx) => {
                  const breakdown = getSaleCurrencyBreakdown(sale);
                  const isExpanded = expandedSales.has(sale.id);
                  const hasMultipleCurrencies = (breakdown.usd.items.length > 0 && breakdown.iqd.items.length > 0) || 
                                                 (breakdown.usd.paid > 0 && breakdown.iqd.paid > 0);
                  return (
                    <React.Fragment key={sale.id}>
                      {/* Main Sale Row */}
                      <tr className={`border-b border-gray-200/50 dark:border-gray-600/50 ${idx % 2 === 0 ? 'bg-gradient-to-r from-white to-gray-50 dark:from-gray-800/80 dark:to-gray-900/60' : 'bg-gradient-to-r from-gray-50 to-white dark:from-gray-900/60 dark:to-gray-800/80'} hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 dark:hover:from-cyan-900/30 dark:hover:to-blue-900/30 transition-all duration-200 transform hover:scale-[1.001] hover:shadow-md`}>
                        <td className="px-3 py-2 border-r border-gray-200/30 dark:border-gray-600/30">
                          <div className="flex justify-center">
                            {hasMultipleCurrencies && (
                              <button
                                onClick={() => toggleSaleExpansion(sale.id)}
                                className="px-2 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 transform hover:scale-105 shadow-lg shadow-blue-200 dark:shadow-blue-800 font-medium text-xs flex items-center gap-1"
                                title={t?.showCurrencyBreakdown || 'Show currency breakdown'}
                              >
                                <Icon name={isExpanded ? "chevronDown" : "chevronRight"} size={12} />
                                {isExpanded ? 'Hide' : 'Show'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200/30 dark:border-gray-600/30">
                          <div className="flex flex-col space-y-1">
                            <div className="text-xs font-medium text-gray-800 dark:text-gray-200">
                              {new Date(sale.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-700/50 px-1 py-0.5 rounded-full w-fit">
                              {new Date(sale.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200/30 dark:border-gray-600/30">
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-cyan-400">
                            {(sale.customer_name || t.walkInCustomer || 'Walk-in').toString().charAt(0).toUpperCase() + (sale.customer_name || t.walkInCustomer || 'Walk-in').toString().slice(1).toLowerCase()}
                          </div>
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200/30 dark:border-gray-600/30">
                          <div className="text-xs text-gray-700 dark:text-gray-300 font-medium bg-gray-50/80 dark:bg-gray-700/50 px-2 py-1 rounded-lg">
                            {sale.items ? `${sale.items.length} items (${sale.items.reduce((sum, item) => sum + (item.quantity || 1), 0)} total)` : '0 items'}
                          </div>
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200/30 dark:border-gray-600/30">
                          <div className="flex flex-col gap-1">
                            {breakdown.usd.buyingTotal > 0 && (
                              <div className="bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg border-l-2 border-orange-500">
                                <span className="text-orange-700 dark:text-orange-400 font-bold text-sm">
                                  {formatCurrency(breakdown.usd.buyingTotal, 'USD')}
                                </span>
                              </div>
                            )}
                            {breakdown.iqd.buyingTotal > 0 && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg border-l-2 border-blue-500">
                                <span className="text-blue-700 dark:text-blue-400 font-bold text-sm">
                                  {formatCurrency(breakdown.iqd.buyingTotal, 'IQD')}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200/30 dark:border-gray-600/30">
                          <div className="flex flex-col gap-1">
                            {breakdown.usd.sellingTotal > 0 && (
                              <div className="bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg border-l-2 border-orange-500">
                                <span className="text-orange-700 dark:text-orange-400 font-bold text-sm">
                                  {formatCurrency(breakdown.usd.sellingTotal, 'USD')}
                                </span>
                              </div>
                            )}
                            {breakdown.iqd.sellingTotal > 0 && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg border-l-2 border-blue-500">
                                <span className="text-blue-700 dark:text-blue-400 font-bold text-sm">
                                  {formatCurrency(breakdown.iqd.sellingTotal, 'IQD')}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200/30 dark:border-gray-600/30">
                          <div className="text-right">
                            <div className="flex flex-col gap-1">
                              {breakdown.usd.paid > 0 && (
                                <div className="bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg border-l-2 border-orange-500">
                                  <span className="text-orange-700 dark:text-orange-400 font-bold text-sm">
                                    {formatCurrency(breakdown.usd.paid, 'USD')}
                                  </span>
                                </div>
                              )}
                              {breakdown.iqd.paid > 0 && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg border-l-2 border-blue-500">
                                  <span className="text-blue-700 dark:text-blue-400 font-bold text-sm">
                                    {formatCurrency(breakdown.iqd.paid, 'IQD')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200/30 dark:border-gray-600/30">
                          {/* Show profit in the sale currency to match sale details modal */}
                          <div className="flex flex-col gap-1">
                            {breakdown.usd.actualProfit !== undefined && breakdown.usd.actualProfit !== 0 && (
                              <div className={`px-2 py-1 rounded-lg font-bold text-sm ${
                                breakdown.usd.actualProfit >= 0 
                                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-600/50'
                                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-600/50'
                              }`}>
                                {formatCurrency(breakdown.usd.actualProfit, 'USD')}
                              </div>
                            )}
                            {breakdown.iqd.actualProfit !== undefined && breakdown.iqd.actualProfit !== 0 && (
                              <div className={`px-2 py-1 rounded-lg font-bold text-sm ${
                                breakdown.iqd.actualProfit >= 0 
                                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-600/50'
                                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-600/50'
                              }`}>
                                {formatCurrency(breakdown.iqd.actualProfit, 'IQD')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => onView && onView(sale)}
                              className="px-2 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 transform hover:scale-105 shadow-lg shadow-blue-200 dark:shadow-blue-800 font-medium text-xs flex items-center gap-1"
                              title={t.view}
                            >
                              <Icon name="eye" size={12} />
                              {t.view}
                            </button>
                            {onReturn && (
                              <button
                                onClick={() => {
                                  console.log('Return button clicked for sale:', sale.id);
                                  console.log('onReturn function:', onReturn);
                                  if (onReturn) {
                                    onReturn(sale.id);
                                  } else {
                                    console.error('onReturn function is undefined');
                                  }
                                }}
                                className="px-2 py-1 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg hover:from-red-700 hover:to-rose-700 transition-all duration-200 transform hover:scale-105 shadow-lg shadow-red-200 dark:shadow-red-800 font-medium text-xs flex items-center gap-1"
                                title={t.return}
                              >
                                <Icon name="undo" size={12} />
                                {t.return}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Currency Details */}
                      {isExpanded && hasMultipleCurrencies && (
                        <>
                          {/* USD Row */}
                          {breakdown.usd.items.length > 0 && (
                            <tr className="bg-blue-50 dark:bg-blue-900/20 border-b">
                              <td className="px-3 py-2 border-r border-gray-200/30 dark:border-gray-600/30"></td>
                              <td className="px-3 py-2 text-xs text-blue-600 dark:text-blue-400 font-medium border-r border-gray-200/30 dark:border-gray-600/30">
                                <div className="flex items-center gap-1">
                                  <Icon name="dollarSign" size={12} />
                                  {t?.usd || 'USD'} Details
                                </div>
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-800 dark:text-gray-200 border-r border-gray-200/30 dark:border-gray-600/30">
                                <span className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded-full font-medium">
                                  {breakdown.usd.items.length} items
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-800 dark:text-gray-200 border-r border-gray-200/30 dark:border-gray-600/30">
                                <div className="bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg border-l-2 border-orange-500">
                                  <span className="text-orange-700 dark:text-orange-400 font-bold">
                                    {formatCurrency(breakdown.usd.buyingTotal, 'USD')}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-800 dark:text-gray-200 border-r border-gray-200/30 dark:border-gray-600/30">
                                <div className="bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg border-l-2 border-orange-500">
                                  <span className="text-orange-700 dark:text-orange-400 font-bold">
                                    {formatCurrency(breakdown.usd.sellingTotal, 'USD')}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 border-r border-gray-200/30 dark:border-gray-600/30">
                                <div className="bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg border-l-2 border-orange-500">
                                  <span className="text-orange-700 dark:text-orange-400 font-bold">
                                    {formatCurrency(breakdown.usd.paid, 'USD')}
                                  </span>
                                </div>
                              </td>
                              <td className={`px-3 py-2 text-xs font-semibold border-r border-gray-200/30 dark:border-gray-600/30`}>
                                <div className={`px-2 py-1 rounded-lg border-l-2 ${
                                  breakdown.usd.actualProfit >= 0 
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-500'
                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-500'
                                }`}>
                                  <span className="font-bold">
                                    {formatCurrency(breakdown.usd.actualProfit, 'USD')}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2"></td>
                            </tr>
                          )}

                          {/* IQD Row */}
                          {breakdown.iqd.items.length > 0 && (
                            <tr className="bg-green-50 dark:bg-green-900/20 border-b">
                              <td className="px-3 py-2 border-r border-gray-200/30 dark:border-gray-600/30"></td>
                              <td className="px-3 py-2 text-xs text-green-600 dark:text-green-400 font-medium border-r border-gray-200/30 dark:border-gray-600/30">
                                <div className="flex items-center gap-1">
                                  <Icon name="banknote" size={12} />
                                  {t?.iqd || 'IQD'} Details
                                </div>
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-800 dark:text-gray-200 border-r border-gray-200/30 dark:border-gray-600/30">
                                <span className="bg-green-100 dark:bg-green-800 px-2 py-1 rounded-full font-medium">
                                  {breakdown.iqd.items.length} items
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-800 dark:text-gray-200 border-r border-gray-200/30 dark:border-gray-600/30">
                                <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border-l-4 border-blue-500">
                                  <span className="text-blue-700 dark:text-blue-400 font-bold">
                                    {formatCurrency(breakdown.iqd.buyingTotal, 'IQD')}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-800 dark:text-gray-200 border-r border-gray-200/30 dark:border-gray-600/30">
                                <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border-l-4 border-blue-500">
                                  <span className="text-blue-700 dark:text-blue-400 font-bold">
                                    {formatCurrency(breakdown.iqd.sellingTotal, 'IQD')}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-xs font-semibold text-gray-800 dark:text-gray-200 border-r border-gray-200/30 dark:border-gray-600/30">
                                <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border-l-4 border-blue-500">
                                  <span className="text-blue-700 dark:text-blue-400 font-bold">
                                    {formatCurrency(breakdown.iqd.paid, 'IQD')}
                                  </span>
                                </div>
                              </td>
                              <td className={`px-6 py-4 text-xs font-semibold border-r border-gray-200/30 dark:border-gray-600/30`}>
                                <div className={`px-3 py-2 rounded-lg border-l-4 ${
                                  breakdown.iqd.actualProfit >= 0 
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-500'
                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-500'
                                }`}>
                                  <span className="font-bold">
                                    {formatCurrency(breakdown.iqd.actualProfit, 'IQD')}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4"></td>
                            </tr>
                          )}
                        </>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default SalesHistoryTableEnhanced;
