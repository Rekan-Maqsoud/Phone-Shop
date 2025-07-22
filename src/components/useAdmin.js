import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';
import { useData } from '../contexts/DataContext';
import { convertCurrency } from '../utils/exchangeRates';

export default function useAdmin(showConfirm = null) {
  const { t } = useLocale();
  const navigate = useNavigate();
  
  // Get data from DataContext with error handling
  const dataContext = useData();
  
  // Get data from DataContext with fallbacks
  const {
    products = [], setProducts = () => {},
    accessories = [], setAccessories = () => {},
    sales = [], setSales = () => {},
    debts = [], setDebts = () => {},
    debtSales = [], setDebtSales = () => {},
    companyDebts = [], setCompanyDebts = () => {},
    buyingHistory = [], setBuyingHistory = () => {},
    monthlyReports = [], setMonthlyReports = () => {},
    loading: dataLoading = false,
    refreshProducts = () => {},
    refreshAccessories = () => {},
    refreshSales = () => {},
    refreshDebts = () => {},
    refreshCompanyDebts = () => {},
    refreshBuyingHistory = () => {},
    refreshMonthlyReports = () => {}
  } = dataContext || {};
  
  // UI state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [viewSale, setViewSale] = useState(null);
  // Company debt modal states
  const [selectedCompanyDebt, setSelectedCompanyDebt] = useState(null);
  const [showEnhancedCompanyDebtModal, setShowEnhancedCompanyDebtModal] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  
  // Customer debt section states
  const [showPaidDebts, setShowPaidDebts] = useState(false);
  const [debtSearch, setDebtSearch] = useState('');
  
  // Add Purchase Modal state
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [isCompanyDebtMode, setIsCompanyDebtMode] = useState(false);
  // Balance state
  const [balanceUSD, setBalanceUSD] = useState(0);
  const [balanceIQD, setBalanceIQD] = useState(0);
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

  // Balance loading functionality
  const loadBalances = useCallback(async () => {
    try {
      if (window.api?.getBalances) {
        const balances = await window.api.getBalances();
        if (balances) {
          setBalanceUSD(balances.usd_balance || 0);
          setBalanceIQD(balances.iqd_balance || 0);
        }
      }
    } catch (error) {
      console.error('Error loading balances:', error);
      // Keep previous values on error
    }
  }, []);

  // Load balances on component mount and when data refreshes
  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

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

  // Purchase modal functions
  const openAddPurchaseModal = useCallback((forCompanyDebt = false) => {
    setIsCompanyDebtMode(forCompanyDebt);
    setShowAddPurchaseModal(true);
  }, []);

  const closeAddPurchaseModal = useCallback(() => {
    setShowAddPurchaseModal(false);
    setIsCompanyDebtMode(false); // Reset company debt mode when closing
  }, []);

  // Product CRUD
  const handleAddProduct = async (product) => {
    try {
      if (window.api?.addProduct) {
        // Check for existing product with same name/specs but different currency
        const existingProduct = products.find(p => 
          p.name === product.name &&
          p.brand === product.brand &&
          p.model === product.model &&
          p.ram === product.ram &&
          p.storage === product.storage &&
          p.currency !== product.currency &&
          !p.archived
        );

        if (existingProduct) {
          // Show confirmation to merge with existing product
          if (showConfirm) {
            showConfirm(
              `A product with the same specs already exists in ${existingProduct.currency}. Do you want to update its currency to ${product.currency} and merge the prices?`,
              async () => {
                // Convert the existing product to new currency and merge
                
                let newBuyingPrice = product.buying_price;
                let newStock = existingProduct.stock + (product.stock || 0);
                
                // If we want to average the prices, convert and calculate
                if (existingProduct.buying_price && product.buying_price) {
                  const convertedExistingPrice = convertCurrency(
                    existingProduct.buying_price, 
                    existingProduct.currency, 
                    product.currency
                  );
                  
                  // Calculate weighted average based on stock quantities
                  const existingWeight = existingProduct.stock || 1;
                  const newWeight = product.stock || 1;
                  const totalWeight = existingWeight + newWeight;
                  
                  newBuyingPrice = ((convertedExistingPrice * existingWeight) + (product.buying_price * newWeight)) / totalWeight;
                  
                  // Round appropriately
                  if (product.currency === 'USD') {
                    newBuyingPrice = Math.round(newBuyingPrice * 100) / 100;
                  } else {
                    newBuyingPrice = Math.round(newBuyingPrice);
                  }
                }
                
                const updatedProduct = {
                  ...existingProduct,
                  currency: product.currency,
                  buying_price: newBuyingPrice,
                  stock: newStock
                };
                
                const res = await window.api.editProduct(updatedProduct);
                if (res.success) {
                  setToast(`Product merged successfully: ${product.name} (${product.currency})`);
                  await refreshProducts();
                  setShowProductModal(false);
                  setEditProduct(null);
                } else {
                  setToast(res.message || 'Failed to merge product.');
                }
              }
            );
            return;
          } else {
            // Fallback to native confirm if showConfirm not available
            const confirmMerge = window.confirm(
              `A product with the same specs already exists in ${existingProduct.currency}. Do you want to update its currency to ${product.currency} and merge the prices?`
            );
            
            if (confirmMerge) {
              // Same merge logic as above
              
              let newBuyingPrice = product.buying_price;
              let newStock = existingProduct.stock + (product.stock || 0);
              
              if (existingProduct.buying_price && product.buying_price) {
                const convertedExistingPrice = convertCurrency(
                  existingProduct.buying_price, 
                  existingProduct.currency, 
                  product.currency
                );
                
                const existingWeight = existingProduct.stock || 1;
                const newWeight = product.stock || 1;
                const totalWeight = existingWeight + newWeight;
                
                newBuyingPrice = ((convertedExistingPrice * existingWeight) + (product.buying_price * newWeight)) / totalWeight;
                
                if (product.currency === 'USD') {
                  newBuyingPrice = Math.round(newBuyingPrice * 100) / 100;
                } else {
                  newBuyingPrice = Math.round(newBuyingPrice);
                }
              }
              
              const updatedProduct = {
                ...existingProduct,
                currency: product.currency,
                buying_price: newBuyingPrice,
                stock: newStock
              };
              
              const res = await window.api.editProduct(updatedProduct);
              if (res.success) {
                setToast(`Product merged successfully: ${product.name} (${product.currency})`);
                await refreshProducts();
                setShowProductModal(false);
                setEditProduct(null);
              } else {
                setToast(res.message || 'Failed to merge product.');
              }
              return;
            }
          }
        }

        // If no existing product or user chose not to merge, add normally
        const res = await window.api.addProduct(product);
        if (res.success) {
          setToast(`${t.productAdded} ${product.name}`);
          await refreshProducts();
          setShowProductModal(false); // Close modal on success
          setEditProduct(null); // Clear edit state
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
        // Check for existing accessory with same name but different currency
        const existingAccessory = accessories.find(a => 
          a.name === accessory.name &&
          a.brand === accessory.brand &&
          a.type === accessory.type &&
          a.currency !== accessory.currency &&
          !a.archived
        );

        if (existingAccessory) {
          // Show confirmation to merge with existing accessory
          if (showConfirm) {
            showConfirm(
              `An accessory with the same name already exists in ${existingAccessory.currency}. Do you want to update its currency to ${accessory.currency} and merge the prices?`,
              async () => {
                // Convert the existing accessory to new currency and merge
                
                let newBuyingPrice = accessory.buying_price;
                let newStock = existingAccessory.stock + (accessory.stock || 0);
                
                // If we want to average the prices, convert and calculate
                if (existingAccessory.buying_price && accessory.buying_price) {
                  const convertedExistingPrice = convertCurrency(
                    existingAccessory.buying_price, 
                    existingAccessory.currency, 
                    accessory.currency
                  );
                  
                  // Calculate weighted average based on stock quantities
                  const existingWeight = existingAccessory.stock || 1;
                  const newWeight = accessory.stock || 1;
                  const totalWeight = existingWeight + newWeight;
                  
                  newBuyingPrice = ((convertedExistingPrice * existingWeight) + (accessory.buying_price * newWeight)) / totalWeight;
                  
                  // Round appropriately
                  if (accessory.currency === 'USD') {
                    newBuyingPrice = Math.round(newBuyingPrice * 100) / 100;
                  } else {
                    newBuyingPrice = Math.round(newBuyingPrice);
                  }
                }
                
                const updatedAccessory = {
                  ...existingAccessory,
                  currency: accessory.currency,
                  buying_price: newBuyingPrice,
                  stock: newStock
                };
                
                const res = await window.api.editAccessory(updatedAccessory);
                if (res.success) {
                  setToast(`Accessory merged successfully: ${accessory.name} (${accessory.currency})`);
                  await refreshAccessories();
                } else {
                  setToast(res.message || 'Failed to merge accessory.');
                }
              }
            );
            return;
          } else {
            // Fallback to native confirm if showConfirm not available
            const confirmMerge = window.confirm(
              `An accessory with the same name already exists in ${existingAccessory.currency}. Do you want to update its currency to ${accessory.currency} and merge the prices?`
            );
            
            if (confirmMerge) {
              // Same merge logic as above
              
              let newBuyingPrice = accessory.buying_price;
              let newStock = existingAccessory.stock + (accessory.stock || 0);
              
              if (existingAccessory.buying_price && accessory.buying_price) {
                const convertedExistingPrice = convertCurrency(
                  existingAccessory.buying_price, 
                  existingAccessory.currency, 
                  accessory.currency
                );
                
                const existingWeight = existingAccessory.stock || 1;
                const newWeight = accessory.stock || 1;
                const totalWeight = existingWeight + newWeight;
                
                newBuyingPrice = ((convertedExistingPrice * existingWeight) + (accessory.buying_price * newWeight)) / totalWeight;
                
                if (accessory.currency === 'USD') {
                  newBuyingPrice = Math.round(newBuyingPrice * 100) / 100;
                } else {
                  newBuyingPrice = Math.round(newBuyingPrice);
                }
              }
              
              const updatedAccessory = {
                ...existingAccessory,
                currency: accessory.currency,
                buying_price: newBuyingPrice,
                stock: newStock
              };
              
              const res = await window.api.editAccessory(updatedAccessory);
              if (res.success) {
                setToast(`Accessory merged successfully: ${accessory.name} (${accessory.currency})`);
                await refreshAccessories();
              } else {
                setToast(res.message || 'Failed to merge accessory.');
              }
              return;
            }
          }
        }

        // If no existing accessory or user chose not to merge, add normally
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
          setShowProductModal(false); // Close modal on success
          setEditProduct(null); // Clear edit state
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

  // Company Debt: Mark as Paid with multi-currency support
  const handleMarkCompanyDebtPaid = async (id, multiCurrencyPayment) => {
    try {
      if (window.api?.markCompanyDebtPaid) {
        const paymentData = {
          paid_at: new Date().toISOString(),
          payment_usd_amount: multiCurrencyPayment?.usdAmount || 0,
          payment_iqd_amount: multiCurrencyPayment?.iqdAmount || 0,
          payment_currency_used: multiCurrencyPayment?.deductCurrency || 'USD'
        };
        
        await window.api.markCompanyDebtPaid(id, paymentData);
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
    if (!p || typeof p.buying_price !== 'number' || typeof p.stock !== 'number') return sum;
    return sum + p.buying_price * p.stock;
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
    editProduct,
    setEditProduct,
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
    selectedCompanyDebt,
    setSelectedCompanyDebt,
    showEnhancedCompanyDebtModal,
    setShowEnhancedCompanyDebtModal,
    activeSection,
    setActiveSection,
    showPaidDebts,
    setShowPaidDebts,
    debtSearch,
    setDebtSearch,
    showAddPurchaseModal,
    setShowAddPurchaseModal,
    isCompanyDebtMode,
    setIsCompanyDebtMode,
    openAddPurchaseModal,
    closeAddPurchaseModal,
    setToast, toast,
    loading: dataLoading,
    balanceUSD, balanceIQD, loadBalances,
    monthlySales, totalRevenue, inventoryValue,
    notificationsEnabled, setNotificationsEnabled,
    lowStockThreshold, setLowStockThreshold,
    adminModal, setAdminModal, openAdminModal, adminPassword, setAdminPassword, adminError, handleAdminAccess,
    goToAdmin,
  }), [
    products, accessories, sales, showProductModal, editProduct, viewSale, debts, debtSales, companyDebts, buyingHistory, monthlyReports,
    selectedCompanyDebt, showEnhancedCompanyDebtModal, activeSection, showPaidDebts, debtSearch, showAddPurchaseModal, isCompanyDebtMode,
    toast, dataLoading, balanceUSD, balanceIQD, notificationsEnabled, lowStockThreshold, adminModal, adminPassword, adminError, resetConfirmOpen,
    // Add function dependencies to ensure stability
    setProducts, setAccessories, setSales, setDebts, setDebtSales, setCompanyDebts, setBuyingHistory, setMonthlyReports,
    refreshProducts, refreshAccessories, refreshSales, refreshDebts, refreshCompanyDebts, refreshBuyingHistory, refreshMonthlyReports
  ]); // Comprehensive dependency array for stability
  return adminObject;
}
