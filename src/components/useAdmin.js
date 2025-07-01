import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';

export default function useAdmin() {
  const { t } = useLocale();
  const navigate = useNavigate();

  // Core state
  const [products, setProducts] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [sales, setSales] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAccessoryModal, setShowAccessoryModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [editAccessory, setEditAccessory] = useState(null);
  const [viewSale, setViewSale] = useState(null);
  const [debts, setDebts] = useState([]);
  const [debtSales, setDebtSales] = useState([]);
  const [companyDebts, setCompanyDebts] = useState([]);
  const [buyingHistory, setBuyingHistory] = useState([]);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [loading, setLoading] = useState(false);
  // Toast state
  const [toast, setToastState] = useState(null);
  // Add a wrapper for toast to match expected API
  const setToast = (msg, type = 'info', duration = 3000) => {
    setToastState({ msg, type, duration });
  };
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('notificationsEnabled') === 'true');
  const [autoBackup, setAutoBackup] = useState(() => localStorage.getItem('autoBackup') === 'true');
  const [lowStockThreshold, setLowStockThreshold] = useState(() => Number(localStorage.getItem('lowStockThreshold')) || 5);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(() => localStorage.getItem('autoBackupEnabled') === 'true');

  // Admin modal state for Cashier
  const [adminModal, setAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");

  function openAdminModal() {
    // Direct navigation to admin panel - no password required
    navigate("/admin");
  }

  const handleAdminAccess = (e) => {
    e.preventDefault();
    navigate("/admin");
  };

  // Fetchers
  const fetchProducts = useCallback(async () => {
    if (window.api?.getProducts) {
      const data = await window.api.getProducts();
      setProducts(data || []);
    }
  }, []);

  const fetchAccessories = useCallback(async () => {
    if (window.api?.getAllAccessories) {
      const data = await window.api.getAllAccessories();
      setAccessories(data || []);
    }
  }, []);

  const fetchSales = useCallback(async () => {
    if (window.api?.getSales) {
      const data = await window.api.getSales();
      setSales(data || []);
    }
  }, []);

  const fetchDebts = useCallback(async () => {
    if (window.api?.getDebts) {
      const data = await window.api.getDebts();
      setDebts(data || []);
    }
  }, []);
  const fetchDebtSales = useCallback(async () => {
    if (window.api?.getDebtSales) {
      const data = await window.api.getDebtSales();
      setDebtSales(data || []);
    }
  }, []);

  const fetchCompanyDebts = useCallback(async () => {
    if (window.api?.getCompanyDebts) {
      const data = await window.api.getCompanyDebts();
      setCompanyDebts(data || []);
    }
  }, []);

  const fetchBuyingHistory = useCallback(async () => {
    if (window.api?.getBuyingHistoryWithItems) {
      const data = await window.api.getBuyingHistoryWithItems();
      setBuyingHistory(data || []);
    }
  }, []);

  const fetchMonthlyReports = useCallback(async () => {
    if (window.api?.getMonthlyReports) {
      const data = await window.api.getMonthlyReports();
      setMonthlyReports(data || []);
    }
  }, []);

  const handleMarkDebtPaid = async (id, paid_at) => {
    setLoading(true);
    try {
      if (window.api?.markDebtPaid) {
        await window.api.markDebtPaid(id, paid_at);
        fetchDebts();
        fetchSales(); // Refresh sales since paid debt moves to sales history
        fetchProducts(); // update sales stats
      }
    } finally {
      setLoading(false);
    }
  };

  // Product CRUD
  const handleAddProduct = async (product) => {
    setLoading(true);
    try {
      if (window.api?.addProduct) {
        const res = await window.api.addProduct(product);
        if (res.success) {
          setToast(`${t.productAdded} ${product.name}`);
          await fetchProducts();
        } else {
          setToast(res.message || t.addProductFailed || 'Add product failed.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccessory = async (accessory) => {
    setLoading(true);
    try {
      if (window.api?.addAccessory) {
        const res = await window.api.addAccessory(accessory);
        if (res.success) {
          setToast(`${t.accessoryAdded || 'Accessory added'}: ${accessory.name}`);
          await fetchAccessories();
        } else {
          setToast(res.message || 'Add accessory failed.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async (product) => {
    setLoading(true);
    try {
      if (window.api?.editProduct) {
        const res = await window.api.editProduct(product);
        if (res.success) {
          setToast(`${t.productUpdated} ${product.name}`);
          await fetchProducts();
        } else {
          setToast(res.message || t.updateProductFailed || 'Update product failed.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccessory = async (accessory) => {
    setLoading(true);
    try {
      if (window.api?.editAccessory) {
        const res = await window.api.editAccessory(accessory);
        if (res.success) {
          setToast(`${t.accessoryUpdated || 'Accessory updated'}: ${accessory.name}`);
          await fetchAccessories();
        } else {
          setToast(res.message || 'Update accessory failed.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Removed admin password functionality - direct access granted

  const handleRestoreBackup = async (filePath) => {
    setLoading(true);
    try {
      if (window.api?.restoreBackup) {
        const res = await window.api.restoreBackup(filePath);
        setToast(res.success ? 'Restore successful!' : res.message || 'Restore failed.');
        if (res.success) {
          // Refetch all data after successful restore
          fetchProducts();
          fetchSales();
          fetchDebts();
          fetchDebtSales();
        }
      }
    } catch (e) {
      setToast('Restore failed.');
    } finally {
      setLoading(false);
    }
  };
  const handleResetAllData = async () => {
    if (window.confirm(t.confirmReset)) {
      setLoading(true);
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
              fetchProducts(),
              fetchAccessories(),
              fetchSales(),
              fetchDebts(),
              fetchDebtSales(),
              fetchCompanyDebts(),
              fetchBuyingHistory(),
              fetchMonthlyReports()
            ]);
          }
        }
      } catch (e) {
        setToast('Reset failed.');
      } finally {
        setLoading(false);
      }
    }
  };
  const handleExportSales = async () => {
    setLoading(true);
    try {
      if (window.api?.exportSalesCSV) {
        const res = await window.api.exportSalesCSV();
        setToast(res.success ? `${t.exportSales} successful!` : res.message || 'Export failed.');
      }
    } catch (e) {
      setToast('Export failed.');
    } finally {
      setLoading(false);
    }
  };
  const handleExportInventory = async () => {
    setLoading(true);
    try {
      if (window.api?.exportInventoryCSV) {
        const res = await window.api.exportInventoryCSV();
        setToast(res.success ? `${t.exportInventory} successful!` : res.message || 'Export failed.');
      }
    } catch (e) {
      setToast('Export failed.');
    } finally {
      setLoading(false);
    }
  };
  const handleTestPrint = async () => {
    setLoading(true);
    try {
      if (window.api?.testPrint) {
        const res = await window.api.testPrint();
        setToast(res.success ? 'Test print successful!' : res.message || 'Print test failed.');
      }
    } catch (e) {
      setToast('Print test failed.');
    } finally {
      setLoading(false);
    }
  };

  // Add company debt with items
  const handleAddCompanyDebtWithItems = async ({ company_name, description, items }) => {
    setLoading(true);
    try {
      if (window.api?.addCompanyDebtWithItems) {
        const res = await window.api.addCompanyDebtWithItems({ company_name, description, items });
        if (res && res.success) {
          setToast(t.companyDebtAdded || 'Company debt with items added!');
          fetchCompanyDebts();
          fetchBuyingHistory();
          fetchProducts();
          fetchAccessories();
        } else {
          setToast(res?.message || 'Failed to add company debt with items.');
        }
      }
    } catch (e) {
      setToast('Failed to add company debt with items.');
    } finally {
      setLoading(false);
    }
  };

  // Company Debt: Mark as Paid
  const handleMarkCompanyDebtPaid = async (id, paid_at) => {
    setLoading(true);
    try {
      if (window.api?.markCompanyDebtPaid) {
        await window.api.markCompanyDebtPaid(id, paid_at);
        fetchCompanyDebts();
        fetchBuyingHistory();
        fetchProducts();
        fetchAccessories && fetchAccessories();
      }
    } finally {
      setLoading(false);
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
  }, 0);

  // Fetch sales and debts on mount - only run once
  useEffect(() => {
    fetchSales();
    fetchDebts();
    fetchDebtSales();
    
    // Initialize auto backup if enabled
    if (autoBackupEnabled && window.api?.setAutoBackup) {
      window.api.setAutoBackup(true);
    }
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
    fetchProducts,
    fetchAccessories,
    fetchSales,
    fetchDebts,
    fetchDebtSales,
    fetchCompanyDebts,
    fetchBuyingHistory,
    fetchMonthlyReports,
    handleAddProduct,
    handleAddAccessory,
    handleEditProduct,
    handleEditAccessory,
    handleRestoreBackup,
    handleResetAllData,
    handleExportSales,
    handleExportInventory,
    handleTestPrint,
    handleMarkDebtPaid,
    handleAddCompanyDebtWithItems,
    handleMarkCompanyDebtPaid,
    setToast, toast,
    loading,
    monthlySales, totalRevenue, inventoryValue,
    notificationsEnabled, setNotificationsEnabled,
    autoBackup, setAutoBackup,
    autoBackupEnabled, setAutoBackupEnabled,
    lowStockThreshold, setLowStockThreshold,
    adminModal, setAdminModal, openAdminModal, adminPassword, setAdminPassword, adminError, handleAdminAccess,
  }), [
    products, accessories, sales, showProductModal, showAccessoryModal, editProduct, editAccessory, viewSale, debts, debtSales, companyDebts, buyingHistory, monthlyReports,
    fetchProducts, fetchAccessories, fetchSales, fetchDebts, fetchDebtSales, fetchCompanyDebts, fetchBuyingHistory, fetchMonthlyReports,
    handleAddProduct, handleAddAccessory, handleEditProduct, handleEditAccessory, handleRestoreBackup, handleResetAllData, handleExportSales, handleExportInventory, handleTestPrint, handleMarkDebtPaid, handleAddCompanyDebtWithItems, handleMarkCompanyDebtPaid,
    setToast, toast, loading, monthlySales, totalRevenue, inventoryValue, notificationsEnabled, setNotificationsEnabled, autoBackup, setAutoBackup, autoBackupEnabled, setAutoBackupEnabled, lowStockThreshold, setLowStockThreshold, adminModal, setAdminModal, openAdminModal, adminPassword, setAdminPassword, adminError, handleAdminAccess
  ]);
  return adminObject;
}
