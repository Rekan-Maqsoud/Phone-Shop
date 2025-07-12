const fs = require('fs');
const path = require('path');

// Files to fix
const filesToFix = [
  'src/components/AdvancedAnalytics.jsx',
  'src/pages/Admin.jsx'
];

// Simple profit calculation replacement
const simpleProfitLogic = `
          const quantity = item.quantity || 1;
          const buyingPrice = item.buying_price || 0;
          const sellingPrice = item.selling_price || item.buying_price || 0;
          const productCurrency = item.product_currency || 'IQD';
          const saleCurrency = sale.currency || 'USD';
          
          // Simple profit calculation: selling - buying = profit
          // Convert buying price to sale currency if needed
          let buyingPriceInSaleCurrency = buyingPrice;
          
          if (productCurrency !== saleCurrency) {
            if (saleCurrency === 'USD' && productCurrency === 'IQD') {
              // Convert IQD buying price to USD
              buyingPriceInSaleCurrency = buyingPrice * 0.000694; // Use fixed rate for consistency
            } else if (saleCurrency === 'IQD' && productCurrency === 'USD') {
              // Convert USD buying price to IQD
              buyingPriceInSaleCurrency = buyingPrice * 1440; // Use fixed rate for consistency
            }
          }
          
          const profit = (sellingPrice - buyingPriceInSaleCurrency) * quantity;
`;

function fixProfitCalculations() {
  filesToFix.forEach(filePath => {
    try {
      console.log(`Processing ${filePath}...`);
      const fullPath = path.join(__dirname, filePath);
      
      if (!fs.existsSync(fullPath)) {
        console.log(`File not found: ${fullPath}`);
        return;
      }
      
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace complex profit calculations with simple ones
      // Pattern 1: profit_in_sale_currency with correction logic
      const pattern1 = /if \(item\.profit_in_sale_currency !== undefined && item\.profit_in_sale_currency !== null\) \{[\s\S]*?\} else \{[\s\S]*?const profit = \(sellingPrice - buyingPriceInSaleCurrency\) \* quantity;[\s\S]*?\}/g;
      
      content = content.replace(pattern1, simpleProfitLogic.trim());
      
      // Pattern 2: Simple profit_in_sale_currency usage
      const pattern2 = /\/\/ Use pre-calculated profit from sale time if available[\s\S]*?if \(item\.profit_in_sale_currency !== undefined && item\.profit_in_sale_currency !== null\) \{[\s\S]*?\} else \{[\s\S]*?\}/g;
      
      content = content.replace(pattern2, simpleProfitLogic.trim());
      
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Fixed ${filePath}`);
      
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  });
}

fixProfitCalculations();
console.log('\n🎉 All profit calculations simplified!');
