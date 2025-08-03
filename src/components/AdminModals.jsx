import React from 'react';
import { useData } from '../contexts/DataContext';
import { EXCHANGE_RATES } from '../utils/exchangeRates';
import SettingsModal from './SettingsModal';
import ProductModal from './ProductModal';
import AccessoryModal from './AccessoryModal';
import SaleDetailsModal from './SaleDetailsModal';
import BackupManager from './BackupManager';
import AddPurchaseModal from './AddPurchaseModal';
import ConfirmModal from './ConfirmModal';
import EnhancedCompanyDebtModal from './EnhancedCompanyDebtModal';
import UniversalPaymentModal from './UniversalPaymentModal';
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
  const { refreshSales, refreshProducts, refreshAccessories, refreshCompanyDebts, refreshBuyingHistory, refreshDebts, refreshDebtSales, refreshTransactions, refreshAllData } = useData();
  

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
        handleRefreshBalances={admin.refreshBalances}
        t={t}
      />

      {/* Product Modal */}
      {typeof ProductModal !== 'undefined' ? (
        <ProductModal
          key={`product-${admin.editProduct?.id || 'new'}`} // Force re-render when product changes
          show={admin.showProductModal}
          initialProduct={admin.editProduct}
          onSubmit={admin.editProduct ? admin.handleEditProduct : admin.handleAddProduct}
          onClose={() => {
            admin.setShowProductModal(false);
            admin.setEditProduct(null);
          }}
          t={t}
          loading={loading}
          onToast={admin.setToast}
        />
      ) : (
        <div className="text-red-600 font-bold p-4">ProductModal component not found or failed to import.</div>
      )}

      {/* Accessory Modal */}
      {typeof AccessoryModal !== 'undefined' ? (
        <AccessoryModal
          key={`accessory-${admin.editAccessory?.id || 'new'}`} // Force re-render when accessory changes
          show={admin.showAccessoryModal}
          initialAccessory={admin.editAccessory}
          onSubmit={admin.editAccessory ? admin.handleEditAccessory : admin.handleAddAccessory}
          onClose={() => {
            admin.setShowAccessoryModal(false);
            admin.setEditAccessory(null);
          }}
          t={t}
          loading={loading}
          onToast={admin.setToast}
        />
      ) : (
        <div className="text-red-600 font-bold p-4">AccessoryModal component not found or failed to import.</div>
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
                const result = await window.api?.returnSaleItem?.(saleId, itemId, quantity, {
                  // Use default currency behavior for now, can be enhanced later
                  returnAmounts: null
                });
                if (result?.success) {
                  admin.setToast?.(`Item returned successfully${quantityText}. Stock has been restored.`);
                  
                  // Use DataContext refresh functions to update data
                  await Promise.all([
                    refreshSales(),
                    refreshProducts(),
                    refreshAccessories(),
                    refreshDebts(),
                    refreshDebtSales(),
                    refreshTransactions(),
                    refreshBuyingHistory()
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
                  admin.setToast?.((t?.failedToReturnItem || 'Failed to return item') + ': ' + (result?.message || t?.unknownError || 'Unknown error'));
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
        showConfirm={admin.showConfirm}
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
          admin={admin}
          onSubmit={async (purchaseData) => {
     
            setLoading(true);
            try {
              let result = null;
              let detectedMixedCurrency = false;
              
              if (purchaseData.payment_status === 'paid') {
                // Direct purchase - goes to buying history immediately
                if (purchaseData.type === 'simple') {
                  if (purchaseData.multi_currency && purchaseData.multi_currency.enabled) {
                    // Handle multi-currency purchases as a single entry
                    if (window.api?.addDirectPurchaseMultiCurrency) {
                      result = await window.api.addDirectPurchaseMultiCurrency({
                        item_name: purchaseData.description || 'Purchase',
                        quantity: 1,
                        supplier: purchaseData.company_name,
                        date: new Date().toISOString(),
                        usdAmount: purchaseData.multi_currency.usdAmount,
                        iqdAmount: purchaseData.multi_currency.iqdAmount
                      });
                      if (!result || result.error) {
                        throw new Error(result?.error || 'Failed to add multi-currency direct purchase');
                      }
                    } else {
                      console.error('[AdminModals] window.api.addDirectPurchaseMultiCurrency not available');
                      throw new Error('Multi-currency direct purchase API not available');
                    }
                  } else if (window.api?.addDirectPurchase) {
                    // Single currency purchase
                    result = await window.api.addDirectPurchase({
                      item_name: purchaseData.description || 'Purchase',
                      quantity: 1,
                      unit_price: purchaseData.amount || 0,
                      supplier: purchaseData.company_name,
                      date: new Date().toISOString(),
                      currency: purchaseData.currency || 'USD'
                    });
                    if (!result || result.error) {
                      throw new Error(result?.error || 'Failed to add direct purchase');
                    }
                  } else {
                    console.error('[AdminModals] window.api.addDirectPurchase not available');
                    throw new Error('Direct purchase API not available');
                  }
                } else if (purchaseData.type === 'withItems') {
                  // Detect if items have mixed currencies automatically
                  const currencies = [...new Set(purchaseData.items.map(item => item.currency || 'IQD'))];
                  const hasMixedCurrencies = currencies.length > 1;
                  
                  // Check if payment currency differs from item currencies (important for currency display fix)
                  const paymentCurrency = purchaseData.currency || 'IQD';
                  const hasPaymentCurrencyMismatch = currencies.some(itemCurrency => itemCurrency !== paymentCurrency);
                  
                  // Check for mixed currency detection
                  if (hasMixedCurrencies || hasPaymentCurrencyMismatch) {
                    detectedMixedCurrency = true;
                  }
                  
                  // Calculate totals by currency for mixed-currency scenarios
                  const usdTotal = purchaseData.items
                    .filter(item => (item.currency || 'IQD') === 'USD')
                    .reduce((sum, item) => sum + (parseInt(item.quantity) * parseFloat(item.unit_price)), 0);
                  
                  const iqdTotal = purchaseData.items
                    .filter(item => (item.currency || 'IQD') === 'IQD')
                    .reduce((sum, item) => sum + (parseInt(item.quantity) * parseFloat(item.unit_price)), 0);
                  
                  // Check if we should use multi-currency handling
                  // Use multi-currency ONLY if: explicit multi-currency enabled OR user has mixed currencies AND didn't choose a single payment currency
                  const shouldUseMultiCurrency = (purchaseData.multi_currency && purchaseData.multi_currency.enabled) || 
                                                 (hasMixedCurrencies && !paymentCurrency);
                  
                  if (shouldUseMultiCurrency) {
                    // For multi-currency purchases with items, use the dedicated function
                    if (window.api?.addDirectPurchaseMultiCurrencyWithItems) {
                      let finalUsdAmount, finalIqdAmount;
                      
                      if (purchaseData.multi_currency && purchaseData.multi_currency.enabled) {
                        // Explicit multi-currency payment
                        finalUsdAmount = purchaseData.multi_currency.usdAmount || 0;
                        finalIqdAmount = purchaseData.multi_currency.iqdAmount || 0;
                      } else {
                        // Mixed currencies - use item currency totals
                        finalUsdAmount = usdTotal;
                        finalIqdAmount = iqdTotal;
                      }
                      
                      result = await window.api.addDirectPurchaseMultiCurrencyWithItems({
                        supplier: purchaseData.company_name,
                        date: new Date().toISOString(),
                        items: purchaseData.items || [],
                        usdAmount: finalUsdAmount,
                        iqdAmount: finalIqdAmount
                      });
                      
                      if (!result || result.error) {
                        throw new Error(result?.error || 'Failed to add multi-currency purchase with items');
                      }
                    } else {
                      console.error('[AdminModals] window.api.addDirectPurchaseMultiCurrencyWithItems not available');
                      throw new Error('Multi-currency purchase with items API not available');
                    }
                  } else {
                    // Single currency payment - convert all items to the chosen payment currency
                    const totalInPaymentCurrency = paymentCurrency === 'USD' 
                      ? usdTotal + (iqdTotal / EXCHANGE_RATES.USD_TO_IQD) // Convert IQD items to USD
                      : iqdTotal + (usdTotal * EXCHANGE_RATES.USD_TO_IQD); // Convert USD items to IQD
                    
                    // Regular single-currency purchase with items
                    if (window.api?.addDirectPurchaseWithItems) {
                      result = await window.api.addDirectPurchaseWithItems({
                        supplier: purchaseData.company_name,
                        date: new Date().toISOString(),
                        items: purchaseData.items || [],
                        totalAmount: totalInPaymentCurrency,
                        currency: paymentCurrency || 'IQD'
                      });
                      if (!result || result.error) {
                        throw new Error(result?.error || 'Failed to add purchase with items');
                      }
                    } else {
                      console.error('[AdminModals] window.api.addDirectPurchaseWithItems not available');
                      throw new Error('Purchase with items API not available');
                    }
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
                      multi_currency: purchaseData.multi_currency,
                      discount: purchaseData.discount
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
                  // Detect mixed currencies for company debt as well
                  const currencies = [...new Set(purchaseData.items.map(item => item.currency || 'IQD'))];
                  const hasMixedCurrencies = currencies.length > 1;
                  
                  // Calculate totals by currency for mixed-currency debt scenarios
                  const usdTotal = purchaseData.items
                    .filter(item => (item.currency || 'IQD') === 'USD')
                    .reduce((sum, item) => sum + (parseInt(item.quantity) * parseFloat(item.unit_price)), 0);
                  
                  const iqdTotal = purchaseData.items
                    .filter(item => (item.currency || 'IQD') === 'IQD')
                    .reduce((sum, item) => sum + (parseInt(item.quantity) * parseFloat(item.unit_price)), 0);
                  
                  // Prepare multi-currency data if needed
                  let multiCurrencyData = purchaseData.multi_currency;
                  if (hasMixedCurrencies && (!multiCurrencyData || !multiCurrencyData.enabled)) {
                    multiCurrencyData = {
                      enabled: true,
                      usdAmount: usdTotal,
                      iqdAmount: iqdTotal
                    };
                  }
                  
                  if (window.api?.addCompanyDebtWithItems) {
                    result = await window.api.addCompanyDebtWithItems({
                      company_name: purchaseData.company_name,
                      description: purchaseData.description,
                      items: purchaseData.items,
                      currency: purchaseData.currency,
                      multi_currency: multiCurrencyData,
                      discount: purchaseData.discount
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
              await refreshTransactions();
              
              // Refresh balances to show updated amounts in modal
              if (admin.loadBalances) {
                await admin.loadBalances();
              }
              
              setShowAddPurchase(); // This calls the close function
              
              // Show success message with mixed currency detection info
              const successMessage = detectedMixedCurrency 
                ? (t.purchaseAddedWithMixedCurrency || 'Purchase added successfully! Mixed currencies detected and handled automatically.')
                : (t.purchaseAddedSuccessfully || 'Purchase added successfully!');
              
              setToast(successMessage);
              
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

      {/* Universal Payment Modal for Company Debts */}
      {showEnhancedCompanyDebtModal && selectedCompanyDebt && (
        <UniversalPaymentModal
          show={showEnhancedCompanyDebtModal}
          onClose={() => {
            setShowEnhancedCompanyDebtModal(false);
            setSelectedCompanyDebt(null);
          }}
          debtData={selectedCompanyDebt}
          paymentType="company"
          onPaymentComplete={async () => {
            // Simplified refresh logic to prevent performance issues
            try {
              // Clear the current state first to force a fresh fetch
              if (admin.setCompanyDebts) {
                admin.setCompanyDebts([]);
              }
              
              // Single refresh with shorter delay to ensure database write completion
              await new Promise(resolve => setTimeout(resolve, 200)); // Reduced from 400ms
              await refreshCompanyDebts();
              
              // Refresh related data once
              await refreshBuyingHistory();
              await refreshTransactions();
              
              // Refresh balance data if available
              if (admin.loadBalances) {
                await admin.loadBalances();
              }
            } catch (error) {
              console.error('Error during data refresh after payment:', error);
              // Simple retry without additional complexity
              try {
                await new Promise(resolve => setTimeout(resolve, 300));
                await refreshCompanyDebts();
              } catch (retryError) {
                console.error('Retry refresh also failed:', retryError);
              }
            }
            
            // Clear the selected debt to force re-selection with fresh data
            setSelectedCompanyDebt(null);
            setShowEnhancedCompanyDebtModal(false);
            
            // Trigger cloud backup after successful payment
            triggerCloudBackup();
          }}
          admin={{
            ...admin,
            setToast: (msg) => setToast(msg)
          }}
          t={t}
        />
      )}
    </>
  );
}
