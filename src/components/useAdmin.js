import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';
import { useData } from '../contexts/DataContext';

export default function useAdmin() {
  const { t } = useLocale();
  const navigate = useNavigate();
  
  // Get data from DataContext instead of managing it locally
  const {
    products, setProducts,
    accessories, setAccessories,
    sales, setSales,
    debts, setDebts,
    debtSales, setDebtSales,
    companyDebts, setCompanyDebts,
    buyingHistory, setBuyingHistory,
    monthlyReports, setMonthlyReports,
    loading: dataLoading,
    refreshProducts,
    refreshAccessories,
    refreshSales,
    refreshDebts,
    refreshCompanyDebts,
    refreshBuyingHistory,
    refreshMonthlyReports
  } = useData();
  
  // UI state
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAccessoryModal, setShowAccessoryModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [editAccessory, setEditAccessory] = useState(null);
  const [viewSale, setViewSale] = useState(null);
  // Toast state
  const [toast, setToastState] = useState(null);
  // Add a wrapper for toast to match expected API
  const setToast = (msg, type = 'info', duration = 3000) => {
    setToastState({ msg, type, duration });
  };
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('notificationsEnabled') === 'true');
  const [lowStockThreshold, setLowStockThreshold] = useState(() => Number(localStorage.getItem('lowStockThreshold')) || 5);

  // Admin modal state for Cashier
  const [adminModal, setAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");

  function openAdminModal() {
    // Direct navigation to admin panel - no password required
    navigate("/admin");
  }

  const goToAdmin = useCallback(() => {
    navigate("/admin");
  }, [navigate]);

  const handleAdminAccess = (e) => {
    e.preventDefault();
    navigate("/admin");
  };

  const handleMarkDebtPaid = async (id, paid_at) => {
    try {
      if (window.api?.markDebtPaid) {
        await window.api.markDebtPaid(id, paid_at);
        refreshDebts();
        refreshSales(); // Refresh sales since paid debt moves to sales history
        refreshProducts(); // update sales stats
      }
    } catch (error) {
      console.error('Error marking debt as paid:', error);
      setToast('Error marking debt as paid', 'error');
    }
  };

  // Product CRUD
  const handleAddProduct = async (product) => {
    try {
      if (window.api?.addProduct) {
        const res = await window.api.addProduct(product);
        if (res.success) {
          setToast(`${t.productAdded} ${product.name}`);
          await refreshProducts();
        } else {
          setToast(res.message || t.addProductFailed || 'Add product failed.');
        }
      }
    } catch (error) {
      console.error('Error adding product:', error);
      setToast('Error adding product', 'error');
    }
  };

  const handleAddAccessory = async (accessory) => {
    try {
      if (window.api?.addAccessory) {
        const res = await window.api.addAccessory(accessory);
        if (res.success) {
          setToast(`${t.accessoryAdded || 'Accessory added'}: ${accessory.name}`);
          await refreshAccessories();
        } else {
          setToast(res.message || 'Add accessory failed.');
        }
      }
    } catch (error) {
      console.error('Error adding accessory:', error);
      setToast('Error adding accessory', 'error');
    }
  };

  const handleEditProduct = async (product) => {
    try {
      if (window.api?.editProduct) {
        const res = await window.api.editProduct(product);
        if (res.success) {
          setToast(`${t.productUpdated} ${product.name}`);
          await refreshProducts();
        } else {
          setToast(res.message || t.updateProductFailed || 'Update product failed.');
        }
      }
    } catch (error) {
      console.error('Error editing product:', error);
      setToast('Error editing product', 'error');
    }
  };

  const handleEditAccessory = async (accessory) => {
    
    try {
      if (window.api?.editAccessory) {
        const res = await window.api.editAccessory(accessory);
        if (res.success) {
          setToast(`${t.accessoryUpdated || 'Accessory updated'}: ${accessory.name}`);
          await refreshAccessories();
        } else {
          setToast(res.message || 'Update accessory failed.');
        }
      }
    } finally {
      
    }
  };

  // Removed admin password functionality - direct access granted

  const handleRestoreBackup = async (filePath) => {
    
    try {
      if (window.api?.restoreBackup) {
        const res = await window.api.restoreBackup(filePath);
        setToast(res.success ? 'Restore successful!' : res.message || 'Restore failed.');
        if (res.success) {
          // Refetch all data after successful restore
          await Promise.all([
            refreshProducts(),
            refreshAccessories(),
            refreshSales(),
            refreshDebts(),
            refreshCompanyDebts(),
            refreshBuyingHistory(),
            refreshMonthlyReports()
          ]);
        }
      }
    } catch (e) {
      setToast('Restore failed.');
    } finally {
      
    }
  };
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleResetAllData = async () => {
    setResetConfirmOpen(true);
  };

  const executeResetAllData = async () => {
    try {
      if (window.api?.resetAllData) {
        const res = await window.api.resetAllData();
        setToast(res.success ? 'All data reset successful!' : res.message || 'Reset failed.');
        if (res.success) {
          // Clear all state data immediately to ensure UI reflects reset
          setProducts([]);
          setAccessories([]);
          setSales([]);
          setDebts([]);
          setDebtSales([]);
          setCompanyDebts([]);
          setBuyingHistory([]);
          setMonthlyReports([]);
          
          // Wait a moment for state to clear, then refetch all data
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Refetch all data to ensure UI is updated with fresh data
          await Promise.all([
            refreshProducts(),
            refreshAccessories(),
            refreshSales(),
            refreshDebts(),
            // debtSales handled by DataContext
            refreshCompanyDebts(),
            refreshBuyingHistory(),
            refreshMonthlyReports()
          ]);
        }
      }
    } catch (e) {
      setToast('Reset failed.');
    } finally {
      
    }
  };
  const handleExportSales = async () => {
    
    try {
      if (window.api?.exportSalesCSV) {
        const res = await window.api.exportSalesCSV();
        setToast(res.success ? `${t.exportSales} successful!` : res.message || 'Export failed.');
      }
    } catch (e) {
      setToast(t.exportFailed || 'Export failed.');
    } finally {
      
    }
  };
  const handleExportInventory = async () => {
    
    try {
      if (window.api?.exportInventoryCSV) {
        const res = await window.api.exportInventoryCSV();
        setToast(res.success ? `${t.exportInventory} ${t.successful}!` : res.message || t.exportFailed || 'Export failed.');
      }
    } catch (e) {
      setToast(t.exportFailed || 'Export failed.');
    } finally {
      
    }
  };
  const handleTestPrint = async () => {
    
    try {
      if (window.api?.testPrint) {
        const res = await window.api.testPrint();
        setToast(res.success ? t.testPrintSuccessful || 'Test print successful!' : res.message || t.printTestFailed || 'Print test failed.');
      }
    } catch (e) {
      setToast(t.printTestFailed || 'Print test failed.');
    } finally {
      
    }
  };

  // Add company debt with items
  const handleAddCompanyDebtWithItems = async ({ company_name, description, items }) => {
    
    try {
      if (window.api?.addCompanyDebtWithItems) {
        const res = await window.api.addCompanyDebtWithItems({ company_name, description, items });
        if (res && res.success) {
          setToast(t.companyDebtAdded || 'Company debt with items added!');
          refreshCompanyDebts();
          refreshBuyingHistory();
          refreshProducts();
          refreshAccessories();
          return { success: true }; // Return success flag
        } else {
          setToast(res?.message || 'Failed to add company debt with items.');
          return { success: false, message: res?.message || 'Failed to add company debt with items.' };
        }
      } else {
        setToast('API function not available');
        return { success: false, message: 'API function not available' };
      }
    } catch (e) {
      setToast('Failed to add company debt with items.');
      return { success: false, message: e.message };
    } finally {
      
    }
  };

  // Company Debt: Mark as Paid
  const handleMarkCompanyDebtPaid = async (id, paid_at) => {
    
    try {
      if (window.api?.markCompanyDebtPaid) {
        await window.api.markCompanyDebtPaid(id, paid_at);
        refreshCompanyDebts();
        refreshBuyingHistory();
        refreshProducts();
        refreshAccessories();
      }
    } finally {
      
    }
  };

  // Stats
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const monthlySales = sales.filter(s => s && s.created_at && s.created_at.slice(0, 7) === thisMonth)
    .reduce((sum, s) => sum + (s && typeof s.total === 'number' ? s.total : Number(s?.total || 0)), 0);
  const totalRevenue = sales.reduce((sum, s) => sum + (s && typeof s.total === 'number' ? s.total : Number(s?.total || 0)), 0);
  const inventoryValue = products.reduce((sum, p) => {
    if (!p || typeof p.price !== 'number' || typeof p.stock !== 'number') return sum;
    return sum + p.price * p.stock;
  }, 0) + accessories.reduce((sum, a) => {
    if (!a || typeof a.buying_price !== 'number' || typeof a.stock !== 'number') return sum;
    return sum + a.buying_price * a.stock;
  }, 0);

  // Initialize settings on mount
  useEffect(() => {
    // No longer need to initialize auto backup as it's handled by CloudBackupService
  }, []); // Empty dependency array to run only once

  // Memoize the admin object to ensure stability across renders
  const adminObject = useMemo(() => ({
    products,
    setProducts,
    accessories,
    setAccessories,
    sales,
    setSales,
    showProductModal,
    setShowProductModal,
    showAccessoryModal,
    setShowAccessoryModal,
    editProduct,
    setEditProduct,
    editAccessory,
    setEditAccessory,
    viewSale,
    setViewSale,
    debts,
    setDebts,
    debtSales,
    setDebtSales,
    companyDebts,
    setCompanyDebts,
    buyingHistory,
    setBuyingHistory,
    monthlyReports,
    setMonthlyReports,
    // Removed fetch functions - use DataContext directly in components
    handleAddProduct,
    handleAddAccessory,
    handleEditProduct,
    handleEditAccessory,
    handleRestoreBackup,
    handleResetAllData,
    executeResetAllData,
    resetConfirmOpen,
    setResetConfirmOpen,
    handleExportSales,
    handleExportInventory,
    handleTestPrint,
    handleMarkDebtPaid,
    handleAddCompanyDebtWithItems,
    handleMarkCompanyDebtPaid,
    setToast, toast,
    loading: dataLoading,
    monthlySales, totalRevenue, inventoryValue,
    notificationsEnabled, setNotificationsEnabled,
    lowStockThreshold, setLowStockThreshold,
    adminModal, setAdminModal, openAdminModal, adminPassword, setAdminPassword, adminError, handleAdminAccess,
    goToAdmin,
  }), [
    products, accessories, sales, showProductModal, showAccessoryModal, editProduct, editAccessory, viewSale, debts, debtSales, companyDebts, buyingHistory, monthlyReports,
    toast, dataLoading, notificationsEnabled, lowStockThreshold, adminModal, adminPassword, adminError, resetConfirmOpen
  ]); // Removed function dependencies and apiReady that change on every render
  return adminObject;
}
