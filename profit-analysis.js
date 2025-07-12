console.log('=== PROFIT CALCULATION ANALYSIS ===');

// Current situation from your sale:
const buyingPriceUSD = 1000;
const sellingPriceIQD = 1200;
const exchangeRate = 1440; // 1 USD = 1440 IQD

console.log('Phone Details:');
console.log('- Buying Price: $' + buyingPriceUSD + ' USD');
console.log('- Selling Price: ' + sellingPriceIQD + ' IQD');

console.log('\nConversion Analysis:');
const sellingPriceInUSD = sellingPriceIQD / exchangeRate;
console.log('- Selling Price in USD: $' + sellingPriceInUSD.toFixed(2));

console.log('\nProfit Calculation:');
const profitUSD = sellingPriceInUSD - buyingPriceUSD;
const profitIQD = profitUSD * exchangeRate;

console.log('- Profit in USD: $' + profitUSD.toFixed(2));
console.log('- Profit in IQD: ' + profitIQD.toFixed(0) + ' IQD');

console.log('\n=== WHAT SHOULD HAPPEN ===');
console.log('To make $100 profit:');
const targetProfitUSD = 100;
const targetSellingPriceUSD = buyingPriceUSD + targetProfitUSD;
const targetSellingPriceIQD = targetSellingPriceUSD * exchangeRate;

console.log('- Target Selling Price USD: $' + targetSellingPriceUSD);
console.log('- Target Selling Price IQD: ' + targetSellingPriceIQD + ' IQD');
console.log('- Profit would be: $' + targetProfitUSD + ' USD = ' + (targetProfitUSD * exchangeRate) + ' IQD');

console.log('\n=== CONCLUSION ===');
if (profitUSD < 0) {
  console.log('❌ LOSS: You are selling at a loss!');
  console.log('💡 SOLUTION: Increase selling price to at least ' + (buyingPriceUSD * exchangeRate) + ' IQD to break even');
} else {
  console.log('✅ PROFIT: You are making a profit!');
}
