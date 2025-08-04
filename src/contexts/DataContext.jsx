import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { EXCHANGE_RATES } from '../utils/exchangeRates';

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
  const [personalLoans, setPersonalLoans] = useState([]);
  const [buyingHistory, setBuyingHistory] = useState([]);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [incentives, setIncentives] = useState([]);
  const [transactions, setTransactions] = useState([]);
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
      const createDataFetch = (apiMethod, setter, dataType, params = []) => {
        if (window.api?.[apiMethod]) {
          return window.api[apiMethod](...params)
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
      promises.push(createDataFetch('getAccessories', setAccessories, 'accessories'));
      promises.push(createDataFetch('getSales', setSales, 'sales'));
      promises.push(createDataFetch('getDebts', setDebts, 'debts'));
      promises.push(createDataFetch('getDebtSales', setDebtSales, 'debt sales'));
      promises.push(createDataFetch('getCompanyDebts', setCompanyDebts, 'company debts'));
      promises.push(createDataFetch('getPersonalLoans', setPersonalLoans, 'personal loans'));
      promises.push(createDataFetch('getBuyingHistoryWithItems', setBuyingHistory, 'buying history'));
      promises.push(createDataFetch('getMonthlyReports', setMonthlyReports, 'monthly reports'));
      promises.push(createDataFetch('getIncentives', setIncentives, 'incentives'));
      promises.push(createDataFetch('getTransactions', setTransactions, 'transactions', [200])); // Get recent 200 transactions

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
      setPersonalLoans([]);
      setBuyingHistory([]);
      setMonthlyReports([]);
      setIncentives([]);
      setTransactions([]);
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
            setIncentives([]);
            setLoading(false);
          }
        }
      };
      
      fetchWithRetry();
    }
  }, [apiReady]); // FIXED: Removed fetchAllData dependency to prevent infinite loop

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
    if (!apiReady || !window.api?.getAccessories) return;
    try {
      const data = await window.api.getAccessories();
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
  
  const refreshIncentives = useCallback(async () => {
    if (!apiReady || !window.api?.getIncentives) return;
    try {
      const data = await window.api.getIncentives();
      setIncentives(data || []);
    } catch (error) {
      console.error('❌ DataContext: Error refreshing incentives:', error);
    }
  }, [apiReady]);

  const refreshTransactions = useCallback(async () => {
    if (!apiReady || !window.api?.getTransactions) return;
    try {
      const data = await window.api.getTransactions(200);
      setTransactions(data || []);
    } catch (error) {
      console.error('❌ DataContext: Error refreshing transactions:', error);
    }
  }, [apiReady]);

  // Utility function to calculate remaining debt amount using payment history with accurate exchange rates
  const calculateRemainingCustomerDebt = useCallback((sale, debt) => {
    if (!debt) {
      // No debt record means full amount is owed
      return {
        amount: sale.total,
        currency: sale.currency || 'USD'
      };
    }

    if (debt.paid_at) {
      // Fully paid
      return {
        amount: 0,
        currency: sale.currency || 'USD'
      };
    }

    // For now, fallback to the original calculation using the accumulated payment totals
    // TODO: Implement proper payment history tracking once the migration is stable
    const originalTotal = sale.total;
    const currency = sale.currency || 'USD';
    
    // Use the exchange rate saved at payment time, or fallback to current rate
    const exchangeRate = debt.payment_exchange_rate_usd_to_iqd || EXCHANGE_RATES.USD_TO_IQD;
    
    if (currency === 'USD') {
      // For USD debts, convert all payments to USD equivalent using saved rates
      const paidUSD = debt.payment_usd_amount || 0;
      const paidIQD = debt.payment_iqd_amount || 0;
      const totalPaidUSDEquivalent = paidUSD + (paidIQD / exchangeRate);
      
      return {
        amount: Math.max(0, originalTotal - totalPaidUSDEquivalent),
        currency: 'USD'
      };
    } else {
      // For IQD debts, convert all payments to IQD equivalent using saved rates
      const paidUSD = debt.payment_usd_amount || 0;
      const paidIQD = debt.payment_iqd_amount || 0;
      const totalPaidIQDEquivalent = paidIQD + (paidUSD * exchangeRate);
      
      return {
        amount: Math.max(0, originalTotal - totalPaidIQDEquivalent),
        currency: 'IQD'
      };
    }
  }, []);

  // Utility function to calculate remaining company debt amount using current exchange rates for UI display
  const calculateRemainingCompanyDebt = useCallback((debt) => {
    if (!debt) {
      return { USD: 0, IQD: 0 };
    }

    if (debt.paid_at) {
      // Fully paid
      return { USD: 0, IQD: 0 };
    }

    // Always use CURRENT exchange rate for UI display consistency
    // The payment-time rates are used for backend calculations but UI should be consistent
    const currentExchangeRate = EXCHANGE_RATES.USD_TO_IQD;

    if (debt.currency === 'MULTI') {
      // For multi-currency debts, subtract partial payments
      const remainingUSD = Math.max(0, (debt.usd_amount || 0) - (debt.payment_usd_amount || 0));
      const remainingIQD = Math.max(0, (debt.iqd_amount || 0) - (debt.payment_iqd_amount || 0));
      
      // Check 250 IQD threshold: if total remaining is less than 250 IQD equivalent, ignore
      const totalRemainingIQDEquivalent = remainingIQD + (remainingUSD * currentExchangeRate);
      if (totalRemainingIQDEquivalent >= 250) {
        return { USD: remainingUSD, IQD: remainingIQD };
      } else {
        return { USD: 0, IQD: 0 };
      }
    } else if (debt.currency === 'USD') {
      // USD debt - subtract USD payments and IQD payments converted to USD using CURRENT rate for display
      const paidUSD = debt.payment_usd_amount || 0;
      const paidIQD = debt.payment_iqd_amount || 0;
      const remaining = Math.max(0, (debt.amount || 0) - paidUSD - (paidIQD / currentExchangeRate));
      
      // Check 250 IQD threshold for USD debts
      const remainingIQDEquivalent = remaining * currentExchangeRate;
      if (remainingIQDEquivalent >= 250) {
        return { USD: remaining, IQD: 0 };
      } else {
        return { USD: 0, IQD: 0 };
      }
    } else {
      // IQD or unknown currency - subtract IQD payments and USD payments converted to IQD using CURRENT rate for display
      const paidUSD = debt.payment_usd_amount || 0;
      const paidIQD = debt.payment_iqd_amount || 0;
      const remaining = Math.max(0, (debt.amount || 0) - paidIQD - (paidUSD * currentExchangeRate));
      
      // Check 250 IQD threshold
      if (remaining >= 250) {
        return { USD: 0, IQD: remaining };
      } else {
        return { USD: 0, IQD: 0 };
      }
    }
  }, []);

  // Utility function to calculate remaining personal loan amount using accumulated payment totals
  const calculateRemainingPersonalLoan = useCallback((loan) => {
    if (!loan) {
      return { USD: 0, IQD: 0 };
    }

    if (loan.paid_at) {
      // Fully paid
      return { USD: 0, IQD: 0 };
    }

    // For personal loans, track remaining amounts in each currency using accumulated totals
    const totalPaidUSD = loan.payment_usd_amount || 0;
    const totalPaidIQD = loan.payment_iqd_amount || 0;
    
    const remainingUSD = Math.max(0, (loan.usd_amount || 0) - totalPaidUSD);
    const remainingIQD = Math.max(0, (loan.iqd_amount || 0) - totalPaidIQD);
    
    // Check 250 IQD threshold: if total remaining is less than 250 IQD equivalent, ignore
    const currentExchangeRate = window.exchangeRates?.USD_TO_IQD || 1390;
    const totalRemainingIQDEquivalent = remainingIQD + (remainingUSD * currentExchangeRate);
    if (totalRemainingIQDEquivalent >= 250) {
      return { USD: remainingUSD, IQD: remainingIQD };
    } else {
      return { USD: 0, IQD: 0 };
    }
  }, []);

  // Utility function to calculate total outstanding customer debts
  const calculateTotalCustomerOutstanding = useCallback(() => {
    const outstanding = { USD: 0, IQD: 0 };
    
    if (!sales || !debts) return outstanding;
    
    const debtSalesFiltered = sales.filter(sale => sale.is_debt);
    debtSalesFiltered.forEach(sale => {
      const debt = debts.find(d => d.sale_id === sale.id);
      const remaining = calculateRemainingCustomerDebt(sale, debt);
      
      if (remaining.amount > 0) {
        if (remaining.currency === 'USD') {
          outstanding.USD += remaining.amount;
        } else if (remaining.currency === 'IQD') {
          outstanding.IQD += remaining.amount;
        }
      }
    });
    
    return outstanding;
  }, [sales, debts, calculateRemainingCustomerDebt]);

  // Utility function to calculate total outstanding company debts
  const calculateTotalCompanyOutstanding = useCallback(() => {
    const outstanding = { USD: 0, IQD: 0 };
    
    if (!companyDebts) return outstanding;
    
    const unpaidCompanyDebts = companyDebts.filter(debt => !debt.paid_at);
    unpaidCompanyDebts.forEach(debt => {
      const remaining = calculateRemainingCompanyDebt(debt);
      outstanding.USD += remaining.USD;
      outstanding.IQD += remaining.IQD;
    });
    
    return outstanding;
  }, [companyDebts, calculateRemainingCompanyDebt]);

  // Utility function to get company debt counts
  const getCompanyDebtCounts = useCallback(() => {
    if (!companyDebts) return { total: 0, unpaid: 0 };
    
    const total = companyDebts.length;
    const unpaid = companyDebts.filter(debt => !debt.paid_at).length;
    
    return { total, unpaid };
  }, [companyDebts]);

  // Utility function to get customer debt counts
  const getCustomerDebtCounts = useCallback(() => {
    if (!sales || !debts) return { total: 0, unpaid: 0 };
    
    const debtSalesFiltered = sales.filter(sale => sale.is_debt);
    const total = debtSalesFiltered.length;
    
    let unpaid = 0;
    debtSalesFiltered.forEach(sale => {
      const debt = debts.find(d => d.sale_id === sale.id);
      const remaining = calculateRemainingCustomerDebt(sale, debt);
      if (remaining.amount > 0) {
        unpaid++;
      }
    });
    
    return { total, unpaid };
  }, [sales, debts, calculateRemainingCustomerDebt]);

  const refreshPersonalLoans = useCallback(async () => {
    if (!apiReady || !window.api?.getPersonalLoans) return;
    try {
      const data = await window.api.getPersonalLoans();
      setPersonalLoans(data || []);
    } catch (error) {
      console.error('❌ DataContext: Error refreshing personal loans:', error);
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
      setIncentives([]);
      
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
    personalLoans,
    buyingHistory,
    monthlyReports,
    incentives,
    transactions,
    loading,
    apiReady,
    
    // Setters for direct updates (when adding/editing items)
    setProducts,
    setAccessories,
    setSales,
    setDebts,
    setDebtSales,
    setCompanyDebts,
    setPersonalLoans,
    setBuyingHistory,
    setMonthlyReports,
    setIncentives,
    setTransactions,
    
    // Fetch functions
    fetchAllData,
    refreshAllData: fetchAllData, // Alias for backwards compatibility
    reloadApp,
    refreshProducts,
    refreshAccessories,
    refreshSales,
    refreshDebts,
    refreshDebtSales,
    refreshCompanyDebts,
    refreshPersonalLoans,
    refreshBuyingHistory,
    refreshMonthlyReports,
    refreshIncentives,
    refreshTransactions,

    // Debt calculation utilities
    calculateRemainingCustomerDebt,
    calculateRemainingCompanyDebt,
    calculateRemainingPersonalLoan,
    calculateTotalCustomerOutstanding,
    calculateTotalCompanyOutstanding,
    getCompanyDebtCounts,
    getCustomerDebtCounts
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
