// Shared chart utilities and formatters
import { EXCHANGE_RATES } from './exchangeRates';

/**
 * Format currency with proper decimals and localization
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency type ('USD' or 'IQD')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD') => {
  if (currency === 'IQD') {
    // IQD always shows as whole numbers (no decimals ever)
    return `${Math.round(amount).toLocaleString()} IQD`;
  }
  
  // For USD: Show whole numbers when possible, otherwise show minimal decimals
  const numAmount = Number(amount);
  if (numAmount === Math.floor(numAmount)) {
    // It's a whole number, show without decimals
    return `$${Math.floor(numAmount).toLocaleString()}`;
  } else {
    // It has decimals, format with minimal decimal places
    const formatted = numAmount.toFixed(2);
    const cleanFormatted = formatted.replace(/\.?0+$/, '');
    return `$${cleanFormatted}`;
  }
};

/**
 * Filter sales by date range and payment status
 * @param {Array} sales - Array of sales data
 * @param {Array} debts - Array of debts data for checking payment status
 * @param {string} dateString - Target date string to filter by
 * @returns {Array} Filtered sales array
 */
export const filterPaidSales = (sales, debts, dateString) => {
  return (sales || []).filter(sale => {
    const isTargetDate = new Date(sale.created_at).toDateString() === dateString;
    if (!isTargetDate) return false;
    
    // For debt sales, check if the debt is paid
    if (sale.is_debt) {
      const debt = (debts || []).find(d => d.sale_id === sale.id);
      return debt && (debt.paid_at || debt.paid);
    }
    
    return true;
  });
};

/**
 * Calculate revenue by currency from sales array
 * @param {Array} sales - Array of sales data
 * @param {string} currency - Target currency ('USD' or 'IQD')
 * @returns {number} Total revenue in specified currency
 */
export const calculateRevenueByCurrency = (sales, currency) => {
  return (sales || []).reduce((sum, sale) => {
    if (sale.currency === currency) {
      return sum + (sale.total || 0);
    }
    return sum;
  }, 0);
};

/**
 * Generate date range array for charts
 * @param {number} days - Number of days to go back
 * @returns {Array} Array of date objects with ISO and display formats
 */
export const generateDateRange = (days) => {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return {
      iso: date.toISOString().split('T')[0],
      display: date.toLocaleDateString(),
      short: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  }).reverse();
};

/**
 * Common chart options for consistent styling
 */
export const getCommonChartOptions = (title = '') => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 300, // Fast animations for better performance
  },
  interaction: {
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: !!title,
      text: title,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
});

/**
 * Chart colors for consistent theming
 */
export const CHART_COLORS = {
  USD: {
    primary: 'rgba(34, 197, 94, 1)',
    secondary: 'rgba(34, 197, 94, 0.5)',
    background: 'rgba(34, 197, 94, 0.1)',
  },
  IQD: {
    primary: 'rgba(168, 85, 247, 1)',
    secondary: 'rgba(168, 85, 247, 0.5)',
    background: 'rgba(168, 85, 247, 0.1)',
  },
  profit: {
    primary: 'rgba(59, 130, 246, 1)',
    secondary: 'rgba(59, 130, 246, 0.5)',
    background: 'rgba(59, 130, 246, 0.1)',
  },
  danger: {
    primary: 'rgba(239, 68, 68, 1)',
    secondary: 'rgba(239, 68, 68, 0.5)',
    background: 'rgba(239, 68, 68, 0.1)',
  },
};
