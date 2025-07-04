import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';

const AdminDashboard = ({ 
  t, 
  openAddPurchaseModal, 
  topSellingProducts, 
  recentSales, 
  criticalStockProducts, 
  lowStockProducts, 
  setSection,
  admin // Added admin prop to get more data
}) => {
  const { reloadApp, loading } = useData();
  const [reloading, setReloading] = useState(false);

  const handleReload = async () => {
    setReloading(true);
    try {
      const success = await reloadApp();
      if (!success) {
        console.error('❌ Failed to reload application');
      }
    } catch (error) {
      console.error('❌ Error during reload:', error);
    } finally {
      setReloading(false);
    }
  };
  // Data is automatically fetched by DataContext, no manual fetching needed
  
  // Calculate additional metrics
  const metrics = useMemo(() => {
    // Today's metrics
    const today = new Date().toDateString();
    const todaysSales = (admin?.sales || []).filter(sale => 
      new Date(sale.created_at).toDateString() === today
    );
    
    const todaysRevenue = todaysSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const todaysTransactions = todaysSales.length;
    
    // This week's metrics
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeeksSales = (admin?.sales || []).filter(sale => 
      new Date(sale.created_at) >= oneWeekAgo
    );
    const thisWeeksRevenue = thisWeeksSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    
    // Outstanding debts - fixed to check both paid_at and paid fields
    const unpaidDebts = (admin?.debts || []).filter(debt => !debt.paid_at && !debt.paid);
    const totalUnpaidAmount = unpaidDebts.reduce((sum, debt) => {
      // Use debt.total if available, otherwise find sale and use sale.total
      const debtAmount = debt.total || debt.amount;
      if (debtAmount) {
        return sum + debtAmount;
      }
      const sale = (admin?.sales || []).find(s => s.id === debt.sale_id);
      return sum + (sale ? sale.total : 0);
    }, 0);
    
    // Product/Accessory counts
    const activeProducts = (admin?.products || []).filter(p => !p.archived).length;
    const activeAccessories = (admin?.accessories || []).filter(a => !a.archived).length;
    const lowStockCount = criticalStockProducts.length + lowStockProducts.length;
    
    return {
      todaysRevenue,
      todaysTransactions,
      thisWeeksRevenue,
      totalUnpaidAmount,
      unpaidDebtsCount: unpaidDebts.length,
      activeProducts,
      activeAccessories,
      lowStockCount
    };
  }, [admin, criticalStockProducts, lowStockProducts]);

  const formatCurrency = (amount) => `$${amount.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              📊 {t.businessOverview}
            </h1>
            <p className="text-blue-100 text-lg">
              {t.dashboardWelcome}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                
                openAddPurchaseModal();
              }}
              className="px-6 py-3 bg-white/20 backdrop-blur text-white rounded-xl hover:bg-white/30 transition font-semibold shadow-lg border border-white/20 flex items-center gap-2"
            >
              ➕ {t.addPurchase}
            </button>
            <button
              onClick={() => setSection('companyDebts')}
              className="px-6 py-3 bg-white/20 backdrop-blur text-white rounded-xl hover:bg-white/30 transition font-semibold shadow-lg border border-white/20 flex items-center gap-2"
            >
              🏢 {t.companyDebts}
            </button>
            <button
              onClick={handleReload}
              disabled={reloading || loading}
              className="px-6 py-3 bg-white/20 backdrop-blur text-white rounded-xl hover:bg-white/30 transition font-semibold shadow-lg border border-white/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/20"
              title={t.reloadApp}
            >
              {reloading || loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t.reloading}
                </>
              ) : (
                <>
                  🔄 {t.reload}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
        <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">💰</span>
            <span className="text-green-100 text-sm">{t.today}</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(metrics.todaysRevenue)}</div>
          <div className="text-green-100 text-sm">{metrics.todaysTransactions} {t.transactions}</div>
        </div>

        {/* This Week's Revenue */}
        <div className="bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">📈</span>
            <span className="text-blue-100 text-sm">{t.thisWeek}</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(metrics.thisWeeksRevenue)}</div>
          <div className="text-blue-100 text-sm">{t.weeklyRevenue}</div>
        </div>

        {/* Outstanding Debts */}
        <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">⚠️</span>
            <span className="text-orange-100 text-sm">{t.outstanding}</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalUnpaidAmount)}</div>
          <div className="text-orange-100 text-sm">{metrics.unpaidDebtsCount} {t.unpaidDebts}</div>
        </div>

        {/* Inventory Status */}
        <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">📦</span>
            <span className="text-purple-100 text-sm">{t.inventory}</span>
          </div>
          <div className="text-2xl font-bold">{metrics.activeProducts + metrics.activeAccessories}</div>
          <div className="text-purple-100 text-sm">
            {metrics.lowStockCount > 0 ? `${metrics.lowStockCount} ${t.lowStockText}` : t.allStocksHealthy}
          </div>
        </div>
      </div>
      
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-h-[420px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-400/40 scrollbar-track-transparent">
        {/* Top Selling Products */}
        <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 shadow-xl border border-white/20 backdrop-blur">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🏆</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{t.topProducts}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t.bestSellers}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {topSellingProducts.length > 0 ? topSellingProducts.slice(0, 5).map(([name, data], idx) => (
              <div key={name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-blue-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[150px]">{name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(data.revenue || 0)} {t.revenue}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">{data.quantity}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t.sold}</div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <span className="text-4xl">📊</span>
                <p className="text-gray-500 dark:text-gray-400 mt-2">{t.noSalesDataYet}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t.sellItemsToSeeStats}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 shadow-xl border border-white/20 backdrop-blur">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{t.recentSales}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t.latestTransactions}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {recentSales.length > 0 ? recentSales.slice(0, 5).map((sale, idx) => (
              <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    sale.is_debt ? 'bg-orange-500' : 'bg-green-500'
                  } text-white`}>
                    {sale.is_debt ? '💳' : '💰'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {formatCurrency(sale.total)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(sale.created_at).toLocaleDateString()} • {sale.items?.length || 0} {t.items}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sale.is_debt && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-full text-xs font-medium">
                      {t.debt}
                    </span>
                  )}
                  <button
                    onClick={() => admin.setViewSale(sale)}
                    className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                  >
                    {t.view}
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <span className="text-4xl">🛒</span>
                <p className="text-gray-500 dark:text-gray-400 mt-2">{t.noRecentSales}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t.salesWillAppearHere}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stock Alerts */}
        <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 shadow-xl border border-white/20 backdrop-blur">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-red-400 to-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{t.stockAlerts}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t.lowStockItems}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {criticalStockProducts.length > 0 || lowStockProducts.length > 0 ? (
              [...criticalStockProducts.slice(0, 3), ...lowStockProducts.slice(0, 5 - criticalStockProducts.length)].map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                      product.stock <= 2 ? 'bg-red-500' : 'bg-orange-500'
                    }`}>
                      {product.stock <= 2 ? '🚨' : '⚡'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[120px]">{product.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(product.price)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${product.stock <= 2 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {product.stock}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t.itemsLeft}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl">✅</span>
                <p className="text-green-600 dark:text-green-400 mt-2">{t.allStocksHealthy}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t.noLowStockItems}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-700/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <span className="text-2xl text-white">⚡</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{t.quickActions}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t.commonTasks}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { key: 'active', icon: '📦', label: t.products, description: `${metrics.activeProducts} ${t.active}` },
            { key: 'accessories', icon: '🎧', label: t.accessories, description: `${metrics.activeAccessories} ${t.active}` },
            { key: 'history', icon: '📈', label: t.salesHistory, description: `${admin?.sales?.length || 0} ${t.totalCount}` },
            { key: 'customerDebts', icon: '💸', label: t.customerDebts, description: `${metrics.unpaidDebtsCount} ${t.unpaid}` },
            { key: 'companyDebts', icon: '🏢', label: t.companyDebts, description: `${(admin?.companyDebts || []).filter(d => !d.paid_at).length} ${t.unpaid}` },
            { key: 'archived', icon: '🗃️', label: t.archived, description: `${((admin?.products || []).filter(p => p.archived).length + (admin?.accessories || []).filter(a => a.archived).length)} ${t.items}` }
          ].map((action) => (
            <button
              key={action.key}
              onClick={() => setSection(action.key)}
              className="flex flex-col items-center gap-2 p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-white/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all shadow-sm hover:shadow-md group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{action.icon}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white text-center">{action.label}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center">{action.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
