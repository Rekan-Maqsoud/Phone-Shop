import React from 'react';
import SalesHistoryTable from './SalesHistoryTable';

export default function SalesHistorySection({ 
  t, 
  admin, 
  showConfirm, 
  setConfirm, 
  setLoading, 
  triggerCloudBackup 
}) {
  return (
    <SalesHistoryTable
      sales={admin.sales}
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
                if (admin.fetchSales) admin.fetchSales();
                if (admin.fetchProducts) admin.fetchProducts();
                if (admin.fetchAccessories) admin.fetchAccessories();
                if (admin.fetchDebts) admin.fetchDebts();
                if (admin.fetchDebtSales) admin.fetchDebtSales();
                triggerCloudBackup(); // Trigger cloud backup
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
