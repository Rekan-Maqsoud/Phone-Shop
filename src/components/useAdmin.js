import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';

export default function useAdmin() {
  const { t } = useLocale();
  const navigate = useNavigate();

  // Core state
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [viewSale, setViewSale] = useState(null);
  const [debts, setDebts] = useState([]);
  const [debtSales, setDebtSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('notificationsEnabled') === 'true');
  const [autoBackup, setAutoBackup] = useState(() => localStorage.getItem('autoBackup') === 'true');
  const [lowStockThreshold, setLowStockThreshold] = useState(() => Number(localStorage.getItem('lowStockThreshold')) || 5);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(() => localStorage.getItem('autoBackupEnabled') === 'true');

  // Admin modal state for Cashier
  const [adminModal, setAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");

  function openAdminModal() {
    setAdminModal(true);
    setAdminPassword("");
    setAdminError("");
  }

  const handleAdminAccess = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAdminError("");
    try {
      if (window.api?.checkAdminPassword) {
        const res = await window.api.checkAdminPassword(adminPassword);
        if (res.success) {
          setAdminModal(false);
          setAdminPassword("");
          setAdminError("");
          navigate("/admin");
        } else {
          setAdminError(res.message || t.invalidPassword || "Invalid password");
        }
      } else {
        setAdminError(t.apiUnavailable || "API unavailable");
      }
    } catch (err) {
      setAdminError(t.error || "Error");
    } finally {
      setLoading(false);
    }
  };

  // Fetchers
  const fetchProducts = useCallback(async () => {
    if (window.api?.getProducts) {
      const data = await window.api.getProducts();
      setProducts(data || []);
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
  const handleEditProduct = async (product) => {
    setLoading(true);
    try {
      if (window.api?.editProduct) {
        const res = await window.api.editProduct(product);
        if (res.success) {
          setToast(`${t.productUpdated} ${product.name}`);
          await fetchProducts();
        } else {
          setToast(res.message || t.editProductFailed || 'Edit product failed.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Admin actions
  const handleChangeAdminPassword = async (oldPassword, newPassword) => {
    setLoading(true);
    try {
      if (window.api?.changeAdminPassword) {
        const res = await window.api.changeAdminPassword(oldPassword, newPassword);
        setToast(res.success ? 'Password changed!' : res.message || 'Change password failed.');
      }
    } catch (e) {
      setToast('Change password failed.');
    } finally {
      setLoading(false);
    }
  };
  const handleRestoreBackup = async (filePath) => {
    setLoading(true);
    try {
      if (window.api?.restoreBackup) {
        const res = await window.api.restoreBackup(filePath);
        setToast(res.success ? 'Restore successful!' : res.message || 'Restore failed.');
        if (res.success) {
          fetchProducts();
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
            setProducts([]);
            setSales([]);
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

  // Fetch sales and debts on mount
  useEffect(() => {
    fetchSales();
    fetchDebts();
    fetchDebtSales();
    
    // Initialize auto backup if enabled
    if (autoBackupEnabled && window.api?.setAutoBackup) {
      window.api.setAutoBackup(true);
    }
  }, [fetchSales, fetchDebts, fetchDebtSales, autoBackupEnabled]);

  return {
    products, setProducts,
    sales, setSales,
    showProductModal, setShowProductModal,
    editProduct, setEditProduct,
    viewSale, setViewSale,
    debts,
    debtSales,
    fetchProducts,
    handleAddProduct,
    handleEditProduct,
    handleChangeAdminPassword,
    handleRestoreBackup,
    handleResetAllData,
    handleExportSales,
    handleExportInventory,
    handleTestPrint,
    handleMarkDebtPaid,
    setToast, toast,
    loading,
    monthlySales, totalRevenue, inventoryValue,
    notificationsEnabled, setNotificationsEnabled,
    autoBackup, setAutoBackup,
    autoBackupEnabled, setAutoBackupEnabled,
    lowStockThreshold, setLowStockThreshold,
    // Admin modal for Cashier
    adminModal, setAdminModal, openAdminModal, adminPassword, setAdminPassword, adminError, handleAdminAccess,
  };
}
