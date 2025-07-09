import React, { useState, useMemo, useCallback } from 'react';
import HistorySearchFilter from './HistorySearchFilter';
import { EXCHANGE_RATES } from '../utils/exchangeRates';

export default function SalesHistoryTable({ sales, t, onView, onPrintLast, onReturn }) {
  const [filteredSales, setFilteredSales] = useState(sales);
  const [totals, setTotals] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  // Calculate totals for filtered sales by currency with multi-currency support
  const calculateTotals = useCallback((salesData) => {
    let totalProfitUSD = 0;
    let totalProfitIQD = 0;
    let totalRevenueUSD = 0;
    let totalRevenueIQD = 0;
    let totalSales = salesData.length;
    let totalProducts = 0;

    salesData.forEach(sale => {
      const saleCurrency = sale.currency || 'USD';
      const total = sale.total || 0;
      
      // Check if this is a multi-currency payment
      const isMultiCurrency = sale.multi_currency && 
        (sale.multi_currency.usdAmount > 0 && sale.multi_currency.iqdAmount > 0);
      
      if (isMultiCurrency) {
        // For multi-currency payments, add the actual amounts paid to respective totals
        totalRevenueUSD += sale.multi_currency.usdAmount || 0;
        totalRevenueIQD += sale.multi_currency.iqdAmount || 0;
      } else {
        // For single currency payments
        if (saleCurrency === 'USD') {
          totalRevenueUSD += total;
        } else {
          totalRevenueIQD += total;
        }
      }
      
      if (sale.items && sale.items.length) {
        sale.items.forEach(item => {
          const qty = item.quantity || 1;
          const buyingPrice = typeof item.buying_price === 'number' ? item.buying_price : 0;
          const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.price === 'number' ? item.price : 0);
          
          // Assume product was bought in USD (can be enhanced with actual product currency data)
          const productCurrency = item.currency || 'USD';
          
          // For multi-currency sales, calculate profit based on total amount paid
          if (isMultiCurrency) {
            const totalPaidInUSD = (sale.multi_currency.usdAmount || 0) + ((sale.multi_currency.iqdAmount || 0) / EXCHANGE_RATES.USD_TO_IQD);
            const totalBuyingPrice = sale.items.reduce((sum, i) => sum + ((i.buying_price || 0) * (i.quantity || 1)), 0);
            const profitPercentage = totalBuyingPrice > 0 ? (totalPaidInUSD - totalBuyingPrice) / totalBuyingPrice : 0;
            const itemProfit = (buyingPrice * qty) * profitPercentage;
            
            // Add profit to the product's original currency
            if (productCurrency === 'USD') {
              totalProfitUSD += itemProfit;
            } else {
              totalProfitIQD += itemProfit * EXCHANGE_RATES.USD_TO_IQD;
            }
          } else {
            // For single currency sales, convert selling price to product currency for proper profit calculation
            let sellingPriceInProductCurrency = sellingPrice;
            if (saleCurrency !== productCurrency) {
              if (saleCurrency === 'IQD' && productCurrency === 'USD') {
                sellingPriceInProductCurrency = sellingPrice / EXCHANGE_RATES.USD_TO_IQD; // Convert IQD to USD
              } else if (saleCurrency === 'USD' && productCurrency === 'IQD') {
                sellingPriceInProductCurrency = sellingPrice * EXCHANGE_RATES.USD_TO_IQD; // Convert USD to IQD
              }
            }
            
            const profit = (sellingPriceInProductCurrency - buyingPrice) * qty;
            
            // Add profit to the appropriate currency total based on product currency
            if (productCurrency === 'USD') {
              totalProfitUSD += profit;
            } else {
              totalProfitIQD += profit;
            }
          }
          
          totalProducts += qty;
        });
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

  // Helper to calculate totals for each sale with multi-currency support
  const getTotals = (sale) => {
    let totalBuyingOriginal = 0;
    let totalSellingInSaleCurrency = 0;
    let totalConvertedToBuyingCurrency = 0;
    let totalProfit = 0;
    let mixedPaymentDisplay = '';
    
    const saleCurrency = sale.currency || 'USD';
    
    // Check if this is a multi-currency payment
    const isMultiCurrency = sale.multi_currency && 
      (sale.multi_currency.usdAmount > 0 && sale.multi_currency.iqdAmount > 0);
    
    if (sale.items && sale.items.length) {
      sale.items.forEach(item => {
        const qty = item.quantity || 1;
        const buyingPrice = typeof item.buying_price === 'number' ? item.buying_price : 0;
        const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.price === 'number' ? item.price : 0);
        
        // Determine the product's original currency (assume USD for products unless specified)
        const productCurrency = item.product_currency || 'USD';
        
        // Total buying in original currency
        totalBuyingOriginal += buyingPrice * qty;
        
        // Total selling in sale currency
        totalSellingInSaleCurrency += sellingPrice * qty;
        
        // Convert selling price to product currency for profit calculation
        let sellingPriceInProductCurrency = sellingPrice;
        if (saleCurrency !== productCurrency) {
          if (saleCurrency === 'IQD' && productCurrency === 'USD') {
            sellingPriceInProductCurrency = sellingPrice / EXCHANGE_RATES.USD_TO_IQD; // Convert IQD to USD
          } else if (saleCurrency === 'USD' && productCurrency === 'IQD') {
            sellingPriceInProductCurrency = sellingPrice * EXCHANGE_RATES.USD_TO_IQD; // Convert USD to IQD
          }
        }
        
        totalConvertedToBuyingCurrency += sellingPriceInProductCurrency * qty;
        totalProfit += (sellingPriceInProductCurrency - buyingPrice) * qty;
      });
    }
    
    // Handle multi-currency payment display
    if (isMultiCurrency) {
      const usdAmount = sale.multi_currency.usdAmount || 0;
      const iqdAmount = sale.multi_currency.iqdAmount || 0;
      
      if (usdAmount > 0 && iqdAmount > 0) {
        mixedPaymentDisplay = `$${usdAmount.toFixed(2)} + د.ع${Math.round(iqdAmount).toLocaleString()}`;
      } else if (usdAmount > 0) {
        mixedPaymentDisplay = `$${usdAmount.toFixed(2)}`;
      } else if (iqdAmount > 0) {
        mixedPaymentDisplay = `د.ع${Math.round(iqdAmount).toLocaleString()}`;
      }
      
      // Convert the total payment to the original currency for consistent calculations
      const totalPaidInUSD = usdAmount + (iqdAmount / EXCHANGE_RATES.USD_TO_IQD);
      
      // For multi-currency payments, use the actual total paid converted to original currency
      totalConvertedToBuyingCurrency = totalPaidInUSD;
      totalProfit = totalPaidInUSD - totalBuyingOriginal;
    }
    
    return { 
      totalBuying: totalBuyingOriginal, 
      totalSelling: totalSellingInSaleCurrency,
      totalConvertedToBuyingCurrency,
      totalProfit,
      originalCurrency: 'USD', // Assume USD for now, can be enhanced later
      mixedPaymentDisplay,
      isMultiCurrency
    };
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
          <div className="flex gap-4 items-center">
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
        </div>

        {/* Table of sales */}
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-lg text-gray-800 dark:text-gray-100" dir="auto">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-gray-800 dark:text-white text-right">#</th>
                <th className="px-4 py-2 text-gray-800 dark:text-white cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 text-right" onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}>
                  {t.date} {sortOrder === 'desc' ? '↓' : '↑'}
                </th>
                <th className="px-4 py-2 text-gray-800 dark:text-white text-right">{t.customer}</th>
                <th className="px-4 py-2 text-gray-800 dark:text-white text-right">{t.buyingPrice}</th>
                <th className="px-4 py-2 text-gray-800 dark:text-white text-right">{t.sellingPrice}</th>
                <th className="px-4 py-2 text-gray-800 dark:text-white text-right">{t.profit}</th>
                <th className="px-4 py-2 text-gray-800 dark:text-white text-right">{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {sortedSales.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-400 py-4">{t.noSales}</td></tr>
              ) : sortedSales.map((s, idx) => {
            const { totalBuying, totalSelling, totalConvertedToBuyingCurrency, totalProfit, originalCurrency, mixedPaymentDisplay, isMultiCurrency } = getTotals(s);
            const saleCurrency = s.currency || 'USD';
            const saleSymbol = saleCurrency === 'USD' ? '$' : 'د.ع';
            const originalSymbol = originalCurrency === 'USD' ? '$' : 'د.ع';
            
            const formatSale = n => n != null ? `${saleSymbol}${(+n).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-';
            const formatOriginal = n => n != null ? `${originalSymbol}${(+n).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-';
            
            // For display, show the actual payment received (mixed or single currency)
            const displaySellingPrice = isMultiCurrency ? mixedPaymentDisplay : formatSale(s.total);
            
            return (
              <tr key={s.id} className="border-b last:border-b-0 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 transition group">
                <td className="px-4 py-2">{idx + 1}</td>
                <td className="px-4 py-2">{s.created_at ? s.created_at.slice(0, 19).replace('T', ' ') : ''}</td>
                <td className="px-4 py-2">{s.customer_name ? s.customer_name.charAt(0).toUpperCase() + s.customer_name.slice(1).toLowerCase() : 'Unknown'}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-col">
                    <span>{formatOriginal(totalBuying)}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{originalCurrency}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{displaySellingPrice}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{isMultiCurrency ? 'Mixed Payment' : saleCurrency}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-col">
                    <span className={totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {formatOriginal(totalProfit)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{originalCurrency}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => onView(s.id)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition">{t.view}</button>
                    <button 
                      onClick={() => onReturn && onReturn(s.id)} 
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                      title="Return this sale"
                    >
                      {t.returnSale}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
        </div>
      </div>
    </div>
  );
}
