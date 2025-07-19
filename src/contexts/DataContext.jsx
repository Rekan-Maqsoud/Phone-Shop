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

  // Enhanced API readiness check for production
  useEffect(() => {
    const checkApiReady = () => {
      // More comprehensive check for production environments
      if (window.api && 
          typeof window.api.getProducts === 'function' &&
          typeof window.api.getSales === 'function' &&
          typeof window.api.addProduct === 'function' &&
          typeof window.api.editProduct === 'function') {
        setApiReady(true);
        return true;
      }
      return false;
    };
    
    if (checkApiReady()) {
      return;
    }
    
    // Enhanced polling with better error handling for production
    let attempts = 0;
    const maxAttempts = 200; // 20 seconds max for slower systems
    
    const pollApiReady = () => {
      attempts++;
      
      if (checkApiReady()) {
        return;
      }
      
      if (attempts >= maxAttempts) {
        console.error('❌ DataContext: API not available after maximum attempts');
        setApiReady(true); // Set to true anyway to prevent infinite loading
        return;
      }
      
      setTimeout(pollApiReady, 100);
    };
    
    pollApiReady();
  }, []);

  // Enhanced data fetching with better error recovery
  const fetchAllData = useCallback(async () => {
    if (!apiReady) {
      return;
    }
    
    setLoading(true);

    try {
      const promises = [];
      
      // Enhanced error handling for each data type
      const createDataFetch = (apiMethod, setter, dataType) => {
        if (window.api?.[apiMethod]) {
          return window.api[apiMethod]()
            .then(data => {
              setter(data || []);
            })
            .catch(err => {
              console.error(`❌ DataContext: Error fetching ${dataType}:`, err);
              setter([]);
              // Don't throw - let other fetches continue
            });
        } else {
          console.warn(`⚠️ DataContext: ${apiMethod} not available`);
          setter([]);
          return Promise.resolve();
        }
      };
      
      promises.push(createDataFetch('getProducts', setProducts, 'products'));
      promises.push(createDataFetch('getAllAccessories', setAccessories, 'accessories'));
      promises.push(createDataFetch('getSales', setSales, 'sales'));
      promises.push(createDataFetch('getDebts', setDebts, 'debts'));
      promises.push(createDataFetch('getDebtSales', setDebtSales, 'debt sales'));
      promises.push(createDataFetch('getCompanyDebts', setCompanyDebts, 'company debts'));
      promises.push(createDataFetch('getBuyingHistoryWithItems', setBuyingHistory, 'buying history'));
      promises.push(createDataFetch('getMonthlyReports', setMonthlyReports, 'monthly reports'));

      await Promise.allSettled(promises); // Use allSettled to ensure all complete even if some fail

    } catch (error) {
      console.error('❌ DataContext: Critical error during data fetch:', error);
      // Initialize with empty arrays to prevent app crash
      setProducts([]);
      setAccessories([]);
      setSales([]);
      setDebts([]);
      setDebtSales([]);
      setCompanyDebts([]);
      setBuyingHistory([]);
      setMonthlyReports([]);
    } finally {
      setLoading(false);
    }
  }, [apiReady]);

  // Enhanced data fetching trigger with retry mechanism
  useEffect(() => {
    if (apiReady) {
      let retryCount = 0;
      const maxRetries = 3;
      
      const fetchWithRetry = async () => {
        try {
          await fetchAllData();
        } catch (error) {
          console.error(`❌ DataContext: Fetch attempt ${retryCount + 1} failed:`, error);
          retryCount++;
          
          if (retryCount < maxRetries) {
            setTimeout(fetchWithRetry, retryCount * 2000);
          } else {
            console.error('❌ DataContext: Max retries reached, setting safe defaults');
            // Set safe defaults to prevent app crash
            setProducts([]);
            setAccessories([]);
            setSales([]);
            setDebts([]);
            setDebtSales([]);
            setCompanyDebts([]);
            setBuyingHistory([]);
            setMonthlyReports([]);
            setLoading(false);
          }
        }
      };
      
      fetchWithRetry();
    }
  }, [apiReady, fetchAllData]);

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
