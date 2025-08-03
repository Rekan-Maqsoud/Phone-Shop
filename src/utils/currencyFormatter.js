/**
 * Centralized Currency Formatting Utility
 * 
 * Rules:
 * - IQD: Always whole numbers, no decimals ever
 * - USD: Smart rounding - if < 0.1, round to nearest whole number
 * - USD: Show 1-2 decimal places maximum, remove trailing zeros
 */

/**
 * Apply intelligent rounding based on value and currency
 * @param {number} amount - The amount to round
 * @param {string} currency - The currency type ('USD' or 'IQD')
 * @returns {number} The rounded amount
 */
const intelligentRound = (amount, currency) => {
  const numAmount = Number(amount || 0);
  
  if (currency === 'IQD') {
    // IQD should always be whole numbers
    return Math.round(numAmount);
  }
  
  // For USD: if less than 0.1, round to nearest whole number
  if (Math.abs(numAmount) < 0.1) {
    return Math.round(numAmount);
  }
  
  // Otherwise, round to 2 decimal places but limit to max 2 decimals
  return Math.round(numAmount * 100) / 100;
};

/**
 * Format currency with consistent rules across the app
 * @param {number|string} amount - The amount to format
 * @param {string} currency - The currency type ('USD' or 'IQD')
 * @param {boolean} hideZeroDecimals - Whether to hide .00 for whole numbers (default: true)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency, hideZeroDecimals = true) => {
  const numAmount = intelligentRound(amount, currency);
  
  if (currency === 'IQD') {
    // IQD should never show decimals
    return `د.ع${Math.round(numAmount).toLocaleString()}`;
  }
  
  // For USD: determine decimal places
  const isWholeNumber = numAmount === Math.floor(numAmount);
  
  if (isWholeNumber || (hideZeroDecimals && numAmount % 1 === 0)) {
    return `$${Math.floor(numAmount).toLocaleString()}`;
  } else {
    // Show 1-2 decimal places max, remove trailing zeros
    const formatted = numAmount.toFixed(2).replace(/\.?0+$/, '');
    return `$${formatted}`;
  }
};

/**
 * Format currency for display purposes with translation support
 * @param {number|string} amount - The amount to format
 * @param {string} currency - The currency type ('USD' or 'IQD')
 * @param {object} t - Translation object (optional)
 * @returns {string} Formatted currency string
 */
export const formatCurrencyWithTranslation = (amount, currency, t) => {
  return formatCurrency(amount, currency);
};

/**
 * Get just the number part without currency symbol for calculations
 * @param {number|string} amount - The amount to format
 * @param {string} currency - The currency type ('USD' or 'IQD')
 * @returns {number} The rounded number
 */
export const roundCurrencyAmount = (amount, currency) => {
  return intelligentRound(amount, currency);
};

/**
 * Format currency for input placeholders
 * @param {number|string} amount - The amount to format
 * @param {string} currency - The currency type ('USD' or 'IQD')
 * @returns {string} Formatted currency string for placeholders
 */
export const formatCurrencyForPlaceholder = (amount, currency) => {
  const numAmount = intelligentRound(amount, currency);
  
  if (currency === 'IQD') {
    return `د.ع${Math.round(numAmount).toLocaleString()}`;
  }
  
  const isWholeNumber = numAmount === Math.floor(numAmount);
  if (isWholeNumber) {
    return `$${Math.floor(numAmount)}`;
  } else {
    const formatted = numAmount.toFixed(2).replace(/\.?0+$/, '');
    return `$${formatted}`;
  }
};

/**
 * Format currency amounts for charts and reports
 * @param {number|string} amount - The amount to format
 * @param {string} currency - The currency type ('USD' or 'IQD')
 * @returns {string} Formatted currency string for charts
 */
export const formatCurrencyForChart = (amount, currency = 'USD') => {
  const numAmount = intelligentRound(amount, currency);
  
  if (currency === 'IQD') {
    return `${Math.round(numAmount).toLocaleString()} د.ع`;
  }
  
  const isWholeNumber = numAmount === Math.floor(numAmount);
  if (isWholeNumber) {
    return `${Math.floor(numAmount).toLocaleString()} USD`;
  } else {
    const formatted = numAmount.toFixed(2).replace(/\.?0+$/, '');
    return `${formatted} USD`;
  }
};

export default {
  formatCurrency,
  formatCurrencyWithTranslation,
  roundCurrencyAmount,
  formatCurrencyForPlaceholder,
  formatCurrencyForChart
};
