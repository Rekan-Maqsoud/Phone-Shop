import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  // All data states
  const [products, setProducts] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [sales, setSales] = useState([]);
  const [debts, setDebts] = useState([]);
  const [debtSales, setDebtSales] = useState([]);
  const [companyDebts, setCompanyDebts] = useState([]);
  const [buyingHistory, setBuyingHistory] = useState([]);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  // Check for API availability
  useEffect(() => {
    const checkApiReady = () => {
      if (window.api && window.api.getProducts) {
        setApiReady(true);
        return true;
      }
      return false;
    };
    
    if (checkApiReady()) {
      return;
    }
    
    // Poll for API availability in production
    const interval = setInterval(() => {
      if (checkApiReady()) {
        clearInterval(interval);
      }
    }, 100);
    
    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      console.error('❌ DataContext: API not available after 10 seconds');
      setApiReady(true); // Set to true anyway to prevent infinite loading
    }, 10000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Centralized fetch all data function
  const fetchAllData = useCallback(async () => {
    if (!apiReady) {
      return;
    }
    setLoading(true);

    
    try {
      // Call fetch functions directly to avoid dependency issues
      const promises = [];
      
      if (window.api?.getProducts) {
        promises.push(window.api.getProducts().then(data => {
       
          setProducts(data || []);
        }).catch(err => {
          console.error('❌ DataContext: Error fetching products:', err);
          setProducts([]);
        }));
      }
      
      if (window.api?.getAllAccessories) {
        promises.push(window.api.getAllAccessories().then(data => {
       
          setAccessories(data || []);
        }).catch(err => {
          console.error('❌ DataContext: Error fetching accessories:', err);
          setAccessories([]);
        }));
      }
      
      if (window.api?.getSales) {
        promises.push(window.api.getSales().then(data => setSales(data || [])).catch(err => {
          console.error('❌ DataContext: Error fetching sales:', err);
          setSales([]);
        }));
      }
      
      if (window.api?.getDebts) {
        promises.push(window.api.getDebts().then(data => setDebts(data || [])).catch(err => {
          console.error('❌ DataContext: Error fetching debts:', err);
          setDebts([]);
        }));
      }
      
      if (window.api?.getDebtSales) {
        promises.push(window.api.getDebtSales().then(data => setDebtSales(data || [])).catch(err => {
          console.error('❌ DataContext: Error fetching debt sales:', err);
          setDebtSales([]);
        }));
      }
      
      if (window.api?.getCompanyDebts) {
        promises.push(window.api.getCompanyDebts().then(data => setCompanyDebts(data || [])).catch(err => {
          console.error('❌ DataContext: Error fetching company debts:', err);
          setCompanyDebts([]);
        }));
      }
      
      if (window.api?.getBuyingHistoryWithItems) {
        promises.push(window.api.getBuyingHistoryWithItems().then(data => setBuyingHistory(data || [])).catch(err => {
          console.error('❌ DataContext: Error fetching buying history:', err);
          setBuyingHistory([]);
        }));
      }
      
      if (window.api?.getMonthlyReports) {
        promises.push(window.api.getMonthlyReports().then(data => setMonthlyReports(data || [])).catch(err => {
          console.error('❌ DataContext: Error fetching monthly reports:', err);
          setMonthlyReports([]);
        }));
      }
      
      await Promise.all(promises);

    } catch (error) {
      console.error('❌ DataContext: Error fetching all data:', error);
    } finally {
      setLoading(false);
    }
  }, [apiReady]);

  // Fetch all data when API becomes ready
  useEffect(() => {
    if (apiReady) {
      fetchAllData().catch(error => {
        console.error('❌ DataContext: Failed to fetch all data:', error);
        // Fallback to empty data to prevent app crash
        setProducts([]);
        setBuyingHistory([]);
        setMonthlyReports([]);
        setSales([]);
        setDebts([]);
      });
    }
  }, [apiReady]); // Only depend on apiReady to prevent infinite loops

  // Refresh functions for individual data types - simplified to avoid dependency loops
  const refreshProducts = useCallback(async () => {
    if (!apiReady || !window.api?.getProducts) return;
    try {
      const data = await window.api.getProducts();
      setProducts(data || []);
    } catch (error) {
      console.error('❌ DataContext: Error refreshing products:', error);
    }
  }, [apiReady]);
  
  const refreshAccessories = useCallback(async () => {
    if (!apiReady || !window.api?.getAllAccessories) return;
    try {
      const data = await window.api.getAllAccessories();
      setAccessories(data || []);
    } catch (error) {
      console.error('❌ DataContext: Error refreshing accessories:', error);
    }
  }, [apiReady]);
  
  const refreshSales = useCallback(async () => {
    if (!apiReady || !window.api?.getSales) return;
    try {
      const data = await window.api.getSales();
      setSales(data || []);
    } catch (error) {
      console.error('❌ DataContext: Error refreshing sales:', error);
    }
  }, [apiReady]);
  
  const refreshDebts = useCallback(async () => {
    if (!apiReady || !window.api?.getDebts) return;
    try {
      const data = await window.api.getDebts();
      setDebts(data || []);
    } catch (error) {
      console.error('❌ DataContext: Error refreshing debts:', error);
    }
  }, [apiReady]);
  
  const refreshCompanyDebts = useCallback(async () => {
    if (!apiReady || !window.api?.getCompanyDebts) return;
    try {
      const data = await window.api.getCompanyDebts();
      setCompanyDebts(data || []);
    } catch (error) {
      console.error('❌ DataContext: Error refreshing company debts:', error);
    }
  }, [apiReady]);
  
  const refreshBuyingHistory = useCallback(async () => {
    if (!apiReady || !window.api?.getBuyingHistoryWithItems) return;
    try {
      const data = await window.api.getBuyingHistoryWithItems();
      setBuyingHistory(data || []);
    } catch (error) {
      console.error('❌ DataContext: Error refreshing buying history:', error);
    }
  }, [apiReady]);
  
  const refreshDebtSales = useCallback(async () => {
    if (!apiReady || !window.api?.getDebtSales) return;
    try {
      const data = await window.api.getDebtSales();
      setDebtSales(data || []);
    } catch (error) {
      console.error('❌ DataContext: Error refreshing debt sales:', error);
    }
  }, [apiReady]);
  
  const refreshMonthlyReports = useCallback(async () => {
    if (!apiReady || !window.api?.getMonthlyReports) return;
    try {
      const data = await window.api.getMonthlyReports();
      setMonthlyReports(data || []);
    } catch (error) {
      console.error('❌ DataContext: Error refreshing monthly reports:', error);
    }
  }, [apiReady]);

  // Reload function for the entire app
  const reloadApp = useCallback(async () => {
    setLoading(true);
    
    try {
      // Clear all current data to show fresh loading state
      setProducts([]);
      setAccessories([]);
      setSales([]);
      setDebts([]);
      setDebtSales([]);
      setCompanyDebts([]);
      setBuyingHistory([]);
      setMonthlyReports([]);
      
      // Wait a moment for UI to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch all data fresh from database
      await fetchAllData();
      return true;
    } catch (error) {
      console.error('❌ DataContext: Error reloading application data:', error);
      return false;
    }
  }, [fetchAllData]);

  const value = {
    // Data states
    products,
    accessories,
    sales,
    debts,
    debtSales,
    companyDebts,
    buyingHistory,
    monthlyReports,
    loading,
    apiReady,
    
    // Setters for direct updates (when adding/editing items)
    setProducts,
    setAccessories,
    setSales,
    setDebts,
    setDebtSales,
    setCompanyDebts,
    setBuyingHistory,
    setMonthlyReports,
    
    // Fetch functions
    fetchAllData,
    reloadApp,
    refreshProducts,
    refreshAccessories,
    refreshSales,
    refreshDebts,
    refreshDebtSales,
    refreshCompanyDebts,
    refreshBuyingHistory,
    refreshMonthlyReports
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
