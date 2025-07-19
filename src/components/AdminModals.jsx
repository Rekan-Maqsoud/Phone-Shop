import React from 'react';
import { useData } from '../contexts/DataContext';
import SettingsModal from './SettingsModal';
import ProductModal from './ProductModal';
import SaleDetailsModal from './SaleDetailsModal';
import BackupManager from './BackupManager';
import AddPurchaseModal from './AddPurchaseModal';
import ConfirmModal from './ConfirmModal';
import EnhancedCompanyDebtModal from './EnhancedCompanyDebtModal';
import ToastUnified from './ToastUnified';

export default function AdminModals({
  // Settings Modal
  showSettingsModal,
  setShowSettingsModal,
  theme,
  setTheme,
  lang,
  setLang,
  admin,
  t,
  
  // Product Modal
  loading,
  
  // Sale Details Modal
  showConfirm,
  setConfirm,
  setLoading,
  
  // Backup Modal
  showBackupManager,
  setShowBackupManager,
  
  // Company Debt Modals
  showAddPurchase,
  setShowAddPurchase,
  isCompanyDebtMode,
  setToast,
  
  // Enhanced Company Debt Modal
  showEnhancedCompanyDebtModal,
  setShowEnhancedCompanyDebtModal,
  selectedCompanyDebt,
  setSelectedCompanyDebt,
  
  // Confirm Modal
  confirm,
  
  // Cloud Backup
  triggerCloudBackup
}) {
  const { refreshSales, refreshProducts, refreshAccessories, refreshCompanyDebts, refreshBuyingHistory, refreshDebts, refreshDebtSales } = useData();
  

  return (
    <>
      {/* Settings Modal */}
      <SettingsModal
        show={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        theme={theme}
        setTheme={setTheme}
        lang={lang}
        setLang={setLang}
        notificationsEnabled={admin.notificationsEnabled}
        setNotificationsEnabled={admin.setNotificationsEnabled}
        lowStockThreshold={admin.lowStockThreshold}
        setLowStockThreshold={admin.setLowStockThreshold}
        handleExportSales={admin.handleExportSales}
        handleExportInventory={admin.handleExportInventory}
        handleTestPrint={admin.handleTestPrint}
        handleResetAllData={admin.handleResetAllData}
        t={t}
      />

      {/* Product Modal */}
      {typeof ProductModal !== 'undefined' ? (
        <ProductModal
          key={admin.editProduct?.id || 'new'} // Force re-render when product changes
          show={admin.showProductModal}
          initialProduct={admin.editProduct}
          onSubmit={admin.editProduct ? admin.handleEditProduct : admin.handleAddProduct}
          onClose={() => {
            admin.setShowProductModal(false);
            admin.setEditProduct(null);
          }}
          t={t}
          loading={loading}
        />
      ) : (
        <div className="text-red-600 font-bold p-4">ProductModal component not found or failed to import.</div>
      )}

      {/* Sale Details Modal */}
      <SaleDetailsModal
        sale={admin.viewSale}
        onClose={() => admin.setViewSale(null)}
        onReturnItem={async (saleId, itemId, quantity) => {
          const quantityText = quantity && quantity < 999 ? ` (${quantity} items)` : '';
          showConfirm(
            (t.confirmReturnItem || 'Are you sure you want to return this item? This will restore stock and remove the item from the sale.') + quantityText,
            async () => {
              setConfirm({ open: false, message: '', onConfirm: null });
              setLoading(true);
              try {
                const result = await window.api?.returnSaleItem?.(saleId, itemId, quantity);
                if (result?.success) {
                  admin.setToast?.(`Item returned successfully${quantityText}. Stock has been restored.`);
                  
                  // Use DataContext refresh functions to update data
                  await Promise.all([
                    refreshSales(),
                    refreshProducts(),
                    refreshAccessories(),
                    refreshDebts(),
                    refreshDebtSales()
                  ]);
                  
                  // Refresh the current sale view to show updated information
                  try {
                    const updatedSale = await window.api?.getSaleDetails?.(saleId);
                    if (updatedSale && updatedSale.success && updatedSale.sale) {
                      admin.setViewSale(updatedSale.sale);
                    } else {
                      // Sale was completely deleted or has no items left, close modal
                      admin.setViewSale(null);
                    }
                  } catch (error) {
                    console.warn('Could not refresh sale view:', error);
                    // Close modal on error to avoid showing blank data
                    admin.setViewSale(null);
                  }
                  
                  triggerCloudBackup();
                } else {
                  admin.setToast?.('Failed to return item: ' + (result?.message || 'Unknown error'));
                }
              } catch (error) {
                admin.setToast?.('Error returning item: ' + error.message);
              } finally {
                setLoading(false);
              }
            }
          );
        }}
        t={t}
      />

      {/* Backup Manager */}
      <BackupManager
        show={showBackupManager}
        onClose={() => setShowBackupManager(false)}
        t={t}
      />

      {/* Toast */}
      <ToastUnified
        message={admin.toast?.msg || ""}
        type={admin.toast?.type || "info"}
        duration={admin.toast?.duration || 3000}
        onClose={() => admin.setToast(null)}
      />

      {/* Add Purchase Modal */}
      {showAddPurchase && (
        <AddPurchaseModal
          show={showAddPurchase}
          onClose={() => setShowAddPurchase()}
          isCompanyDebtMode={isCompanyDebtMode}
          onSubmit={async (purchaseData) => {
     
            setLoading(true);
            try {
              let result = null;
              
              if (purchaseData.payment_status === 'paid') {
                // Direct purchase - goes to buying history immediately
                if (purchaseData.type === 'simple') {
                  if (window.api?.addDirectPurchase) {
                    // Handle multi-currency purchases
                    if (purchaseData.multi_currency && purchaseData.multi_currency.enabled) {
                      // For multi-currency, create separate entries for each currency
                      if (purchaseData.multi_currency.usdAmount > 0) {
                        await window.api.addDirectPurchase({
                          item_name: purchaseData.description || 'Purchase',
                          quantity: 1,
                          unit_price: purchaseData.multi_currency.usdAmount,
                          supplier: purchaseData.company_name,
                          date: new Date().toISOString(),
                          currency: 'USD'
                        });
                      }
                      if (purchaseData.multi_currency.iqdAmount > 0) {
                        await window.api.addDirectPurchase({
                          item_name: purchaseData.description || 'Purchase',
                          quantity: 1,
                          unit_price: purchaseData.multi_currency.iqdAmount,
                          supplier: purchaseData.company_name,
                          date: new Date().toISOString(),
                          currency: 'IQD'
                        });
                      }
                      result = { success: true };
                    } else {
                      // Single currency purchase
                      result = await window.api.addDirectPurchase({
                        item_name: purchaseData.description || 'Purchase',
                        quantity: 1,
                        unit_price: purchaseData.amount || 0,
                        supplier: purchaseData.company_name,
                        date: new Date().toISOString(),
                        currency: purchaseData.currency || 'USD'
                      });
                    }
                    if (!result || result.error) {
                      throw new Error(result?.error || 'Failed to add direct purchase');
                    }
                  } else {
                    console.error('[AdminModals] window.api.addDirectPurchase not available');
                    throw new Error('Direct purchase API not available');
                  }
                } else if (purchaseData.type === 'withItems') {
                  if (window.api?.addDirectPurchaseWithItems) {
                    result = await window.api.addDirectPurchaseWithItems({
                      supplier: purchaseData.company_name,
                      date: new Date().toISOString(),
                      items: purchaseData.items || [],
                      currency: purchaseData.currency || 'USD'
                    });
                    if (!result || result.error) {
                      throw new Error(result?.error || 'Failed to add direct purchase with items');
                    }
                  } else {
                    console.error('[AdminModals] window.api.addDirectPurchaseWithItems not available');
                    throw new Error('Direct purchase with items API not available');
                  }
                }
              } else {
                // Credit purchase - creates company debt
                if (purchaseData.type === 'simple') {
                  if (window.api?.addCompanyDebt) {
                    result = await window.api.addCompanyDebt({
                      company_name: purchaseData.company_name,
                      amount: purchaseData.amount,
                      description: purchaseData.description,
                      currency: purchaseData.currency,
                      multi_currency: purchaseData.multi_currency
                    });
                    if (!result || (!result.lastInsertRowid && !result.success)) {
                      throw new Error(result?.message || 'Failed to add company debt');
                    }
                    result = { success: true }; // Normalize result
                  } else {
                    console.error('[AdminModals] window.api.addCompanyDebt not available');
                    throw new Error('Company debt API not available');
                  }
                } else if (purchaseData.type === 'withItems') {
                  if (window.api?.addCompanyDebtWithItems) {
                    result = await window.api.addCompanyDebtWithItems({
                      company_name: purchaseData.company_name,
                      description: purchaseData.description,
                      items: purchaseData.items,
                      currency: purchaseData.currency,
                      multi_currency: purchaseData.multi_currency
                    });
                    if (!result || (!result.lastInsertRowid && !result.success)) {
                      throw new Error(result?.message || 'Failed to add company debt with items');
                    }
                    result = { success: true }; // Normalize result
                  } else {
                    console.error('[AdminModals] window.api.addCompanyDebtWithItems not available');
                    throw new Error('Company debt with items API not available');
                  }
                }
              }
              
              // Refresh data from DataContext
              await refreshCompanyDebts();
              await refreshBuyingHistory();
              await refreshProducts();
              await refreshAccessories();
              
              setShowAddPurchase(); // This calls the close function
              setToast(t.purchaseAddedSuccessfully || 'Purchase added successfully!');
              
            } catch (error) {
              console.error('[AdminModals] Error adding purchase:', error);
              setToast((t.errorAddingPurchase || 'Error adding purchase') + ': ' + error.message);
            } finally {
              setLoading(false);
            }
          }}
          t={t}
        />
      )}

      {/* Confirm Modal */}
      <ConfirmModal 
        open={confirm.open} 
        message={confirm.message} 
        onConfirm={confirm.onConfirm} 
        onCancel={() => setConfirm({ open: false, message: '', onConfirm: null })} 
        t={t}
      />

      {/* Enhanced Company Debt Modal */}
      {showEnhancedCompanyDebtModal && selectedCompanyDebt && (
        <EnhancedCompanyDebtModal
          show={showEnhancedCompanyDebtModal}
          onClose={() => {
            setShowEnhancedCompanyDebtModal(false);
            setSelectedCompanyDebt(null);
          }}
          debt={selectedCompanyDebt}
          onMarkPaid={async (debtId, multiCurrency) => {
            try {
              setLoading(true);
              
              const paid_at = new Date().toISOString();
              let payment_currency_used = 'USD';
              let payment_usd_amount = 0;
              let payment_iqd_amount = 0;
              
              // Get the actual debt being paid
              const debt = selectedCompanyDebt;
              
              if (multiCurrency && multiCurrency.enabled) {
                payment_currency_used = multiCurrency.deductCurrency || 'USD';
                // If it's a multi-currency debt, use the actual debt amounts
                if (debt.currency === 'MULTI') {
                  payment_usd_amount = debt.usd_amount || 0;
                  payment_iqd_amount = debt.iqd_amount || 0;
                } else if (payment_currency_used === 'USD') {
                  payment_usd_amount = debt.amount || 0;
                  payment_iqd_amount = 0;
                } else {
                  payment_usd_amount = 0;
                  payment_iqd_amount = debt.amount || 0;
                }
              } else {
                // Single currency payment - use the debt amount in its original currency
                if (debt.currency === 'MULTI') {
                  // For multi-currency debts, default to USD portion
                  payment_usd_amount = debt.usd_amount || 0;
                  payment_iqd_amount = debt.iqd_amount || 0;
                } else if (debt.currency === 'USD') {
                  payment_currency_used = 'USD';
                  payment_usd_amount = debt.amount || 0;
                } else {
                  payment_currency_used = 'IQD';
                  payment_iqd_amount = debt.amount || 0;
                }
              }
              
              await window.api?.markCompanyDebtPaid?.(
                debtId, 
                {
                  paid_at,
                  payment_currency_used,
                  payment_usd_amount,
                  payment_iqd_amount
                }
              );
              
              await refreshCompanyDebts();
              await refreshBuyingHistory();
              setShowEnhancedCompanyDebtModal(false);
              setSelectedCompanyDebt(null);
              setToast(t.debtMarkedAsPaid || 'Debt marked as paid successfully');
              triggerCloudBackup();
            } catch (error) {
              console.error('Error marking debt as paid:', error);
              setToast(t.errorMarkingDebtPaid || 'Error marking debt as paid');
            } finally {
              setLoading(false);
            }
          }}
          t={t}
        />
      )}
    </>
  );
}
