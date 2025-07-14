import React from 'react';
import SalesHistoryTable from './SalesHistoryTable';
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

  // Filter out unpaid debt sales from the sales history
  const filteredSales = admin.sales.filter(sale => {
    // If this is a debt sale, check if the debt is paid
    if (sale.is_debt) {
      const debt = debts.find(d => d.sale_id === sale.id);
      // Only include if debt exists and is paid
      return debt ? Boolean(debt.paid_at) : false;
    }
    // Include all non-debt sales
    return true;
  });

  return (
    <SalesHistoryTable
      sales={filteredSales}
      t={t}
      onView={saleId => {
        const sale = admin.sales.find(s => s.id === saleId);
        if (sale) admin.setViewSale(sale);
      }}
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
                admin.setToast?.('Failed to return sale: ' + (result?.message || 'Unknown error'));
              }
            } catch (error) {
              admin.setToast?.('Error returning sale: ' + error.message);
            } finally {
              setLoading(false);
            }
          }
        );
      }}
    />
  );
}
