import React, { useState, useMemo } from 'react';
import SalesHistoryTableEnhanced from './SalesHistoryTableEnhanced';
import SearchableSelect from './SearchableSelect';
import { useData } from '../contexts/DataContext';

export default function SalesHistorySection({ 
  t, 
  admin, 
  showConfirm, 
  setConfirm, 
  setLoading, 
  triggerCloudBackup 
}) {
  const { refreshSales, refreshProducts, refreshAccessories, refreshDebts, debts } = useData();
  const [brandFilter, setBrandFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');

  // Get unique brands and items from sales data
  const { availableBrands, availableItems } = useMemo(() => {
    const brands = new Set();
    const items = new Set();
    
    admin.sales.forEach(sale => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach(item => {
          if (item.brand) brands.add(item.brand);
          if (item.name) items.add(item.name);
        });
      }
    });
    
    return {
      availableBrands: Array.from(brands).sort(),
      availableItems: Array.from(items).sort()
    };
  }, [admin.sales]);

  // Filter out unpaid debt sales and apply search filters
  const filteredSales = useMemo(() => {
    return admin.sales.filter(sale => {
      // If this is a debt sale, check if the debt is paid
      if (sale.is_debt) {
        const debt = debts.find(d => d.sale_id === sale.id);
        // Only include if debt exists and is paid
        if (!debt || !debt.paid_at) return false;
      }
      
      // Apply brand filter
      if (brandFilter) {
        const hasBrand = sale.items && sale.items.some(item => 
          item.brand && item.brand.toLowerCase().includes(brandFilter.toLowerCase())
        );
        if (!hasBrand) return false;
      }
      
      // Apply item filter
      if (itemFilter) {
        const hasItem = sale.items && sale.items.some(item => 
          item.name && item.name.toLowerCase().includes(itemFilter.toLowerCase())
        );
        if (!hasItem) return false;
      }
      
      return true;
    });
  }, [admin.sales, debts, brandFilter, itemFilter]);

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="bg-white/70 dark:bg-gray-800/90 rounded-xl p-4 shadow border border-white/30">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Brand Filter */}
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.filterByBrand || 'Filter by Brand'}
            </label>
            <SearchableSelect
              options={availableBrands}
              value={brandFilter}
              onChange={setBrandFilter}
              placeholder={t.selectBrand || 'Select or search brand...'}
              className="w-full"
            />
          </div>
          
          {/* Item Filter */}
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.filterByItem || 'Filter by Item'}
            </label>
            <SearchableSelect
              options={availableItems}
              value={itemFilter}
              onChange={setItemFilter}
              placeholder={t.selectItem || 'Select or search item...'}
              className="w-full"
            />
          </div>
          
          {/* Clear Filters */}
          {(brandFilter || itemFilter) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setBrandFilter('');
                  setItemFilter('');
                }}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                {t.clearFilters || 'Clear Filters'}
              </button>
            </div>
          )}
        </div>
        
        {/* Results Summary */}
        {(brandFilter || itemFilter) && (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            {t.showing || 'Showing'} {filteredSales.length} {t.of || 'of'} {admin.sales.length} {t.sales || 'sales'}
          </div>
        )}
      </div>

      <SalesHistoryTableEnhanced
      sales={filteredSales}
      t={t}
      onView={sale => admin.setViewSale(sale)}
      onReturn={async (saleId) => {
        showConfirm(
          t.confirmReturnSale || 'Are you sure you want to return this entire sale? This will restore stock and remove the sale from records.',
          async () => {
            setConfirm({ open: false, message: '', onConfirm: null });
            setLoading(true);
            try {
              const result = await window.api?.returnSale?.(saleId);
              if (result?.success) {
                admin.setToast?.('Sale returned successfully. Stock has been restored.');
                // Refresh all relevant data in parallel for faster update
                await Promise.all([
                  refreshSales(),
                  refreshProducts(),
                  refreshAccessories(),
                  refreshDebts()
                ]);
                
                // Force a small delay to ensure state updates are applied
                await new Promise(resolve => setTimeout(resolve, 100));
                
                triggerCloudBackup();
              } else {
                console.error('[DEBUG] Sale return failed:', result);
                admin.setToast?.('Failed to return sale: ' + (result?.message || 'Unknown error'));
              }
            } catch (error) {
              console.error('[DEBUG] Sale return error:', error);
              admin.setToast?.('Error returning sale: ' + error.message);
            } finally {
              setLoading(false);
            }
          }
        );
      }}
    />
    </div>
  );
}
