import React, { useMemo, useEffect, useState } from 'react';
import OfflineIndicator from './OfflineIndicator';
import { useData } from '../contexts/DataContext';
import { playNavigationSound, playActionSound } from '../utils/sounds';
import { formatCurrency, EXCHANGE_RATES } from '../utils/exchangeRates';

const AdminStatsSidebar = ({ 
  admin, 
  t, 
  navItems, 
  section, 
  handleNavClick 
}) => {
  const { products, sales, accessories, buyingHistory, companyDebts } = useData();
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Set up midnight refresh timer
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    // Set initial timeout to midnight
    const midnightTimeout = setTimeout(() => {
      setRefreshKey(prev => prev + 1);
      
      // Then set up daily interval
      const dailyInterval = setInterval(() => {
        setRefreshKey(prev => prev + 1);
      }, 24 * 60 * 60 * 1000); // 24 hours
      
      return () => clearInterval(dailyInterval);
    }, timeUntilMidnight);
    
    return () => clearTimeout(midnightTimeout);
  }, []);
  
  // Enhanced calculations for better admin insights - memoized for performance
  const stats = useMemo(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Today's sales by currency
    const todaysSales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate.toDateString() === currentDate.toDateString();
    });
    
    const todaysRevenueUSD = todaysSales.reduce((sum, sale) => {
      // Handle multi-currency sales first
      if (sale.multi_currency && (sale.multi_currency.usdAmount > 0 || sale.multi_currency.iqdAmount > 0)) {
        return sum + (sale.multi_currency.usdAmount || 0);
      }
      // For single currency sales
      if ((sale.currency || 'USD') === 'USD') {
        return sum + (sale.total || 0);
      }
      return sum;
    }, 0);
    
    const todaysRevenueIQD = todaysSales.reduce((sum, sale) => {
      // Handle multi-currency sales first
      if (sale.multi_currency && (sale.multi_currency.usdAmount > 0 || sale.multi_currency.iqdAmount > 0)) {
        return sum + (sale.multi_currency.iqdAmount || 0);
      }
      // For single currency sales
      if (sale.currency === 'IQD') {
        return sum + (sale.total || 0);
      }
      return sum;
    }, 0);
    
    const todaysProfitUSD = todaysSales.filter(sale => (sale.currency || 'USD') === 'USD').reduce((sum, sale) => {
      if (!sale.items) return sum;
      console.log('🔍 [USD PROFIT] Processing sale:', sale.id, 'currency:', sale.currency);
      return sum + sale.items.reduce((itemSum, item) => {
        // Ensure profit calculation considers both purchase and sale currencies
        const buyingPrice = item.buying_price || 0;
        const sellingPrice = item.selling_price || item.buying_price || 0;
        const quantity = item.quantity || 1;
        
        console.log('🔍 [USD PROFIT] Item:', item.name);
        console.log('  - RAW DATABASE VALUES:', {
          price: item.price,
          selling_price: item.selling_price,
          buying_price: item.buying_price,
          currency: item.currency,
          product_currency: item.product_currency
        });
        
        // CRITICAL: The selling_price is stored in the PRODUCT'S original currency, not the sale currency
        
        let sellingPriceInSaleCurrency = sellingPrice;
        let buyingPriceInSaleCurrency = buyingPrice;
        
        // Determine what currency the selling_price is actually stored in
        // CRITICAL FIX: selling_price should ALWAYS be stored in the product's original currency
        // NOT in the sale currency (which is what item.currency represents)
        const sellingPriceCurrency = item.product_currency || 'USD'; // Always use product currency for selling_price
        const productCurrency = item.product_currency || 'USD';
        
        console.log('  - CURRENCY ANALYSIS:');
        console.log('    * selling_price:', sellingPrice, 'stored in currency:', sellingPriceCurrency, '(FIXED: always product currency)');
        console.log('    * buying_price:', buyingPrice, 'stored in currency:', productCurrency);
        console.log('    * sale_currency:', sale.currency);
        console.log('    * item.currency (sale context):', item.currency);
        
        // Convert selling price to sale currency if needed
        if (sellingPriceCurrency === 'IQD' && sale.currency === 'USD') {
          sellingPriceInSaleCurrency = sellingPrice * (sale.exchange_rate_iqd_to_usd || 0.000694);
          console.log('    * Converting selling_price: IQD', sellingPrice, '* 0.000694 = USD', sellingPriceInSaleCurrency);
        } else if (sellingPriceCurrency === 'USD' && sale.currency === 'IQD') {
          sellingPriceInSaleCurrency = sellingPrice * (sale.exchange_rate_usd_to_iqd || 1440);
          console.log('    * Converting selling_price: USD', sellingPrice, '* 1440 = IQD', sellingPriceInSaleCurrency);
        } else {
          console.log('    * No selling_price conversion needed');
        }
        
        // Convert buying price to sale currency if needed
        if (productCurrency === 'IQD' && sale.currency === 'USD') {
          buyingPriceInSaleCurrency = buyingPrice * (sale.exchange_rate_iqd_to_usd || 0.000694);
          console.log('    * Converting buying_price: IQD', buyingPrice, '* 0.000694 = USD', buyingPriceInSaleCurrency);
        } else if (productCurrency === 'USD' && sale.currency === 'IQD') {
          buyingPriceInSaleCurrency = buyingPrice * (sale.exchange_rate_usd_to_iqd || 1440);
          console.log('    * Converting buying_price: USD', buyingPrice, '* 1440 = IQD', buyingPriceInSaleCurrency);
        } else {
          console.log('    * No buying_price conversion needed');
        }
        
        // Calculate profit in sale currency
        const profit = (sellingPriceInSaleCurrency - buyingPriceInSaleCurrency) * quantity;
        console.log('  - FINAL PROFIT CALC:', sellingPriceInSaleCurrency, '-', buyingPriceInSaleCurrency, '*', quantity, '=', profit, sale.currency);
        
        return itemSum + profit;
      }, 0);
    }, 0);
    
    const todaysProfitIQD = todaysSales.filter(sale => sale.currency === 'IQD').reduce((sum, sale) => {
      if (!sale.items) return sum;
      console.log('🔍 [IQD PROFIT] Processing sale:', sale.id, 'currency:', sale.currency);
      return sum + sale.items.reduce((itemSum, item) => {
        // Ensure profit calculation considers both purchase and sale currencies
        const buyingPrice = item.buying_price || 0;
        const sellingPrice = item.selling_price || item.buying_price || 0;
        const quantity = item.quantity || 1;
        
        console.log('🔍 [IQD PROFIT] Item:', item.name);
        console.log('  - RAW DATABASE VALUES:', {
          price: item.price,
          selling_price: item.selling_price,
          buying_price: item.buying_price,
          currency: item.currency,
          product_currency: item.product_currency,
          purchase_currency: item.purchase_currency
        });
        console.log('  - SALE CONTEXT:', {
          sale_currency: sale.currency,
          sale_total: sale.total,
          exchange_rates: {
            usd_to_iqd: sale.exchange_rate_usd_to_iqd,
            iqd_to_usd: sale.exchange_rate_iqd_to_usd
          }
        });
        console.log('  - CALCULATED VALUES:', { buyingPrice, sellingPrice, quantity });
        
        // CRITICAL: The selling_price is stored in the PRODUCT'S original currency, not the sale currency
        // This is key to fixing the profit calculation!
        
        let sellingPriceInSaleCurrency = sellingPrice;
        let buyingPriceInSaleCurrency = buyingPrice;
        
        // Determine what currency the selling_price is actually stored in
        // CRITICAL FIX: selling_price should ALWAYS be stored in the product's original currency
        // NOT in the sale currency (which is what item.currency represents)
        const sellingPriceCurrency = item.product_currency || 'USD'; // Always use product currency for selling_price
        const productCurrency = item.product_currency || 'USD';
        
        console.log('  - CURRENCY ANALYSIS:');
        console.log('    * selling_price:', sellingPrice, 'stored in currency:', sellingPriceCurrency, '(FIXED: always product currency)');
        console.log('    * buying_price:', buyingPrice, 'stored in currency:', productCurrency);
        console.log('    * sale_currency:', sale.currency);
        console.log('    * item.currency (sale context):', item.currency);
        
        // Convert selling price to sale currency if needed
        if (sellingPriceCurrency === 'USD' && sale.currency === 'IQD') {
          sellingPriceInSaleCurrency = sellingPrice * (sale.exchange_rate_usd_to_iqd || 1440);
          console.log('    * Converting selling_price: USD', sellingPrice, '* 1440 = IQD', sellingPriceInSaleCurrency);
        } else if (sellingPriceCurrency === 'IQD' && sale.currency === 'USD') {
          sellingPriceInSaleCurrency = sellingPrice * (sale.exchange_rate_iqd_to_usd || 0.000694);
          console.log('    * Converting selling_price: IQD', sellingPrice, '* 0.000694 = USD', sellingPriceInSaleCurrency);
        } else {
          console.log('    * No selling_price conversion needed');
        }
        
        // Convert buying price to sale currency if needed
        if (productCurrency === 'USD' && sale.currency === 'IQD') {
          buyingPriceInSaleCurrency = buyingPrice * (sale.exchange_rate_usd_to_iqd || 1440);
          console.log('    * Converting buying_price: USD', buyingPrice, '* 1440 = IQD', buyingPriceInSaleCurrency);
        } else if (productCurrency === 'IQD' && sale.currency === 'USD') {
          buyingPriceInSaleCurrency = buyingPrice * (sale.exchange_rate_iqd_to_usd || 0.000694);
          console.log('    * Converting buying_price: IQD', buyingPrice, '* 0.000694 = USD', buyingPriceInSaleCurrency);
        } else {
          console.log('    * No buying_price conversion needed');
        }
        
        // Calculate profit in sale currency
        const profit = (sellingPriceInSaleCurrency - buyingPriceInSaleCurrency) * quantity;
        console.log('  - FINAL PROFIT CALC:', sellingPriceInSaleCurrency, '-', buyingPriceInSaleCurrency, '*', quantity, '=', profit, sale.currency);
        
        return itemSum + profit;
      }, 0);
    }, 0);

    // Today's spending by currency (from buying history)
    const todaysSpendingUSD = buyingHistory.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.toDateString() === currentDate.toDateString() && (entry.currency === 'USD' || (!entry.currency && typeof entry.total_price === 'number'));
    }).reduce((sum, entry) => {
      // If no currency specified, assume it's the original entry which should be in USD
      return sum + (entry.currency === 'USD' || !entry.currency ? (entry.total_price || 0) : 0);
    }, 0);
    
    const todaysSpendingIQD = buyingHistory.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.toDateString() === currentDate.toDateString() && entry.currency === 'IQD';
    }).reduce((sum, entry) => sum + (entry.total_price || 0), 0);

    // Net performance for today by currency (revenue - spending)
    const todaysNetPerformanceUSD = todaysRevenueUSD - todaysSpendingUSD;
    const todaysNetPerformanceIQD = todaysRevenueIQD - todaysSpendingIQD;

    // Low stock products (critical alerts)
    const criticalStockProducts = products.filter(p => p.stock <= 2 && !p.archived);
    const lowStockProducts = products.filter(p => p.stock > 2 && p.stock < admin.lowStockThreshold && !p.archived);

    // Top selling products (by quantity sold)
    const productSalesMap = {};
    sales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          // Skip items without names
          if (!item.name || item.name === 'null' || item.name === null) return;
          
          if (!productSalesMap[item.name]) {
            productSalesMap[item.name] = { quantity: 0, revenue: 0 };
          }
          productSalesMap[item.name].quantity += item.quantity;
          productSalesMap[item.name].revenue += item.total;
        });
      }
    });

    const topSellingProducts = Object.entries(productSalesMap)
      .filter(([name]) => name && name !== 'null' && name !== null) // Filter out null/invalid names
      .sort(([, a], [, b]) => b.quantity - a.quantity)
      .slice(0, 5);

    // Recent sales for quick overview
    const recentSales = [...sales]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    // Calculate total profit by currency (fixed calculation with proper currency handling)
    const totalProfitUSD = sales.filter(sale => (sale.currency || 'USD') === 'USD').reduce((sum, sale) => {
      if (!sale.items) return sum;
      // For debt sales, check if the debt is paid by looking up in debts array
      if (sale.is_debt) {
        const debt = admin.debts?.find(d => d.sale_id === sale.id);
        if (!debt || (!debt.paid_at && !debt.paid)) return sum; // Skip unpaid debts - check both fields
      }
      return sum + sale.items.reduce((itemSum, item) => {
        // Ensure profit calculation considers both purchase and sale currencies
        const buyingPrice = item.buying_price || 0;
        const sellingPrice = item.selling_price || item.buying_price || 0;
        const quantity = item.quantity || 1;
        const productCurrency = item.product_currency || 'USD';
        const saleCurrency = sale.currency || 'USD';
        
        // CRITICAL FIX: selling_price is stored in product's original currency
        // Need to convert both prices to sale currency for proper profit calculation
        let sellingPriceInSaleCurrency = sellingPrice;
        let buyingPriceInSaleCurrency = buyingPrice;
        
        // Get exchange rates from sale or use current rates
        const saleExchangeRates = sale.exchange_rates || {
          usd_to_iqd: EXCHANGE_RATES.USD_TO_IQD,
          iqd_to_usd: EXCHANGE_RATES.IQD_TO_USD
        };
        
        // Convert selling price to sale currency if needed
        if (productCurrency !== saleCurrency) {
          if (saleCurrency === 'USD' && productCurrency === 'IQD') {
            sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.iqd_to_usd;
          } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
            sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.usd_to_iqd;
          }
        }
        
        // Convert buying price to sale currency if needed
        if (productCurrency !== saleCurrency) {
          if (saleCurrency === 'USD' && productCurrency === 'IQD') {
            buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.iqd_to_usd;
          } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
            buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.usd_to_iqd;
          }
        }
        
        // Calculate profit in the sale currency
        let profit = (sellingPriceInSaleCurrency - buyingPriceInSaleCurrency) * quantity;
        
        return itemSum + profit ;
      }, 0);
    }, 0);
    
    const totalProfitIQD = sales.filter(sale => sale.currency === 'IQD').reduce((sum, sale) => {
      if (!sale.items) return sum;
      // For debt sales, check if the debt is paid by looking up in debts array
      if (sale.is_debt) {
        const debt = admin.debts?.find(d => d.sale_id === sale.id);
        if (!debt || (!debt.paid_at && !debt.paid)) return sum; // Skip unpaid debts - check both fields
      }
      return sum + sale.items.reduce((itemSum, item) => {
        // Ensure profit calculation considers both purchase and sale currencies
        const buyingPrice = item.buying_price || 0;
        const sellingPrice = item.selling_price || item.buying_price || 0;
        const quantity = item.quantity || 1;
        const productCurrency = item.product_currency || 'IQD';
        const saleCurrency = sale.currency || 'IQD';
        
        // CRITICAL FIX: selling_price is stored in product's original currency
        // Need to convert both prices to sale currency for proper profit calculation
        let sellingPriceInSaleCurrency = sellingPrice;
        let buyingPriceInSaleCurrency = buyingPrice;
        
        // Get exchange rates from sale or use current rates
        const saleExchangeRates = sale.exchange_rates || {
          usd_to_iqd: EXCHANGE_RATES.USD_TO_IQD,
          iqd_to_usd: EXCHANGE_RATES.IQD_TO_USD
        };
        
        // Convert selling price to sale currency if needed
        if (productCurrency !== saleCurrency) {
          if (saleCurrency === 'USD' && productCurrency === 'IQD') {
            sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.iqd_to_usd;
          } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
            sellingPriceInSaleCurrency = sellingPrice * saleExchangeRates.usd_to_iqd;
          }
        }
        
        // Convert buying price to sale currency if needed
        if (productCurrency !== saleCurrency) {
          if (saleCurrency === 'USD' && productCurrency === 'IQD') {
            buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.iqd_to_usd;
          } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
            buyingPriceInSaleCurrency = buyingPrice * saleExchangeRates.usd_to_iqd;
          }
        }
        
        // Calculate profit in the sale currency
        let profit = (sellingPriceInSaleCurrency - buyingPriceInSaleCurrency) * quantity;
        
        return itemSum + profit;
      }, 0);
    }, 0);

    return {
      todaysSales,
      todaysRevenueUSD,
      todaysRevenueIQD,
      todaysProfitUSD,
      todaysProfitIQD,
      todaysSpendingUSD,
      todaysSpendingIQD,
      todaysNetPerformanceUSD,
      todaysNetPerformanceIQD,
      criticalStockProducts,
      lowStockProducts,
      topSellingProducts,
      recentSales,
      totalProfitUSD,
      totalProfitIQD
    };
  }, [sales, products, accessories, buyingHistory, admin.debts, admin.lowStockThreshold, refreshKey]);

  // Customer Debt calculations - fixed to handle both paid_at and paid fields
  const totalCustomerDebtAmount = useMemo(() => {
    return (admin.debts || [])
      .filter(debt => !debt.paid_at && !debt.paid) // Check both paid_at and paid fields
      .reduce((sum, debt) => {
        // Use debt.total if available, otherwise find sale and use sale.total
        const debtAmount = debt.total || debt.amount;
        if (debtAmount) {
          return sum + debtAmount;
        }
        const sale = sales.find(s => s.id === debt.sale_id);
        return sum + (sale ? sale.total : 0);
      }, 0);
  }, [admin.debts, sales]);

  // Company Debt calculations - get data from DataContext
  
  const totalCompanyDebtAmountUSD = useMemo(() => {
    return (companyDebts || [])
      .filter(debt => !debt.paid_at)
      .reduce((sum, debt) => {
        if (debt.currency === 'MULTI') {
          return sum + (debt.usd_amount || 0);
        } else if (debt.currency === 'USD' || !debt.currency) {
          return sum + (debt.amount || 0);
        }
        return sum;
      }, 0);
  }, [companyDebts]);

  const totalCompanyDebtAmountIQD = useMemo(() => {
    return (companyDebts || [])
      .filter(debt => !debt.paid_at)
      .reduce((sum, debt) => {
        if (debt.currency === 'MULTI') {
          return sum + (debt.iqd_amount || 0);
        } else if (debt.currency === 'IQD') {
          return sum + (debt.amount || 0);
        }
        return sum;
      }, 0);
  }, [companyDebts]);

  const outstandingCustomerDebtsCount = useMemo(() => {
    return (admin.debts || []).filter(debt => !debt.paid_at && !debt.paid).length;
  }, [admin.debts]);

  const outstandingCompanyDebtsCount = useMemo(() => {
    return (companyDebts || []).filter(debt => !debt.paid_at).length;
  }, [companyDebts]);

  const paidCustomerDebtsToday = useMemo(() => {
    const today = new Date().toDateString();
    return (admin.debts || [])
      .filter(debt => {
        // Check if debt was paid today using either paid_at field or paid field with timestamp
        if (debt.paid_at) {
          return new Date(debt.paid_at).toDateString() === today;
        }
        // Fallback for older data structure
        return debt.paid && debt.paid_at && new Date(debt.paid_at).toDateString() === today;
      })
      .length;
  }, [admin.debts]);

  const paidCompanyDebtsToday = useMemo(() => {
    const today = new Date().toDateString();
    return (companyDebts || [])
      .filter(debt => {
        if (debt.paid_at) {
          return new Date(debt.paid_at).toDateString() === today;
        }
        return false;
      })
      .length;
  }, [companyDebts]);

  return (
    <aside className="w-full md:w-[370px] h-full flex flex-col justify-between p-8 bg-white/30 dark:bg-gray-900/60 backdrop-blur-xl shadow-2xl border-r border-white/10 relative z-10 overflow-y-auto" aria-label="Admin navigation">
      <div className="flex flex-col h-full min-h-0">
        {/* Mobile Roma Admin Dashboard label moved to top of sidebar */}
        <div className="flex flex-col gap-2 mb-6 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-purple-400 animate-pulse"></span>
              <span className="font-extrabold text-2xl text-[#a21caf] dark:text-purple-200 tracking-tight drop-shadow">Mobile Roma</span>
            </div>
            <OfflineIndicator className="text-xs" />
          </div>
          <span className="font-bold text-lg text-gray-700 dark:text-gray-300 ml-5">{t.adminDashboard}</span>
        </div>
        
        {/* Enhanced Stats */}
        <div className="space-y-3 mb-8 shrink-0">
          {/* Today's Performance */}
          <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 dark:from-blue-900/40 dark:to-cyan-900/40 rounded-2xl shadow p-4 border border-blue-200/30 dark:border-blue-700/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📈</span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.todaysPerformance || 'Today\'s Performance'}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t.sales || 'Sales'}: </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{stats.todaysSales.length}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t.revenueUSD || 'Revenue USD'}: </span>
                <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.todaysRevenueUSD, 'USD')}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t.revenueIQD || 'Revenue IQD'}: </span>
                <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.todaysRevenueIQD, 'IQD')}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t.profitUSD || 'Profit USD'}: </span>
                <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.todaysProfitUSD, 'USD')}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t.profitIQD || 'Profit IQD'}: </span>
                <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.todaysProfitIQD, 'IQD')}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t.spentUSD || 'Spent USD'}: </span>
                <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.todaysSpendingUSD, 'USD')}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t.spentIQD || 'Spent IQD'}: </span>
                <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.todaysSpendingIQD, 'IQD')}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t.netUSD || 'Net USD'}: </span>
                <span className={`font-bold ${stats.todaysNetPerformanceUSD >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(stats.todaysNetPerformanceUSD, 'USD')}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t.netIQD || 'Net IQD'}: </span>
                <span className={`font-bold ${stats.todaysNetPerformanceIQD >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(stats.todaysNetPerformanceIQD, 'IQD')}
                </span>
              </div>
            </div>
          </div>

          {/* Monthly Overview */}
          <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-4 flex flex-col border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🏪</span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.thisMonth || 'This Month'}</span>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-bold text-blue-500 dark:text-blue-300">
                {formatCurrency(
                  sales.filter(sale => {
                    const saleDate = new Date(sale.created_at);
                    const currentDate = new Date();
                    return saleDate.getMonth() === currentDate.getMonth() && 
                           saleDate.getFullYear() === currentDate.getFullYear();
                  }).reduce((sum, sale) => {
                    // Handle multi-currency sales first
                    if (sale.multi_currency && (sale.multi_currency.usdAmount > 0 || sale.multi_currency.iqdAmount > 0)) {
                      return sum + (sale.multi_currency.usdAmount || 0);
                    }
                    // For single currency sales
                    if ((sale.currency || 'USD') === 'USD') {
                      return sum + (sale.total || 0);
                    }
                    return sum;
                  }, 0), 'USD'
                )}
              </div>
              <div className="text-lg font-bold text-blue-500 dark:text-blue-300">
                {formatCurrency(
                  sales.filter(sale => {
                    const saleDate = new Date(sale.created_at);
                    const currentDate = new Date();
                    return saleDate.getMonth() === currentDate.getMonth() && 
                           saleDate.getFullYear() === currentDate.getFullYear();
                  }).reduce((sum, sale) => {
                    // Handle multi-currency sales first
                    if (sale.multi_currency && (sale.multi_currency.usdAmount > 0 || sale.multi_currency.iqdAmount > 0)) {
                      return sum + (sale.multi_currency.iqdAmount || 0);
                    }
                    // For single currency sales
                    if (sale.currency === 'IQD') {
                      return sum + (sale.total || 0);
                    }
                    return sum;
                  }, 0), 'IQD'
                )}
              </div>
            </div>
          </div>

          {/* Total Profit */}
          <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-4 flex flex-col border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">💰</span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.totalProfit || 'Total Profit'}</span>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-bold text-green-500 dark:text-green-300">{formatCurrency(stats.totalProfitUSD || 0, 'USD')}</div>
              <div className="text-lg font-bold text-green-500 dark:text-green-300">{formatCurrency(stats.totalProfitIQD || 0, 'IQD')}</div>
            </div>
          </div>

          {/* Inventory Value */}
          <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-4 flex flex-col border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">📦</span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.inventoryValue}</span>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-bold text-purple-500 dark:text-purple-300">
                {formatCurrency(
                  products.filter(p => !p.archived && (p.currency === 'USD' || !p.currency)).reduce((sum, p) => {
                    return sum + ((p.buying_price || 0) * (p.stock || 0));
                  }, 0), 'USD'
                )}
              </div>
              <div className="text-lg font-bold text-purple-500 dark:text-purple-300">
                {formatCurrency(
                  products.filter(p => !p.archived && p.currency === 'IQD').reduce((sum, p) => {
                    return sum + ((p.buying_price || 0) * (p.stock || 0));
                  }, 0) + accessories.filter(a => !a.archived).reduce((sum, a) => {
                    return sum + ((a.buying_price || 0) * (a.stock || 0));
                  }, 0), 'IQD'
                )}
              </div>
            </div>
          </div>

          {/* Stock Alerts */}
          {(stats.criticalStockProducts.length > 0 || stats.lowStockProducts.length > 0) && (
            <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 dark:from-red-900/40 dark:to-orange-900/40 rounded-2xl shadow p-4 border border-red-200/30 dark:border-red-700/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">⚠️</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.stockWarnings || 'Stock Alerts'}</span>
              </div>
              <div className="space-y-1 text-sm">
                {stats.criticalStockProducts.length > 0 && (
                  <div className="text-red-600 dark:text-red-400 font-semibold">
                    🚨 {t.critical || 'Critical'}: {stats.criticalStockProducts.length} {t.items || 'items'}
                  </div>
                )}
                {stats.lowStockProducts.length > 0 && (
                  <div className="text-orange-600 dark:text-orange-400">
                    ⚡ {t.lowStock || 'Low'}: {stats.lowStockProducts.length} {t.items || 'items'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Debt Summary */}
          {admin.debts && admin.debts.length > 0 && (
            <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 dark:from-yellow-900/40 dark:to-amber-900/40 rounded-2xl shadow p-4 border border-yellow-200/30 dark:border-yellow-700/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">💸</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.debts || 'Debts'}</span>
              </div>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t.customerDebts || 'Customer Debts'}: </span>
                  <span className="font-bold text-red-600 dark:text-red-400">{outstandingCustomerDebtsCount} ({formatCurrency(totalCustomerDebtAmount, 'USD')})</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t.companyDebts || 'Company Debts'}: </span>
                  <div className="font-bold text-red-600 dark:text-red-400">
                    {outstandingCompanyDebtsCount} debts
                    {(totalCompanyDebtAmountUSD > 0 || totalCompanyDebtAmountIQD > 0) && (
                      <div className="text-xs">
                        {totalCompanyDebtAmountUSD > 0 && `USD: ${formatCurrency(totalCompanyDebtAmountUSD, 'USD')}`}
                        {totalCompanyDebtAmountUSD > 0 && totalCompanyDebtAmountIQD > 0 && ' • '}
                        {totalCompanyDebtAmountIQD > 0 && `IQD: ${formatCurrency(totalCompanyDebtAmountIQD, 'IQD')}`}
                      </div>
                    )}
                  </div>
                </div>
                {(paidCustomerDebtsToday > 0 || paidCompanyDebtsToday > 0) && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{t.paidToday || 'Paid today'}: </span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {paidCustomerDebtsToday + paidCompanyDebtsToday}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation buttons - move down, let whole sidebar scroll */}
        <nav className="flex flex-col gap-4 mt-16" aria-label="Section navigation">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => {
                if (item.key === 'settings') {
                  playActionSound();
                } else {
                  playNavigationSound();
                }
                handleNavClick(item);
              }}
              disabled={item.disabled}
              className={`flex items-center gap-3 px-4 py-4 rounded-xl font-semibold text-lg transition shadow-md
                ${item.isLogout
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : section === item.key && item.key !== 'settings' && item.key !== 'backup' && !item.action
                    ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-xl scale-105'
                    : 'bg-white/60 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 hover:bg-purple-100 dark:hover:bg-purple-900'}
                ${item.disabled ? 'opacity-60 cursor-not-allowed' : ''}
              `}
              aria-current={section === item.key ? 'page' : undefined}
              title={item.disabled ? (t.noBackupMethodConfigured || 'No backup method configured') : ''}
              aria-label={item.label}
            >
              <span className="text-2xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default AdminStatsSidebar;
