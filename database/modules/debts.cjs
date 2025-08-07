// Customer and company debt management functions
const settings = require('./settings.cjs');

function getCustomerDebts(db) {
  try {
    return db.prepare('SELECT * FROM customer_debts ORDER BY created_at DESC').all();
  } catch (error) {
    console.error('❌ [debts.cjs] Error getting customer debts:', error);
    return [];
  }
}

function getDebtPayments(db, debtType, debtId) {
  try {
    return db.prepare('SELECT * FROM debt_payments WHERE debt_type = ? AND debt_id = ? ORDER BY payment_date ASC')
      .all(debtType, debtId);
  } catch (error) {
    console.error('❌ [debts.cjs] Error getting debt payments:', error);
    return [];
  }
}

function addCustomerDebt(db, { customer_name, amount, description, currency = 'IQD', sale_id = null }) {
  try {
    // Validate required parameters
    if (!customer_name || !amount || amount <= 0) {
      throw new Error('Invalid customer debt data: customer_name and positive amount are required');
    }
    
    const now = new Date().toISOString();
    const transaction = db.transaction(() => {
      return db.prepare('INSERT INTO customer_debts (customer_name, amount, description, created_at, currency, sale_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(customer_name, amount, description, now, currency, sale_id);
    });
    
    return transaction();
  } catch (error) {
    console.error('❌ [debts.cjs] Error adding customer debt:', error);
    throw error;
  }
}

function payCustomerDebt(db, id) {
  try {
    if (!id || isNaN(Number(id))) {
      throw new Error('Invalid debt ID provided');
    }
    
    const now = new Date().toISOString();
    const transaction = db.transaction(() => {
      // Check if debt exists and is unpaid
      const debt = db.prepare('SELECT * FROM customer_debts WHERE id = ? AND paid_at IS NULL').get(id);
      if (!debt) {
        throw new Error('Debt not found or already paid');
      }
      
      return db.prepare('UPDATE customer_debts SET paid_at = ? WHERE id = ?').run(now, id);
    });
    
    return transaction();
  } catch (error) {
    console.error('❌ [debts.cjs] Error paying customer debt:', error);
    throw error;
  }
}

// Enhanced function for marking customer debt as paid with multi-currency support and balance addition
function markCustomerDebtPaid(db, id, paymentData) {
  const { 
    paid_at, 
    payment_currency_used, 
    payment_usd_amount = 0, 
    payment_iqd_amount = 0 
  } = paymentData || {};
  
  const now = paid_at || new Date().toISOString();
  
  const transaction = db.transaction(() => {
    try {
      // Get current debt info before updating for transaction record
      const debtInfo = db.prepare(`
        SELECT customer_name, amount, description, currency,
               payment_usd_amount as current_paid_usd, 
               payment_iqd_amount as current_paid_iqd,
               paid_at
        FROM customer_debts WHERE id = ?
      `).get(id);
      
      if (!debtInfo) {
        return { success: false, message: 'Customer debt not found' };
      }
      
      // If no specific payment amounts are provided, use the debt's original amount and currency
      let finalUSDAmount = payment_usd_amount;
      let finalIQDAmount = payment_iqd_amount;
      
      // Check if this is a single currency payment (only one amount is non-zero)
      const isSingleCurrencyPayment = (payment_usd_amount > 0 && payment_iqd_amount === 0) || 
                                      (payment_iqd_amount > 0 && payment_usd_amount === 0);
      
      if (payment_usd_amount === 0 && payment_iqd_amount === 0 && debtInfo) {
        // No custom payment amounts specified, use the debt's original amount
        if (debtInfo.currency === 'USD') {
          finalUSDAmount = debtInfo.amount;
          finalIQDAmount = 0;
        } else {
          finalUSDAmount = 0;
          finalIQDAmount = debtInfo.amount;
        }
      } else if (isSingleCurrencyPayment) {
        // For single currency payments, respect the currency the customer actually paid with
        // Don't force it to match the original debt currency
        finalUSDAmount = payment_usd_amount || 0;
        finalIQDAmount = payment_iqd_amount || 0;
      }
      
      // Calculate cumulative payment amounts for partial payment support
      const currentPaidUSD = debtInfo.current_paid_usd || 0;
      const currentPaidIQD = debtInfo.current_paid_iqd || 0;
      const newTotalPaidUSD = currentPaidUSD + finalUSDAmount;
      const newTotalPaidIQD = currentPaidIQD + finalIQDAmount;
      
      // Check if this payment fully pays off the debt based on the original currency
      const { getExchangeRate } = require('./settings.cjs');
      const currentUSDToIQD = getExchangeRate(db, 'USD', 'IQD');
      const currentIQDToUSD = 1 / currentUSDToIQD;
      
      let isFullyPaid = false;
      let remainingCustomerDebt = 0;
      
      if (debtInfo.currency === 'USD') {
        // For USD debts, convert total paid to USD equivalent
        const totalPaidUSDEquivalent = newTotalPaidUSD + (newTotalPaidIQD / currentUSDToIQD);
        remainingCustomerDebt = debtInfo.amount - totalPaidUSDEquivalent;
        isFullyPaid = remainingCustomerDebt <= 0.01; // USD tolerance
      } else {
        // For IQD debts (or unknown), convert total paid to IQD equivalent
        const totalPaidIQDEquivalent = newTotalPaidIQD + (newTotalPaidUSD * currentUSDToIQD);
        remainingCustomerDebt = debtInfo.amount - totalPaidIQDEquivalent;
        isFullyPaid = remainingCustomerDebt <= 1; // 1 IQD tolerance
      }
      
      // Only set paid_at if fully paid
      const paidAtValue = isFullyPaid ? now : null;
      
      // Record this specific payment in the debt_payments table
      // This allows us to track each payment's exchange rate accurately
      const recordPaymentStmt = db.prepare(`
        INSERT INTO debt_payments (debt_type, debt_id, payment_usd_amount, payment_iqd_amount, 
                                   payment_currency_used, exchange_rate_usd_to_iqd, exchange_rate_iqd_to_usd, 
                                   payment_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      recordPaymentStmt.run(
        'customer',
        id,
        finalUSDAmount || 0,
        finalIQDAmount || 0,
        payment_currency_used || (finalUSDAmount > 0 && finalIQDAmount > 0 ? 'MULTI' : (finalUSDAmount > 0 ? 'USD' : 'IQD')),
        currentUSDToIQD,
        currentIQDToUSD,
        now
      );

      // Update the debt record - accumulate payments, only mark as paid if fully paid
      // Also save the latest payment exchange rate for remaining debt calculations
      const updateStmt = db.prepare(`
        UPDATE customer_debts 
        SET paid_at = ?, 
            payment_usd_amount = ?, 
            payment_iqd_amount = ?,
            payment_exchange_rate_usd_to_iqd = ?,
            payment_exchange_rate_iqd_to_usd = ?
        WHERE id = ?
      `);
      
      const result = updateStmt.run(
        paidAtValue, 
        newTotalPaidUSD || 0, 
        newTotalPaidIQD || 0,
        currentUSDToIQD,
        currentIQDToUSD,
        id
      );
      
      // Record transaction - track the actual payment amounts made
      // Use different transaction types for partial vs full payments
      const transactionType = isFullyPaid ? 'customer_debt_payment_final' : 'customer_debt_payment_partial';
      const addTransactionStmt = db.prepare(`
        INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      addTransactionStmt.run(
        transactionType,
        finalUSDAmount || 0,
        finalIQDAmount || 0,
        `Customer debt payment ${isFullyPaid ? '(FINAL)' : '(PARTIAL)'}: ${debtInfo.customer_name} - ${debtInfo.description || 'Payment'}`,
        id,
        'customer_debt',
        now
      );
      
      // Update the corresponding sale record to reflect actual payment made
      // Find the sale record linked to this debt
      const findSaleStmt = db.prepare('SELECT sale_id FROM customer_debts WHERE id = ?');
      const debtRecord = findSaleStmt.get(id);
      
      if (debtRecord && debtRecord.sale_id) {
        if (isFullyPaid) {
          // ONLY update sale record when debt is FULLY paid
          // This moves it to sales history for profit/revenue calculation
          const updateSaleStmt = db.prepare(`
            UPDATE sales 
            SET paid_amount_usd = ?, 
                paid_amount_iqd = ?,
                is_multi_currency = ?,
                currency = ?,
                total = ?
            WHERE id = ?
          `);
          
          const isMultiCurrencyPayment = newTotalPaidUSD > 0 && newTotalPaidIQD > 0;
          const actualPaymentCurrency = isMultiCurrencyPayment ? 'MULTI' : 
                                        (newTotalPaidUSD > 0 ? 'USD' : 'IQD');
          
          // Use the total payments made (for multi-currency, convert to consistent currency)
          let actualTotalPaid = 0;
          if (isMultiCurrencyPayment) {
            // For multi-currency, use USD equivalent
            actualTotalPaid = newTotalPaidUSD + (newTotalPaidIQD / currentUSDToIQD);
          } else if (newTotalPaidUSD > 0) {
            actualTotalPaid = newTotalPaidUSD;
          } else {
            actualTotalPaid = newTotalPaidIQD;
          }
          
          updateSaleStmt.run(
            newTotalPaidUSD || 0,
            newTotalPaidIQD || 0,
            isMultiCurrencyPayment ? 1 : 0,
            actualPaymentCurrency,
            actualTotalPaid,
            debtRecord.sale_id
          );
        }
        // If partially paid, DON'T update sales - keep it as debt until fully paid
      }
      
      // Add to the user's balance based on the actual payment amounts received
      // This correctly tracks what currency the customer actually paid with
      if (finalUSDAmount > 0) {
        settings.updateBalance(db, 'USD', finalUSDAmount);
      }
      
      // Add IQD amount if any IQD was paid by customer
      if (finalIQDAmount > 0) {
        settings.updateBalance(db, 'IQD', finalIQDAmount);
      }
      
      return { 
        success: true, 
        changes: result.changes, 
        isFullyPaid,
        remainingDebt: Math.max(0, remainingCustomerDebt),
        remainingDebtCurrency: debtInfo.currency,
        totalPaidUSD: newTotalPaidUSD,
        totalPaidIQD: newTotalPaidIQD
      };
    } catch (error) {
      console.error('❌ [debts.cjs] Error marking customer debt as paid:', error);
      return { success: false, message: error.message };
    }
  });
  
  return transaction();
}

function deleteCustomerDebt(db, id) {
  try {
    if (!id || isNaN(Number(id))) {
      throw new Error('Invalid debt ID provided');
    }
    
    const transaction = db.transaction(() => {
      // Check if debt exists
      const debt = db.prepare('SELECT * FROM customer_debts WHERE id = ?').get(id);
      if (!debt) {
        throw new Error('Debt not found');
      }
      
      return db.prepare('DELETE FROM customer_debts WHERE id = ?').run(id);
    });
    
    return transaction();
  } catch (error) {
    console.error('❌ [debts.cjs] Error deleting customer debt:', error);
    throw error;
  }
}

// New function to pay total customer debt for a specific customer
function payCustomerDebtTotal(db, customerName, paymentData) {
  const { 
    payment_usd_amount = 0, 
    payment_iqd_amount = 0 
  } = paymentData || {};
  
  if (!customerName) {
    throw new Error('Customer name is required');
  }
  
  const now = new Date().toISOString();
  
  const transaction = db.transaction(() => {
    try {
      // Get all unpaid debts for this customer, ordered by creation date (oldest first)
      // Use case-insensitive comparison
      const unpaidDebts = db.prepare(`
        SELECT id, customer_name, amount, description, currency,
               payment_usd_amount, payment_iqd_amount, created_at
        FROM customer_debts 
        WHERE LOWER(customer_name) = LOWER(?) AND paid_at IS NULL
        ORDER BY created_at ASC
      `).all(customerName);
      
      if (unpaidDebts.length === 0) {
        // Check if customer exists with any debts (paid or unpaid)
        const anyDebts = db.prepare(`
          SELECT COUNT(*) as count FROM customer_debts WHERE LOWER(customer_name) = LOWER(?)
        `).get(customerName);
        
        if (anyDebts.count === 0) {
          return { success: false, message: `No debts found for customer: ${customerName}` };
        } else {
          return { success: false, message: `No unpaid debts found for customer: ${customerName}` };
        }
      }
      
      // Get current exchange rates
      const { getExchangeRate } = require('./settings.cjs');
      const currentUSDToIQD = getExchangeRate(db, 'USD', 'IQD');
      const currentIQDToUSD = 1 / currentUSDToIQD;
      
      let remainingUSDPayment = payment_usd_amount;
      let remainingIQDPayment = payment_iqd_amount;
      let totalPaidUSD = 0;
      let totalPaidIQD = 0;
      let paidDebts = [];
      
      // Process each debt in order (oldest first)
      for (const debt of unpaidDebts) {
        if (remainingUSDPayment <= 0 && remainingIQDPayment <= 0) {
          break; // No more payment left
        }
        
        // Calculate remaining debt for this specific debt
        const currentPaidUSD = debt.payment_usd_amount || 0;
        const currentPaidIQD = debt.payment_iqd_amount || 0;
        
        let remainingDebtUSD = 0;
        let remainingDebtIQD = 0;
        
        if (debt.currency === 'USD') {
          const paidIQDInUSD = currentPaidIQD / currentUSDToIQD;
          remainingDebtUSD = Math.max(0, debt.amount - currentPaidUSD - paidIQDInUSD);
          remainingDebtIQD = 0;
        } else {
          // IQD or default
          const paidUSDInIQD = currentPaidUSD * currentUSDToIQD;
          remainingDebtIQD = Math.max(0, debt.amount - currentPaidIQD - paidUSDInIQD);
          remainingDebtUSD = 0;
        }
        
        // Apply payment to this debt
        let usdToApply = 0;
        let iqdToApply = 0;
        
        // For single-currency debts, use the existing logic
        // First, try to pay with matching currency
        if (remainingDebtUSD > 0 && remainingUSDPayment > 0) {
          usdToApply = Math.min(remainingDebtUSD, remainingUSDPayment);
          remainingUSDPayment -= usdToApply;
          remainingDebtUSD -= usdToApply;
        }
        
        if (remainingDebtIQD > 0 && remainingIQDPayment > 0) {
          iqdToApply = Math.min(remainingDebtIQD, remainingIQDPayment);
          remainingIQDPayment -= iqdToApply;
          remainingDebtIQD -= iqdToApply;
        }
        
        // Cross-currency payment for single-currency debts
        if (remainingDebtUSD > 0 && remainingIQDPayment > 0) {
          const iqdToUSDForDebt = Math.min(remainingIQDPayment, remainingDebtUSD * currentUSDToIQD);
          iqdToApply += iqdToUSDForDebt;
          remainingIQDPayment -= iqdToUSDForDebt;
          remainingDebtUSD -= iqdToUSDForDebt / currentUSDToIQD;
        }
        
        if (remainingDebtIQD > 0 && remainingUSDPayment > 0) {
          const usdToIQDForDebt = Math.min(remainingUSDPayment, remainingDebtIQD / currentUSDToIQD);
          usdToApply += usdToIQDForDebt;
          remainingUSDPayment -= usdToIQDForDebt;
          remainingDebtIQD -= usdToIQDForDebt * currentUSDToIQD;
        }
        
        // Apply the payment to this debt
        if (usdToApply > 0 || iqdToApply > 0) {
          const newTotalPaidUSD = currentPaidUSD + usdToApply;
          const newTotalPaidIQD = currentPaidIQD + iqdToApply;
          
          // Check if this debt is now fully paid
          let isFullyPaid = false;
          if (debt.currency === 'USD') {
            const totalPaidUSDEquivalent = newTotalPaidUSD + (newTotalPaidIQD / currentUSDToIQD);
            isFullyPaid = totalPaidUSDEquivalent >= (debt.amount - 0.01);
          } else {
            const totalPaidIQDEquivalent = newTotalPaidIQD + (newTotalPaidUSD * currentUSDToIQD);
            isFullyPaid = totalPaidIQDEquivalent >= (debt.amount - 250);
          }
          
          // Update the debt
          const updateStmt = db.prepare(`
            UPDATE customer_debts 
            SET paid_at = ?, 
                payment_usd_amount = ?, 
                payment_iqd_amount = ?,
                payment_exchange_rate_usd_to_iqd = ?,
                payment_exchange_rate_iqd_to_usd = ?
            WHERE id = ?
          `);
          
          updateStmt.run(
            isFullyPaid ? now : null,
            newTotalPaidUSD,
            newTotalPaidIQD,
            currentUSDToIQD,
            currentIQDToUSD,
            debt.id
          );
          
          // Record this payment in debt_payments table
          const recordPaymentStmt = db.prepare(`
            INSERT INTO debt_payments (debt_type, debt_id, payment_usd_amount, payment_iqd_amount, 
                                       payment_currency_used, exchange_rate_usd_to_iqd, exchange_rate_iqd_to_usd, 
                                       payment_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          recordPaymentStmt.run(
            'customer',
            debt.id,
            usdToApply || 0,
            iqdToApply || 0,
            (usdToApply > 0 && iqdToApply > 0) ? 'MULTI' : (usdToApply > 0 ? 'USD' : 'IQD'),
            currentUSDToIQD,
            currentIQDToUSD,
            now
          );
          
          totalPaidUSD += usdToApply;
          totalPaidIQD += iqdToApply;
          paidDebts.push({ ...debt, paidAmount: { usd: usdToApply, iqd: iqdToApply }, fullyPaid: isFullyPaid });
        }
      }
      
      // Record the total transaction
      if (totalPaidUSD > 0 || totalPaidIQD > 0) {
        const addTransactionStmt = db.prepare(`
          INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        addTransactionStmt.run(
          'customer_debt_payment',
          totalPaidUSD || 0, // Positive for receiving
          totalPaidIQD || 0, // Positive for receiving
          `Total customer debt payment: ${customerName} - Paid ${paidDebts.length} debt(s)`,
          null, // No single reference ID since we're paying multiple debts
          'customer_debt_total',
          now
        );
      }
      
      // Add to the user's balance based on what currency was actually used
      if (totalPaidUSD > 0) {
        settings.updateBalance(db, 'USD', totalPaidUSD);
      }
      if (totalPaidIQD > 0) {
        settings.updateBalance(db, 'IQD', totalPaidIQD);
      }
      
      return { 
        success: true, 
        message: `Successfully processed payment for ${customerName}`,
        paidDebts,
        totalPaid: { usd: totalPaidUSD, iqd: totalPaidIQD },
        remainingPayment: { usd: remainingUSDPayment, iqd: remainingIQDPayment },
        hasOverpayment: remainingUSDPayment > 0 || remainingIQDPayment > 0
      };
      
    } catch (error) {
      console.error('❌ [debts.cjs] Error in payCustomerDebtTotal:', error);
      throw error;
    }
  });
  
  return transaction();
}

// Force USD debt payment - only pay USD debts, but allow any currency balance to be used
function payCustomerDebtTotalForcedUSD(db, customerName, paymentData) {
  const { 
    payment_usd_amount = 0, 
    payment_iqd_amount = 0 
  } = paymentData || {};
  
  if (!customerName) {
    throw new Error('Customer name is required');
  }
  
  const now = new Date().toISOString();
  
  // Get current exchange rates from settings instead of hardcoded fallback
  const { getExchangeRate } = require('./settings.cjs');
  const currentUSDToIQD = getExchangeRate(db, 'USD', 'IQD');
  
  const transaction = db.transaction(() => {
    try {
      // Get all unpaid debts for this customer
      const unpaidDebts = db.prepare(`
        SELECT id, customer_name, amount, description, currency,
               payment_usd_amount, payment_iqd_amount, created_at
        FROM customer_debts 
        WHERE LOWER(customer_name) = LOWER(?) AND paid_at IS NULL
        ORDER BY created_at ASC
      `).all(customerName);
      
      if (unpaidDebts.length === 0) {
        return {
          success: true,
          message: 'No unpaid debts found for this customer',
          paidDebts: [],
          totalPaid: { usd: 0, iqd: 0 },
          remainingPayment: { usd: payment_usd_amount, iqd: payment_iqd_amount },
          hasOverpayment: payment_usd_amount > 0 || payment_iqd_amount > 0
        };
      }
      
      // Calculate total remaining USD debt for this customer - ONLY USD debts
      let totalRemainingUSDDebt = 0;
      const usdDebts = []; // USD debts only
      
      for (const debt of unpaidDebts) {
        const currentPaidUSD = debt.payment_usd_amount || 0;
        const currentPaidIQD = debt.payment_iqd_amount || 0;
        
        if (debt.currency === 'USD') {
          const totalPaidUSDEquivalent = currentPaidUSD + (currentPaidIQD / currentUSDToIQD);
          const remainingDebtUSD = Math.max(0, debt.amount - totalPaidUSDEquivalent);
          
          if (remainingDebtUSD > 0) {
            totalRemainingUSDDebt += remainingDebtUSD;
            usdDebts.push({
              ...debt,
              remainingAmount: remainingDebtUSD
            });
          }
        }
        // IGNORE IQD-only debts completely for forced USD payment
      }
      
      // Only USD debts for forced USD payment
      const allDebtsForPayment = [...usdDebts];
      
      if (allDebtsForPayment.length === 0) {
        return {
          success: true,
          message: 'No unpaid USD debts found for this customer',
          paidDebts: [],
          totalPaid: { usd: 0, iqd: 0 },
          remainingPayment: { usd: payment_usd_amount, iqd: payment_iqd_amount },
          hasOverpayment: payment_usd_amount > 0 || payment_iqd_amount > 0
        };
      }
      
      // Apply payment to all debts (USD priority), but track which currency is being used to pay
      let remainingUSDPayment = payment_usd_amount;
      let remainingIQDPayment = payment_iqd_amount;
      let totalPaidFromUSD = 0;
      let totalPaidFromIQD = 0;
      let paidDebts = [];
      
      // Pay debts until payment is exhausted (USD debts only)
      for (const debt of allDebtsForPayment) {
        // Continue as long as there's any payment available (USD OR IQD)
        if (remainingUSDPayment <= 0 && remainingIQDPayment <= 0) break;
        
        const currentPaidUSD = debt.payment_usd_amount || 0;
        const currentPaidIQD = debt.payment_iqd_amount || 0;
        
        let paymentFromUSDBalance = 0;
        let paymentFromIQDBalance = 0;
        
        // Payment logic: Only USD debts allowed in forced USD payment
        if (debt.currency === 'USD') {
          // Try to pay with USD balance first for USD debts
          if (remainingUSDPayment > 0) {
            paymentFromUSDBalance = Math.min(remainingUSDPayment, debt.remainingAmount);
            remainingUSDPayment -= paymentFromUSDBalance;
          }
          
          // If still debt remaining, pay with IQD balance (converted to USD equivalent)
          const stillOwedAfterUSD = debt.remainingAmount - paymentFromUSDBalance;
          if (stillOwedAfterUSD > 0 && remainingIQDPayment > 0) {
            const iqdNeededForDebt = stillOwedAfterUSD * currentUSDToIQD;
            paymentFromIQDBalance = Math.min(remainingIQDPayment, iqdNeededForDebt);
            remainingIQDPayment -= paymentFromIQDBalance;
          }
        }
        
        if (paymentFromUSDBalance > 0 || paymentFromIQDBalance > 0) {
          // For single-currency debts, use the original logic
          const updatedPaidUSD = currentPaidUSD + paymentFromUSDBalance;
          const updatedPaidIQD = currentPaidIQD + paymentFromIQDBalance;
          
          // Check if this specific debt is fully paid based on its currency type
          let isFullyPaid = false;
          if (debt.currency === 'USD') {
            const totalPaidUSDEquivalent = updatedPaidUSD + (updatedPaidIQD / currentUSDToIQD);
            isFullyPaid = totalPaidUSDEquivalent >= debt.amount;
          }
          
          const paidAt = isFullyPaid ? now : null;
          
          // Update debt record
          db.prepare(`
            UPDATE customer_debts 
            SET payment_usd_amount = ?, payment_iqd_amount = ?, paid_at = ?
            WHERE id = ?
          `).run(updatedPaidUSD, updatedPaidIQD, paidAt, debt.id);
          
          paidDebts.push({
            id: debt.id,
            customer_name: debt.customer_name,
            description: debt.description,
            paymentUSD: paymentFromUSDBalance,
            paymentIQD: paymentFromIQDBalance,
            fullyPaid: isFullyPaid
          });
          
          totalPaidFromUSD += paymentFromUSDBalance;
          totalPaidFromIQD += paymentFromIQDBalance;
        }
      }
      
      // Add to user's balance based on what currency was actually used
      if (totalPaidFromUSD > 0) {
        settings.updateBalance(db, 'USD', totalPaidFromUSD);
      }
      if (totalPaidFromIQD > 0) {
        settings.updateBalance(db, 'IQD', totalPaidFromIQD);
      }
      
      // Check if there's still any debt remaining after payment (all currencies)
      const remainingAllDebts = db.prepare(`
        SELECT SUM(
          CASE 
            WHEN currency = 'USD' THEN amount - COALESCE(payment_usd_amount, 0) - COALESCE(payment_iqd_amount, 0) / 1440
            WHEN currency = 'IQD' THEN amount - COALESCE(payment_iqd_amount, 0) - COALESCE(payment_usd_amount, 0) * 1440
            ELSE amount
          END
        ) as total_remaining
        FROM customer_debts 
        WHERE customer_name = ? AND paid_at IS NULL
      `).get(customerName);
      
      const finalRemainingDebt = remainingAllDebts?.total_remaining || 0;
      const actualOverpayment = (remainingUSDPayment > 0 || remainingIQDPayment > 0) && finalRemainingDebt <= 0;

      // Record the total transaction for forced USD payment
      if (totalPaidFromUSD > 0 || totalPaidFromIQD > 0) {
        const addTransactionStmt = db.prepare(`
          INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        addTransactionStmt.run(
          'customer_debt_payment',
          totalPaidFromUSD || 0, // Positive for receiving
          totalPaidFromIQD || 0, // Positive for receiving
          `Forced USD debt payment: ${customerName} - Paid ${paidDebts.length} debt(s)`,
          null, // No single reference ID since we're paying multiple debts
          'customer_debt_forced_usd',
          now
        );
      }

      return {
        success: true,
        message: `USD debt payment completed for ${customerName}`,
        paidDebts,
        totalPaid: { usd: totalPaidFromUSD, iqd: totalPaidFromIQD },
        remainingPayment: { usd: remainingUSDPayment, iqd: remainingIQDPayment },
        hasOverpayment: actualOverpayment,
        paymentMethod: 'forced_usd'
      };
      
    } catch (error) {
      console.error('❌ [debts.cjs] Error in payCustomerDebtTotalForcedUSD:', error);
      throw error;
    }
  });
  
  return transaction();
}

// Force IQD debt payment - only pay IQD debts, but allow any currency balance to be used
function payCustomerDebtTotalForcedIQD(db, customerName, paymentData) {
  const { 
    payment_usd_amount = 0, 
    payment_iqd_amount = 0 
  } = paymentData || {};
  
  if (!customerName) {
    throw new Error('Customer name is required');
  }
  
  const now = new Date().toISOString();
  
  // Get current exchange rates from settings instead of hardcoded fallback
  const { getExchangeRate } = require('./settings.cjs');
  const currentUSDToIQD = getExchangeRate(db, 'USD', 'IQD');
  
  const transaction = db.transaction(() => {
    try {
      // Get all unpaid debts for this customer
      const unpaidDebts = db.prepare(`
        SELECT id, customer_name, amount, description, currency,
               payment_usd_amount, payment_iqd_amount, created_at
        FROM customer_debts 
        WHERE LOWER(customer_name) = LOWER(?) AND paid_at IS NULL
        ORDER BY created_at ASC
      `).all(customerName);
      
      if (unpaidDebts.length === 0) {
        return {
          success: true,
          message: 'No unpaid debts found for this customer',
          paidDebts: [],
          totalPaid: { usd: 0, iqd: 0 },
          remainingPayment: { usd: payment_usd_amount, iqd: payment_iqd_amount },
          hasOverpayment: payment_usd_amount > 0 || payment_iqd_amount > 0
        };
      }
      
      // Calculate total remaining IQD debt for this customer - ONLY IQD debts
      let totalRemainingIQDDebt = 0;
      const iqdDebts = []; // IQD debts only
      
      for (const debt of unpaidDebts) {
        const currentPaidIQD = debt.payment_iqd_amount || 0;
        const currentPaidUSD = debt.payment_usd_amount || 0;
        
        if (debt.currency === 'IQD') {
          const totalPaidIQDEquivalent = currentPaidIQD + (currentPaidUSD * currentUSDToIQD);
          const remainingDebtIQD = Math.max(0, debt.amount - totalPaidIQDEquivalent);
          
          if (remainingDebtIQD > 0) {
            totalRemainingIQDDebt += remainingDebtIQD;
            iqdDebts.push({
              ...debt,
              remainingAmount: remainingDebtIQD
            });
          }
        }
        // IGNORE USD-only debts completely for forced IQD payment
      }
      
      // Only IQD debts for forced IQD payment
      const allDebtsForPayment = [...iqdDebts];
      
      if (allDebtsForPayment.length === 0) {
        return {
          success: true,
          message: 'No unpaid IQD debts found for this customer',
          paidDebts: [],
          totalPaid: { usd: 0, iqd: 0 },
          remainingPayment: { usd: payment_usd_amount, iqd: payment_iqd_amount },
          hasOverpayment: payment_usd_amount > 0 || payment_iqd_amount > 0
        };
      }
      
      // Apply payment to all debts (IQD priority), but track which currency is being used to pay
      let remainingUSDPayment = payment_usd_amount;
      let remainingIQDPayment = payment_iqd_amount;
      let totalPaidFromUSD = 0;
      let totalPaidFromIQD = 0;
      let paidDebts = [];
      
      // Pay debts until payment is exhausted (IQD debts only)
      for (const debt of allDebtsForPayment) {
        // Continue as long as there's any payment available (USD OR IQD)
        if (remainingUSDPayment <= 0 && remainingIQDPayment <= 0) break;
        
        const currentPaidUSD = debt.payment_usd_amount || 0;
        const currentPaidIQD = debt.payment_iqd_amount || 0;
        
        let paymentFromUSDBalance = 0;
        let paymentFromIQDBalance = 0;
        
        // Payment logic: Only IQD debts allowed in forced IQD payment
        if (debt.currency === 'IQD') {
          // Try to pay with IQD balance first for IQD debts
          if (remainingIQDPayment > 0) {
            paymentFromIQDBalance = Math.min(remainingIQDPayment, debt.remainingAmount);
            remainingIQDPayment -= paymentFromIQDBalance;
          }
          
          // If still debt remaining, pay with USD balance (converted to IQD equivalent)
          const stillOwedAfterIQD = debt.remainingAmount - paymentFromIQDBalance;
          if (stillOwedAfterIQD > 0 && remainingUSDPayment > 0) {
            const usdNeededForDebt = stillOwedAfterIQD / currentUSDToIQD;
            paymentFromUSDBalance = Math.min(remainingUSDPayment, usdNeededForDebt);
            remainingUSDPayment -= paymentFromUSDBalance;
          }
        }
        
        if (paymentFromUSDBalance > 0 || paymentFromIQDBalance > 0) {
          // For single-currency debts, use the original logic
          const updatedPaidUSD = currentPaidUSD + paymentFromUSDBalance;
          const updatedPaidIQD = currentPaidIQD + paymentFromIQDBalance;
          
          // Check if this specific debt is fully paid based on its currency type
          let isFullyPaid = false;
          if (debt.currency === 'IQD') {
            const totalPaidIQDEquivalent = updatedPaidIQD + (updatedPaidUSD * currentUSDToIQD);
            isFullyPaid = totalPaidIQDEquivalent >= debt.amount;
          }
          
          const paidAt = isFullyPaid ? now : null;
          
          // Update debt record
          db.prepare(`
            UPDATE customer_debts 
            SET payment_usd_amount = ?, payment_iqd_amount = ?, paid_at = ?
            WHERE id = ?
          `).run(updatedPaidUSD, updatedPaidIQD, paidAt, debt.id);
          
          paidDebts.push({
            id: debt.id,
            customer_name: debt.customer_name,
            description: debt.description,
            paymentUSD: paymentFromUSDBalance,
            paymentIQD: paymentFromIQDBalance,
            fullyPaid: isFullyPaid
          });
          
          totalPaidFromUSD += paymentFromUSDBalance;
          totalPaidFromIQD += paymentFromIQDBalance;
        }
      }
      
      // Add to user's balance based on what currency was actually used
      if (totalPaidFromUSD > 0) {
        settings.updateBalance(db, 'USD', totalPaidFromUSD);
      }
      if (totalPaidFromIQD > 0) {
        settings.updateBalance(db, 'IQD', totalPaidFromIQD);
      }
      
      // Check if there's still any debt remaining after payment (all currencies)
      const remainingAllDebts = db.prepare(`
        SELECT SUM(
          CASE 
            WHEN currency = 'USD' THEN amount - COALESCE(payment_usd_amount, 0) - COALESCE(payment_iqd_amount, 0) / 1440
            WHEN currency = 'IQD' THEN amount - COALESCE(payment_iqd_amount, 0) - COALESCE(payment_usd_amount, 0) * 1440
            ELSE amount
          END
        ) as total_remaining
        FROM customer_debts 
        WHERE customer_name = ? AND paid_at IS NULL
      `).get(customerName);
      
      const finalRemainingDebt = remainingAllDebts?.total_remaining || 0;
      const actualOverpayment = (remainingIQDPayment > 0 || remainingUSDPayment > 0) && finalRemainingDebt <= 0;

      // Record the total transaction for forced IQD payment
      if (totalPaidFromUSD > 0 || totalPaidFromIQD > 0) {
        const addTransactionStmt = db.prepare(`
          INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        addTransactionStmt.run(
          'customer_debt_payment',
          totalPaidFromUSD || 0, // Positive for receiving
          totalPaidFromIQD || 0, // Positive for receiving
          `Forced IQD debt payment: ${customerName} - Paid ${paidDebts.length} debt(s)`,
          null, // No single reference ID since we're paying multiple debts
          'customer_debt_forced_iqd',
          now
        );
      }

      return {
        success: true,
        message: `IQD debt payment completed for ${customerName}`,
        paidDebts,
        totalPaid: { usd: totalPaidFromUSD, iqd: totalPaidFromIQD },
        remainingPayment: { usd: remainingUSDPayment, iqd: remainingIQDPayment },
        hasOverpayment: actualOverpayment,
        paymentMethod: 'forced_iqd'
      };
      
    } catch (error) {
      console.error('❌ [debts.cjs] Error in payCustomerDebtTotalForcedIQD:', error);
      throw error;
    }
  });
  
  return transaction();
}

// Targeted currency payment function
function payCustomerDebtTotalTargeted(db, customerName, paymentData, targetCurrency) {
  if (targetCurrency === 'USD') {
    return payCustomerDebtTotalForcedUSD(db, customerName, paymentData);
  } else if (targetCurrency === 'IQD') {
    return payCustomerDebtTotalForcedIQD(db, customerName, paymentData);
  } else {
    return payCustomerDebtTotal(db, customerName, paymentData);
  }
}

function getCompanyDebts(db) {
  try {
    return db.prepare('SELECT * FROM company_debts ORDER BY created_at DESC').all();
  } catch (error) {
    console.error('❌ [debts.cjs] Error getting company debts:', error);
    return [];
  }
}

function addCompanyDebt(db, { company_name, amount, description, has_items = 0, currency = 'IQD', discount = null, multi_currency = null }) {
  const now = new Date().toISOString();
  
  let finalAmount = amount;
  let finalCurrency = currency;
  let usdAmount = null;
  let iqdAmount = null;
  
  // Handle multi-currency debts
  if (multi_currency && multi_currency.enabled) {
    usdAmount = parseFloat(multi_currency.usdAmount) || 0;
    iqdAmount = parseFloat(multi_currency.iqdAmount) || 0;
    finalCurrency = 'MULTI';
    finalAmount = usdAmount; // Store USD as primary reference
  }
  
  // Apply discount if provided
  if (discount && discount.discount_value) {
    if (discount.discount_type === 'percentage') {
      const discountPercent = discount.discount_value / 100;
      if (multi_currency && multi_currency.enabled) {
        usdAmount = usdAmount * (1 - discountPercent);
        iqdAmount = iqdAmount * (1 - discountPercent);
        finalAmount = usdAmount;
      } else {
        finalAmount = amount * (1 - discountPercent);
      }
    } else {
      // Fixed amount discount
      if (multi_currency && multi_currency.enabled) {
        // Apply to USD first, then IQD if needed
        const discountRemaining = Math.max(0, discount.discount_value - usdAmount);
        usdAmount = Math.max(0, usdAmount - discount.discount_value);
        if (discountRemaining > 0) {
          iqdAmount = Math.max(0, iqdAmount - discountRemaining);
        }
        finalAmount = usdAmount;
      } else {
        finalAmount = Math.max(0, amount - discount.discount_value);
      }
    }
  }
  
  // Store in the original currency without conversion
  // This preserves the true currency of the debt
  try {
    return db.prepare(`INSERT INTO company_debts 
      (company_name, amount, description, created_at, has_items, currency, usd_amount, iqd_amount) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(company_name, finalAmount, description, now, has_items, finalCurrency, usdAmount, iqdAmount);
  } catch (columnError) {
    // Fallback to basic schema without multi-currency columns
    return db.prepare(`INSERT INTO company_debts 
      (company_name, amount, description, created_at, has_items, currency) 
      VALUES (?, ?, ?, ?, ?, ?)`)
      .run(company_name, finalAmount, description, now, has_items, finalCurrency);
  }
}

function payCompanyDebt(db, id) {
  const now = new Date().toISOString();
  return db.prepare('UPDATE company_debts SET paid_at = ? WHERE id = ?').run(now, id);
}

// Enhanced function for marking company debt as paid with multi-currency support like customer debts
function markCompanyDebtPaid(db, id, paymentData) {
  const { 
    paid_at, 
    payment_currency_used, 
    payment_usd_amount = 0, 
    payment_iqd_amount = 0,
    // Legacy single-currency support
    payment_currency = 'USD',
    payment_amount = 0
  } = paymentData || {};
  
  const now = paid_at || new Date().toISOString();
  
  const transaction = db.transaction(() => {
    try {
      // Get current debt info before updating for transaction record
      const debtInfo = db.prepare(`
        SELECT company_name, amount, description, currency,
               payment_usd_amount as current_paid_usd, 
               payment_iqd_amount as current_paid_iqd,
               usd_amount, iqd_amount,
               paid_at
        FROM company_debts WHERE id = ?
      `).get(id);
      
      if (!debtInfo) {
        return { success: false, message: 'Company debt not found' };
      }
      
      // Handle both new multi-currency format and legacy single-currency format
      let finalUSDAmount = payment_usd_amount;
      let finalIQDAmount = payment_iqd_amount;
      
      // If using legacy format, convert to multi-currency format
      if ((payment_usd_amount === 0 && payment_iqd_amount === 0) && payment_amount > 0) {
        if (payment_currency === 'USD') {
          finalUSDAmount = payment_amount;
          finalIQDAmount = 0;
        } else {
          finalUSDAmount = 0;
          finalIQDAmount = payment_amount;
        }
      }
      
      // If no payment amounts specified, use the debt's original amount
      if (finalUSDAmount === 0 && finalIQDAmount === 0 && debtInfo) {
        // Use the debt's original currency and amount
        if (debtInfo.currency === 'USD') {
          finalUSDAmount = debtInfo.amount;
          finalIQDAmount = 0;
        } else {
          finalUSDAmount = 0;
          finalIQDAmount = debtInfo.amount;
        }
      }
      
      // Get current exchange rates and save them with the payment
      const { getExchangeRate } = require('./settings.cjs');
      const currentUSDToIQD = getExchangeRate(db, 'USD', 'IQD');
      const currentIQDToUSD = 1 / currentUSDToIQD;
      
      // Calculate cumulative payment amounts for partial payment support
      const currentPaidUSD = debtInfo.current_paid_usd || 0;
      const currentPaidIQD = debtInfo.current_paid_iqd || 0;
      const newTotalPaidUSD = currentPaidUSD + finalUSDAmount;
      const newTotalPaidIQD = currentPaidIQD + finalIQDAmount;
      
      // Check if this payment fully pays off the debt based on the original currency
      // NOTE: For remaining debt calculations, we'll use the saved exchange rates per payment
      // This is handled later in the utility functions that calculate remaining debt
      
      let isFullyPaid = false;
      let remainingDebt = 0;
      
      // Determine original debt amounts - use usd_amount/iqd_amount columns if available, fallback to main columns
      const originalUSDAmount = debtInfo.usd_amount || 
                                (debtInfo.currency === 'USD' ? debtInfo.amount : 0);
      const originalIQDAmount = debtInfo.iqd_amount || 
                                (debtInfo.currency === 'IQD' ? debtInfo.amount : 0);
      
      // Calculate remaining debt and payment status
      
      if (debtInfo.currency === 'USD') {
        // For USD debts, convert total paid to USD equivalent (including both currencies)
        const iqdToUSDEquivalent = newTotalPaidIQD / currentUSDToIQD;
        const totalPaidUSDEquivalent = newTotalPaidUSD + iqdToUSDEquivalent;
        remainingDebt = debtInfo.amount - totalPaidUSDEquivalent;
        isFullyPaid = remainingDebt <= 0.01; // USD tolerance
      } else if (debtInfo.currency === 'IQD') {
        // For IQD debts, convert total paid to IQD equivalent (including both currencies)
        const usdToIQDEquivalent = newTotalPaidUSD * currentUSDToIQD;
        const totalPaidIQDEquivalent = newTotalPaidIQD + usdToIQDEquivalent;
        remainingDebt = debtInfo.amount - totalPaidIQDEquivalent;
        isFullyPaid = remainingDebt <= 250; // 250 IQD threshold
      } else if (debtInfo.currency === 'MULTI') {
        // For multi-currency debts, we need to handle cross-currency payments properly
        
        // Calculate remaining debt amounts in each currency
        const remainingUSD = Math.max(0, originalUSDAmount - newTotalPaidUSD);
        const remainingIQD = Math.max(0, originalIQDAmount - newTotalPaidIQD);
        
        // If either currency is overpaid, apply the excess to the other currency
        let adjustedPaidUSD = newTotalPaidUSD;
        let adjustedPaidIQD = newTotalPaidIQD;
        
        if (newTotalPaidUSD > originalUSDAmount && remainingIQD > 0) {
          // Overpaid in USD, convert excess to IQD payment
          const excessUSD = newTotalPaidUSD - originalUSDAmount;
          const excessAsIQD = excessUSD * currentUSDToIQD;
          adjustedPaidUSD = originalUSDAmount;
          adjustedPaidIQD = Math.min(newTotalPaidIQD + excessAsIQD, originalIQDAmount);
        } else if (newTotalPaidIQD > originalIQDAmount && remainingUSD > 0) {
          // Overpaid in IQD, convert excess to USD payment
          const excessIQD = newTotalPaidIQD - originalIQDAmount;
          const excessAsUSD = excessIQD / currentUSDToIQD;
          adjustedPaidIQD = originalIQDAmount;
          adjustedPaidUSD = Math.min(newTotalPaidUSD + excessAsUSD, originalUSDAmount);
        }
        
        // Calculate final remaining amounts
        const finalRemainingUSD = Math.max(0, originalUSDAmount - adjustedPaidUSD);
        const finalRemainingIQD = Math.max(0, originalIQDAmount - adjustedPaidIQD);
        
        // Check if fully paid (both currencies satisfied)
        isFullyPaid = finalRemainingUSD <= 0.01 && finalRemainingIQD <= 250;
        
        // For display purposes, calculate total remaining in USD equivalent
        remainingDebt = finalRemainingUSD + (finalRemainingIQD / currentUSDToIQD);
      } else {
        // Legacy handling for unknown currency types
        const totalPaidUSDEquivalent = newTotalPaidUSD + (newTotalPaidIQD / currentUSDToIQD);
        remainingDebt = debtInfo.amount - totalPaidUSDEquivalent;
        const usdThreshold = 250 / currentUSDToIQD;
        isFullyPaid = remainingDebt <= usdThreshold;
      }
      
      // Only set paid_at if fully paid
      const paidAtValue = isFullyPaid ? now : null;
      
      // Record this specific payment in the debt_payments table
      // This allows us to track each payment's exchange rate accurately
      const recordPaymentStmt = db.prepare(`
        INSERT INTO debt_payments (debt_type, debt_id, payment_usd_amount, payment_iqd_amount, 
                                   payment_currency_used, exchange_rate_usd_to_iqd, exchange_rate_iqd_to_usd, 
                                   payment_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      recordPaymentStmt.run(
        'company',
        id,
        finalUSDAmount || 0,
        finalIQDAmount || 0,
        payment_currency_used || (finalUSDAmount > 0 && finalIQDAmount > 0 ? 'MULTI' : (finalUSDAmount > 0 ? 'USD' : 'IQD')),
        currentUSDToIQD,
        currentIQDToUSD,
        now
      );

      // Update the debt record - accumulate payments, only mark as paid if fully paid
      // Also save the latest payment exchange rate for remaining debt calculations
      const updateStmt = db.prepare(`
        UPDATE company_debts 
        SET paid_at = ?, 
            payment_usd_amount = ?, 
            payment_iqd_amount = ?,
            payment_exchange_rate_usd_to_iqd = ?,
            payment_exchange_rate_iqd_to_usd = ?
        WHERE id = ?
      `);
      
      const result = updateStmt.run(
        paidAtValue, 
        newTotalPaidUSD || 0, 
        newTotalPaidIQD || 0,
        currentUSDToIQD,
        currentIQDToUSD,
        id
      );
      
      // Record transaction - track the actual payment amounts deducted
      const addTransactionStmt = db.prepare(`
        INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      addTransactionStmt.run(
        'company_debt_payment',
        finalUSDAmount || 0,
        finalIQDAmount || 0,
        `Company debt payment ${isFullyPaid ? '(FINAL)' : '(PARTIAL)'}: ${debtInfo.company_name} - ${debtInfo.description || 'Payment'}`,
        id,
        'company_debt',
        now
      );
      
      // Note: Buying history entries are handled by the calling payment functions
      // (payCompanyDebtTotal, payCompanyDebtTotalForcedUSD, etc.) to avoid duplicates
      
      // Deduct from the user's balance based on the actual payment amounts
      if (finalUSDAmount > 0) {
        settings.updateBalance(db, 'USD', -finalUSDAmount);
      }
      
      // Deduct IQD amount if any IQD was paid  
      if (finalIQDAmount > 0) {
        settings.updateBalance(db, 'IQD', -finalIQDAmount);
      }
      
      // Calculate remaining debt in the original currency for return value
      let remainingDebtForReturn = Math.max(0, remainingDebt);
      
      return { 
        success: true, 
        changes: result.changes, 
        isFullyPaid,
        remainingDebt: remainingDebtForReturn,
        remainingDebtCurrency: debtInfo.currency,
        totalPaidUSD: newTotalPaidUSD,
        totalPaidIQD: newTotalPaidIQD
      };
    } catch (error) {
      console.error('Error marking company debt as paid:', error);
      return { success: false, message: error.message || 'Failed to mark debt as paid' };
    }
  });
  
  return transaction();
}

// New function to pay total company debt for a specific company
function payCompanyDebtTotal(db, companyName, paymentData) {
  const { 
    payment_usd_amount = 0, 
    payment_iqd_amount = 0 
  } = paymentData || {};
  
  if (!companyName) {
    throw new Error('Company name is required');
  }
  
  const now = new Date().toISOString();
  
  const transaction = db.transaction(() => {
    try {
      // Get all unpaid debts for this company, ordered by creation date (oldest first)
      // Use case-insensitive comparison
      const unpaidDebts = db.prepare(`
        SELECT id, company_name, amount, description, currency,
               payment_usd_amount, payment_iqd_amount,
               usd_amount, iqd_amount, created_at
        FROM company_debts 
        WHERE LOWER(company_name) = LOWER(?) AND paid_at IS NULL
        ORDER BY created_at ASC
      `).all(companyName);
      
      if (unpaidDebts.length === 0) {
        // Check if company exists with any debts (paid or unpaid)
        const anyDebts = db.prepare(`
          SELECT COUNT(*) as count FROM company_debts WHERE LOWER(company_name) = LOWER(?)
        `).get(companyName);
        
        if (anyDebts.count === 0) {
          return { success: false, message: `No debts found for company: ${companyName}` };
        } else {
          return { success: false, message: `No unpaid debts found for company: ${companyName}` };
        }
      }
      
      // Get current exchange rates
      const { getExchangeRate } = require('./settings.cjs');
      const currentUSDToIQD = getExchangeRate(db, 'USD', 'IQD');
      const currentIQDToUSD = 1 / currentUSDToIQD;
      
      let remainingUSDPayment = payment_usd_amount;
      let remainingIQDPayment = payment_iqd_amount;
      let totalPaidUSD = 0;
      let totalPaidIQD = 0;
      let paidDebts = [];
      
      // Process each debt in order (oldest first)
      for (const debt of unpaidDebts) {
        if (remainingUSDPayment <= 0 && remainingIQDPayment <= 0) {
          break; // No more payment left
        }
        
        // Calculate remaining debt for this specific debt
        const currentPaidUSD = debt.payment_usd_amount || 0;
        const currentPaidIQD = debt.payment_iqd_amount || 0;
        
        let remainingDebtUSD = 0;
        let remainingDebtIQD = 0;
        
        if (debt.currency === 'MULTI') {
          remainingDebtUSD = Math.max(0, (debt.usd_amount || 0) - currentPaidUSD);
          remainingDebtIQD = Math.max(0, (debt.iqd_amount || 0) - currentPaidIQD);
        } else if (debt.currency === 'USD') {
          const paidIQDInUSD = currentPaidIQD / currentUSDToIQD;
          remainingDebtUSD = Math.max(0, debt.amount - currentPaidUSD - paidIQDInUSD);
          remainingDebtIQD = 0;
        } else {
          // IQD or default
          const paidUSDInIQD = currentPaidUSD * currentUSDToIQD;
          remainingDebtIQD = Math.max(0, debt.amount - currentPaidIQD - paidUSDInIQD);
          remainingDebtUSD = 0;
        }
        
        // Apply payment to this debt
        let usdToApply = 0;
        let iqdToApply = 0;
        
        if (debt.currency === 'MULTI') {
          // For multi-currency debts, handle cross-currency payments properly
          // First, satisfy each currency portion with its matching payment
          if (remainingDebtUSD > 0 && remainingUSDPayment > 0) {
            usdToApply = Math.min(remainingDebtUSD, remainingUSDPayment);
            remainingUSDPayment -= usdToApply;
            remainingDebtUSD -= usdToApply;
          }
          
          if (remainingDebtIQD > 0 && remainingIQDPayment > 0) {
            iqdToApply = Math.min(remainingDebtIQD, remainingIQDPayment);
            remainingIQDPayment -= iqdToApply;
            remainingDebtIQD -= iqdToApply;
          }
          
          // Then apply cross-currency payments if there's still remaining payment and debt
          if (remainingDebtUSD > 0 && remainingIQDPayment > 0) {
            // Use IQD payment to pay USD debt
            const iqdNeededForUSDDebt = remainingDebtUSD * currentUSDToIQD;
            const iqdToUseForUSD = Math.min(remainingIQDPayment, iqdNeededForUSDDebt);
            iqdToApply += iqdToUseForUSD;
            remainingIQDPayment -= iqdToUseForUSD;
            remainingDebtUSD -= iqdToUseForUSD / currentUSDToIQD;
          }
          
          if (remainingDebtIQD > 0 && remainingUSDPayment > 0) {
            // Use USD payment to pay IQD debt
            const usdNeededForIQDDebt = remainingDebtIQD / currentUSDToIQD;
            const usdToUseForIQD = Math.min(remainingUSDPayment, usdNeededForIQDDebt);
            usdToApply += usdToUseForIQD;
            remainingUSDPayment -= usdToUseForIQD;
            remainingDebtIQD -= usdToUseForIQD * currentUSDToIQD;
          }
        } else {
          // For single-currency debts, use the existing logic
          // First, try to pay with matching currency
          if (remainingDebtUSD > 0 && remainingUSDPayment > 0) {
            usdToApply = Math.min(remainingDebtUSD, remainingUSDPayment);
            remainingUSDPayment -= usdToApply;
            remainingDebtUSD -= usdToApply;
          }
          
          if (remainingDebtIQD > 0 && remainingIQDPayment > 0) {
            iqdToApply = Math.min(remainingDebtIQD, remainingIQDPayment);
            remainingIQDPayment -= iqdToApply;
            remainingDebtIQD -= iqdToApply;
          }
          
          // Cross-currency payment for single-currency debts
          if (remainingDebtUSD > 0 && remainingIQDPayment > 0) {
            const iqdToUSDForDebt = Math.min(remainingIQDPayment, remainingDebtUSD * currentUSDToIQD);
            iqdToApply += iqdToUSDForDebt;
            remainingIQDPayment -= iqdToUSDForDebt;
            remainingDebtUSD -= iqdToUSDForDebt / currentUSDToIQD;
          }
          
          if (remainingDebtIQD > 0 && remainingUSDPayment > 0) {
            const usdToIQDForDebt = Math.min(remainingUSDPayment, remainingDebtIQD / currentUSDToIQD);
            usdToApply += usdToIQDForDebt;
            remainingUSDPayment -= usdToIQDForDebt;
            remainingDebtIQD -= usdToIQDForDebt * currentUSDToIQD;
          }
        }
        
        // Apply the payment to this debt
        if (usdToApply > 0 || iqdToApply > 0) {
          const newTotalPaidUSD = currentPaidUSD + usdToApply;
          const newTotalPaidIQD = currentPaidIQD + iqdToApply;
          
          // Check if this debt is now fully paid
          let isFullyPaid = false;
          if (debt.currency === 'MULTI') {
            const finalRemainingUSD = Math.max(0, (debt.usd_amount || 0) - newTotalPaidUSD);
            const finalRemainingIQD = Math.max(0, (debt.iqd_amount || 0) - newTotalPaidIQD);
            isFullyPaid = finalRemainingUSD <= 0.01 && finalRemainingIQD <= 250;
          } else if (debt.currency === 'USD') {
            const totalPaidUSDEquivalent = newTotalPaidUSD + (newTotalPaidIQD / currentUSDToIQD);
            isFullyPaid = totalPaidUSDEquivalent >= (debt.amount - 0.01);
          } else {
            const totalPaidIQDEquivalent = newTotalPaidIQD + (newTotalPaidUSD * currentUSDToIQD);
            isFullyPaid = totalPaidIQDEquivalent >= (debt.amount - 250);
          }
          
          // Update the debt
          const updateStmt = db.prepare(`
            UPDATE company_debts 
            SET paid_at = ?, 
                payment_usd_amount = ?, 
                payment_iqd_amount = ?,
                payment_exchange_rate_usd_to_iqd = ?,
                payment_exchange_rate_iqd_to_usd = ?
            WHERE id = ?
          `);
          
          updateStmt.run(
            isFullyPaid ? now : null,
            newTotalPaidUSD,
            newTotalPaidIQD,
            currentUSDToIQD,
            currentIQDToUSD,
            debt.id
          );
          
          // Record this payment in debt_payments table
          const recordPaymentStmt = db.prepare(`
            INSERT INTO debt_payments (debt_type, debt_id, payment_usd_amount, payment_iqd_amount, 
                                       payment_currency_used, exchange_rate_usd_to_iqd, exchange_rate_iqd_to_usd, 
                                       payment_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          recordPaymentStmt.run(
            'company',
            debt.id,
            usdToApply || 0,
            iqdToApply || 0,
            (usdToApply > 0 && iqdToApply > 0) ? 'MULTI' : (usdToApply > 0 ? 'USD' : 'IQD'),
            currentUSDToIQD,
            currentIQDToUSD,
            now
          );
          
          totalPaidUSD += usdToApply;
          totalPaidIQD += iqdToApply;
          paidDebts.push({ ...debt, paidAmount: { usd: usdToApply, iqd: iqdToApply }, fullyPaid: isFullyPaid });
        }
      }
      
      // Record the total transaction
      if (totalPaidUSD > 0 || totalPaidIQD > 0) {
        const addTransactionStmt = db.prepare(`
          INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        addTransactionStmt.run(
          'company_debt_payment',
          totalPaidUSD || 0, // Positive for spending
          totalPaidIQD || 0, // Positive for spending
          `Total company debt payment: ${companyName} - Paid ${paidDebts.length} debt(s)`,
          null, // No single reference ID since we're paying multiple debts
          'company_debt_total',
          now
        );
      }
      
      // Deduct from user's balance based on what currency was actually used
      // This is the critical fix for the balance deduction issue
      if (totalPaidUSD > 0) {
        settings.updateBalance(db, 'USD', -totalPaidUSD);
      }
      if (totalPaidIQD > 0) {
        settings.updateBalance(db, 'IQD', -totalPaidIQD);
      }
      
      return { 
        success: true, 
        message: `Successfully processed payment for ${companyName}`,
        paidDebts,
        totalPaid: { usd: totalPaidUSD, iqd: totalPaidIQD },
        remainingPayment: { usd: remainingUSDPayment, iqd: remainingIQDPayment },
        hasOverpayment: remainingUSDPayment > 0 || remainingIQDPayment > 0
      };
      
    } catch (error) {
      console.error('❌ [debts.cjs] Error in payCompanyDebtTotal:', error);
      throw error;
    }
  });
  
  return transaction();
}

// Force USD debt payment - only pay USD debts, but allow any currency balance to be used
function payCompanyDebtTotalForcedUSD(db, companyName, paymentData) {
  const { 
    payment_usd_amount = 0, 
    payment_iqd_amount = 0 
  } = paymentData || {};
  
  if (!companyName) {
    throw new Error('Company name is required');
  }
  
  const now = new Date().toISOString();
  
  // Get current exchange rates from settings instead of hardcoded fallback
  const { getExchangeRate } = require('./settings.cjs');
  const currentUSDToIQD = getExchangeRate(db, 'USD', 'IQD');
  
  const transaction = db.transaction(() => {
    try {
      // Get all unpaid debts for this company
      const unpaidDebts = db.prepare(`
        SELECT id, company_name, amount, description, currency,
               payment_usd_amount, payment_iqd_amount,
               usd_amount, iqd_amount, created_at
        FROM company_debts 
        WHERE LOWER(company_name) = LOWER(?) AND paid_at IS NULL
        ORDER BY created_at ASC
      `).all(companyName);
      
      if (unpaidDebts.length === 0) {
        return {
          success: true,
          message: 'No unpaid debts found for this company',
          paidDebts: [],
          totalPaid: { usd: 0, iqd: 0 },
          remainingPayment: { usd: payment_usd_amount, iqd: payment_iqd_amount },
          hasOverpayment: payment_usd_amount > 0 || payment_iqd_amount > 0
        };
      }
      
      // Calculate total remaining USD debt for this company - ONLY USD and MULTI debts
      let totalRemainingUSDDebt = 0;
      const usdDebts = []; // USD debts (priority)
      const multiCurrencyDebts = []; // Multi-currency debts (only USD portion)
      
      for (const debt of unpaidDebts) {
        const currentPaidUSD = debt.payment_usd_amount || 0;
        const currentPaidIQD = debt.payment_iqd_amount || 0;
        
        if (debt.currency === 'USD') {
          const totalPaidUSDEquivalent = currentPaidUSD + (currentPaidIQD / currentUSDToIQD);
          const remainingDebtUSD = Math.max(0, debt.amount - totalPaidUSDEquivalent);
          
          if (remainingDebtUSD > 0) {
            totalRemainingUSDDebt += remainingDebtUSD;
            usdDebts.push({
              ...debt,
              remainingAmount: remainingDebtUSD
            });
          }
        } else if (debt.currency === 'MULTI') {
          // For multi-currency debts, only consider the USD portion
          const remainingUSD = Math.max(0, (debt.usd_amount || 0) - currentPaidUSD);
          
          if (remainingUSD > 0) {
            totalRemainingUSDDebt += remainingUSD;
            multiCurrencyDebts.push({
              ...debt,
              remainingAmount: remainingUSD
            });
          }
        }
        // IGNORE IQD-only debts completely for forced USD payment
      }
      
      // Combine only USD and multi-currency debts
      const allDebtsForPayment = [...usdDebts, ...multiCurrencyDebts];
      
      if (allDebtsForPayment.length === 0) {
        return {
          success: true,
          message: 'No unpaid debts found for this company',
          paidDebts: [],
          totalPaid: { usd: 0, iqd: 0 },
          remainingPayment: { usd: payment_usd_amount, iqd: payment_iqd_amount },
          hasOverpayment: payment_usd_amount > 0 || payment_iqd_amount > 0
        };
      }
      
      // Apply payment to all debts (USD priority), but track which currency is being used to pay
      let remainingUSDPayment = payment_usd_amount;
      let remainingIQDPayment = payment_iqd_amount;
      let totalPaidFromUSD = 0;
      let totalPaidFromIQD = 0;
      let paidDebts = [];
      
      // Pay debts until payment is exhausted (USD debts first, then others)
      for (const debt of allDebtsForPayment) {
        // Continue as long as there's any payment available (USD OR IQD)
        if (remainingUSDPayment <= 0 && remainingIQDPayment <= 0) break;
        
        const currentPaidUSD = debt.payment_usd_amount || 0;
        const currentPaidIQD = debt.payment_iqd_amount || 0;
        
        let paymentFromUSDBalance = 0;
        let paymentFromIQDBalance = 0;
        
        // Payment logic: Only USD and MULTI debts allowed in forced USD payment
        if (debt.currency === 'USD') {
          // Try to pay with USD balance first for USD debts
          if (remainingUSDPayment > 0) {
            paymentFromUSDBalance = Math.min(remainingUSDPayment, debt.remainingAmount);
            remainingUSDPayment -= paymentFromUSDBalance;
          }
          
          // If still debt remaining, pay with IQD balance (converted to USD equivalent)
          const stillOwedAfterUSD = debt.remainingAmount - paymentFromUSDBalance;
          if (stillOwedAfterUSD > 0 && remainingIQDPayment > 0) {
            const iqdNeededForDebt = stillOwedAfterUSD * currentUSDToIQD;
            paymentFromIQDBalance = Math.min(remainingIQDPayment, iqdNeededForDebt);
            remainingIQDPayment -= paymentFromIQDBalance;
          }
        } else if (debt.currency === 'MULTI') {
          // For multi-currency debts with FORCED USD payment:
          // CRITICAL: Always prioritize USD debt, NEVER apply IQD payment to IQD debt directly
          const remainingUSD = Math.max(0, (debt.usd_amount || 0) - currentPaidUSD);
          const remainingIQD = Math.max(0, (debt.iqd_amount || 0) - currentPaidIQD);
          
          // Step 1: Pay USD portion first (ONLY USD DEBT PRIORITY)
          if (remainingUSD > 0) {
            // Pay with USD balance first
            if (remainingUSDPayment > 0) {
              paymentFromUSDBalance = Math.min(remainingUSDPayment, remainingUSD);
              remainingUSDPayment -= paymentFromUSDBalance;
            }
            
            // FORCED USD: Convert IQD payment to pay USD debt (NO direct IQD to IQD)
            const stillOwedUSDAfterUSDPayment = remainingUSD - paymentFromUSDBalance;
            if (stillOwedUSDAfterUSDPayment > 0 && remainingIQDPayment > 0) {
              const iqdNeededForUSDDebt = stillOwedUSDAfterUSDPayment * currentUSDToIQD;
              const iqdToUseForUSD = Math.min(remainingIQDPayment, iqdNeededForUSDDebt);
              paymentFromIQDBalance += iqdToUseForUSD;
              remainingIQDPayment -= iqdToUseForUSD;
            }
          }
          
          // Step 2: ONLY after USD portion is fully paid, pay IQD portion with remaining USD ONLY
          const usdPortionFullyPaid = (currentPaidUSD + paymentFromUSDBalance) >= (debt.usd_amount || 0);
          if (usdPortionFullyPaid && remainingIQD > 0 && remainingUSDPayment > 0) {
            // FORCED USD: Convert remaining USD to pay IQD debt (NO direct IQD to IQD)
            const usdToIQDForIQDDebt = remainingUSDPayment * currentUSDToIQD;
            const iqdPaymentFromUSD = Math.min(usdToIQDForIQDDebt, remainingIQD);
            paymentFromIQDBalance += iqdPaymentFromUSD;
            remainingUSDPayment -= iqdPaymentFromUSD / currentUSDToIQD;
          }
          // CRITICAL: remainingIQDPayment is NEVER used for IQD debt in forced USD mode
        }
        
        if (paymentFromUSDBalance > 0 || paymentFromIQDBalance > 0) {
          // CRITICAL FIX: For multi-currency debts in forced payment mode,
          // record payments by TARGET DEBT CURRENCY, not SOURCE PAYMENT CURRENCY
          let updatedPaidUSD = currentPaidUSD;
          let updatedPaidIQD = currentPaidIQD;
          
          if (debt.currency === 'MULTI') {
            // For multi-currency debts, convert all payments to target the prioritized currency
            if (paymentFromUSDBalance > 0) {
              // USD payment - always goes to USD debt tracking
              updatedPaidUSD += paymentFromUSDBalance;
            }
            if (paymentFromIQDBalance > 0) {
              // For FORCED USD mode: IQD payment is converted and applied to USD debt
              // So we track it as USD payment in the database
              const iqdConvertedToUSDDebt = paymentFromIQDBalance / currentUSDToIQD;
              updatedPaidUSD += iqdConvertedToUSDDebt;
            }
          } else {
            // For single-currency debts, use the original logic
            updatedPaidUSD = currentPaidUSD + paymentFromUSDBalance;
            updatedPaidIQD = currentPaidIQD + paymentFromIQDBalance;
          }
          
          // Check if this specific debt is fully paid based on its currency type
          let isFullyPaid = false;
          if (debt.currency === 'USD') {
            const totalPaidUSDEquivalent = updatedPaidUSD + (updatedPaidIQD / currentUSDToIQD);
            isFullyPaid = totalPaidUSDEquivalent >= debt.amount;
          } else if (debt.currency === 'IQD') {
            const totalPaidIQDEquivalent = updatedPaidIQD + (updatedPaidUSD * currentUSDToIQD);
            isFullyPaid = totalPaidIQDEquivalent >= debt.amount;
          } else if (debt.currency === 'MULTI') {
            const usdFullyPaid = updatedPaidUSD >= (debt.usd_amount || 0);
            const iqdFullyPaid = updatedPaidIQD >= (debt.iqd_amount || 0);
            isFullyPaid = usdFullyPaid && iqdFullyPaid;
          }
          
          const paidAt = isFullyPaid ? now : null;
          
          // Update debt record
          db.prepare(`
            UPDATE company_debts 
            SET payment_usd_amount = ?, payment_iqd_amount = ?, paid_at = ?
            WHERE id = ?
          `).run(updatedPaidUSD, updatedPaidIQD, paidAt, debt.id);
          
          paidDebts.push({
            id: debt.id,
            company_name: debt.company_name,
            description: debt.description,
            paymentUSD: paymentFromUSDBalance,
            paymentIQD: paymentFromIQDBalance,
            fullyPaid: isFullyPaid
          });
          
          totalPaidFromUSD += paymentFromUSDBalance;
          totalPaidFromIQD += paymentFromIQDBalance;
        }
      }
      
      // Deduct from user's balance based on what currency was actually used
      if (totalPaidFromUSD > 0) {
        settings.updateBalance(db, 'USD', -totalPaidFromUSD);
      }
      if (totalPaidFromIQD > 0) {
        settings.updateBalance(db, 'IQD', -totalPaidFromIQD);
      }
      
      // Check if there's still any debt remaining after payment (all currencies)
      const remainingAllDebts = db.prepare(`
        SELECT SUM(
          CASE 
            WHEN currency = 'USD' THEN amount - COALESCE(payment_usd_amount, 0) - COALESCE(payment_iqd_amount, 0) / 1440
            WHEN currency = 'IQD' THEN amount - COALESCE(payment_iqd_amount, 0) - COALESCE(payment_usd_amount, 0) * 1440
            WHEN currency = 'MULTI' THEN 
              (COALESCE(usd_amount, 0) - COALESCE(payment_usd_amount, 0)) + 
              (COALESCE(iqd_amount, 0) - COALESCE(payment_iqd_amount, 0)) / 1440
            ELSE amount
          END
        ) as total_remaining
        FROM company_debts 
        WHERE company_name = ? AND paid_at IS NULL
      `).get(companyName);
      
      const finalRemainingDebt = remainingAllDebts?.total_remaining || 0;
      const actualOverpayment = (remainingUSDPayment > 0 || remainingIQDPayment > 0) && finalRemainingDebt <= 0;

      // Record the total transaction for forced USD payment
      if (totalPaidFromUSD > 0 || totalPaidFromIQD > 0) {
        const addTransactionStmt = db.prepare(`
          INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        addTransactionStmt.run(
          'company_debt_payment',
          totalPaidFromUSD || 0, // Positive for spending
          totalPaidFromIQD || 0, // Positive for spending
          `Forced USD debt payment: ${companyName} - Paid ${paidDebts.length} debt(s)`,
          null, // No single reference ID since we're paying multiple debts
          'company_debt_forced_usd',
          now
        );
      }

      return {
        success: true,
        message: `USD debt payment completed for ${companyName}`,
        paidDebts,
        totalPaid: { usd: totalPaidFromUSD, iqd: totalPaidFromIQD },
        remainingPayment: { usd: remainingUSDPayment, iqd: remainingIQDPayment },
        hasOverpayment: actualOverpayment,
        paymentMethod: 'forced_usd'
      };
      
    } catch (error) {
      console.error('❌ [debts.cjs] Error in payCompanyDebtTotalForcedUSD:', error);
      throw error;
    }
  });
  
  return transaction();
}

// Force IQD debt payment - only pay IQD debts, but allow any currency balance to be used
function payCompanyDebtTotalForcedIQD(db, companyName, paymentData) {
  const { 
    payment_usd_amount = 0, 
    payment_iqd_amount = 0 
  } = paymentData || {};
  
  if (!companyName) {
    throw new Error('Company name is required');
  }
  
  const now = new Date().toISOString();
  
  // Get current exchange rates from settings instead of hardcoded fallback
  const { getExchangeRate } = require('./settings.cjs');
  const currentUSDToIQD = getExchangeRate(db, 'USD', 'IQD');
  
  const transaction = db.transaction(() => {
    try {
      // Get all unpaid debts for this company
      const unpaidDebts = db.prepare(`
        SELECT id, company_name, amount, description, currency,
               payment_usd_amount, payment_iqd_amount,
               usd_amount, iqd_amount, created_at
        FROM company_debts 
        WHERE LOWER(company_name) = LOWER(?) AND paid_at IS NULL
        ORDER BY created_at ASC
      `).all(companyName);
      
      if (unpaidDebts.length === 0) {
        return {
          success: true,
          message: 'No unpaid debts found for this company',
          paidDebts: [],
          totalPaid: { usd: 0, iqd: 0 },
          remainingPayment: { usd: payment_usd_amount, iqd: payment_iqd_amount },
          hasOverpayment: payment_usd_amount > 0 || payment_iqd_amount > 0
        };
      }
      
      // Calculate total remaining IQD debt for this company - ONLY IQD and MULTI debts
      let totalRemainingIQDDebt = 0;
      const iqdDebts = []; // IQD debts (priority)
      const multiCurrencyDebts = []; // Multi-currency debts (only IQD portion)
      
      for (const debt of unpaidDebts) {
        const currentPaidIQD = debt.payment_iqd_amount || 0;
        const currentPaidUSD = debt.payment_usd_amount || 0;
        
        if (debt.currency === 'IQD') {
          const totalPaidIQDEquivalent = currentPaidIQD + (currentPaidUSD * currentUSDToIQD);
          const remainingDebtIQD = Math.max(0, debt.amount - totalPaidIQDEquivalent);
          
          if (remainingDebtIQD > 0) {
            totalRemainingIQDDebt += remainingDebtIQD;
            iqdDebts.push({
              ...debt,
              remainingAmount: remainingDebtIQD
            });
          }
        } else if (debt.currency === 'MULTI') {
          // For multi-currency debts, only consider the IQD portion
          const remainingIQD = Math.max(0, (debt.iqd_amount || 0) - currentPaidIQD);
          
          if (remainingIQD > 0) {
            totalRemainingIQDDebt += remainingIQD;
            multiCurrencyDebts.push({
              ...debt,
              remainingAmount: remainingIQD
            });
          }
        }
        // IGNORE USD-only debts completely for forced IQD payment
      }
      
      // Combine only IQD and multi-currency debts
      const allDebtsForPayment = [...iqdDebts, ...multiCurrencyDebts];
      
      if (allDebtsForPayment.length === 0) {
        return {
          success: true,
          message: 'No unpaid debts found for this company',
          paidDebts: [],
          totalPaid: { usd: 0, iqd: 0 },
          remainingPayment: { usd: payment_usd_amount, iqd: payment_iqd_amount },
          hasOverpayment: payment_usd_amount > 0 || payment_iqd_amount > 0
        };
      }
      
      // Apply payment to all debts (IQD priority), but track which currency is being used to pay
      let remainingUSDPayment = payment_usd_amount;
      let remainingIQDPayment = payment_iqd_amount;
      let totalPaidFromUSD = 0;
      let totalPaidFromIQD = 0;
      let paidDebts = [];
      
      // Pay debts until payment is exhausted (IQD debts first, then others)
      for (const debt of allDebtsForPayment) {
        // Continue as long as there's any payment available (USD OR IQD)
        if (remainingUSDPayment <= 0 && remainingIQDPayment <= 0) break;
        
        const currentPaidUSD = debt.payment_usd_amount || 0;
        const currentPaidIQD = debt.payment_iqd_amount || 0;
        
        let paymentFromUSDBalance = 0;
        let paymentFromIQDBalance = 0;
        
        // Payment logic: Only IQD and MULTI debts allowed in forced IQD payment
        if (debt.currency === 'IQD') {
          // Try to pay with IQD balance first for IQD debts
          if (remainingIQDPayment > 0) {
            paymentFromIQDBalance = Math.min(remainingIQDPayment, debt.remainingAmount);
            remainingIQDPayment -= paymentFromIQDBalance;
          }
          
          // If still debt remaining, pay with USD balance (converted to IQD equivalent)
          const stillOwedAfterIQD = debt.remainingAmount - paymentFromIQDBalance;
          if (stillOwedAfterIQD > 0 && remainingUSDPayment > 0) {
            const usdNeededForDebt = stillOwedAfterIQD / currentUSDToIQD;
            paymentFromUSDBalance = Math.min(remainingUSDPayment, usdNeededForDebt);
            remainingUSDPayment -= paymentFromUSDBalance;
          }
        } else if (debt.currency === 'MULTI') {
          // For multi-currency debts with FORCED IQD payment:
          // CRITICAL: Always prioritize IQD debt, NEVER apply USD payment to USD debt directly
          const remainingUSD = Math.max(0, (debt.usd_amount || 0) - currentPaidUSD);
          const remainingIQD = Math.max(0, (debt.iqd_amount || 0) - currentPaidIQD);
          
          // Step 1: Pay IQD portion first (ONLY IQD DEBT PRIORITY)
          if (remainingIQD > 0) {
            // Pay with IQD balance first
            if (remainingIQDPayment > 0) {
              paymentFromIQDBalance = Math.min(remainingIQDPayment, remainingIQD);
              remainingIQDPayment -= paymentFromIQDBalance;
            }
            
            // FORCED IQD: Convert USD payment to pay IQD debt (NO direct USD to USD)
            const stillOwedIQDAfterIQDPayment = remainingIQD - paymentFromIQDBalance;
            if (stillOwedIQDAfterIQDPayment > 0 && remainingUSDPayment > 0) {
              const usdNeededForIQDDebt = stillOwedIQDAfterIQDPayment / currentUSDToIQD;
              const usdToUseForIQD = Math.min(remainingUSDPayment, usdNeededForIQDDebt);
              paymentFromUSDBalance += usdToUseForIQD;
              remainingUSDPayment -= usdToUseForIQD;
            }
          }
          
          // Step 2: ONLY after IQD portion is fully paid, pay USD portion with remaining IQD ONLY
          const iqdPortionFullyPaid = (currentPaidIQD + paymentFromIQDBalance) >= (debt.iqd_amount || 0);
          if (iqdPortionFullyPaid && remainingUSD > 0 && remainingIQDPayment > 0) {
            // FORCED IQD: Convert remaining IQD to pay USD debt (NO direct USD to USD)
            const iqdToUSDForUSDDebt = remainingIQDPayment / currentUSDToIQD;
            const usdPaymentFromIQD = Math.min(iqdToUSDForUSDDebt, remainingUSD);
            paymentFromUSDBalance += usdPaymentFromIQD;
            remainingIQDPayment -= usdPaymentFromIQD * currentUSDToIQD;
          }
          // CRITICAL: remainingUSDPayment is NEVER used for USD debt in forced IQD mode
        }
        
        if (paymentFromUSDBalance > 0 || paymentFromIQDBalance > 0) {
          // CRITICAL FIX: For multi-currency debts in forced payment mode,
          // record payments by TARGET DEBT CURRENCY, not SOURCE PAYMENT CURRENCY
          let updatedPaidUSD = currentPaidUSD;
          let updatedPaidIQD = currentPaidIQD;
          
          if (debt.currency === 'MULTI') {
            // For multi-currency debts, convert all payments to target the prioritized currency
            if (paymentFromIQDBalance > 0) {
              // IQD payment - always goes to IQD debt tracking
              updatedPaidIQD += paymentFromIQDBalance;
            }
            if (paymentFromUSDBalance > 0) {
              // For FORCED IQD mode: USD payment is converted and applied to IQD debt
              // So we track it as IQD payment in the database
              const usdConvertedToIQDDebt = paymentFromUSDBalance * currentUSDToIQD;
              updatedPaidIQD += usdConvertedToIQDDebt;
            }
          } else {
            // For single-currency debts, use the original logic
            updatedPaidUSD = currentPaidUSD + paymentFromUSDBalance;
            updatedPaidIQD = currentPaidIQD + paymentFromIQDBalance;
          }
          
          // Check if this specific debt is fully paid based on its currency type
          let isFullyPaid = false;
          if (debt.currency === 'IQD') {
            const totalPaidIQDEquivalent = updatedPaidIQD + (updatedPaidUSD * currentUSDToIQD);
            isFullyPaid = totalPaidIQDEquivalent >= debt.amount;
          } else if (debt.currency === 'USD') {
            const totalPaidUSDEquivalent = updatedPaidUSD + (updatedPaidIQD / currentUSDToIQD);
            isFullyPaid = totalPaidUSDEquivalent >= debt.amount;
          } else if (debt.currency === 'MULTI') {
            const usdFullyPaid = updatedPaidUSD >= (debt.usd_amount || 0);
            const iqdFullyPaid = updatedPaidIQD >= (debt.iqd_amount || 0);
            isFullyPaid = usdFullyPaid && iqdFullyPaid;
          }
          
          const paidAt = isFullyPaid ? now : null;
          
          // Update debt record
          db.prepare(`
            UPDATE company_debts 
            SET payment_usd_amount = ?, payment_iqd_amount = ?, paid_at = ?
            WHERE id = ?
          `).run(updatedPaidUSD, updatedPaidIQD, paidAt, debt.id);
          
          paidDebts.push({
            id: debt.id,
            company_name: debt.company_name,
            description: debt.description,
            paymentUSD: paymentFromUSDBalance,
            paymentIQD: paymentFromIQDBalance,
            fullyPaid: isFullyPaid
          });
          
          totalPaidFromUSD += paymentFromUSDBalance;
          totalPaidFromIQD += paymentFromIQDBalance;
        }
      }
      
      // Deduct from user's balance based on what currency was actually used
      if (totalPaidFromUSD > 0) {
        settings.updateBalance(db, 'USD', -totalPaidFromUSD);
      }
      if (totalPaidFromIQD > 0) {
        settings.updateBalance(db, 'IQD', -totalPaidFromIQD);
      }
      
      // Check if there's still any debt remaining after payment (all currencies)
      const remainingAllDebts = db.prepare(`
        SELECT SUM(
          CASE 
            WHEN currency = 'USD' THEN amount - COALESCE(payment_usd_amount, 0) - COALESCE(payment_iqd_amount, 0) / 1440
            WHEN currency = 'IQD' THEN amount - COALESCE(payment_iqd_amount, 0) - COALESCE(payment_usd_amount, 0) * 1440
            WHEN currency = 'MULTI' THEN 
              (COALESCE(usd_amount, 0) - COALESCE(payment_usd_amount, 0)) + 
              (COALESCE(iqd_amount, 0) - COALESCE(payment_iqd_amount, 0)) / 1440
            ELSE amount
          END
        ) as total_remaining
        FROM company_debts 
        WHERE company_name = ? AND paid_at IS NULL
      `).get(companyName);
      
      const finalRemainingDebt = remainingAllDebts?.total_remaining || 0;
      const actualOverpayment = (remainingIQDPayment > 0 || remainingUSDPayment > 0) && finalRemainingDebt <= 0;

      // Record the total transaction for forced IQD payment
      if (totalPaidFromUSD > 0 || totalPaidFromIQD > 0) {
        const addTransactionStmt = db.prepare(`
          INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        addTransactionStmt.run(
          'company_debt_payment',
          totalPaidFromUSD || 0, // Positive for spending
          totalPaidFromIQD || 0, // Positive for spending
          `Forced IQD debt payment: ${companyName} - Paid ${paidDebts.length} debt(s)`,
          null, // No single reference ID since we're paying multiple debts
          'company_debt_forced_iqd',
          now
        );
      }

      return {
        success: true,
        message: `IQD debt payment completed for ${companyName}`,
        paidDebts,
        totalPaid: { usd: totalPaidFromUSD, iqd: totalPaidFromIQD },
        remainingPayment: { usd: remainingUSDPayment, iqd: remainingIQDPayment },
        hasOverpayment: actualOverpayment,
        paymentMethod: 'forced_iqd'
      };
      
    } catch (error) {
      console.error('❌ [debts.cjs] Error in payCompanyDebtTotalForcedIQD:', error);
      throw error;
    }
  });
  
  return transaction();
}

// Targeted currency payment function
function payCompanyDebtTotalTargeted(db, companyName, paymentData, targetCurrency) {
  if (targetCurrency === 'USD') {
    return payCompanyDebtTotalForcedUSD(db, companyName, paymentData);
  } else if (targetCurrency === 'IQD') {
    return payCompanyDebtTotalForcedIQD(db, companyName, paymentData);
  } else {
    return payCompanyDebtTotal(db, companyName, paymentData);
  }
}

function deleteCompanyDebt(db, id) {
  const deleteItems = db.prepare('DELETE FROM company_debt_items WHERE debt_id = ?');
  const deleteDebt = db.prepare('DELETE FROM company_debts WHERE id = ?');
  
  const transaction = db.transaction(() => {
    deleteItems.run(id);
    deleteDebt.run(id);
  });
  
  return transaction();
}

function addCompanyDebtWithItems(db, { company_name, description, items, currency = 'IQD', multi_currency = null, discount = null }) {
  const now = new Date().toISOString();
  
  // For multi-currency or mixed items, calculate totals by currency
  let totalUSDAmount = 0;
  let totalIQDAmount = 0;
  
  // Calculate totals preserving original currencies
  items.forEach(item => {
    const quantity = parseInt(item.quantity) || 0;
    const unitPrice = parseFloat(item.unit_price) || 0;
    const itemTotal = quantity * unitPrice;
    
    if (item.currency === 'USD') {
      totalUSDAmount += itemTotal;
    } else {
      totalIQDAmount += itemTotal;
    }
  });
  
  // Determine storage method based on currency mix
  let finalAmount, finalCurrency;
  let isMultiCurrency = false;
  
  if (multi_currency && multi_currency.enabled) {
    // Multi-currency mode - store as multi-currency debt
    totalUSDAmount = parseFloat(multi_currency.usdAmount) || 0;
    totalIQDAmount = parseFloat(multi_currency.iqdAmount) || 0;
    isMultiCurrency = true;
    finalCurrency = 'MULTI';
    finalAmount = totalUSDAmount; // Store USD amount as primary for reference
  } else if (totalUSDAmount > 0 && totalIQDAmount > 0) {
    // Mixed currency items - store as multi-currency
    isMultiCurrency = true;
    finalCurrency = 'MULTI';
    finalAmount = totalUSDAmount; // Store USD amount as primary for reference
  } else if (currency === 'USD' || totalUSDAmount > 0) {
    // Single currency USD
    finalCurrency = 'USD';
    finalAmount = totalUSDAmount;
  } else {
    // Single currency IQD
    finalCurrency = 'IQD';
    finalAmount = totalIQDAmount;
  }
  
  // Apply discount if provided
  if (discount && discount.discount_value) {
    if (discount.discount_type === 'percentage') {
      const discountPercent = discount.discount_value / 100;
      if (isMultiCurrency) {
        totalUSDAmount = totalUSDAmount * (1 - discountPercent);
        totalIQDAmount = totalIQDAmount * (1 - discountPercent);
        finalAmount = totalUSDAmount;
      } else {
        finalAmount = finalAmount * (1 - discountPercent);
      }
    } else {
      // Fixed amount discount - apply to the appropriate currency
      if (finalCurrency === 'USD') {
        finalAmount = Math.max(0, finalAmount - discount.discount_value);
      } else if (finalCurrency === 'IQD') {
        finalAmount = Math.max(0, finalAmount - discount.discount_value);
      } else {
        // For multi-currency, apply to USD first, then IQD if needed
        const discountRemaining = Math.max(0, discount.discount_value - totalUSDAmount);
        totalUSDAmount = Math.max(0, totalUSDAmount - discount.discount_value);
        if (discountRemaining > 0) {
          totalIQDAmount = Math.max(0, totalIQDAmount - discountRemaining);
        }
        finalAmount = totalUSDAmount;
      }
    }
  }
  
  const transaction = db.transaction(() => {
    // Create the main debt record preserving original currency
    // Try with multi-currency columns first, fall back if they don't exist
    let debtResult;
    try {
      debtResult = db.prepare(`INSERT INTO company_debts 
        (company_name, amount, description, created_at, has_items, currency, multi_currency_usd, multi_currency_iqd) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(company_name, finalAmount, description, now, 1, finalCurrency, 
             isMultiCurrency ? totalUSDAmount : null, 
             isMultiCurrency ? totalIQDAmount : null);
    } catch (columnError) {
      // Fallback to basic schema without multi-currency columns
      debtResult = db.prepare(`INSERT INTO company_debts 
        (company_name, amount, description, created_at, has_items, currency) 
        VALUES (?, ?, ?, ?, ?, ?)`)
        .run(company_name, finalAmount, description, now, 1, finalCurrency);
    }
    
    const debtId = debtResult.lastInsertRowid;
    
    // Add all items (storing original currency info for reference)
    const insertItem = db.prepare(`INSERT INTO company_debt_items 
      (debt_id, item_name, item_type, model, ram, storage, quantity, unit_price, total_price, currency) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    
    items.forEach(item => {
      const totalPrice = item.quantity * item.unit_price;
      insertItem.run(
        debtId, 
        item.item_name || [item.brand, item.model].filter(Boolean).join(' '),
        item.item_type || 'product',
        item.model || null,
        item.ram || null,
        item.storage || null,
        item.quantity, 
        item.unit_price, 
        totalPrice,
        item.currency || currency
      );
      
      // Add stock to products or accessories
      if (item.item_type === 'product') {
        // Check if product exists, if not create it
        const existingProduct = db.prepare(`
          SELECT id FROM products 
          WHERE brand = ? AND model = ? AND COALESCE(ram, '') = ? AND COALESCE(storage, '') = ?
        `).get(item.brand || '', item.model || '', item.ram || '', item.storage || '');
        
        if (existingProduct) {
          // Update existing product stock and unarchive if archived
          db.prepare(`UPDATE products SET stock = stock + ?, archived = 0 WHERE id = ?`)
            .run(item.quantity, existingProduct.id);
        } else {
          // Create new product
          db.prepare(`INSERT INTO products 
            (name, brand, model, ram, storage, buying_price, stock, currency, category) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(
              item.item_name || [item.brand, item.model].filter(Boolean).join(' '),
              item.brand || '',
              item.model || '',
              item.ram || null,
              item.storage || null,
              item.unit_price,
              item.quantity,
              item.currency || currency,
              'phones'
            );
        }
      } else if (item.item_type === 'accessory') {
        // Check if accessory exists, if not create it
        const existingAccessory = db.prepare(`
          SELECT id FROM accessories 
          WHERE brand = ? AND model = ? AND COALESCE(type, '') = ?
        `).get(item.brand || '', item.model || '', item.type || '');
        
        if (existingAccessory) {
          // Update existing accessory stock and unarchive if archived
          db.prepare(`UPDATE accessories SET stock = stock + ?, archived = 0 WHERE id = ?`)
            .run(item.quantity, existingAccessory.id);
        } else {
          // Create new accessory
          db.prepare(`INSERT INTO accessories 
            (name, brand, model, type, buying_price, stock, currency) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(
              item.item_name || [item.brand, item.model].filter(Boolean).join(' '),
              item.brand || '',
              item.model || '',
              item.type || null,
              item.unit_price,
              item.quantity,
              item.currency || currency
            );
        }
      }
    });
    
    return { lastInsertRowid: debtId, success: true };
  });
  
  return transaction();
}

function getCompanyDebtItems(db, debtId) {
  return db.prepare('SELECT * FROM company_debt_items WHERE debt_id = ?').all(debtId);
}

function addCompanyDebtItem(db, { debt_id, item_name, quantity, unit_price, currency = 'IQD' }) {
  return db.prepare('INSERT INTO company_debt_items (debt_id, item_name, quantity, unit_price, currency) VALUES (?, ?, ?, ?, ?)')
    .run(debt_id, item_name, quantity, unit_price, currency);
}

function deleteCompanyDebtItem(db, id) {
  return db.prepare('DELETE FROM company_debt_items WHERE id = ?').run(id);
}

function updateCompanyDebtItem(db, { id, item_name, quantity, unit_price, currency = 'IQD' }) {
  return db.prepare('UPDATE company_debt_items SET item_name = ?, quantity = ?, unit_price = ?, currency = ? WHERE id = ?')
    .run(item_name, quantity, unit_price, currency, id);
}

// Personal loans functions
function getPersonalLoans(db) {
  return db.prepare('SELECT * FROM personal_loans ORDER BY created_at DESC').all();
}

function addPersonalLoan(db, { person_name, usd_amount = 0, iqd_amount = 0, description }) {
  const now = new Date().toISOString();
  
  // Validate that at least one amount is provided
  if ((!usd_amount || usd_amount <= 0) && (!iqd_amount || iqd_amount <= 0)) {
    return { success: false, message: 'At least one amount (USD or IQD) must be greater than 0' };
  }

  const transaction = db.transaction(() => {
    // Insert the loan - include the old amount field for backward compatibility
    const totalAmount = usd_amount > 0 ? usd_amount : iqd_amount;
    const currency = usd_amount > 0 ? 'USD' : 'IQD';
    
    const result = db.prepare(`
      INSERT INTO personal_loans (person_name, amount, currency, usd_amount, iqd_amount, description, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(person_name, totalAmount, currency, usd_amount || 0, iqd_amount || 0, description, now);
    
    // Update balances - subtract the loaned amounts from current balance
    if (usd_amount > 0) {
      const { updateBalance } = require('./settings.cjs');
      updateBalance(db, 'USD', -usd_amount);
    }
    if (iqd_amount > 0) {
      const { updateBalance } = require('./settings.cjs');
      updateBalance(db, 'IQD', -iqd_amount);
    }

    // Record transaction for daily tracking - track the loan given as outgoing money (NEGATIVE amounts)
    const loanDescription = `Personal loan given to ${person_name}${description ? ` - ${description}` : ''}`;
    const addTransactionStmt = db.prepare(`
      INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    addTransactionStmt.run(
      'personal_loan',
      -(usd_amount || 0), // Negative because money is going OUT
      -(iqd_amount || 0), // Negative because money is going OUT
      loanDescription,
      result.lastInsertRowid,
      'personal_loan',
      now
    );

    return result;
  });

  const result = transaction();
  
  if (result.changes > 0) {
    return { success: true, id: result.lastInsertRowid };
  } else {
    return { success: false, message: 'Failed to insert personal loan' };
  }
}

function payPersonalLoan(db, id) {
  const now = new Date().toISOString();
  const result = db.prepare('UPDATE personal_loans SET paid_at = ? WHERE id = ?').run(now, id);
  
  if (result.changes > 0) {
    return { success: true };
  } else {
    return { success: false, message: 'Failed to update personal loan or loan not found' };
  }
}

// Enhanced function for marking personal loan as paid with multi-currency support and balance addition
function markPersonalLoanPaid(db, id, paymentData) {
  const { 
    paid_at, 
    payment_usd_amount = 0, 
    payment_iqd_amount = 0 
  } = paymentData || {};
  
  const now = paid_at || new Date().toISOString();
  
  // Validate that at least one payment amount is provided
  if ((!payment_usd_amount || payment_usd_amount <= 0) && (!payment_iqd_amount || payment_iqd_amount <= 0)) {
    return { success: false, message: 'At least one payment amount must be greater than 0' };
  }

  const transaction = db.transaction(() => {
    try {
      // Get loan info before updating for transaction record
      const loanInfo = db.prepare('SELECT person_name, usd_amount, iqd_amount, description, payment_usd_amount, payment_iqd_amount FROM personal_loans WHERE id = ?').get(id);
      
      if (!loanInfo) {
        return { success: false, message: 'Loan not found' };
      }

      // Calculate remaining amounts owed
      const remainingUSD = (loanInfo.usd_amount || 0) - (loanInfo.payment_usd_amount || 0);
      const remainingIQD = (loanInfo.iqd_amount || 0) - (loanInfo.payment_iqd_amount || 0);

      // Get current exchange rates from database
      const iqdToUsdRate = settings.getExchangeRate(db, 'IQD', 'USD') || 0.000694;
      const usdToIqdRate = settings.getExchangeRate(db, 'USD', 'IQD') || 1440;

      // Enhanced validation for cross-currency payments
      // Convert payment to equivalent values for validation
      const paymentUSDEquivalent = payment_usd_amount + (payment_iqd_amount * iqdToUsdRate);
      const remainingTotalUSDEquivalent = remainingUSD + (remainingIQD * iqdToUsdRate);
      
      // Allow cross-currency payment as long as total doesn't exceed remaining loan
      if (paymentUSDEquivalent > remainingTotalUSDEquivalent + 0.01) { // Small tolerance for rounding
        return { 
          success: false, 
          message: `Total payment of ${payment_usd_amount > 0 ? `$${payment_usd_amount}` : ''}${payment_usd_amount > 0 && payment_iqd_amount > 0 ? ' + ' : ''}${payment_iqd_amount > 0 ? `${payment_iqd_amount} IQD` : ''} exceeds remaining loan balance of $${remainingTotalUSDEquivalent.toFixed(2)} equivalent` 
        };
      }

      // For cross-currency payments, we need to handle the conversion logic
      let finalPaymentUSD = payment_usd_amount;
      let finalPaymentIQD = payment_iqd_amount;
      
      // If paying more than what's owed in that specific currency, convert excess to the other currency
      if (payment_usd_amount > remainingUSD && remainingIQD > 0) {
        // Paying more USD than owed, convert excess to IQD payment
        const excessUSD = payment_usd_amount - remainingUSD;
        const excessAsIQD = excessUSD * usdToIqdRate;
        finalPaymentUSD = remainingUSD;
        finalPaymentIQD = Math.min(payment_iqd_amount + excessAsIQD, remainingIQD);
      } else if (payment_iqd_amount > remainingIQD && remainingUSD > 0) {
        // Paying more IQD than owed, convert excess to USD payment
        const excessIQD = payment_iqd_amount - remainingIQD;
        const excessAsUSD = excessIQD * iqdToUsdRate;
        finalPaymentIQD = remainingIQD;
        finalPaymentUSD = Math.min(payment_usd_amount + excessAsUSD, remainingUSD);
      }

      // Calculate new payment totals using the final amounts after cross-currency conversion
      const newPaymentUSD = (loanInfo.payment_usd_amount || 0) + finalPaymentUSD;
      const newPaymentIQD = (loanInfo.payment_iqd_amount || 0) + finalPaymentIQD;

      // Check if loan is fully paid after this payment
      const isFullyPaid = (newPaymentUSD >= (loanInfo.usd_amount || 0)) && (newPaymentIQD >= (loanInfo.iqd_amount || 0));
      
      // Record this specific payment in the debt_payments table
      // This allows us to track each payment's exchange rate accurately
      const recordPaymentStmt = db.prepare(`
        INSERT INTO debt_payments (debt_type, debt_id, payment_usd_amount, payment_iqd_amount, 
                                   payment_currency_used, exchange_rate_usd_to_iqd, exchange_rate_iqd_to_usd, 
                                   payment_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      recordPaymentStmt.run(
        'personal',
        id,
        payment_usd_amount || 0,
        payment_iqd_amount || 0,
        (payment_usd_amount > 0 && payment_iqd_amount > 0) ? 'MULTI' : (payment_usd_amount > 0 ? 'USD' : 'IQD'),
        usdToIqdRate,
        iqdToUsdRate,
        now
      );

      // Update the loan record - only set paid_at if fully paid
      const updateStmt = db.prepare(`
        UPDATE personal_loans 
        SET paid_at = ?, 
            payment_usd_amount = ?, 
            payment_iqd_amount = ?
        WHERE id = ?
      `);
      
      const result = updateStmt.run(
        isFullyPaid ? now : null, // Only mark as paid if fully paid
        newPaymentUSD,
        newPaymentIQD,
        id
      );

      if (result.changes === 0) {
        return { success: false, message: 'Failed to update loan or loan not found' };
      }

      // Add the payment amounts to the current balance - USE ORIGINAL PAYMENT AMOUNTS, NOT CONVERTED ONES!
      // This is crucial: if customer pays in IQD, add to IQD balance, if USD, add to USD balance
      if (payment_usd_amount > 0) {
        const settings = require('./settings.cjs');
        settings.updateBalance(db, 'USD', payment_usd_amount); // Add actual USD paid
      }
      if (payment_iqd_amount > 0) {
        const settings = require('./settings.cjs');
        settings.updateBalance(db, 'IQD', payment_iqd_amount); // Add actual IQD paid
      }
      
      // Record transaction - track the actual payment amounts received (original amounts paid by customer)
      const description = `Loan payment from ${loanInfo.person_name}`;
      const addTransactionStmt = db.prepare(`
        INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      addTransactionStmt.run(
        'loan_payment',
        payment_usd_amount || 0, // Use original payment amounts for transaction record
        payment_iqd_amount || 0,
        description,
        id,
        'personal_loan',
        now
      );

      return { success: true };
    } catch (error) {
      console.error('Error in markPersonalLoanPaid transaction:', error);
      return { success: false, message: error.message || 'Failed to mark loan as paid' };
    }
  });

  return transaction();
}

function deletePersonalLoan(db, id) {
  const result = db.prepare('DELETE FROM personal_loans WHERE id = ?').run(id);
  
  if (result.changes > 0) {
    return { success: true };
  } else {
    return { success: false, message: 'Failed to delete personal loan or loan not found' };
  }
}

// New function to pay total personal loans for a specific person
function payPersonalLoanTotal(db, personName, paymentData) {
  console.log('🔍 [DEBUG] payPersonalLoanTotal called:', {
    personName,
    paymentData
  });
  
  const { 
    payment_usd_amount = 0, 
    payment_iqd_amount = 0 
  } = paymentData || {};
  
  if (!personName) {
    throw new Error('Person name is required');
  }
  
  const now = new Date().toISOString();
  
  const transaction = db.transaction(() => {
    try {
      // Get all unpaid loans for this person, ordered by creation date (oldest first)
      // Use case-insensitive comparison and get multi-currency columns
      const unpaidLoans = db.prepare(`
        SELECT id, person_name, amount, description, currency,
               usd_amount, iqd_amount,
               payment_usd_amount, payment_iqd_amount, created_at
        FROM personal_loans 
        WHERE LOWER(person_name) = LOWER(?) AND paid_at IS NULL
        ORDER BY created_at ASC
      `).all(personName);
      
      if (unpaidLoans.length === 0) {
        // Check if person exists with any loans (paid or unpaid)
        const anyLoans = db.prepare(`
          SELECT COUNT(*) as count FROM personal_loans WHERE LOWER(person_name) = LOWER(?)
        `).get(personName);
        
        if (anyLoans.count === 0) {
          return { success: false, message: `No loans found for person: ${personName}` };
        } else {
          return { success: false, message: `No unpaid loans found for person: ${personName}` };
        }
      }
      
      // Get current exchange rates
      const { getExchangeRate } = require('./settings.cjs');
      const currentUSDToIQD = getExchangeRate(db, 'USD', 'IQD');
      const currentIQDToUSD = 1 / currentUSDToIQD;
      
      let remainingUSDPayment = payment_usd_amount;
      let remainingIQDPayment = payment_iqd_amount;
      let totalPaidUSD = 0;
      let totalPaidIQD = 0;
      let paidLoans = [];
      
      // Process each loan in order (oldest first)
      for (const loan of unpaidLoans) {
        if (remainingUSDPayment <= 0 && remainingIQDPayment <= 0) {
          break; // No more payment left
        }
        
        // Calculate remaining loan for this specific loan using multi-currency approach
        const currentPaidUSD = loan.payment_usd_amount || 0;
        const currentPaidIQD = loan.payment_iqd_amount || 0;
        
        // Get loan amounts (use multi-currency columns if available, fallback to old schema)
        const loanUSDAmount = loan.usd_amount || (loan.currency === 'USD' ? (loan.amount || 0) : 0);
        const loanIQDAmount = loan.iqd_amount || (loan.currency === 'IQD' ? (loan.amount || 0) : 0);
        
        // Calculate remaining amounts for each currency
        const remainingLoanUSD = Math.max(0, loanUSDAmount - currentPaidUSD);
        const remainingLoanIQD = Math.max(0, loanIQDAmount - currentPaidIQD);
        
        // Apply payment to this loan
        let usdToApply = 0;
        let iqdToApply = 0;
        
        // First, apply payments in matching currencies
        if (remainingLoanUSD > 0 && remainingUSDPayment > 0) {
          usdToApply = Math.min(remainingLoanUSD, remainingUSDPayment);
          remainingUSDPayment -= usdToApply;
        }
        
        if (remainingLoanIQD > 0 && remainingIQDPayment > 0) {
          iqdToApply = Math.min(remainingLoanIQD, remainingIQDPayment);
          remainingIQDPayment -= iqdToApply;
        }
        
        // Then apply cross-currency payments if there are remaining loan amounts
        const stillRemainingUSD = remainingLoanUSD - usdToApply;
        const stillRemainingIQD = remainingLoanIQD - iqdToApply;
        
        // Use IQD to pay remaining USD debt
        if (stillRemainingUSD > 0 && remainingIQDPayment > 0) {
          const iqdNeededForUSD = stillRemainingUSD * currentUSDToIQD;
          const iqdToUseForUSD = Math.min(remainingIQDPayment, iqdNeededForUSD);
          iqdToApply += iqdToUseForUSD;
          remainingIQDPayment -= iqdToUseForUSD;
        }
        
        // Use USD to pay remaining IQD debt
        if (stillRemainingIQD > 0 && remainingUSDPayment > 0) {
          const usdNeededForIQD = stillRemainingIQD / currentUSDToIQD;
          const usdToUseForIQD = Math.min(remainingUSDPayment, usdNeededForIQD);
          usdToApply += usdToUseForIQD;
          remainingUSDPayment -= usdToUseForIQD;
        }
        
        // Apply the payment to this loan
        if (usdToApply > 0 || iqdToApply > 0) {
          const newTotalPaidUSD = currentPaidUSD + usdToApply;
          const newTotalPaidIQD = currentPaidIQD + iqdToApply;
          
          // Check if this loan is now fully paid
          const totalUSDPaidEquivalent = newTotalPaidUSD + (newTotalPaidIQD / currentUSDToIQD);
          const totalIQDPaidEquivalent = newTotalPaidIQD + (newTotalPaidUSD * currentUSDToIQD);
          const totalUSDLoanAmount = loanUSDAmount + (loanIQDAmount / currentUSDToIQD);
          const totalIQDLoanAmount = loanIQDAmount + (loanUSDAmount * currentUSDToIQD);
          
          // A loan is fully paid if either the USD equivalent or IQD equivalent is fully covered
          const isFullyPaid = (totalUSDPaidEquivalent >= (totalUSDLoanAmount - 0.01)) || 
                              (totalIQDPaidEquivalent >= (totalIQDLoanAmount - 250));
          
          // Update the loan
          const updateStmt = db.prepare(`
            UPDATE personal_loans 
            SET paid_at = ?, 
                payment_usd_amount = ?, 
                payment_iqd_amount = ?,
                payment_exchange_rate_usd_to_iqd = ?,
                payment_exchange_rate_iqd_to_usd = ?
            WHERE id = ?
          `);
          
          updateStmt.run(
            isFullyPaid ? now : null,
            newTotalPaidUSD,
            newTotalPaidIQD,
            currentUSDToIQD,
            currentIQDToUSD,
            loan.id
          );
          
          // Record this payment in debt_payments table
          const recordPaymentStmt = db.prepare(`
            INSERT INTO debt_payments (debt_type, debt_id, payment_usd_amount, payment_iqd_amount, 
                                       payment_currency_used, exchange_rate_usd_to_iqd, exchange_rate_iqd_to_usd, 
                                       payment_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          recordPaymentStmt.run(
            'personal_loan',
            loan.id,
            usdToApply || 0,
            iqdToApply || 0,
            (usdToApply > 0 && iqdToApply > 0) ? 'MULTI' : (usdToApply > 0 ? 'USD' : 'IQD'),
            currentUSDToIQD,
            currentIQDToUSD,
            now
          );
          
          totalPaidUSD += usdToApply;
          totalPaidIQD += iqdToApply;
          paidLoans.push({ ...loan, paidAmount: { usd: usdToApply, iqd: iqdToApply }, fullyPaid: isFullyPaid });
        }
      }
      
      // Record the total transaction
      if (totalPaidUSD > 0 || totalPaidIQD > 0) {
        const addTransactionStmt = db.prepare(`
          INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        addTransactionStmt.run(
          'personal_loan_payment',
          totalPaidUSD || 0, // Positive for receiving
          totalPaidIQD || 0, // Positive for receiving
          `Total personal loan payment: ${personName} - Paid ${paidLoans.length} loan(s)`,
          null, // No single reference ID since we're paying multiple loans
          'personal_loan_total',
          now
        );
      }
      
      // Add to the user's balance based on what currency was actually used
      // CRITICAL: Handle forced currency payments correctly
      const originalPayment = paymentData._original_payment;
      
      if (originalPayment && originalPayment.force_currency) {
        // For forced currency payments, deduct from the forced currency balance
        console.log('🔍 [DEBUG] Processing forced currency payment:', {
          originalPayment,
          totalPaidUSD,
          totalPaidIQD
        });
        
        if (originalPayment.force_currency === 'USD') {
          // Forced USD: deduct original payment amounts from USD balance only
          const totalOriginalPaymentInUSD = originalPayment.usd + (originalPayment.iqd / currentUSDToIQD);
          if (totalOriginalPaymentInUSD > 0) {
            settings.updateBalance(db, 'USD', totalOriginalPaymentInUSD);
            console.log('🔍 [DEBUG] Updated USD balance by:', totalOriginalPaymentInUSD);
          }
        } else if (originalPayment.force_currency === 'IQD') {
          // Forced IQD: deduct original payment amounts from IQD balance only
          const totalOriginalPaymentInIQD = originalPayment.iqd + (originalPayment.usd * currentUSDToIQD);
          if (totalOriginalPaymentInIQD > 0) {
            settings.updateBalance(db, 'IQD', totalOriginalPaymentInIQD);
            console.log('🔍 [DEBUG] Updated IQD balance by:', totalOriginalPaymentInIQD);
          }
        }
      } else {
        // Regular payment: add to balance based on what was applied to loans
        if (totalPaidUSD > 0) {
          settings.updateBalance(db, 'USD', totalPaidUSD);
        }
        if (totalPaidIQD > 0) {
          settings.updateBalance(db, 'IQD', totalPaidIQD);
        }
      }
      
      return { 
        success: true, 
        message: `Successfully processed payment for ${personName}`,
        paidLoans,
        totalPaid: { usd: totalPaidUSD, iqd: totalPaidIQD },
        remainingPayment: { usd: remainingUSDPayment, iqd: remainingIQDPayment },
        hasOverpayment: remainingUSDPayment > 0 || remainingIQDPayment > 0
      };
      
    } catch (error) {
      console.error('❌ [debts.cjs] Error in payPersonalLoanTotal:', error);
      throw error;
    }
  });
  
  return transaction();
}

// Force USD loan payment - only pay USD loans, but allow any currency balance to be used
function payPersonalLoanTotalForcedUSD(db, personName, paymentData) {
  const { 
    payment_usd_amount = 0, 
    payment_iqd_amount = 0 
  } = paymentData || {};
  
  if (!personName) {
    throw new Error('Person name is required');
  }
  
  const now = new Date().toISOString();
  
  // Get current exchange rates from settings instead of hardcoded fallback
  const { getExchangeRate } = require('./settings.cjs');
  const currentUSDToIQD = getExchangeRate(db, 'USD', 'IQD');
  
  const transaction = db.transaction(() => {
    try {
      // Get all unpaid loans for this person
      const unpaidLoans = db.prepare(`
        SELECT id, person_name, amount, description, currency,
               payment_usd_amount, payment_iqd_amount, created_at
        FROM personal_loans 
        WHERE LOWER(person_name) = LOWER(?) AND paid_at IS NULL
        ORDER BY created_at ASC
      `).all(personName);
      
      if (unpaidLoans.length === 0) {
        return {
          success: true,
          message: 'No unpaid loans found for this person',
          paidLoans: [],
          totalPaid: { usd: 0, iqd: 0 },
          remainingPayment: { usd: payment_usd_amount, iqd: payment_iqd_amount },
          hasOverpayment: payment_usd_amount > 0 || payment_iqd_amount > 0
        };
      }
      
      // Calculate total remaining USD loan for this person - ONLY USD loans
      let totalRemainingUSDLoan = 0;
      const usdLoans = []; // USD loans only
      
      for (const loan of unpaidLoans) {
        const currentPaidUSD = loan.payment_usd_amount || 0;
        const currentPaidIQD = loan.payment_iqd_amount || 0;
        
        if (loan.currency === 'USD') {
          const totalPaidUSDEquivalent = currentPaidUSD + (currentPaidIQD / currentUSDToIQD);
          const remainingLoanUSD = Math.max(0, loan.amount - totalPaidUSDEquivalent);
          
          if (remainingLoanUSD > 0) {
            totalRemainingUSDLoan += remainingLoanUSD;
            usdLoans.push({
              ...loan,
              remainingAmount: remainingLoanUSD
            });
          }
        }
        // IGNORE IQD-only loans completely for forced USD payment
      }
      
      // Only USD loans for forced USD payment
      const allLoansForPayment = [...usdLoans];
      
      if (allLoansForPayment.length === 0) {
        return {
          success: true,
          message: 'No unpaid USD loans found for this person',
          paidLoans: [],
          totalPaid: { usd: 0, iqd: 0 },
          remainingPayment: { usd: payment_usd_amount, iqd: payment_iqd_amount },
          hasOverpayment: payment_usd_amount > 0 || payment_iqd_amount > 0
        };
      }
      
      // Apply payment to all loans (USD priority), but track which currency is being used to pay
      let remainingUSDPayment = payment_usd_amount;
      let remainingIQDPayment = payment_iqd_amount;
      let totalPaidFromUSD = 0;
      let totalPaidFromIQD = 0;
      let paidLoans = [];
      
      // Pay loans until payment is exhausted (USD loans only)
      for (const loan of allLoansForPayment) {
        // Continue as long as there's any payment available (USD OR IQD)
        if (remainingUSDPayment <= 0 && remainingIQDPayment <= 0) break;
        
        const currentPaidUSD = loan.payment_usd_amount || 0;
        const currentPaidIQD = loan.payment_iqd_amount || 0;
        
        let paymentFromUSDBalance = 0;
        let paymentFromIQDBalance = 0;
        
        // Payment logic: Only USD loans allowed in forced USD payment
        if (loan.currency === 'USD') {
          // Try to pay with USD balance first for USD loans
          if (remainingUSDPayment > 0) {
            paymentFromUSDBalance = Math.min(remainingUSDPayment, loan.remainingAmount);
            remainingUSDPayment -= paymentFromUSDBalance;
          }
          
          // If still loan remaining, pay with IQD balance (converted to USD equivalent)
          const stillOwedAfterUSD = loan.remainingAmount - paymentFromUSDBalance;
          if (stillOwedAfterUSD > 0 && remainingIQDPayment > 0) {
            const iqdNeededForLoan = stillOwedAfterUSD * currentUSDToIQD;
            paymentFromIQDBalance = Math.min(remainingIQDPayment, iqdNeededForLoan);
            remainingIQDPayment -= paymentFromIQDBalance;
          }
        }
        
        if (paymentFromUSDBalance > 0 || paymentFromIQDBalance > 0) {
          // For single-currency loans, use the original logic
          const updatedPaidUSD = currentPaidUSD + paymentFromUSDBalance;
          const updatedPaidIQD = currentPaidIQD + paymentFromIQDBalance;
          
          // Check if this specific loan is fully paid based on its currency type
          let isFullyPaid = false;
          if (loan.currency === 'USD') {
            const totalPaidUSDEquivalent = updatedPaidUSD + (updatedPaidIQD / currentUSDToIQD);
            isFullyPaid = totalPaidUSDEquivalent >= loan.amount;
          }
          
          const paidAt = isFullyPaid ? now : null;
          
          // Update loan record
          db.prepare(`
            UPDATE personal_loans 
            SET payment_usd_amount = ?, payment_iqd_amount = ?, paid_at = ?
            WHERE id = ?
          `).run(updatedPaidUSD, updatedPaidIQD, paidAt, loan.id);
          
          paidLoans.push({
            id: loan.id,
            person_name: loan.person_name,
            description: loan.description,
            paymentUSD: paymentFromUSDBalance,
            paymentIQD: paymentFromIQDBalance,
            fullyPaid: isFullyPaid
          });
          
          totalPaidFromUSD += paymentFromUSDBalance;
          totalPaidFromIQD += paymentFromIQDBalance;
        }
      }
      
      // Add to user's balance based on what currency was actually used
      if (totalPaidFromUSD > 0) {
        settings.updateBalance(db, 'USD', totalPaidFromUSD);
      }
      if (totalPaidFromIQD > 0) {
        settings.updateBalance(db, 'IQD', totalPaidFromIQD);
      }
      
      // Check if there's still any loan remaining after payment (all currencies)
      const remainingAllLoans = db.prepare(`
        SELECT SUM(
          CASE 
            WHEN currency = 'USD' THEN amount - COALESCE(payment_usd_amount, 0) - COALESCE(payment_iqd_amount, 0) / 1440
            WHEN currency = 'IQD' THEN amount - COALESCE(payment_iqd_amount, 0) - COALESCE(payment_usd_amount, 0) * 1440
            ELSE amount
          END
        ) as total_remaining
        FROM personal_loans 
        WHERE person_name = ? AND paid_at IS NULL
      `).get(personName);
      
      const finalRemainingLoan = remainingAllLoans?.total_remaining || 0;
      const actualOverpayment = (remainingUSDPayment > 0 || remainingIQDPayment > 0) && finalRemainingLoan <= 0;

      // Record the total transaction for forced USD payment
      if (totalPaidFromUSD > 0 || totalPaidFromIQD > 0) {
        const addTransactionStmt = db.prepare(`
          INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        addTransactionStmt.run(
          'personal_loan_payment',
          totalPaidFromUSD || 0, // Positive for receiving
          totalPaidFromIQD || 0, // Positive for receiving
          `Forced USD loan payment: ${personName} - Paid ${paidLoans.length} loan(s)`,
          null, // No single reference ID since we're paying multiple loans
          'personal_loan_forced_usd',
          now
        );
      }

      return {
        success: true,
        message: `USD loan payment completed for ${personName}`,
        paidLoans,
        totalPaid: { usd: totalPaidFromUSD, iqd: totalPaidFromIQD },
        remainingPayment: { usd: remainingUSDPayment, iqd: remainingIQDPayment },
        hasOverpayment: actualOverpayment,
        paymentMethod: 'forced_usd'
      };
      
    } catch (error) {
      console.error('❌ [debts.cjs] Error in payPersonalLoanTotalForcedUSD:', error);
      throw error;
    }
  });
  
  return transaction();
}

// Force IQD loan payment - only pay IQD loans, but allow any currency balance to be used
function payPersonalLoanTotalForcedIQD(db, personName, paymentData) {
  const { 
    payment_usd_amount = 0, 
    payment_iqd_amount = 0 
  } = paymentData || {};
  
  if (!personName) {
    throw new Error('Person name is required');
  }
  
  const now = new Date().toISOString();
  
  // Get current exchange rates from settings instead of hardcoded fallback
  const { getExchangeRate } = require('./settings.cjs');
  const currentUSDToIQD = getExchangeRate(db, 'USD', 'IQD');
  
  const transaction = db.transaction(() => {
    try {
      // Get all unpaid loans for this person
      const unpaidLoans = db.prepare(`
        SELECT id, person_name, amount, description, currency,
               payment_usd_amount, payment_iqd_amount, created_at
        FROM personal_loans 
        WHERE LOWER(person_name) = LOWER(?) AND paid_at IS NULL
        ORDER BY created_at ASC
      `).all(personName);
      
      if (unpaidLoans.length === 0) {
        return {
          success: true,
          message: 'No unpaid loans found for this person',
          paidLoans: [],
          totalPaid: { usd: 0, iqd: 0 },
          remainingPayment: { usd: payment_usd_amount, iqd: payment_iqd_amount },
          hasOverpayment: payment_usd_amount > 0 || payment_iqd_amount > 0
        };
      }
      
      // Calculate total remaining IQD loan for this person - ONLY IQD loans
      let totalRemainingIQDLoan = 0;
      const iqdLoans = []; // IQD loans only
      
      for (const loan of unpaidLoans) {
        const currentPaidIQD = loan.payment_iqd_amount || 0;
        const currentPaidUSD = loan.payment_usd_amount || 0;
        
        if (loan.currency === 'IQD') {
          const totalPaidIQDEquivalent = currentPaidIQD + (currentPaidUSD * currentUSDToIQD);
          const remainingLoanIQD = Math.max(0, loan.amount - totalPaidIQDEquivalent);
          
          if (remainingLoanIQD > 0) {
            totalRemainingIQDLoan += remainingLoanIQD;
            iqdLoans.push({
              ...loan,
              remainingAmount: remainingLoanIQD
            });
          }
        }
        // IGNORE USD-only loans completely for forced IQD payment
      }
      
      // Only IQD loans for forced IQD payment
      const allLoansForPayment = [...iqdLoans];
      
      if (allLoansForPayment.length === 0) {
        return {
          success: true,
          message: 'No unpaid IQD loans found for this person',
          paidLoans: [],
          totalPaid: { usd: 0, iqd: 0 },
          remainingPayment: { usd: payment_usd_amount, iqd: payment_iqd_amount },
          hasOverpayment: payment_usd_amount > 0 || payment_iqd_amount > 0
        };
      }
      
      // Apply payment to all loans (IQD priority), but track which currency is being used to pay
      let remainingUSDPayment = payment_usd_amount;
      let remainingIQDPayment = payment_iqd_amount;
      let totalPaidFromUSD = 0;
      let totalPaidFromIQD = 0;
      let paidLoans = [];
      
      // Pay loans until payment is exhausted (IQD loans only)
      for (const loan of allLoansForPayment) {
        // Continue as long as there's any payment available (USD OR IQD)
        if (remainingUSDPayment <= 0 && remainingIQDPayment <= 0) break;
        
        const currentPaidUSD = loan.payment_usd_amount || 0;
        const currentPaidIQD = loan.payment_iqd_amount || 0;
        
        let paymentFromUSDBalance = 0;
        let paymentFromIQDBalance = 0;
        
        // Payment logic: Only IQD loans allowed in forced IQD payment
        if (loan.currency === 'IQD') {
          // Try to pay with IQD balance first for IQD loans
          if (remainingIQDPayment > 0) {
            paymentFromIQDBalance = Math.min(remainingIQDPayment, loan.remainingAmount);
            remainingIQDPayment -= paymentFromIQDBalance;
          }
          
          // If still loan remaining, pay with USD balance (converted to IQD equivalent)
          const stillOwedAfterIQD = loan.remainingAmount - paymentFromIQDBalance;
          if (stillOwedAfterIQD > 0 && remainingUSDPayment > 0) {
            const usdNeededForLoan = stillOwedAfterIQD / currentUSDToIQD;
            paymentFromUSDBalance = Math.min(remainingUSDPayment, usdNeededForLoan);
            remainingUSDPayment -= paymentFromUSDBalance;
          }
        }
        
        if (paymentFromUSDBalance > 0 || paymentFromIQDBalance > 0) {
          // For single-currency loans, use the original logic
          const updatedPaidUSD = currentPaidUSD + paymentFromUSDBalance;
          const updatedPaidIQD = currentPaidIQD + paymentFromIQDBalance;
          
          // Check if this specific loan is fully paid based on its currency type
          let isFullyPaid = false;
          if (loan.currency === 'IQD') {
            const totalPaidIQDEquivalent = updatedPaidIQD + (updatedPaidUSD * currentUSDToIQD);
            isFullyPaid = totalPaidIQDEquivalent >= loan.amount;
          }
          
          const paidAt = isFullyPaid ? now : null;
          
          // Update loan record
          db.prepare(`
            UPDATE personal_loans 
            SET payment_usd_amount = ?, payment_iqd_amount = ?, paid_at = ?
            WHERE id = ?
          `).run(updatedPaidUSD, updatedPaidIQD, paidAt, loan.id);
          
          paidLoans.push({
            id: loan.id,
            person_name: loan.person_name,
            description: loan.description,
            paymentUSD: paymentFromUSDBalance,
            paymentIQD: paymentFromIQDBalance,
            fullyPaid: isFullyPaid
          });
          
          totalPaidFromUSD += paymentFromUSDBalance;
          totalPaidFromIQD += paymentFromIQDBalance;
        }
      }
      
      // Add to user's balance based on what currency was actually used
      if (totalPaidFromUSD > 0) {
        settings.updateBalance(db, 'USD', totalPaidFromUSD);
      }
      if (totalPaidFromIQD > 0) {
        settings.updateBalance(db, 'IQD', totalPaidFromIQD);
      }
      
      // Check if there's still any loan remaining after payment (all currencies)
      const remainingAllLoans = db.prepare(`
        SELECT SUM(
          CASE 
            WHEN currency = 'USD' THEN amount - COALESCE(payment_usd_amount, 0) - COALESCE(payment_iqd_amount, 0) / 1440
            WHEN currency = 'IQD' THEN amount - COALESCE(payment_iqd_amount, 0) - COALESCE(payment_usd_amount, 0) * 1440
            ELSE amount
          END
        ) as total_remaining
        FROM personal_loans 
        WHERE person_name = ? AND paid_at IS NULL
      `).get(personName);
      
      const finalRemainingLoan = remainingAllLoans?.total_remaining || 0;
      const actualOverpayment = (remainingIQDPayment > 0 || remainingUSDPayment > 0) && finalRemainingLoan <= 0;

      // Record the total transaction for forced IQD payment
      if (totalPaidFromUSD > 0 || totalPaidFromIQD > 0) {
        const addTransactionStmt = db.prepare(`
          INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        addTransactionStmt.run(
          'personal_loan_payment',
          totalPaidFromUSD || 0, // Positive for receiving
          totalPaidFromIQD || 0, // Positive for receiving
          `Forced IQD loan payment: ${personName} - Paid ${paidLoans.length} loan(s)`,
          null, // No single reference ID since we're paying multiple loans
          'personal_loan_forced_iqd',
          now
        );
      }

      return {
        success: true,
        message: `IQD loan payment completed for ${personName}`,
        paidLoans,
        totalPaid: { usd: totalPaidFromUSD, iqd: totalPaidFromIQD },
        remainingPayment: { usd: remainingUSDPayment, iqd: remainingIQDPayment },
        hasOverpayment: actualOverpayment,
        paymentMethod: 'forced_iqd'
      };
      
    } catch (error) {
      console.error('❌ [debts.cjs] Error in payPersonalLoanTotalForcedIQD:', error);
      throw error;
    }
  });
  
  return transaction();
}

// Targeted currency payment function for personal loans
// Simplified forced currency payment functions that work correctly
function payPersonalLoanTotalSimplifiedForcedUSD(db, personName, paymentData) {
  console.log('🔍 [DEBUG] payPersonalLoanTotalSimplifiedForcedUSD called:', {
    personName,
    paymentData
  });
  
  const { 
    payment_usd_amount = 0, 
    payment_iqd_amount = 0 
  } = paymentData || {};
  
  if (!personName) {
    throw new Error('Person name is required');
  }
  
  const now = new Date().toISOString();
  
  const transaction = db.transaction(() => {
    try {
      // Get all unpaid loans for this person
      const unpaidLoans = db.prepare(`
        SELECT id, person_name, amount, description, currency,
               usd_amount, iqd_amount,
               payment_usd_amount, payment_iqd_amount, created_at
        FROM personal_loans 
        WHERE LOWER(person_name) = LOWER(?) AND paid_at IS NULL
        ORDER BY created_at ASC
      `).all(personName);
      
      if (unpaidLoans.length === 0) {
        return { success: false, message: `No unpaid loans found for person: ${personName}` };
      }
      
      // Get current exchange rates
      const { getExchangeRate } = require('./settings.cjs');
      const currentUSDToIQD = getExchangeRate(db, 'USD', 'IQD');
      const currentIQDToUSD = 1 / currentUSDToIQD;
      
      // Convert all payment amounts to USD for forced USD deduction
      let remainingPaymentUSD = payment_usd_amount + (payment_iqd_amount / currentUSDToIQD);
      let totalPaidUSD = 0;
      let totalPaidIQD = 0;
      let paidLoans = [];
      
      console.log('🔍 [DEBUG] Starting forced USD payment with total:', {
        originalUSD: payment_usd_amount,
        originalIQD: payment_iqd_amount,
        convertedTotalUSD: remainingPaymentUSD,
        exchangeRate: currentUSDToIQD
      });
      
      // STEP 1: Pay all USD loans first (in full priority)
      for (const loan of unpaidLoans) {
        if (remainingPaymentUSD <= 0) break;
        
        const currentPaidUSD = loan.payment_usd_amount || 0;
        const loanUSDAmount = loan.usd_amount || (loan.currency === 'USD' ? (loan.amount || 0) : 0);
        const remainingLoanUSD = Math.max(0, loanUSDAmount - currentPaidUSD);
        
        if (remainingLoanUSD > 0) {
          const usdToApply = Math.min(remainingLoanUSD, remainingPaymentUSD);
          remainingPaymentUSD -= usdToApply;
          
          const newTotalPaidUSD = currentPaidUSD + usdToApply;
          const currentPaidIQD = loan.payment_iqd_amount || 0;
          const loanIQDAmount = loan.iqd_amount || (loan.currency === 'IQD' ? (loan.amount || 0) : 0);
          
          // Check if USD portion is fully paid
          const isUSDFullyPaid = newTotalPaidUSD >= loanUSDAmount - 0.01;
          const isIQDFullyPaid = currentPaidIQD >= loanIQDAmount - 250;
          const isFullyPaid = isUSDFullyPaid && (loanIQDAmount === 0 || isIQDFullyPaid);
          
          // Update the loan
          const updateStmt = db.prepare(`
            UPDATE personal_loans 
            SET paid_at = ?, 
                payment_usd_amount = ?,
                payment_exchange_rate_usd_to_iqd = ?,
                payment_exchange_rate_iqd_to_usd = ?
            WHERE id = ?
          `);
          
          updateStmt.run(
            isFullyPaid ? now : null,
            newTotalPaidUSD,
            currentUSDToIQD,
            currentIQDToUSD,
            loan.id
          );
          
          // Record payment
          const recordPaymentStmt = db.prepare(`
            INSERT INTO debt_payments (debt_type, debt_id, payment_usd_amount, payment_iqd_amount, 
                                       payment_currency_used, exchange_rate_usd_to_iqd, exchange_rate_iqd_to_usd, 
                                       payment_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          recordPaymentStmt.run(
            'personal_loan',
            loan.id,
            usdToApply,
            0,
            'USD',
            currentUSDToIQD,
            currentIQDToUSD,
            now
          );
          
          totalPaidUSD += usdToApply;
          paidLoans.push({ 
            ...loan, 
            paidAmount: { usd: usdToApply, iqd: 0 }, 
            fullyPaid: isFullyPaid,
            phase: 'USD_FIRST'
          });
          
          console.log('🔍 [DEBUG] Applied USD payment:', {
            loanId: loan.id,
            usdToApply,
            remainingPaymentUSD,
            isFullyPaid
          });
        }
      }
      
      // STEP 2: Convert remaining USD payment to IQD and pay IQD loans
      if (remainingPaymentUSD > 0) {
        const remainingIQDFromUSD = remainingPaymentUSD * currentUSDToIQD;
        
        console.log('🔍 [DEBUG] Converting remaining USD to IQD for IQD loans:', {
          remainingUSD: remainingPaymentUSD,
          convertedToIQD: remainingIQDFromUSD
        });
        
        for (const loan of unpaidLoans) {
          if (remainingPaymentUSD <= 0) break;
          
          const currentPaidIQD = loan.payment_iqd_amount || 0;
          const loanIQDAmount = loan.iqd_amount || (loan.currency === 'IQD' ? (loan.amount || 0) : 0);
          const remainingLoanIQD = Math.max(0, loanIQDAmount - currentPaidIQD);
          
          if (remainingLoanIQD > 0) {
            const iqdNeeded = remainingLoanIQD;
            const usdNeededForThisIQD = iqdNeeded / currentUSDToIQD;
            const usdToUseForIQD = Math.min(remainingPaymentUSD, usdNeededForThisIQD);
            const iqdToApply = usdToUseForIQD * currentUSDToIQD;
            
            remainingPaymentUSD -= usdToUseForIQD;
            
            const newTotalPaidIQD = currentPaidIQD + iqdToApply;
            const currentPaidUSD = loan.payment_usd_amount || 0;
            const loanUSDAmount = loan.usd_amount || (loan.currency === 'USD' ? (loan.amount || 0) : 0);
            
            // Check if this loan is now fully paid
            const isIQDFullyPaid = newTotalPaidIQD >= loanIQDAmount - 250;
            const isUSDFullyPaid = currentPaidUSD >= loanUSDAmount - 0.01;
            const isFullyPaid = isIQDFullyPaid && (loanUSDAmount === 0 || isUSDFullyPaid);
            
            // Update the loan
            const updateStmt = db.prepare(`
              UPDATE personal_loans 
              SET paid_at = ?, 
                  payment_iqd_amount = ?,
                  payment_exchange_rate_usd_to_iqd = ?,
                  payment_exchange_rate_iqd_to_usd = ?
              WHERE id = ?
            `);
            
            updateStmt.run(
              isFullyPaid ? now : null,
              newTotalPaidIQD,
              currentUSDToIQD,
              currentIQDToUSD,
              loan.id
            );
            
            // Record payment (converted from USD)
            const recordPaymentStmt = db.prepare(`
              INSERT INTO debt_payments (debt_type, debt_id, payment_usd_amount, payment_iqd_amount, 
                                         payment_currency_used, exchange_rate_usd_to_iqd, exchange_rate_iqd_to_usd, 
                                         payment_date) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            recordPaymentStmt.run(
              'personal_loan',
              loan.id,
              usdToUseForIQD, // Original USD used
              iqdToApply, // IQD equivalent applied
              'USD_TO_IQD', // Indicates conversion
              currentUSDToIQD,
              currentIQDToUSD,
              now
            );
            
            totalPaidIQD += iqdToApply;
            
            // Check if this loan was already in paidLoans from Phase 1
            const existingPaidLoan = paidLoans.find(p => p.id === loan.id);
            if (existingPaidLoan) {
              existingPaidLoan.paidAmount.iqd += iqdToApply;
              existingPaidLoan.fullyPaid = isFullyPaid;
              existingPaidLoan.phase = 'USD_THEN_IQD';
            } else {
              paidLoans.push({ 
                ...loan, 
                paidAmount: { usd: 0, iqd: iqdToApply }, 
                fullyPaid: isFullyPaid,
                phase: 'IQD_FROM_USD'
              });
            }
            
            console.log('🔍 [DEBUG] Applied converted USD→IQD payment:', {
              loanId: loan.id,
              usdUsed: usdToUseForIQD,
              iqdApplied: iqdToApply,
              remainingPaymentUSD,
              isFullyPaid
            });
          }
        }
      }
      
      // Record the total transaction
      const totalOriginalUSD = payment_usd_amount + (payment_iqd_amount / currentUSDToIQD);
      const totalUsedUSD = totalOriginalUSD - remainingPaymentUSD;
      
      if (totalUsedUSD > 0) {
        const addTransactionStmt = db.prepare(`
          INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        addTransactionStmt.run(
          'personal_loan_payment',
          totalPaidUSD, // USD applied to USD loans
          totalPaidIQD, // IQD applied to IQD loans (converted from USD)
          `Forced USD payment: ${personName} - Paid ${paidLoans.length} loan(s) (Sequential: USD first, then IQD)`,
          null,
          'personal_loan_total_forced_usd',
          now
        );
      }
      
      // Update balance (deduct from USD balance only)
      if (totalUsedUSD > 0) {
        const settings = require('./settings.cjs');
        settings.updateBalance(db, 'USD', totalUsedUSD);
        console.log('🔍 [DEBUG] Updated USD balance by:', totalUsedUSD);
      }
      
      return { 
        success: true, 
        message: `Successfully processed forced USD payment for ${personName}`,
        paidLoans,
        totalPaid: { usd: totalPaidUSD, iqd: totalPaidIQD },
        remainingPayment: { usd: remainingPaymentUSD, iqd: 0 },
        hasOverpayment: remainingPaymentUSD > 0.01,
        paymentStrategy: 'SEQUENTIAL_USD_FIRST'
      };
      
    } catch (error) {
      console.error('🔍 [DEBUG] Error in payPersonalLoanTotalSimplifiedForcedUSD:', error);
      throw error;
    }
  });
  
  return transaction();
}

function payPersonalLoanTotalSimplifiedForcedIQD(db, personName, paymentData) {
  console.log('🔍 [DEBUG] payPersonalLoanTotalSimplifiedForcedIQD called:', {
    personName,
    paymentData
  });
  
  const { 
    payment_usd_amount = 0, 
    payment_iqd_amount = 0 
  } = paymentData || {};
  
  if (!personName) {
    throw new Error('Person name is required');
  }
  
  const now = new Date().toISOString();
  
  const transaction = db.transaction(() => {
    try {
      // Get all unpaid loans for this person
      const unpaidLoans = db.prepare(`
        SELECT id, person_name, amount, description, currency,
               usd_amount, iqd_amount,
               payment_usd_amount, payment_iqd_amount, created_at
        FROM personal_loans 
        WHERE LOWER(person_name) = LOWER(?) AND paid_at IS NULL
        ORDER BY created_at ASC
      `).all(personName);
      
      if (unpaidLoans.length === 0) {
        return { success: false, message: `No unpaid loans found for person: ${personName}` };
      }
      
      // Get current exchange rates
      const { getExchangeRate } = require('./settings.cjs');
      const currentUSDToIQD = getExchangeRate(db, 'USD', 'IQD');
      const currentIQDToUSD = 1 / currentUSDToIQD;
      
      // Convert all payment amounts to IQD for forced IQD deduction
      let remainingPaymentIQD = payment_iqd_amount + (payment_usd_amount * currentUSDToIQD);
      let totalPaidUSD = 0;
      let totalPaidIQD = 0;
      let paidLoans = [];
      
      console.log('🔍 [DEBUG] Starting forced IQD payment with total:', {
        originalUSD: payment_usd_amount,
        originalIQD: payment_iqd_amount,
        convertedTotalIQD: remainingPaymentIQD,
        exchangeRate: currentUSDToIQD
      });
      
      // STEP 1: Pay all IQD loans first (in full priority)
      for (const loan of unpaidLoans) {
        if (remainingPaymentIQD <= 0) break;
        
        const currentPaidIQD = loan.payment_iqd_amount || 0;
        const loanIQDAmount = loan.iqd_amount || (loan.currency === 'IQD' ? (loan.amount || 0) : 0);
        const remainingLoanIQD = Math.max(0, loanIQDAmount - currentPaidIQD);
        
        if (remainingLoanIQD > 0) {
          const iqdToApply = Math.min(remainingLoanIQD, remainingPaymentIQD);
          remainingPaymentIQD -= iqdToApply;
          
          const newTotalPaidIQD = currentPaidIQD + iqdToApply;
          const currentPaidUSD = loan.payment_usd_amount || 0;
          const loanUSDAmount = loan.usd_amount || (loan.currency === 'USD' ? (loan.amount || 0) : 0);
          
          // Check if IQD portion is fully paid
          const isIQDFullyPaid = newTotalPaidIQD >= loanIQDAmount - 250;
          const isUSDFullyPaid = currentPaidUSD >= loanUSDAmount - 0.01;
          const isFullyPaid = isIQDFullyPaid && (loanUSDAmount === 0 || isUSDFullyPaid);
          
          // Update the loan
          const updateStmt = db.prepare(`
            UPDATE personal_loans 
            SET paid_at = ?, 
                payment_iqd_amount = ?,
                payment_exchange_rate_usd_to_iqd = ?,
                payment_exchange_rate_iqd_to_usd = ?
            WHERE id = ?
          `);
          
          updateStmt.run(
            isFullyPaid ? now : null,
            newTotalPaidIQD,
            currentUSDToIQD,
            currentIQDToUSD,
            loan.id
          );
          
          // Record payment
          const recordPaymentStmt = db.prepare(`
            INSERT INTO debt_payments (debt_type, debt_id, payment_usd_amount, payment_iqd_amount, 
                                       payment_currency_used, exchange_rate_usd_to_iqd, exchange_rate_iqd_to_usd, 
                                       payment_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          recordPaymentStmt.run(
            'personal_loan',
            loan.id,
            0,
            iqdToApply,
            'IQD',
            currentUSDToIQD,
            currentIQDToUSD,
            now
          );
          
          totalPaidIQD += iqdToApply;
          paidLoans.push({ 
            ...loan, 
            paidAmount: { usd: 0, iqd: iqdToApply }, 
            fullyPaid: isFullyPaid,
            phase: 'IQD_FIRST'
          });
          
          console.log('🔍 [DEBUG] Applied IQD payment:', {
            loanId: loan.id,
            iqdToApply,
            remainingPaymentIQD,
            isFullyPaid
          });
        }
      }
      
      // STEP 2: Convert remaining IQD payment to USD and pay USD loans
      if (remainingPaymentIQD > 0) {
        const remainingUSDFromIQD = remainingPaymentIQD * currentIQDToUSD;
        
        console.log('🔍 [DEBUG] Converting remaining IQD to USD for USD loans:', {
          remainingIQD: remainingPaymentIQD,
          convertedToUSD: remainingUSDFromIQD
        });
        
        for (const loan of unpaidLoans) {
          if (remainingPaymentIQD <= 0) break;
          
          const currentPaidUSD = loan.payment_usd_amount || 0;
          const loanUSDAmount = loan.usd_amount || (loan.currency === 'USD' ? (loan.amount || 0) : 0);
          const remainingLoanUSD = Math.max(0, loanUSDAmount - currentPaidUSD);
          
          if (remainingLoanUSD > 0) {
            const usdNeeded = remainingLoanUSD;
            const iqdNeededForThisUSD = usdNeeded * currentUSDToIQD;
            const iqdToUseForUSD = Math.min(remainingPaymentIQD, iqdNeededForThisUSD);
            const usdToApply = iqdToUseForUSD * currentIQDToUSD;
            
            remainingPaymentIQD -= iqdToUseForUSD;
            
            const newTotalPaidUSD = currentPaidUSD + usdToApply;
            const currentPaidIQD = loan.payment_iqd_amount || 0;
            const loanIQDAmount = loan.iqd_amount || (loan.currency === 'IQD' ? (loan.amount || 0) : 0);
            
            // Check if this loan is now fully paid
            const isUSDFullyPaid = newTotalPaidUSD >= loanUSDAmount - 0.01;
            const isIQDFullyPaid = currentPaidIQD >= loanIQDAmount - 250;
            const isFullyPaid = isUSDFullyPaid && (loanIQDAmount === 0 || isIQDFullyPaid);
            
            // Update the loan
            const updateStmt = db.prepare(`
              UPDATE personal_loans 
              SET paid_at = ?, 
                  payment_usd_amount = ?,
                  payment_exchange_rate_usd_to_iqd = ?,
                  payment_exchange_rate_iqd_to_usd = ?
              WHERE id = ?
            `);
            
            updateStmt.run(
              isFullyPaid ? now : null,
              newTotalPaidUSD,
              currentUSDToIQD,
              currentIQDToUSD,
              loan.id
            );
            
            // Record payment (converted from IQD)
            const recordPaymentStmt = db.prepare(`
              INSERT INTO debt_payments (debt_type, debt_id, payment_usd_amount, payment_iqd_amount, 
                                         payment_currency_used, exchange_rate_usd_to_iqd, exchange_rate_iqd_to_usd, 
                                         payment_date) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            recordPaymentStmt.run(
              'personal_loan',
              loan.id,
              usdToApply, // USD equivalent applied
              iqdToUseForUSD, // Original IQD used
              'IQD_TO_USD', // Indicates conversion
              currentUSDToIQD,
              currentIQDToUSD,
              now
            );
            
            totalPaidUSD += usdToApply;
            
            // Check if this loan was already in paidLoans from Phase 1
            const existingPaidLoan = paidLoans.find(p => p.id === loan.id);
            if (existingPaidLoan) {
              existingPaidLoan.paidAmount.usd += usdToApply;
              existingPaidLoan.fullyPaid = isFullyPaid;
              existingPaidLoan.phase = 'IQD_THEN_USD';
            } else {
              paidLoans.push({ 
                ...loan, 
                paidAmount: { usd: usdToApply, iqd: 0 }, 
                fullyPaid: isFullyPaid,
                phase: 'USD_FROM_IQD'
              });
            }
            
            console.log('🔍 [DEBUG] Applied converted IQD→USD payment:', {
              loanId: loan.id,
              iqdUsed: iqdToUseForUSD,
              usdApplied: usdToApply,
              remainingPaymentIQD,
              isFullyPaid
            });
          }
        }
      }
      
      // Record the total transaction
      const totalOriginalIQD = payment_iqd_amount + (payment_usd_amount * currentUSDToIQD);
      const totalUsedIQD = totalOriginalIQD - remainingPaymentIQD;
      
      if (totalUsedIQD > 0) {
        const addTransactionStmt = db.prepare(`
          INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        addTransactionStmt.run(
          'personal_loan_payment',
          totalPaidUSD, // USD applied to USD loans (converted from IQD)
          totalPaidIQD, // IQD applied to IQD loans
          `Forced IQD payment: ${personName} - Paid ${paidLoans.length} loan(s) (Sequential: IQD first, then USD)`,
          null,
          'personal_loan_total_forced_iqd',
          now
        );
      }
      
      // Update balance (deduct from IQD balance only)
      if (totalUsedIQD > 0) {
        const settings = require('./settings.cjs');
        settings.updateBalance(db, 'IQD', totalUsedIQD);
        console.log('🔍 [DEBUG] Updated IQD balance by:', totalUsedIQD);
      }
      
      return { 
        success: true, 
        message: `Successfully processed forced IQD payment for ${personName}`,
        paidLoans,
        totalPaid: { usd: totalPaidUSD, iqd: totalPaidIQD },
        remainingPayment: { usd: 0, iqd: remainingPaymentIQD },
        hasOverpayment: remainingPaymentIQD > 250,
        paymentStrategy: 'SEQUENTIAL_IQD_FIRST'
      };
      
    } catch (error) {
      console.error('🔍 [DEBUG] Error in payPersonalLoanTotalSimplifiedForcedIQD:', error);
      throw error;
    }
  });
  
  return transaction();
}

function payPersonalLoanTotalTargeted(db, personName, paymentData, targetCurrency) {
  if (targetCurrency === 'USD') {
    return payPersonalLoanTotalForcedUSD(db, personName, paymentData);
  } else if (targetCurrency === 'IQD') {
    return payPersonalLoanTotalForcedIQD(db, personName, paymentData);
  } else {
    return payPersonalLoanTotal(db, personName, paymentData);
  }
}

function getTotalDebts(db) {
  // Get current exchange rate for 250 IQD threshold calculations
  const { getExchangeRate } = require('./settings.cjs');
  const currentUSDToIQD = getExchangeRate(db, 'USD', 'IQD') || 1440;
  
  // Customer debts - account for partial payments
  const customerDebts = db.prepare(`
    SELECT currency, amount, payment_usd_amount, payment_iqd_amount 
    FROM customer_debts 
    WHERE paid_at IS NULL
  `).all();
  
  const customerDebtTotals = customerDebts.reduce((acc, debt) => {
    let remainingAmount = 0;
    
    if (debt.currency === 'USD') {
      const totalPaidUSD = (debt.payment_usd_amount || 0) + ((debt.payment_iqd_amount || 0) / currentUSDToIQD);
      remainingAmount = (debt.amount || 0) - totalPaidUSD;
      
      if (remainingAmount > 0.01) { // USD tolerance
        const existing = acc.find(item => item.currency === 'USD');
        if (existing) {
          existing.total += remainingAmount;
        } else {
          acc.push({ currency: 'USD', total: remainingAmount });
        }
      }
    } else {
      // IQD or unknown currency
      const totalPaidIQD = (debt.payment_iqd_amount || 0) + ((debt.payment_usd_amount || 0) * currentUSDToIQD);
      remainingAmount = (debt.amount || 0) - totalPaidIQD;
      
      if (remainingAmount > 1) { // IQD tolerance
        const existing = acc.find(item => item.currency === 'IQD');
        if (existing) {
          existing.total += remainingAmount;
        } else {
          acc.push({ currency: 'IQD', total: remainingAmount });
        }
      }
    }
    
    return acc;
  }, []);
  
  // Company debts - account for partial payments and 250 IQD threshold
  const companyDebts = db.prepare(`
    SELECT currency, amount, payment_usd_amount, payment_iqd_amount, usd_amount, iqd_amount 
    FROM company_debts 
    WHERE paid_at IS NULL
  `).all();
  
  const companyDebtTotals = companyDebts.reduce((acc, debt) => {
    if (debt.currency === 'MULTI') {
      const remainingUSD = (debt.usd_amount || 0) - (debt.payment_usd_amount || 0);
      const remainingIQD = (debt.iqd_amount || 0) - (debt.payment_iqd_amount || 0);
      
      // Check 250 IQD threshold
      const totalRemainingIQDEquivalent = remainingIQD + (remainingUSD * currentUSDToIQD);
      if (totalRemainingIQDEquivalent >= 250) {
        if (remainingUSD > 0) {
          const existingUSD = acc.find(item => item.currency === 'USD');
          if (existingUSD) {
            existingUSD.total += remainingUSD;
          } else {
            acc.push({ currency: 'USD', total: remainingUSD });
          }
        }
        if (remainingIQD > 0) {
          const existingIQD = acc.find(item => item.currency === 'IQD');
          if (existingIQD) {
            existingIQD.total += remainingIQD;
          } else {
            acc.push({ currency: 'IQD', total: remainingIQD });
          }
        }
      }
    } else if (debt.currency === 'USD') {
      const remainingAmount = (debt.amount || 0) - (debt.payment_usd_amount || 0);
      
      // Check 250 IQD threshold
      const remainingIQDEquivalent = remainingAmount * currentUSDToIQD;
      if (remainingIQDEquivalent >= 250 && remainingAmount > 0.01) {
        const existing = acc.find(item => item.currency === 'USD');
        if (existing) {
          existing.total += remainingAmount;
        } else {
          acc.push({ currency: 'USD', total: remainingAmount });
        }
      }
    } else {
      // IQD or unknown currency
      const remainingAmount = (debt.amount || 0) - (debt.payment_iqd_amount || 0);
      
      // Check 250 IQD threshold
      if (remainingAmount >= 250) {
        const existing = acc.find(item => item.currency === 'IQD');
        if (existing) {
          existing.total += remainingAmount;
        } else {
          acc.push({ currency: 'IQD', total: remainingAmount });
        }
      }
    }
    
    return acc;
  }, []);

  // For personal loans, calculate totals from both USD and IQD amounts, accounting for partial payments
  const personalLoansData = db.prepare(`
    SELECT usd_amount, iqd_amount, payment_usd_amount, payment_iqd_amount, currency, amount
    FROM personal_loans 
    WHERE paid_at IS NULL
  `).all();
  
  const personalLoanTotals = personalLoansData.reduce((acc, loan) => {
    // Use new multi-currency fields if available
    if (loan.usd_amount !== undefined && loan.iqd_amount !== undefined) {
      const remainingUSD = (loan.usd_amount || 0) - (loan.payment_usd_amount || 0);
      const remainingIQD = (loan.iqd_amount || 0) - (loan.payment_iqd_amount || 0);
      
      if (remainingUSD > 0) {
        const existing = acc.find(item => item.currency === 'USD');
        if (existing) {
          existing.total += remainingUSD;
        } else {
          acc.push({ currency: 'USD', total: remainingUSD });
        }
      }
      if (remainingIQD > 0) {
        const existing = acc.find(item => item.currency === 'IQD');
        if (existing) {
          existing.total += remainingIQD;
        } else {
          acc.push({ currency: 'IQD', total: remainingIQD });
        }
      }
    } else {
      // Fallback to old schema
      const amount = loan.amount || 0;
      const currency = loan.currency || 'USD';
      if (amount > 0) {
        const existing = acc.find(item => item.currency === currency);
        if (existing) {
          existing.total += amount;
        } else {
          acc.push({ currency: currency, total: amount });
        }
      }
    }
    
    return acc;
  }, []);

  return {
    customer: customerDebtTotals,
    company: companyDebtTotals,
    personal: personalLoanTotals
  };
}

module.exports = {
  getCustomerDebts,
  getDebtPayments,
  addCustomerDebt,
  payCustomerDebt,
  markCustomerDebtPaid,
  payCustomerDebtTotal,
  payCustomerDebtTotalForcedUSD,
  payCustomerDebtTotalForcedIQD,
  payCustomerDebtTotalTargeted,
  deleteCustomerDebt,
  getCompanyDebts,
  addCompanyDebt,
  addCompanyDebtWithItems,
  payCompanyDebt,
  markCompanyDebtPaid,
  payCompanyDebtTotal,
  payCompanyDebtTotalForcedUSD,
  payCompanyDebtTotalForcedIQD,
  payCompanyDebtTotalTargeted,
  deleteCompanyDebt,
  getCompanyDebtItems,
  addCompanyDebtItem,
  deleteCompanyDebtItem,
  updateCompanyDebtItem,
  getPersonalLoans,
  addPersonalLoan,
  payPersonalLoan,
  markPersonalLoanPaid,
  payPersonalLoanTotal,
  payPersonalLoanTotalForcedUSD,
  payPersonalLoanTotalForcedIQD,
  payPersonalLoanTotalSimplifiedForcedUSD,
  payPersonalLoanTotalSimplifiedForcedIQD,
  payPersonalLoanTotalTargeted,
  deletePersonalLoan,
  getTotalDebts
};
