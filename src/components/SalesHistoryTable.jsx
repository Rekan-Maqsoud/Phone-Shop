import React, { useState, useMemo, useCallback } from 'react';
import HistorySearchFilter from './HistorySearchFilter';
import { EXCHANGE_RATES, formatCurrency } from '../utils/exchangeRates';

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
      
      // Check if this is a multi-currency sale (for display purposes only)
      const isMultiCurrency = sale.multi_currency && sale.multi_currency.enabled;
      
      // For revenue calculations, calculate from actual selling prices (before discount)
      if (sale.items && sale.items.length > 0) {
        const itemsTotal = sale.items.reduce((itemSum, item) => {
          const qty = item.quantity || 1;
          const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.buying_price === 'number' ? item.buying_price : 0);
          return itemSum + (sellingPrice * qty);
        }, 0);
        
        if (saleCurrency === 'USD') {
          totalRevenueUSD += itemsTotal;
          // Also add to IQD total (converted) for accurate IQD revenue totals
          const exchangeRate = sale.exchange_rates?.usd_to_iqd || EXCHANGE_RATES.USD_TO_IQD;
          totalRevenueIQD += (itemsTotal * exchangeRate);
        } else {
          totalRevenueIQD += itemsTotal;
        }
      } else {
        // Fallback to sale.total if no items data
        if (saleCurrency === 'USD') {
          totalRevenueUSD += total;
          // Also add to IQD total (converted) for accurate IQD revenue totals
          const exchangeRate = sale.exchange_rates?.usd_to_iqd || EXCHANGE_RATES.USD_TO_IQD;
          totalRevenueIQD += (total * exchangeRate);
        } else {
          totalRevenueIQD += total;
        }
      }
      
      if (sale.items && sale.items.length) {
        sale.items.forEach(item => {
          const qty = item.quantity || 1;
          const buyingPrice = typeof item.buying_price === 'number' ? item.buying_price : 0;
          const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.buying_price === 'number' ? item.buying_price : 0);
          const productCurrency = item.product_currency || 'IQD';
          
          // Simple profit calculation: selling - buying = profit
          // Convert BOTH prices to sale currency if needed
          let buyingPriceInSaleCurrency = buyingPrice;
          let sellingPriceInSaleCurrency = sellingPrice;
          
          if (productCurrency !== saleCurrency) {
            if (saleCurrency === 'USD' && productCurrency === 'IQD') {
              // Convert IQD prices to USD
              buyingPriceInSaleCurrency = buyingPrice * EXCHANGE_RATES.IQD_TO_USD;
              sellingPriceInSaleCurrency = sellingPrice * EXCHANGE_RATES.IQD_TO_USD;
            } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
              // Convert USD prices to IQD  
              buyingPriceInSaleCurrency = buyingPrice * EXCHANGE_RATES.USD_TO_IQD;
              sellingPriceInSaleCurrency = sellingPrice * EXCHANGE_RATES.USD_TO_IQD;
            }
          }
          
          const profit = (sellingPriceInSaleCurrency - buyingPriceInSaleCurrency) * qty;
          
          // Add profit to the sale currency total
          if (saleCurrency === 'USD') {
            totalProfitUSD += profit;
          } else {
            totalProfitIQD += profit;
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
    let totalBuyingUSD = 0;
    let totalBuyingIQD = 0;
    let totalSellingInSaleCurrency = 0;
    let totalConvertedToBuyingCurrency = 0;
    let totalProfit = 0;
    
    const saleCurrency = sale.currency || 'USD';
    const saleExchangeRates = sale.exchange_rates || {
      usd_to_iqd: EXCHANGE_RATES.USD_TO_IQD,
      iqd_to_usd: EXCHANGE_RATES.IQD_TO_USD
    };
    
    // Check if this is a multi-currency sale (for display purposes only)
    const isMultiCurrency = sale.multi_currency && sale.multi_currency.enabled;
    
    if (sale.items && sale.items.length) {
      sale.items.forEach(item => {
        const qty = item.quantity || 1;
        const buyingPrice = typeof item.buying_price === 'number' ? item.buying_price : 0;
        const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.buying_price === 'number' ? item.buying_price : 0);
        
        // Use stored product currency or default to IQD
        const productCurrency = item.product_currency || 'IQD';
        
        // Debug log for troubleshooting buying price issues
        if (item.buying_price === 0) {
          console.warn('Zero buying price detected:', {
            item_name: item.name,
            buying_price: item.buying_price,
            product_currency: productCurrency,
            sale_currency: saleCurrency,
            item
          });
        }
        
        // Accumulate buying price by currency (keep separate)
        if (productCurrency === 'USD') {
          totalBuyingUSD += buyingPrice * qty;
        } else {
          totalBuyingIQD += buyingPrice * qty;
        }
        
        // CRITICAL FIX: selling_price is stored in product's original currency, not sale currency
        // We need to convert it to sale currency for proper profit calculation
        let sellingPriceInSaleCurrency = sellingPrice;
        
        // Convert selling price to sale currency if needed
        if (productCurrency !== saleCurrency) {
          if (saleCurrency === 'USD' && productCurrency === 'IQD') {
            // Convert IQD selling price to USD
            sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.iqd_to_usd;
          } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
            // Convert USD selling price to IQD
            sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.usd_to_iqd;
          }
        }
        
        // Total selling in sale currency (using converted price)
        totalSellingInSaleCurrency += sellingPriceInSaleCurrency * qty;
        // Calculate profit: selling - buying = profit
        // Convert buying price to sale currency if needed
        let buyingPriceInSaleCurrency = buyingPrice;
        
        if (productCurrency !== saleCurrency) {
          if (saleCurrency === 'USD' && productCurrency === 'IQD') {
            // Convert IQD buying price to USD
            buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.iqd_to_usd;
          } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
            // Convert USD buying price to IQD
            buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.usd_to_iqd;
          }
        }
        
        const profit = (sellingPriceInSaleCurrency - buyingPriceInSaleCurrency) * qty;
        totalProfit += profit;
      });
    }
    
    // For multi-currency sales, totalSellingInSaleCurrency should equal sale.total
    totalConvertedToBuyingCurrency = totalSellingInSaleCurrency;
    
    // Determine display format based on what currencies are present in buying prices
    const hasBothCurrencies = totalBuyingUSD > 0 && totalBuyingIQD > 0;
    const primaryCurrency = hasBothCurrencies ? 'MIXED' : (totalBuyingUSD > 0 ? 'USD' : 'IQD');
    
    // Format buying price display
    let buyingPriceDisplay = '';
    if (hasBothCurrencies) {
      buyingPriceDisplay = `${formatCurrency(totalBuyingUSD, 'USD')} + ${formatCurrency(totalBuyingIQD, 'IQD')}`;
    } else if (totalBuyingUSD > 0) {
      buyingPriceDisplay = formatCurrency(totalBuyingUSD, 'USD');
    } else {
      buyingPriceDisplay = formatCurrency(totalBuyingIQD, 'IQD');
    }

    return { 
      totalBuying: hasBothCurrencies ? totalBuyingUSD + (totalBuyingIQD * saleExchangeRates.iqd_to_usd) : (totalBuyingUSD || totalBuyingIQD),
      totalSelling: totalSellingInSaleCurrency,
      totalConvertedToBuyingCurrency,
      totalProfit,
      originalCurrency: saleCurrency, // Profit is always in sale currency
      isMultiCurrency,
      buyingPriceDisplay,
      primaryCurrency
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
            const { totalBuying, totalSelling, totalConvertedToBuyingCurrency, totalProfit, originalCurrency, isMultiCurrency, buyingPriceDisplay, primaryCurrency } = getTotals(s);
            const saleCurrency = s.currency || 'USD';
            const saleSymbol = saleCurrency === 'USD' ? '$' : 'د.ع';
            const originalSymbol = originalCurrency === 'USD' ? '$' : 'د.ع';
            
            const formatSale = n => n != null ? formatCurrency(n, saleCurrency) : '-';
            const formatOriginal = n => n != null ? formatCurrency(n, originalCurrency) : '-';
            
            // Calculate actual selling price from items (before discount)
            const calculateSellingPriceFromItems = (sale) => {
              if (!sale.items || sale.items.length === 0) return sale.total || 0;
              
              const saleCurrency = sale.currency || 'USD';
              const saleExchangeRates = sale.exchange_rates || {
                usd_to_iqd: EXCHANGE_RATES.USD_TO_IQD,
                iqd_to_usd: EXCHANGE_RATES.IQD_TO_USD
              };
              
              return sale.items.reduce((sum, item) => {
                const qty = item.quantity || 1;
                const sellingPrice = typeof item.selling_price === 'number' ? item.selling_price : (typeof item.buying_price === 'number' ? item.buying_price : 0);
                const productCurrency = item.product_currency || 'IQD';
                
                // Convert selling price to sale currency for display
                let sellingPriceInSaleCurrency = sellingPrice;
                
                if (productCurrency !== saleCurrency) {
                  if (saleCurrency === 'IQD' && productCurrency === 'USD') {
                    // Converting USD price to IQD for display (e.g., $622 -> 894,880 IQD)
                    sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.usd_to_iqd;
                  } else if (saleCurrency === 'USD' && productCurrency === 'IQD') {
                    // Converting IQD price to USD for display
                    sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.iqd_to_usd;
                  }
                }
                
                return sum + (sellingPriceInSaleCurrency * qty);
              }, 0);
            };
            
            // Show the calculated selling price from items, not the final discounted total
            const displaySellingPrice = formatSale(calculateSellingPriceFromItems(s));
            
            return (
              <tr key={s.id} className="border-b last:border-b-0 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 transition group">
                <td className="px-4 py-2">{idx + 1}</td>
                <td className="px-4 py-2">{s.created_at ? s.created_at.slice(0, 19).replace('T', ' ') : ''}</td>
                <td className="px-4 py-2">{s.customer_name ? s.customer_name.charAt(0).toUpperCase() + s.customer_name.slice(1).toLowerCase() : 'Unknown'}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-col">
                    <span>{buyingPriceDisplay}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{primaryCurrency === 'MIXED' ? 'Mixed Currency' : primaryCurrency}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{displaySellingPrice}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{saleCurrency}</span>
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
