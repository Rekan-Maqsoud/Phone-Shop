/**
 * CLEAN EXCHANGE RATE SYSTEM
 * 
 * Features this should support:
 * 1. Persistent exchange rates stored in database
 * 2. Real-time loading and saving of rates
 * 3. Automatic fallback to sensible defaults
 * 4. Clear separation between current rates and historical rates
 */

// Simple in-memory cache - will be populated from database
let currentExchangeRates = {
  USD_TO_IQD: 1440, // Default fallback
  IQD_TO_USD: 1 / 1440
};

/**
 * Load exchange rates from database and update cache
 * @returns {Promise<boolean>} Success status
 */
export const loadExchangeRatesFromDB = async () => {
  try {
    if (!window.api?.getExchangeRate) {
      console.warn('⚠️ Exchange rate API not available');
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
      console.warn('⚠️ No valid exchange rate in DB, using defaults');
      // Save default rates if none exist
      await window.api.setExchangeRate('USD', 'IQD', currentExchangeRates.USD_TO_IQD);
      await window.api.setExchangeRate('IQD', 'USD', currentExchangeRates.IQD_TO_USD);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to load exchange rates:', error);
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
      console.error('❌ Exchange rate save API not available');
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
    console.error('❌ Failed to save exchange rate:', error);
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

export const formatCurrency = (amount, currency) => {
  const symbol = currency === 'USD' ? '$' : 'د.ع';
  
  if (currency === 'IQD') {
    const rounded = Math.round(amount);
    return `${rounded.toLocaleString()}${symbol}`;
  }
  
  // For USD: show 2 decimals, but remove .00 for whole numbers
  const formatted = Number(amount).toFixed(2);
  const cleanFormatted = formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted;
  return `${symbol}${cleanFormatted}`;
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
