// Check product prices to understand the data
import { EXCHANGE_RATES } from './src/utils/exchangeRates.js';

console.log('Exchange rates:', EXCHANGE_RATES);

// Simulate what normal phone prices should be
console.log('\nNormal price examples:');
console.log('$100 phone -> IQD:', 100 * EXCHANGE_RATES.USD_TO_IQD, 'IQD');
console.log('$500 phone -> IQD:', 500 * EXCHANGE_RATES.USD_TO_IQD, 'IQD');
console.log('$1000 phone -> IQD:', 1000 * EXCHANGE_RATES.USD_TO_IQD, 'IQD');

console.log('\nIf the selling prices in the sales are:');
console.log('1,584,000 IQD -> USD:', 1584000 * EXCHANGE_RATES.IQD_TO_USD, 'USD');
console.log('216,000 IQD -> USD:', 216000 * EXCHANGE_RATES.IQD_TO_USD, 'USD');

console.log('\nThese are very expensive phones if correct, or there might be a currency conversion bug.');
