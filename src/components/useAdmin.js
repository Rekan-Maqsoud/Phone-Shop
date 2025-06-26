import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';
import { useTheme } from '../contexts/ThemeContext';

export default function useAdmin() {
  const { t, lang, setLang } = useLocale();
  const { theme, setTheme, setAppTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [viewSale, setViewSale] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [lowStockThreshold, setLowStockThreshold] = useState(() => Number(localStorage.getItem('lowStockThreshold')) || 5);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('notificationsEnabled') === 'true');
  const [autoBackup, setAutoBackup] = useState(() => localStorage.getItem('autoBackup') === 'true');
  const logoInputRef = useRef();
  const [loading, setLoading] = useState(false);
  const [shopInfo, setShopInfo] = useState({ name: '', address: '', contact: '', logo_path: null });
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState("");

  // Debts
  const [debts, setDebts] = useState([]);
  const fetchDebts = useCallback(async () => {
    if (window.api?.getDebts) {
      const data = await window.api.getDebts();
      setDebts(data || []);
    }
  }, []);
  const handleMarkDebtPaid = async (id) => {
    setLoading(true);
    try {
      if (window.api?.markDebtPaid) {
        await window.api.markDebtPaid(id);
        fetchDebts();
        fetchSales(); // update sales stats
      }
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

  useEffect(() => {
    if (window.api?.getShopInfo) {
      window.api.getShopInfo().then(info => {
        if (info) setShopInfo(info);
      });
    }
  }, []);
  useEffect(() => {
    fetchProducts();
    fetchSales();
    fetchDebts();
  }, [location, fetchProducts, fetchSales, fetchDebts]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('lowStockThreshold', lowStockThreshold);
    localStorage.setItem('notificationsEnabled', notificationsEnabled);
    localStorage.setItem('autoBackup', autoBackup);
    localStorage.setItem('lang', lang);
    if (window.api?.saveSetting) {
      window.api.saveSetting({ key: 'lowStockThreshold', value: lowStockThreshold });
      window.api.saveSetting({ key: 'notificationsEnabled', value: notificationsEnabled });
      window.api.saveSetting({ key: 'autoBackup', value: autoBackup });
      window.api.saveSetting({ key: 'theme', value: theme });
      window.api.saveSetting({ key: 'lang', value: lang });
    }
  }, [lowStockThreshold, notificationsEnabled, autoBackup, theme, lang]);

  // Toast
  const showToast = useCallback(msg => setToast(msg), []);

  // Handlers (export, print, backup, restore, CRUD, etc.)
  const handleExportSales = async () => {
    setLoading(true);
    try {
      if (window.api?.exportSalesCSV) {
        const res = await window.api.exportSalesCSV();
        showToast(res.success ? `${t.exportSales} successful!` : res.message || 'Export failed.');
      }
    } catch (e) {
      showToast('Export failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportInventory = async () => {
    setLoading(true);
    try {
      if (window.api?.exportInventoryCSV) {
        const res = await window.api.exportInventoryCSV();
        showToast(res.success ? `${t.exportInventory} successful!` : res.message || 'Export failed.');
      }
    } catch (e) {
      showToast('Export failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestPrint = async () => {
    setLoading(true);
    try {
      if (window.api?.testPrint) {
        const res = await window.api.testPrint();
        showToast(res.success ? 'Test print successful!' : res.message || 'Print test failed.');
      }
    } catch (e) {
      showToast('Print test failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSale = (sale) => {
    setViewSale(sale);
    setShowProductModal(true);
  };

  const handleBackupNow = async () => {
    setLoading(true);
    try {
      if (window.api?.backupData) {
        const res = await window.api.backupData();
        showToast(res.success ? 'Backup successful!' : res.message || 'Backup failed.');
      }
    } catch (e) {
      showToast('Backup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (filePath) => {
    setLoading(true);
    try {
      if (window.api?.restoreBackup) {
        const res = await window.api.restoreBackup(filePath);
        showToast(res.success ? 'Restore successful!' : res.message || 'Restore failed.');
        if (res.success) {
          fetchProducts();
          fetchSales();
        }
      }
    } catch (e) {
      showToast('Restore failed.');
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
          showToast(res.success ? 'All data reset successful!' : res.message || 'Reset failed.');
          if (res.success) {
            setProducts([]);
            setSales([]);
            setCart([]);
            // Immediately re-fetch to ensure UI updates if new products are added externally
            await fetchProducts();
            await fetchSales();
          }
        }
      } catch (e) {
        showToast('Reset failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddProduct = async (product) => {
    setLoading(true);
    try {
      if (window.api?.addProduct) {
        const res = await window.api.addProduct(product);
        if (res.success) {
          showToast(`${t.productAdded} ${product.name}`);
          await fetchProducts(); // Always refresh from DB
          setShowProductModal(false);
        } else {
          // Handle duplicate barcode error
          if (res.message && res.message.toLowerCase().includes('unique constraint failed: products.barcode')) {
            showToast(t.duplicateBarcodeError || 'A product with this barcode already exists.');
          } else {
            showToast(res.message || 'Add product failed.');
          }
        }
      }
    } catch (e) {
      // Also check error message for unique constraint
      if (e && e.message && e.message.toLowerCase().includes('unique constraint failed: products.barcode')) {
        showToast(t.duplicateBarcodeError || 'A product with this barcode already exists.');
      } else {
        showToast('Add product failed.');
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
        showToast(res.success ? `${t.productUpdated} ${product.name}` : res.message || 'Update product failed.');
        if (res.success) {
          setProducts(prev => prev.map(p => p.id === product.id ? res.product : p));
          setEditProduct(null);
          setShowProductModal(false);
        }
      }
    } catch (e) {
      showToast('Update product failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (window.confirm(t.confirmDelete)) {
      setLoading(true);
      try {
        if (window.api?.deleteProduct) {
          const res = await window.api.deleteProduct(product.id);
          showToast(res.success ? `${t.productDeleted} ${product.name}` : res.message || 'Delete product failed.');
          if (res.success) {
            setProducts(prev => prev.filter(p => p.id !== product.id));
            setEditProduct(null);
            setShowProductModal(false);
          }
        }
      } catch (e) {
        showToast('Delete product failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleArchiveProduct = async (product) => {
    setLoading(true);
    try {
      if (window.api?.archiveProduct) {
        const res = await window.api.archiveProduct(product.id);
        showToast(res.success ? `${t.productArchived} ${product.name}` : res.message || 'Archive product failed.');
        if (res.success) {
          setProducts(prev => prev.map(p => p.id === product.id ? { ...p, archived: true } : p));
          setEditProduct(null);
          setShowProductModal(false);
        }
      }
    } catch (e) {
      showToast('Archive product failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShopInfo = async (info) => {
    setLoading(true);
    try {
      if (window.api?.saveShopInfo) {
        const res = await window.api.saveShopInfo(info);
        showToast(res.success ? 'Shop info saved!' : res.message || 'Save failed.');
        if (res.success) {
          setShopInfo(info);
        }
      }
    } catch (e) {
      showToast('Save failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeAdminPassword = async (oldPassword, newPassword) => {
    setLoading(true);
    try {
      if (window.api?.changeAdminPassword) {
        const res = await window.api.changeAdminPassword(oldPassword, newPassword);
        showToast(res.success ? 'Password changed!' : res.message || 'Change password failed.');
      }
    } catch (e) {
      showToast('Change password failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      } else {
        return [...prev, { ...product, quantity: 1 }];
      }
    });
    showToast(`${t.addedToCart} ${product.name}`);
  };

  // Quick stats
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7); // 'YYYY-MM'
  const monthlySales = sales.filter(s => s && s.created_at && s.created_at.slice(0, 7) === thisMonth)
    .reduce((sum, s) => sum + (s && typeof s.total === 'number' ? s.total : Number(s?.total || 0)), 0);
  const totalRevenue = sales.reduce((sum, s) => sum + (s && typeof s.total === 'number' ? s.total : Number(s?.total || 0)), 0);
  const inventoryValue = products.reduce((sum, p) => {
    if (!p || typeof p.price !== 'number' || typeof p.stock !== 'number') return sum;
    return sum + p.price * p.stock;
  }, 0);

  return {
    t, lang, setLang, theme, setTheme, setAppTheme, navigate, location,
    products, setProducts, sales, setSales, showProductModal, setShowProductModal, showBackupModal, setShowBackupModal, showSettingsModal, setShowSettingsModal, viewSale, setViewSale, editProduct, setEditProduct, lowStockThreshold, setLowStockThreshold, notificationsEnabled, setNotificationsEnabled, autoBackup, setAutoBackup, logoInputRef, loading, setLoading, shopInfo, setShopInfo, cart, setCart, toast, setToast,
    fetchProducts, fetchSales, showToast,
    handleExportSales,
    handleExportInventory,
    handleTestPrint,
    handleViewSale,
    handleBackupNow,
    handleRestoreBackup,
    handleResetAllData,
    handleAddProduct,
    handleEditProduct,
    handleDeleteProduct,
    handleArchiveProduct,
    handleSaveShopInfo,
    handleChangeAdminPassword,
    handleAddToCart,
    debts,
    fetchDebts,
    handleMarkDebtPaid,
    monthlySales, totalRevenue, inventoryValue,
  };
}
