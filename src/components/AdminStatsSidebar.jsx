import React, { useMemo, useEffect, useState } from 'react';
import OfflineIndicator from './OfflineIndicator';
import { useData } from '../contexts/DataContext';
import { playNavigationSound, playActionSound } from '../utils/sounds';

const AdminStatsSidebar = ({ 
  admin, 
  t, 
  navItems, 
  section, 
  handleNavClick 
}) => {
  const { products, sales, companyDebts } = useData();
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
    
    // Today's sales
    const todaysSales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate.toDateString() === currentDate.toDateString();
    });
    
    const todaysRevenue = todaysSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const todaysProfit = todaysSales.reduce((sum, sale) => {
      if (!sale.items) return sum;
      return sum + sale.items.reduce((itemSum, item) => {
        return itemSum + (item.profit || 0);
      }, 0);
    }, 0);

    // Today's spending (paid company debts)
    const todaysSpending = (companyDebts || []).filter(debt => {
      if (!debt.paid_at) return false;
      const paidDate = new Date(debt.paid_at);
      return paidDate.toDateString() === currentDate.toDateString();
    }).reduce((sum, debt) => sum + debt.amount, 0);

    // Net performance for today (revenue - spending)
    const todaysNetPerformance = todaysRevenue - todaysSpending;

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
    const recentSales = [...admin.sales]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    // Calculate total profit (fixed calculation)
    const totalProfit = admin.sales.reduce((sum, sale) => {
      if (!sale.items) return sum;
      // For debt sales, check if the debt is paid by looking up in debts array
      if (sale.is_debt) {
        const debt = admin.debts?.find(d => d.sale_id === sale.id);
        if (!debt || (!debt.paid_at && !debt.paid)) return sum; // Skip unpaid debts - check both fields
      }
      return sum + sale.items.reduce((itemSum, item) => {
        return itemSum + (item.profit || 0);
      }, 0);
    }, 0);

    return {
      todaysSales,
      todaysRevenue,
      todaysProfit,
      todaysSpending,
      todaysNetPerformance,
      criticalStockProducts,
      lowStockProducts,
      topSellingProducts,
      recentSales,
      totalProfit
    };
  }, [sales, products, companyDebts, admin.debts, admin.lowStockThreshold, refreshKey]);

  // Debt calculations - fixed to handle both paid_at and paid fields
  const totalDebtAmount = useMemo(() => {
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

  const outstandingDebtsCount = useMemo(() => {
    return (admin.debts || []).filter(debt => !debt.paid_at && !debt.paid).length;
  }, [admin.debts]);

  const paidDebtsToday = useMemo(() => {
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
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t.sales || 'Sales'}: </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{stats.todaysSales.length}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t.revenue || 'Revenue'}: </span>
                <span className="font-bold text-green-600 dark:text-green-400">${Number(stats.todaysRevenue).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t.spending || 'Spending'}: </span>
                <span className="font-bold text-red-600 dark:text-red-400">${stats.todaysSpending.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t.profit || 'Profit'}: </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">${stats.todaysProfit.toFixed(2)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600 dark:text-gray-400">{t.netPerformance || 'Net Performance'}: </span>
                <span className={`font-bold ${stats.todaysNetPerformance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  ${stats.todaysNetPerformance.toFixed(2)}
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
            <span className="text-xl font-bold text-blue-500 dark:text-blue-300">${Number(admin.monthlySales).toFixed(2)}</span>
          </div>

          {/* Total Profit */}
          <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-4 flex flex-col border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">💰</span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.totalProfit || 'Total Profit'}</span>
            </div>
            <span className="text-xl font-bold text-green-500 dark:text-green-300">${Number(stats.totalProfit).toFixed(2)}</span>
          </div>

          {/* Inventory Value */}
          <div className="bg-white/60 dark:bg-gray-800/80 rounded-2xl shadow p-4 flex flex-col border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">📦</span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.inventoryValue}</span>
            </div>
            <span className="text-xl font-bold text-purple-500 dark:text-purple-300">${Number(admin.inventoryValue).toFixed(2)}</span>
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
                  <span className="text-gray-600 dark:text-gray-400">{t.outstanding || 'Outstanding'}: </span>
                  <span className="font-bold text-red-600 dark:text-red-400">{outstandingDebtsCount} debts (${Number(totalDebtAmount).toFixed(2)})</span>
                </div>
                {paidDebtsToday > 0 && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{t.paidToday || 'Paid today'}: </span>
                    <span className="font-bold text-green-600 dark:text-green-400">{paidDebtsToday}</span>
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
