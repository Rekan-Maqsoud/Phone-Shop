/**
 * CLEAN EXCHANGE RATE SYSTEM
 * 
 * Features this should support:
 * 1. Persistent exchange rates stored in database
 * 2. Real-time loading and saving of rates
 * 3. No hardcoded defaults - all rates must come from database
 * 4. Clear separation between current rates and historical rates
 */

// Simple in-memory cache - will be populated from database
let currentExchangeRates = {
  USD_TO_IQD: 1400, // Default working rate that matches header display
  IQD_TO_USD: 1/1400
};

/**
 * Load exchange rates from database and update cache
 * @returns {Promise<boolean>} Success status
 */
export const loadExchangeRatesFromDB = async () => {
  try {
    if (!window.api?.getExchangeRate) {
      // Exchange rate API not available - fail silently
      return false;
    }

    // Load both rates from database
    const usdToIqd = await window.api.getExchangeRate('USD', 'IQD');
    const iqdToUsd = await window.api.getExchangeRate('IQD', 'USD');
    
    if (usdToIqd && usdToIqd > 0) {
      currentExchangeRates.USD_TO_IQD = usdToIqd;
      // If IQD to USD is not set, calculate it
      currentExchangeRates.IQD_TO_USD = iqdToUsd || (1 / usdToIqd);
      
      // Ensure both rates are saved
      if (!iqdToUsd) {
        await window.api.setExchangeRate('IQD', 'USD', 1 / usdToIqd);
      }
      
      return true;
    } else {
      // No valid exchange rate in DB - fail silently
      return false;
    }
  } catch (error) {
    // Failed to load exchange rates - fail silently
    return false;
  }
};

/**
 * Get current exchange rate from cache
 * @param {string} fromCurrency 
 * @param {string} toCurrency 
 * @returns {number} Exchange rate
 */
export const getCurrentExchangeRate = (fromCurrency, toCurrency) => {
  if (fromCurrency === 'USD' && toCurrency === 'IQD') {
    return currentExchangeRates.USD_TO_IQD;
  } else if (fromCurrency === 'IQD' && toCurrency === 'USD') {
    return currentExchangeRates.IQD_TO_USD;
  }
  return 1; // Same currency
};

/**
 * Save exchange rate to database and update cache
 * @param {number} usdToIqd USD to IQD rate
 * @returns {Promise<boolean>} Success status
 */
export const saveExchangeRate = async (usdToIqd) => {
  try {
    if (!window.api?.setExchangeRate) {
      // Exchange rate save API not available - fail silently
      return false;
    }

    // Save both rates to ensure consistency
    await window.api.setExchangeRate('USD', 'IQD', usdToIqd);
    const iqdToUsd = 1 / usdToIqd;
    await window.api.setExchangeRate('IQD', 'USD', iqdToUsd);
    
    // Update cache
    currentExchangeRates.USD_TO_IQD = usdToIqd;
    currentExchangeRates.IQD_TO_USD = iqdToUsd;
    
    
    return true;
  } catch (error) {
    // Failed to save exchange rate - fail silently
    return false;
  }
};

// Export the current rates object for backward compatibility
export const EXCHANGE_RATES = currentExchangeRates;

export const convertCurrency = (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return amount;
  
  if (fromCurrency === 'USD' && toCurrency === 'IQD') {
    return amount * EXCHANGE_RATES.USD_TO_IQD;
  }
  
  if (fromCurrency === 'IQD' && toCurrency === 'USD') {
    return amount * EXCHANGE_RATES.IQD_TO_USD;
  }
  
  return amount; // fallback
};

/**
 * Intelligently rounds amounts based on value and currency
 * For amounts < 0.1, rounds to nearest whole number
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

export const formatCurrency = (amount, currency, hideZeroDecimals = true) => {
  const numAmount = intelligentRound(amount, currency);
  
  if (currency === 'IQD') {
    // IQD should never show decimals
    return `د.ع${Math.round(numAmount).toLocaleString()}`;
  }
  
  // For USD: determine decimal places
  const isWholeNumber = numAmount === Math.floor(numAmount);
  
  if (isWholeNumber || hideZeroDecimals) {
    return `$${Math.floor(numAmount).toLocaleString()}`;
  } else {
    // Show 1-2 decimal places max, remove trailing zeros
    const formatted = numAmount.toFixed(2).replace(/\.?0+$/, '');
    return `$${formatted}`;
  }
};

// New function that uses translations
export const formatCurrencyWithTranslation = (amount, currency, t) => {
  const numAmount = intelligentRound(amount, currency);
  
  if (currency === 'IQD') {
    return `د.ع${Math.round(numAmount).toLocaleString()}`;
  }
  
  // For USD: show clean formatting
  const isWholeNumber = numAmount === Math.floor(numAmount);
  if (isWholeNumber) {
    return `$${Math.floor(numAmount).toLocaleString()}`;
  } else {
    // Show 1-2 decimal places max, remove trailing zeros
    const formatted = numAmount.toFixed(2).replace(/\.?0+$/, '');
    return `$${formatted}`;
  }
};

// Round IQD amounts to nearest 250 (smallest bill denomination)
export const roundIQDToNearestBill = (amount) => {
  if (amount <= 0) return 0;
  return Math.round(amount / 250) * 250;
};

/**
 * Update exchange rate in cache and database
 * @param {number} usdToIqd New USD to IQD rate
 * @returns {Promise<boolean>} Success status
 */
export const updateExchangeRate = async (usdToIqd) => {
  return await saveExchangeRate(usdToIqd);
};

export const validatePaymentAmount = (totalUSD, paymentIQD) => {
  const requiredIQD = totalUSD * EXCHANGE_RATES.USD_TO_IQD;
  const roundedRequiredIQD = roundIQDToNearestBill(requiredIQD);
  return paymentIQD >= roundedRequiredIQD;
};
