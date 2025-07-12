// Exchange rates configuration
// This should be easily editable and can be moved to a settings file or API in the future

export const EXCHANGE_RATES = {
  USD_TO_IQD: 1440, // 1 USD = 1440 IQD (easily changeable)
  IQD_TO_USD: 1 / 1440 // 1 IQD = 0.000694 USD
};

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
    // Round to nearest whole number for IQD (no decimals)
    const rounded = Math.round(amount);
    return `${rounded.toLocaleString()}${symbol}`;
  }
  
  // Format with 2 decimal places for USD, but remove .00 for whole numbers
  const formatted = Number(amount).toFixed(2);
  const cleanFormatted = formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted;
  return `${symbol}${cleanFormatted}`;
};

// Round IQD amounts to nearest 250 (smallest bill denomination)
export const roundIQDToNearestBill = (amount) => {
  if (amount <= 0) return 0;
  return Math.round(amount / 250) * 250;
};

// Get properly rounded total for payments
export const getRoundedPaymentTotal = (amount, currency) => {
  if (currency === 'IQD') {
    return roundIQDToNearestBill(amount);
  }
  return amount;
};

export const validatePaymentAmount = (totalUSD, paymentIQD) => {
  const requiredIQD = totalUSD * EXCHANGE_RATES.USD_TO_IQD;
  const roundedRequiredIQD = roundIQDToNearestBill(requiredIQD);
  return paymentIQD >= roundedRequiredIQD;
};
