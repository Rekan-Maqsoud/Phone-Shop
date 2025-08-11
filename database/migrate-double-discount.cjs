// Migration script to fix double discount issue
// This script identifies and fixes purchases that may have had discount applied twice

const Database = require('better-sqlite3');
const path = require('path');

function migrateDoubleDiscount() {
  const dbPath = path.join(__dirname, 'shop.sqlite');
  const db = new Database(dbPath);
  
  console.log('🔍 Checking for potential double discount issues...');
  
  try {
    // Look for company debts with items that have discounts
    const companyDebtsWithDiscounts = db.prepare(`
      SELECT cd.id, cd.company_name, cd.description, cd.created_at, cd.currency,
             cd.amount, cd.usd_amount, cd.iqd_amount
      FROM company_debts cd
      WHERE cd.has_items = 1 
      AND EXISTS (
        SELECT 1 FROM company_debt_items cdi 
        WHERE cdi.debt_id = cd.id
      )
      AND cd.created_at > '2024-01-01'
      ORDER BY cd.created_at DESC
    `).all();
    
    console.log(`📊 Found ${companyDebtsWithDiscounts.length} company debts with items to check`);
    
    let potentialDoubleDiscountCount = 0;
    
    for (const debt of companyDebtsWithDiscounts) {
      // Get items for this debt
      const items = db.prepare(`
        SELECT * FROM company_debt_items WHERE debt_id = ?
      `).all(debt.id);
      
      // Calculate expected total from items
      let expectedUSDTotal = 0;
      let expectedIQDTotal = 0;
      
      items.forEach(item => {
        const total = item.quantity * item.unit_price;
        if (item.currency === 'USD') {
          expectedUSDTotal += total;
        } else {
          expectedIQDTotal += total;
        }
      });
      
      // Check if the debt amount is significantly less than expected (indicating possible double discount)
      const tolerance = 0.01; // 1 cent tolerance for USD
      const iqdTolerance = 250; // 250 IQD tolerance
      
      let suspiciousDiscount = false;
      
      if (debt.currency === 'USD' && expectedUSDTotal > 0) {
        const ratio = debt.amount / expectedUSDTotal;
        if (ratio < 0.9 && ratio > 0.5) { // Between 50%-90% suggests discount applied
          suspiciousDiscount = true;
        }
      } else if (debt.currency === 'IQD' && expectedIQDTotal > 0) {
        const ratio = debt.amount / expectedIQDTotal;
        if (ratio < 0.9 && ratio > 0.5) { // Between 50%-90% suggests discount applied
          suspiciousDiscount = true;
        }
      } else if (debt.currency === 'MULTI') {
        // Check multi-currency debts
        if (debt.usd_amount && expectedUSDTotal > 0) {
          const usdRatio = debt.usd_amount / expectedUSDTotal;
          if (usdRatio < 0.9 && usdRatio > 0.5) {
            suspiciousDiscount = true;
          }
        }
        if (debt.iqd_amount && expectedIQDTotal > 0) {
          const iqdRatio = debt.iqd_amount / expectedIQDTotal;
          if (iqdRatio < 0.9 && iqdRatio > 0.5) {
            suspiciousDiscount = true;
          }
        }
      }
      
      if (suspiciousDiscount) {
        potentialDoubleDiscountCount++;
        console.log(`⚠️  Potential double discount found:`);
        console.log(`   Company: ${debt.company_name}`);
        console.log(`   Date: ${debt.created_at}`);
        console.log(`   Debt ID: ${debt.id}`);
        console.log(`   Expected Total USD: ${expectedUSDTotal}`);
        console.log(`   Expected Total IQD: ${expectedIQDTotal}`);
        console.log(`   Actual Amount: ${debt.amount} ${debt.currency}`);
        console.log(`   Items count: ${items.length}`);
        console.log('   ---');
      }
    }
    
    if (potentialDoubleDiscountCount === 0) {
      console.log('✅ No potential double discount issues found!');
    } else if (potentialDoubleDiscountCount === 1) {
      console.log(`⚠️  Found ${potentialDoubleDiscountCount} potential double discount issue.`);
      console.log('📝 Manual review recommended. Check if this purchase had a discount applied.');
      console.log('💡 If confirmed, you can manually adjust the debt amount in the admin panel.');
    } else {
      console.log(`⚠️  Found ${potentialDoubleDiscountCount} potential double discount issues.`);
      console.log('📝 Manual review recommended for each case.');
    }
    
    return potentialDoubleDiscountCount;
    
  } catch (error) {
    console.error('❌ Error during migration check:', error);
    return -1;
  } finally {
    db.close();
  }
}

// Run the migration if called directly
if (require.main === module) {
  migrateDoubleDiscount();
}

module.exports = { migrateDoubleDiscount };
