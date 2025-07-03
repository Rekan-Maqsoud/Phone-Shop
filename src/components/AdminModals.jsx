import React, { useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import SettingsModal from './SettingsModal';
import ProductModal from './ProductModal';
import AccessoryModal from './AccessoryModal';
import SaleDetailsModal from './SaleDetailsModal';
import BackupManager from './BackupManager';
import AddCompanyDebtModal from './AddCompanyDebtModal';
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
  showAddCompanyDebt,
  setShowAddCompanyDebt,
  showAddPurchase,
  setShowAddPurchase,
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
  const { refreshSales, refreshProducts, refreshAccessories, refreshCompanyDebts, refreshBuyingHistory } = useData();
  

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

      {/* Accessory Modal */}
      <AccessoryModal
        show={admin.showAccessoryModal}
        accessory={admin.editAccessory}
        onSave={admin.handleAddAccessory}
        onUpdate={admin.handleEditAccessory}
        onClose={() => {
          admin.setShowAccessoryModal(false);
          admin.setEditAccessory(null);
        }}
        t={t}
      />

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
                  
                  // Use DataContext refresh functions instead of admin.fetch functions
                  await Promise.all([
                    refreshSales(),
                    refreshProducts(),
                    refreshAccessories()
                  ]);
                  
                  // Close the sale view after successful return
                  admin.setViewSale(null);
                  
                  triggerCloudBackup(); // Trigger cloud backup
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

      <AddCompanyDebtModal
        show={showAddCompanyDebt}
        onClose={() => setShowAddCompanyDebt(false)}
        t={t}
        onSubmit={async (data) => {
          setLoading(true);
          try {
            let result;
            
            if (data.type === 'withItems') {
              result = await admin.handleAddCompanyDebtWithItems?.(data);
            } else {
              result = await window.api?.addCompanyDebt?.(data);
              
              // Normalize the result - if we have lastInsertRowid, it was successful
              if (result && (result.lastInsertRowid || result.success)) {
                result = { success: true };
              } else if (!result) {
                throw new Error('No response from API');
              } else if (result.error) {
                throw new Error(result.error);
              }
            }
            
  
            
            if (result?.success) {
              admin.setToast?.('Company debt added successfully');
              setShowAddCompanyDebt(false);
              await refreshCompanyDebts(); // Refresh data context
              triggerCloudBackup(); // Trigger cloud backup
            } else {
              const errorMsg = result?.message || result?.error || 'Unknown error - no success flag returned';
              console.error('[AdminModals] Failed to add company debt:', errorMsg);
              admin.setToast?.('Failed to add company debt: ' + errorMsg);
            }
          } catch (error) {
            console.error('[AdminModals] Error adding company debt:', error);
            admin.setToast?.('Error adding company debt: ' + error.message);
          } finally {
            setLoading(false);
          }
        }}
      />

      {/* Add Purchase Modal */}
      {showAddPurchase && (
        <AddPurchaseModal
          show={showAddPurchase}
          onClose={() => setShowAddPurchase(false)}
          onSubmit={async (purchaseData) => {
     
            setLoading(true);
            try {
              let result = null;
              
              if (purchaseData.payment_status === 'paid') {
                // Direct purchase - goes to buying history immediately
                if (purchaseData.type === 'simple') {
                  if (window.api?.addDirectPurchase) {
                    result = await window.api.addDirectPurchase({
                      company_name: purchaseData.company_name,
                      amount: purchaseData.amount,
                      description: purchaseData.description
                    });
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
                      company_name: purchaseData.company_name,
                      description: purchaseData.description,
                      items: purchaseData.items
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
                      description: purchaseData.description
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
                      items: purchaseData.items
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
              if (admin.fetchProducts) {
                await admin.fetchProducts();
              }
              if (admin.fetchAccessories) {
                await admin.fetchAccessories();
              }
              
              setShowAddPurchase(false);
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
          onMarkPaid={async (debtId) => {
            try {
              setLoading(true);
              await window.api?.markCompanyDebtPaid?.(debtId);
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
