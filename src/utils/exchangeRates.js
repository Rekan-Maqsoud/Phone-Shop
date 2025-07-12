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
    // IQD always shows as whole numbers (no decimals ever)
    const rounded = Math.round(amount);
    return `${rounded.toLocaleString()}${symbol}`;
  }
  
  // For USD: Show whole numbers when possible, otherwise show minimal decimals
  const numAmount = Number(amount);
  if (numAmount === Math.floor(numAmount)) {
    // It's a whole number, show without decimals
    return `${symbol}${Math.floor(numAmount).toLocaleString()}`;
  } else {
    // It has decimals, format with 2 decimal places but remove trailing zeros
    const formatted = numAmount.toFixed(2);
    const cleanFormatted = formatted.replace(/\.?0+$/, '');
    return `${symbol}${cleanFormatted}`;
  }
};

// Round IQD amounts to nearest 250 (smallest bill denomination)
export const roundIQDToNearestBill = (amount) => {
  if (amount <= 0) return 0;
  return Math.round(amount / 250) * 250;
};

export const validatePaymentAmount = (totalUSD, paymentIQD) => {
  const requiredIQD = totalUSD * EXCHANGE_RATES.USD_TO_IQD;
  const roundedRequiredIQD = roundIQDToNearestBill(requiredIQD);
  return paymentIQD >= roundedRequiredIQD;
};
