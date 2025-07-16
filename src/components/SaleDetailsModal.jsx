import React, { useState } from 'react';
import { EXCHANGE_RATES } from '../utils/exchangeRates';

export default function SaleDetailsModal({ sale, t, onClose, onReturnItem }) {
  const [returnQuantities, setReturnQuantities] = useState({});

  if (!sale) return null;

  // Handle quantity change for partial returns
  const handleQuantityChange = (itemId, quantity) => {
    setReturnQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, parseInt(quantity) || 0)
    }));
  };

  // Get return quantity for an item
  const getReturnQuantity = (itemId, maxQuantity) => {
    return Math.min(returnQuantities[itemId] || 0, maxQuantity);
  };

  // Handle partial return
  const handlePartialReturn = (saleId, itemId, quantity) => {
    if (quantity > 0 && onReturnItem) {
      onReturnItem(saleId, itemId, quantity);
      // Reset the quantity after return
      setReturnQuantities(prev => ({
        ...prev,
        [itemId]: 0
      }));
    }
  };

  // Get sale exchange rates or use current ones as fallback
  const saleExchangeRates = {
    usd_to_iqd: sale.exchange_rate_usd_to_iqd || EXCHANGE_RATES.USD_TO_IQD,
    iqd_to_usd: sale.exchange_rate_iqd_to_usd || EXCHANGE_RATES.IQD_TO_USD
  };

  // Currency formatter using historical exchange rates
  const formatCurrency = (amount, currency) => {
    const symbol = currency === 'USD' ? '$' : 'د.ع';
    
    if (currency === 'IQD') {
      // IQD should never show decimals
      const rounded = Math.round(amount);
      return `${symbol}${rounded.toLocaleString()}`;
    }
    
    // For USD: show 2 decimals, but remove .00 for whole numbers
    const formatted = Number(amount).toFixed(2);
    const cleanFormatted = formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted;
    return `${symbol}${cleanFormatted}`;
  };

  const fmt = n => n != null ? formatCurrency(n, sale.currency || 'USD') : '-';

  // Split items into products and accessories
  const products = (sale.items || []).filter(i => !i.is_accessory);
  const accessories = (sale.items || []).filter(i => i.is_accessory);

  // Calculate original total from items (before discount)
  const calculateOriginalTotal = () => {
    if (!sale.items || sale.items.length === 0) return sale.total || 0;

    const saleCurrency = sale.currency || 'USD';
    return sale.items.reduce((sum, item) => {
      const qty = item.quantity || 1;
      // Use the stored original selling price or current price as fallback
      const originalPrice = getOriginalSellingPrice(item);
      const productCurrency = item.product_currency || 'IQD';

      let displayPrice = originalPrice;
      if (productCurrency !== saleCurrency) {
        if (saleCurrency === 'IQD' && productCurrency === 'USD') {
          displayPrice = originalPrice * saleExchangeRates.usd_to_iqd;
        } else if (saleCurrency === 'USD' && productCurrency === 'IQD') {
          displayPrice = originalPrice * saleExchangeRates.iqd_to_usd;
        }
      }

      return sum + (displayPrice * qty);
    }, 0);
  };

  // Calculate profits separately by currency to avoid inflated numbers
  const calcProfitByCurrency = item => {
    const qty = item.quantity || 1;
    const buyingPrice = item.buying_price || 0;
    const sellingPrice = item.selling_price ?? item.price ?? item.buying_price;
    const productCurrency = item.product_currency || 'IQD';
    
    // Convert both prices to sale currency if needed
    let buyingPriceInSaleCurrency = buyingPrice;
    let sellingPriceInSaleCurrency = sellingPrice;
    
    if (productCurrency !== saleCurrency) {
      if (saleCurrency === 'USD' && productCurrency === 'IQD') {
        buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.iqd_to_usd;
        sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.iqd_to_usd;
      } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
        buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.usd_to_iqd;
        sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.usd_to_iqd;
      }
    }
    
    // Calculate profit in sale currency
    const profit = (sellingPriceInSaleCurrency - buyingPriceInSaleCurrency) * qty;
    return formatCurrency(profit, saleCurrency);
  };

  // Calculate total profits in sale currency
  let totalProfit = 0;
  let totalProductProfit = 0;
  let totalAccessoryProfit = 0;
  const saleCurrency = sale.currency || 'USD';

  let totalBuyingPrice = 0;
  // Calculate product profits using actual selling prices (already discounted)
  products.forEach(item => {
    const qty = item.quantity || 1;
    const buyingPrice = item.buying_price || 0;
    const productCurrency = item.product_currency || 'IQD';
    let buyingPriceInSaleCurrency = buyingPrice;
    if (productCurrency !== saleCurrency) {
      if (saleCurrency === 'USD' && productCurrency === 'IQD') {
        buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.iqd_to_usd;
      } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
        buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.usd_to_iqd;
      }
    }
    totalBuyingPrice += buyingPriceInSaleCurrency * qty;
  });
  // Add accessory buying prices
  accessories.forEach(item => {
    const qty = item.quantity || 1;
    const buyingPrice = item.buying_price || 0;
    const productCurrency = item.product_currency || 'IQD';
    let buyingPriceInSaleCurrency = buyingPrice;
    if (productCurrency !== saleCurrency) {
      if (saleCurrency === 'USD' && productCurrency === 'IQD') {
        buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.iqd_to_usd;
      } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
        buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.usd_to_iqd;
      }
    }
    totalBuyingPrice += buyingPriceInSaleCurrency * qty;
  });

  if (sale.multi_currency_payment) {
    // For multi-currency sales, calculate profit from actual payment amounts
    const totalPaymentInIQD = (sale.multi_currency_payment.usd_amount * saleExchangeRates.usd_to_iqd) + 
                             sale.multi_currency_payment.iqd_amount;
    const totalBuyingInIQD = totalBuyingPrice * (saleCurrency === 'USD' ? saleExchangeRates.usd_to_iqd : 1);
    
    // Calculate total profit in IQD first
    const totalProfitInIQD = totalPaymentInIQD - totalBuyingInIQD;
    
    // Split profit proportionally between currencies based on payment amounts
    const usdRatio = (sale.multi_currency_payment.usd_amount * saleExchangeRates.usd_to_iqd) / totalPaymentInIQD;
    const iqdRatio = sale.multi_currency_payment.iqd_amount / totalPaymentInIQD;
    
    const usdProfit = totalProfitInIQD * usdRatio * saleExchangeRates.iqd_to_usd;
    const iqdProfit = totalProfitInIQD * iqdRatio;
    
    // Format total profit as mixed currency string
    totalProfit = `${formatCurrency(usdProfit, 'USD')} + ${formatCurrency(iqdProfit, 'IQD')}`;
    
    // Calculate actual profit contribution for products and accessories separately
    let productProfitInIQD = 0;
    let accessoryProfitInIQD = 0;
    
    // Calculate product profits in IQD
    products.forEach(item => {
      const qty = item.quantity || 1;
      const buyingPrice = item.buying_price || 0;
      const sellingPrice = item.selling_price ?? item.price ?? item.buying_price;
      const productCurrency = item.product_currency || 'IQD';
      
      let buyingPriceInIQD = buyingPrice;
      let sellingPriceInIQD = sellingPrice;
      
      if (productCurrency === 'USD') {
        buyingPriceInIQD = buyingPrice * saleExchangeRates.usd_to_iqd;
        sellingPriceInIQD = sellingPrice * saleExchangeRates.usd_to_iqd;
      }
      
      productProfitInIQD += (sellingPriceInIQD - buyingPriceInIQD) * qty;
    });
    
    // Calculate accessory profits in IQD
    accessories.forEach(item => {
      const qty = item.quantity || 1;
      const buyingPrice = item.buying_price || 0;
      const sellingPrice = item.selling_price ?? item.price ?? item.buying_price;
      const productCurrency = item.product_currency || 'IQD';
      
      let buyingPriceInIQD = buyingPrice;
      let sellingPriceInIQD = sellingPrice;
      
      if (productCurrency === 'USD') {
        buyingPriceInIQD = buyingPrice * saleExchangeRates.usd_to_iqd;
        sellingPriceInIQD = sellingPrice * saleExchangeRates.usd_to_iqd;
      }
      
      accessoryProfitInIQD += (sellingPriceInIQD - buyingPriceInIQD) * qty;
    });
    
    
    // Split product and accessory profits proportionally between currencies
    const productUsdProfit = productProfitInIQD * usdRatio * saleExchangeRates.iqd_to_usd;
    const productIqdProfit = productProfitInIQD * iqdRatio;
    const accessoryUsdProfit = accessoryProfitInIQD * usdRatio * saleExchangeRates.iqd_to_usd;
    const accessoryIqdProfit = accessoryProfitInIQD * iqdRatio;
    
    totalProductProfit = `${formatCurrency(productUsdProfit, 'USD')} + ${formatCurrency(productIqdProfit, 'IQD')}`;
    totalAccessoryProfit = `${formatCurrency(accessoryUsdProfit, 'USD')} + ${formatCurrency(accessoryIqdProfit, 'IQD')}`;
  } else {
    // Single currency profit calculation - use actual payment amount (sale.total already accounts for change)
    totalProfit = (sale.total || 0) - totalBuyingPrice;
    
    // Calculate actual profit contribution for products and accessories separately
    let actualProductProfit = 0;
    let actualAccessoryProfit = 0;
    
    // Calculate product profits
    products.forEach(item => {
      const qty = item.quantity || 1;
      const buyingPrice = item.buying_price || 0;
      const sellingPrice = item.selling_price ?? item.price ?? item.buying_price;
      const productCurrency = item.product_currency || 'IQD';
      
      let buyingPriceInSaleCurrency = buyingPrice;
      let sellingPriceInSaleCurrency = sellingPrice;
      
      if (productCurrency !== saleCurrency) {
        if (saleCurrency === 'USD' && productCurrency === 'IQD') {
          buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.iqd_to_usd;
          sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.iqd_to_usd;
        } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
          buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.usd_to_iqd;
          sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.usd_to_iqd;
        }
      }
      
      actualProductProfit += (sellingPriceInSaleCurrency - buyingPriceInSaleCurrency) * qty;
    });
    
    // Calculate accessory profits
    accessories.forEach(item => {
      const qty = item.quantity || 1;
      const buyingPrice = item.buying_price || 0;
      const sellingPrice = item.selling_price ?? item.price ?? item.buying_price;
      const productCurrency = item.product_currency || 'IQD';
      
      let buyingPriceInSaleCurrency = buyingPrice;
      let sellingPriceInSaleCurrency = sellingPrice;
      
      if (productCurrency !== saleCurrency) {
        if (saleCurrency === 'USD' && productCurrency === 'IQD') {
          buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.iqd_to_usd;
          sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.iqd_to_usd;
        } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
          buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.usd_to_iqd;
          sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.usd_to_iqd;
        }
      }
      
      actualAccessoryProfit += (sellingPriceInSaleCurrency - buyingPriceInSaleCurrency) * qty;
    });
    
    totalProductProfit = actualProductProfit;
    totalAccessoryProfit = actualAccessoryProfit;
  }

  // Display buying price in product's original currency and selling price in sale currency
  const formatBuyingPrice = (item) => {
    const productCurrency = item.product_currency || 'IQD';
    const buyingPrice = item.buying_price || 0;
    
    // Always display in the product's original currency
    return formatCurrency(buyingPrice, productCurrency);
  };

  // Helper to get total buying price display for a sale
  const getTotalBuyingPriceDisplay = () => {
    let totalBuyingUSD = 0;
    let totalBuyingIQD = 0;
    
    if (sale.items && sale.items.length) {
      sale.items.forEach(item => {
        const qty = item.quantity || 1;
        const buyingPrice = item.buying_price || 0;
        const productCurrency = item.product_currency || 'IQD';
        
        if (productCurrency === 'USD') {
          totalBuyingUSD += buyingPrice * qty;
        } else {
          totalBuyingIQD += buyingPrice * qty;
        }
      });
    }
    
    const hasBothCurrencies = totalBuyingUSD > 0 && totalBuyingIQD > 0;
    
    if (hasBothCurrencies) {
      return `${formatCurrency(totalBuyingUSD, 'USD')} + ${formatCurrency(totalBuyingIQD, 'IQD')}`;
    } else if (totalBuyingUSD > 0) {
      return formatCurrency(totalBuyingUSD, 'USD');
    } else {
      return formatCurrency(totalBuyingIQD, 'IQD');
    }
  };

  const formatSellingPrice = (item) => {
    // The selling price stored in database is already the final discounted price
    const sellingPrice = item.selling_price ?? item.price ?? item.buying_price;
    const productCurrency = item.product_currency || 'IQD';
    
    // Convert to sale currency if needed
    let displayPrice = sellingPrice;
    if (productCurrency !== saleCurrency) {
      if (saleCurrency === 'USD' && productCurrency === 'IQD') {
        displayPrice = sellingPrice * saleExchangeRates.iqd_to_usd;
      } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
        displayPrice = sellingPrice * saleExchangeRates.usd_to_iqd;
      }
    }
    
    return formatCurrency(displayPrice, saleCurrency);
  };

  // Helper to check if this sale has any discounts
  const hasAnyDiscount = () => {
    // Check for global discounts
    if (sale.discount_type && sale.discount_value > 0) {
      return true;
    }
    // Check for individual item discounts
    if (sale.items && sale.items.some(item => item.discount_percent > 0)) {
      return true;
    }
    return false;
  };

  // Helper to get discount information for display
  const getDiscountInfo = () => {
    let discountInfo = {
      hasGlobalDiscount: false,
      globalDiscountType: null,
      globalDiscountValue: 0,
      hasItemDiscounts: false,
      itemsWithDiscounts: []
    };

    // Check for global discount
    if (sale.discount_type && sale.discount_value > 0) {
      discountInfo.hasGlobalDiscount = true;
      discountInfo.globalDiscountType = sale.discount_type;
      discountInfo.globalDiscountValue = sale.discount_value;
    }

    // Check for individual item discounts
    if (sale.items) {
      sale.items.forEach(item => {
        if (item.discount_percent > 0) {
          discountInfo.hasItemDiscounts = true;
          discountInfo.itemsWithDiscounts.push(item.id);
        }
      });
    }

    return discountInfo;
  };

  // Helper to get original selling price for an item
  const getOriginalSellingPrice = (item) => {
    // Use the stored original_selling_price if available, otherwise back-calculate
    if (item.original_selling_price && item.original_selling_price !== item.selling_price) {
      return item.original_selling_price;
    }
    
    // Back-calculate from current price if there was an individual discount
    let originalPrice = item.selling_price;
    if (item.discount_percent && item.discount_percent > 0) {
      originalPrice = item.selling_price / (1 - item.discount_percent / 100);
    }
    
    return originalPrice;
  };

  // Helper to format discount display for an item
  const formatItemDiscountDisplay = (item) => {
    const originalPrice = getOriginalSellingPrice(item);
    const currentPrice = item.selling_price;
    const productCurrency = item.product_currency || 'IQD';
    
    let hasIndividualDiscount = item.discount_percent > 0;
    let hasGlobalDiscount = sale.discount_type && sale.discount_value > 0;
    
    if (!hasIndividualDiscount && !hasGlobalDiscount) {
      return formatCurrency(currentPrice, productCurrency);
    }

    // Show both original (crossed out) and discounted prices
    let discountText = '';
    if (hasIndividualDiscount) {
      discountText = `(-${item.discount_percent}% individual)`;
    }
    if (hasGlobalDiscount) {
      if (hasIndividualDiscount) discountText += ' + ';
      discountText += `(-${sale.discount_type === 'percentage' ? sale.discount_value + '%' : formatCurrency(sale.discount_value, sale.discount_currency || saleCurrency)} ${sale.discount_type})`;
    }

    return (
      <span>
        <span className="line-through text-red-500 mr-1">
          {formatCurrency(originalPrice, productCurrency)}
        </span>
        <span className="text-green-600 font-bold">
          {formatCurrency(currentPrice, productCurrency)}
        </span>
        <span className="ml-1 text-xs text-orange-600">
          {discountText}
        </span>
      </span>
    );
  };

  // Calculate original and discounted totals
  const originalTotal = calculateOriginalTotal();
  const discountedTotal = sale.total || 0;
  
  // Check if there's a discount by comparing totals or checking discount fields
  const discountInfo = getDiscountInfo();
  const hasDiscount = discountInfo.hasGlobalDiscount || discountInfo.hasItemDiscounts || originalTotal > discountedTotal;

  // Format total display for multi-currency payments
  const formatTotal = () => {
    if (sale.multi_currency_payment) {
      const usdAmount = sale.multi_currency_payment.usd_amount || 0;
      const iqdAmount = sale.multi_currency_payment.iqd_amount || 0;
      return `${formatCurrency(usdAmount, 'USD')} + ${formatCurrency(iqdAmount, 'IQD')}`;
    } else {
      return fmt(discountedTotal);
    }
  };

  // Responsive, no x-scroll, modern look
  return (
    <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl lg:text-2xl font-bold text-purple-700 dark:text-purple-300 mb-2">{t.saleDetails || 'Sale Details'} #{sale.id}</h2>
            <div className="space-y-1 text-sm">
              <div className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">{t.date || 'Date'}:</span> {sale.created_at ? new Date(sale.created_at).toLocaleString() : '-'}
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">{t.customer || 'Customer'}:</span> {sale.customer_name || t.unknownCustomer || 'Unknown'}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end flex-shrink-0">
            {/* Exchange Rate Display */}
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {t.exchangeRate || 'Exchange Rate'}: 1$ = {saleExchangeRates.usd_to_iqd.toLocaleString()} د.ع
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Products Table */}
          {products.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 text-lg border-b border-purple-300 pb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
                {t.products || 'Products'}
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({products.length})</span>
              </h3>
              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-gray-800 dark:text-gray-100 text-sm" dir="auto">
                  <thead className="bg-gradient-to-r from-purple-600 to-pink-500 text-white">
                    <tr>
                      <th className="px-3 py-3 font-medium text-right">#</th>
                      <th className="px-3 py-3 font-medium text-right">{t.name}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.ramSpecs || 'RAM'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.storageSpecs || 'Storage'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.sellingPrice || 'Selling Price'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.buyingPrice || 'Buying Price'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.qty || 'Qty'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.profit || 'Profit'}</th>
                      {onReturnItem && <th className="px-3 py-3 font-medium text-right">{t.returnQty || 'Return Qty'}</th>}
                      {onReturnItem && <th className="px-3 py-3 font-medium text-right">{t.action || 'Action'}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((item, idx) => (
                      <tr key={item.id} className="border-b last:border-b-0 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-3">{idx + 1}</td>
                        <td className="px-3 py-3 font-medium">{item.name}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{item.ram || '-'}</td>
                        <td className="px-3 py-3">{item.storage || '-'}</td>
                        <td className="px-3 py-3">
                          {formatItemDiscountDisplay(item)}
                        </td>
                        <td className="px-3 py-3">{formatBuyingPrice(item)}</td>
                        <td className="px-3 py-3">{item.quantity}</td>
                        <td className="px-3 py-3 font-semibold text-green-600 dark:text-green-400">{calcProfitByCurrency(item)}</td>
                        {onReturnItem && (
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={getReturnQuantity(item.id, item.quantity)}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              placeholder="0"
                            />
                          </td>
                        )}
                        {onReturnItem && (
                          <td className="px-3 py-3">
                            <button
                              onClick={() => handlePartialReturn(sale.id, item.id, getReturnQuantity(item.id, item.quantity))}
                              disabled={getReturnQuantity(item.id, item.quantity) === 0}
                              className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title={t.returnSelectedQty || 'Return selected quantity'}
                            >
                              {t.returnItems || 'Return'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Products Table Footer */}
              <div className="text-right text-emerald-700 dark:text-emerald-300 font-semibold mt-2">
                {t.productProfit || 'Product Profit'}: {typeof totalProductProfit === 'string' ? totalProductProfit : formatCurrency(totalProductProfit, saleCurrency)}
              </div>
            </div>
          )}

          {/* Divider between products and accessories */}
          {products.length > 0 && accessories.length > 0 && (
            <hr className="my-4 border-t-2 border-dashed border-gray-300 dark:border-gray-700" />
          )}

          {/* Accessories Table */}
          {accessories.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 text-lg border-b border-emerald-300 pb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                {t.accessories || 'Accessories'}
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({accessories.length})</span>
              </h3>
              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-gray-800 dark:text-gray-100 text-sm" dir="auto">
                  <thead className="bg-gradient-to-r from-green-600 to-emerald-500 text-white">
                    <tr>
                      <th className="px-3 py-3 font-medium text-right">#</th>
                      <th className="px-3 py-3 font-medium text-right">{t.name}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.type || 'Type'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.sellingPrice || 'Selling Price'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.buyingPrice || 'Buying Price'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.qty || 'Qty'}</th>
                      <th className="px-3 py-3 font-medium text-right">{t.profit || 'Profit'}</th>
                      {onReturnItem && <th className="px-3 py-3 font-medium text-right">{t.returnQty || 'Return Qty'}</th>}
                      {onReturnItem && <th className="px-3 py-3 font-medium text-right">{t.action || 'Action'}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {accessories.map((item, idx) => (
                      <tr key={item.id} className="border-b last:border-b-0 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-3">{idx + 1}</td>
                        <td className="px-3 py-3 font-medium">{item.name}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{item.type || '-'}</td>
                        <td className="px-3 py-3">
                          {formatItemDiscountDisplay(item)}
                        </td>
                        <td className="px-3 py-3">{formatBuyingPrice(item)}</td>
                        <td className="px-3 py-3">{item.quantity}</td>
                        <td className="px-3 py-3 font-semibold text-green-600 dark:text-green-400">{calcProfitByCurrency(item)}</td>
                        {onReturnItem && (
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={getReturnQuantity(item.id, item.quantity)}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              placeholder="0"
                            />
                          </td>
                        )}
                        {onReturnItem && (
                          <td className="px-3 py-3">
                            <button
                              onClick={() => handlePartialReturn(sale.id, item.id, getReturnQuantity(item.id, item.quantity))}
                              disabled={getReturnQuantity(item.id, item.quantity) === 0}
                              className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title={t.returnSelectedQty || 'Return selected quantity'}
                            >
                              {t.returnItems || 'Return'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Accessories Table Footer */}
              <div className="text-right text-emerald-700 dark:text-emerald-300 font-semibold mt-2">
                {t.accessoryProfit || 'Accessory Profit'}: {typeof totalAccessoryProfit === 'string' ? totalAccessoryProfit : formatCurrency(totalAccessoryProfit, saleCurrency)}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-gray-600 dark:text-gray-300 text-sm">
            <span className="font-medium">{t.totalItems || 'Total Items'}:</span> {sale.items ? sale.items.length : 0}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex flex-col sm:items-end gap-1">
              {hasDiscount ? (
                <>
                  <div className="text-lg line-through text-red-500 dark:text-red-400">{t.originalTotal || 'Original Total'}: {fmt(originalTotal)}</div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{t.discountedTotal || 'Discounted Total'}: {formatTotal()}</div>
                </>
              ) : (
                <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{t.total || 'Total'}: {formatTotal()}</div>
              )}
              <div className="text-md font-semibold text-emerald-700 dark:text-emerald-300">{t.profit || 'Profit'}: {typeof totalProfit === 'string' ? totalProfit : formatCurrency(totalProfit, saleCurrency)}</div>
            </div>
            <button 
              onClick={onClose} 
              className="px-6 py-2 rounded-xl bg-purple-600 text-white font-semibold shadow hover:bg-purple-700 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              {t.close || 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
