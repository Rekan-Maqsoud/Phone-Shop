import React, { useState, useMemo, useCallback } from 'react';
import HistorySearchFilter from './HistorySearchFilter';

export default function SalesHistoryTableEnhanced({ sales, t, onView, onPrintLast, onReturn }) {
  const [filteredSales, setFilteredSales] = useState(sales || []);
  const [totals, setTotals] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedSales, setExpandedSales] = useState(new Set());

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

      {/* Sales Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.salesHistory}</h2>
          {onPrintLast && (
            <button
              onClick={onPrintLast}
              className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              title="Print last receipt"
            >
              🖨️ {t.testPrint}
            </button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border rounded-lg">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-2 w-10"></th>
                <th 
                  className="px-4 py-2 cursor-pointer hover:bg-gray-700"
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                >
                  {t.date} {sortOrder === 'desc' ? '↓' : '↑'}
                </th>
                <th className="px-4 py-2">{t.customer_name || 'Customer'}</th>
                <th className="px-4 py-2">{t.items || 'Items'}</th>
                <th className="px-4 py-2">{t.buyingPrice || 'Cost'}</th>
                <th className="px-4 py-2">{t.sellingPrice || 'Price'}</th>
                <th className="px-4 py-2">{t.totalPaid || 'Total Paid'}</th>
                <th className="px-4 py-2">{t.profit || 'Profit'}</th>
                <th className="px-4 py-2">{t.actions || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {sortedSales.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center text-gray-400 py-4">
                    {t.noSalesFound || 'No sales found'}
                  </td>
                </tr>
              ) : (
                sortedSales.map((sale, idx) => {
                  const breakdown = getSaleCurrencyBreakdown(sale);
                  const isExpanded = expandedSales.has(sale.id);
                  const hasMultipleCurrencies = (breakdown.usd.items.length > 0 && breakdown.iqd.items.length > 0) || 
                                                 (breakdown.usd.paid > 0 && breakdown.iqd.paid > 0);
                  return (
                    <React.Fragment key={sale.id}>
                      {/* Main Sale Row */}
                      <tr className={`border-b hover:bg-gray-50 dark:hover:bg-gray-700 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}`}>
                        <td className="px-4 py-2">
                          {hasMultipleCurrencies && (
                            <button
                              onClick={() => toggleSaleExpansion(sale.id)}
                              className="text-blue-500 hover:text-blue-700 focus:outline-none"
                              title="Show currency breakdown"
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {new Date(sale.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2">{sale.customer_name || t.walkInCustomer || 'Walk-in'}</td>
                        <td className="px-4 py-2 text-sm">
                          {sale.items ? `${sale.items.length} items (${sale.items.reduce((sum, item) => sum + (item.quantity || 1), 0)} total)` : '0 items'}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {breakdown.usd.buyingTotal > 0 && formatCurrency(breakdown.usd.buyingTotal, 'USD')}
                          {breakdown.usd.buyingTotal > 0 && breakdown.iqd.buyingTotal > 0 && ' + '}
                          {breakdown.iqd.buyingTotal > 0 && formatCurrency(breakdown.iqd.buyingTotal, 'IQD')}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {breakdown.usd.sellingTotal > 0 && formatCurrency(breakdown.usd.sellingTotal, 'USD')}
                          {breakdown.usd.sellingTotal > 0 && breakdown.iqd.sellingTotal > 0 && ' + '}
                          {breakdown.iqd.sellingTotal > 0 && formatCurrency(breakdown.iqd.sellingTotal, 'IQD')}
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold">
                          {breakdown.usd.paid > 0 && formatCurrency(breakdown.usd.paid, 'USD')}
                          {breakdown.usd.paid > 0 && breakdown.iqd.paid > 0 && ' + '}
                          {breakdown.iqd.paid > 0 && formatCurrency(breakdown.iqd.paid, 'IQD')}
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold">
                          {breakdown.usd.actualProfit !== 0 && (
                            <span className={breakdown.usd.actualProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              {formatCurrency(breakdown.usd.actualProfit, 'USD')}
                            </span>
                          )}
                          {breakdown.usd.actualProfit !== 0 && breakdown.iqd.actualProfit !== 0 && ' + '}
                          {breakdown.iqd.actualProfit !== 0 && (
                            <span className={breakdown.iqd.actualProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              {formatCurrency(breakdown.iqd.actualProfit, 'IQD')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => onView && onView(sale)}
                              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
                            >
                              {t.view}
                            </button>
                            {onReturn && (
                              <button
                                onClick={() => {
                                  onReturn(sale.id);
                                }}
                                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm"
                              >
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
                              <td className="px-4 py-2"></td>
                              <td className="px-8 py-2 text-sm text-blue-600 dark:text-blue-400 font-medium">USD Details</td>
                              <td className="px-4 py-2 text-sm">{breakdown.usd.items.length} items</td>
                              <td className="px-4 py-2 text-sm">{formatCurrency(breakdown.usd.buyingTotal, 'USD')}</td>
                              <td className="px-4 py-2 text-sm">{formatCurrency(breakdown.usd.sellingTotal, 'USD')}</td>
                              <td className="px-4 py-2 text-sm font-semibold">{formatCurrency(breakdown.usd.paid, 'USD')}</td>
                              <td className={`px-4 py-2 text-sm font-semibold ${breakdown.usd.actualProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatCurrency(breakdown.usd.actualProfit, 'USD')}
                              </td>
                              <td className="px-4 py-2"></td>
                            </tr>
                          )}

                          {/* IQD Row */}
                          {breakdown.iqd.items.length > 0 && (
                            <tr className="bg-green-50 dark:bg-green-900/20 border-b">
                              <td className="px-4 py-2"></td>
                              <td className="px-8 py-2 text-sm text-green-600 dark:text-green-400 font-medium">IQD Details</td>
                              <td className="px-4 py-2 text-sm">{breakdown.iqd.items.length} items</td>
                              <td className="px-4 py-2 text-sm">{formatCurrency(breakdown.iqd.buyingTotal, 'IQD')}</td>
                              <td className="px-4 py-2 text-sm">{formatCurrency(breakdown.iqd.sellingTotal, 'IQD')}</td>
                              <td className="px-4 py-2 text-sm font-semibold">{formatCurrency(breakdown.iqd.paid, 'IQD')}</td>
                              <td className={`px-4 py-2 text-sm font-semibold ${breakdown.iqd.actualProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatCurrency(breakdown.iqd.actualProfit, 'IQD')}
                              </td>
                              <td className="px-4 py-2"></td>
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
}
