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
      // Get debt info before updating for transaction record
      const debtInfo = db.prepare('SELECT customer_name, amount, description, currency FROM customer_debts WHERE id = ?').get(id);
      
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
      
      // Update the debt record
      const updateStmt = db.prepare(`
        UPDATE customer_debts 
        SET paid_at = ?, 
            payment_usd_amount = ?, 
            payment_iqd_amount = ?,
            payment_currency_used = ?
        WHERE id = ?
      `);
      
      const result = updateStmt.run(
        now, 
        finalUSDAmount || 0, 
        finalIQDAmount || 0,
        payment_currency_used || debtInfo?.currency || 'USD',
        id
      );
      
      // Record transaction - track the actual payment amounts made
      const addTransactionStmt = db.prepare(`
        INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      addTransactionStmt.run(
        'customer_debt_payment',
        finalUSDAmount || 0,
        finalIQDAmount || 0,
        `Customer debt payment: ${debtInfo.customer_name} - ${debtInfo.description || 'Payment'}`,
        id,
        'customer_debt',
        now
      );
      
      // Update the corresponding sale record to reflect actual payment made
      // Find the sale record linked to this debt
      const findSaleStmt = db.prepare('SELECT sale_id FROM customer_debts WHERE id = ?');
      const debtRecord = findSaleStmt.get(id);
      
      if (debtRecord && debtRecord.sale_id) {
        // Update the sale record with actual payment information
        const updateSaleStmt = db.prepare(`
          UPDATE sales 
          SET paid_amount_usd = ?, 
              paid_amount_iqd = ?,
              is_multi_currency = ?
          WHERE id = ?
        `);
        
        const isMultiCurrencyPayment = finalUSDAmount > 0 && finalIQDAmount > 0;
        updateSaleStmt.run(
          finalUSDAmount || 0,
          finalIQDAmount || 0,
          isMultiCurrencyPayment ? 1 : 0,
          debtRecord.sale_id
        );
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
      
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('❌ [debts.cjs] Error marking customer debt as paid:', error);
      return false;
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

function getCompanyDebts(db) {
  try {
    return db.prepare('SELECT * FROM company_debts WHERE paid_at IS NULL ORDER BY created_at DESC').all();
  } catch (error) {
    console.error('❌ [debts.cjs] Error getting company debts:', error);
    return [];
  }
}

function addCompanyDebt(db, { company_name, amount, description, has_items = 0, currency = 'USD', discount = null }) {
  const now = new Date().toISOString();
  
  // Apply discount if provided
  let finalAmount = amount;
  if (discount && discount.discount_value) {
    if (discount.discount_type === 'percentage') {
      finalAmount = amount * (1 - discount.discount_value / 100);
    } else {
      // Fixed amount discount
      finalAmount = Math.max(0, amount - discount.discount_value);
    }
  }
  
  // Simplified: Always store debts in USD value equivalent and ignore original currency
  // Convert to USD if the amount was originally in IQD
  let usdAmount = finalAmount;
  if (currency === 'IQD') {
    // Convert IQD to USD equivalent for storage
    const EXCHANGE_RATES = { USD_TO_IQD: 1440 }; // Use default rate
    usdAmount = finalAmount / EXCHANGE_RATES.USD_TO_IQD;
  }
  
  // Always store as single USD amount for simplicity
  return db.prepare(`INSERT INTO company_debts 
    (company_name, amount, description, created_at, has_items, currency) 
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run(company_name, usdAmount, description, now, has_items, 'USD');
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
      // Get debt info before updating for transaction record
      const debtInfo = db.prepare('SELECT company_name, amount, description, currency FROM company_debts WHERE id = ?').get(id);
      
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
        // Company debts are always stored in USD
        finalUSDAmount = debtInfo.amount;
        finalIQDAmount = 0;
      }
      
      // Update the debt record
      const updateStmt = db.prepare(`
        UPDATE company_debts 
        SET paid_at = ?, 
            payment_usd_amount = ?, 
            payment_iqd_amount = ?,
            payment_currency_used = ?
        WHERE id = ?
      `);
      
      const result = updateStmt.run(
        now, 
        finalUSDAmount || 0, 
        finalIQDAmount || 0,
        payment_currency_used || (finalUSDAmount > 0 && finalIQDAmount > 0 ? 'MULTI' : (finalUSDAmount > 0 ? 'USD' : 'IQD')),
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
        `Company debt payment: ${debtInfo.company_name} - ${debtInfo.description || 'Payment'}`,
        id,
        'company_debt',
        now
      );
      
      // Add entries to buying history for spending tracking - handle both currencies if paid
      const EXCHANGE_RATES = { USD_TO_IQD: 1440, IQD_TO_USD: 1/1440 }; // Use default rates
      
      if (finalUSDAmount > 0 && finalIQDAmount > 0) {
        // Multi-currency payment, create one consolidated entry
        const totalUSDEquivalent = finalUSDAmount + (finalIQDAmount / EXCHANGE_RATES.USD_TO_IQD);
        
        try {
          const addBuyingHistory = db.prepare(`
            INSERT INTO buying_history (item_name, quantity, unit_price, total_price, date, currency, type, reference_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          const description = `Company debt payment: ${debtInfo.company_name} (Multi-currency: $${finalUSDAmount.toFixed(2)} + د.ع${finalIQDAmount.toFixed(0)})`;
          
          addBuyingHistory.run(
            description,
            1,
            totalUSDEquivalent,
            totalUSDEquivalent,
            now,
            'MULTI',
            'debt_payment',
            id
          );
        } catch (columnError) {
          // Fallback without type and reference_id columns
          const addBuyingHistoryBasic = db.prepare(`
            INSERT INTO buying_history (item_name, quantity, unit_price, total_price, date, currency) 
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          
          const description = `Company debt payment: ${debtInfo.company_name} (Multi-currency: $${finalUSDAmount.toFixed(2)} + د.ع${finalIQDAmount.toFixed(0)})`;
          
          addBuyingHistoryBasic.run(
            description,
            1,
            totalUSDEquivalent,
            totalUSDEquivalent,
            now,
            'MULTI'
          );
        }
      } else {
        // Single currency payment
        const primaryCurrency = finalUSDAmount > 0 ? 'USD' : 'IQD';
        const primaryAmount = finalUSDAmount > 0 ? finalUSDAmount : finalIQDAmount;
        
        try {
          const addBuyingHistory = db.prepare(`
            INSERT INTO buying_history (item_name, quantity, unit_price, total_price, date, currency, type, reference_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          const description = `Company debt payment: ${debtInfo.company_name}`;
          
          addBuyingHistory.run(
            description,
            1,
            primaryAmount,
            primaryAmount,
            now,
            primaryCurrency,
            'debt_payment',
            id
          );
        } catch (columnError) {
          // Fallback without type and reference_id columns
          const addBuyingHistoryBasic = db.prepare(`
            INSERT INTO buying_history (item_name, quantity, unit_price, total_price, date, currency) 
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          
          const description = `Company debt payment: ${debtInfo.company_name}`;
          
          addBuyingHistoryBasic.run(
            description,
            1,
            primaryAmount,
            primaryAmount,
            now,
            primaryCurrency
          );
        }
      }
      
      // Deduct from the user's balance based on the actual payment amounts
      // This is the key fix - deduct the currencies that were actually paid
      if (finalUSDAmount > 0) {
        settings.updateBalance(db, 'USD', -finalUSDAmount);
      }
      
      // Deduct IQD amount if any IQD was paid  
      if (finalIQDAmount > 0) {
        settings.updateBalance(db, 'IQD', -finalIQDAmount);
      }
      
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('Error marking company debt as paid:', error);
      return { success: false, message: error.message || 'Failed to mark debt as paid' };
    }
  });
  
  return transaction();
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

function addCompanyDebtWithItems(db, { company_name, description, items, currency = 'USD', discount = null }) {
  const now = new Date().toISOString();
  
  // Calculate total amount from items in USD equivalent
  let totalUSDAmount = 0;
  items.forEach(item => {
    let itemUSDPrice = item.unit_price;
    if (item.currency === 'IQD') {
      // Convert IQD to USD equivalent for storage
      const EXCHANGE_RATES = { USD_TO_IQD: 1440 }; // Use default rate
      itemUSDPrice = item.unit_price / EXCHANGE_RATES.USD_TO_IQD;
    }
    totalUSDAmount += item.quantity * itemUSDPrice;
  });
  
  // Apply discount if provided
  let finalAmount = totalUSDAmount;
  if (discount && discount.discount_value) {
    if (discount.discount_type === 'percentage') {
      finalAmount = totalUSDAmount * (1 - discount.discount_value / 100);
    } else {
      // Fixed amount discount
      finalAmount = Math.max(0, totalUSDAmount - discount.discount_value);
    }
  }
  
  const transaction = db.transaction(() => {
    // Create the main debt record - always in USD for simplicity
    const debtResult = db.prepare(`INSERT INTO company_debts 
      (company_name, amount, description, created_at, has_items, currency) 
      VALUES (?, ?, ?, ?, ?, ?)`)
      .run(company_name, finalAmount, description, now, 1, 'USD');
    
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

      // Enhanced validation for cross-currency payments
      // Convert payment to equivalent values for validation
      const paymentUSDEquivalent = payment_usd_amount + (payment_iqd_amount * EXCHANGE_RATES.IQD_TO_USD);
      const remainingTotalUSDEquivalent = remainingUSD + (remainingIQD * EXCHANGE_RATES.IQD_TO_USD);
      
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
        const excessAsIQD = excessUSD * EXCHANGE_RATES.USD_TO_IQD;
        finalPaymentUSD = remainingUSD;
        finalPaymentIQD = Math.min(payment_iqd_amount + excessAsIQD, remainingIQD);
      } else if (payment_iqd_amount > remainingIQD && remainingUSD > 0) {
        // Paying more IQD than owed, convert excess to USD payment
        const excessIQD = payment_iqd_amount - remainingIQD;
        const excessAsUSD = excessIQD * EXCHANGE_RATES.IQD_TO_USD;
        finalPaymentIQD = remainingIQD;
        finalPaymentUSD = Math.min(payment_usd_amount + excessAsUSD, remainingUSD);
      }

      // Calculate new payment totals using the final amounts after cross-currency conversion
      const newPaymentUSD = (loanInfo.payment_usd_amount || 0) + finalPaymentUSD;
      const newPaymentIQD = (loanInfo.payment_iqd_amount || 0) + finalPaymentIQD;

      // Check if loan is fully paid after this payment
      const isFullyPaid = (newPaymentUSD >= (loanInfo.usd_amount || 0)) && (newPaymentIQD >= (loanInfo.iqd_amount || 0));
      
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

      // Add the payment amounts to the current balance (using final converted amounts)
      if (finalPaymentUSD > 0) {
        const settings = require('./settings.cjs');
        settings.updateBalance(db, 'USD', finalPaymentUSD);
      }
      if (finalPaymentIQD > 0) {
        const settings = require('./settings.cjs');
        settings.updateBalance(db, 'IQD', finalPaymentIQD);
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

function getTotalDebts(db) {
  const customerDebts = db.prepare(`
    SELECT currency, SUM(amount) as total 
    FROM customer_debts 
    WHERE paid_at IS NULL 
    GROUP BY currency
  `).all();
  
  const companyDebts = db.prepare(`
    SELECT currency, SUM(amount) as total 
    FROM company_debts 
    WHERE paid_at IS NULL 
    GROUP BY currency
  `).all();
  
  // For personal loans, calculate totals from both USD and IQD amounts
  const personalLoansUSD = db.prepare(`
    SELECT SUM(usd_amount) as total 
    FROM personal_loans 
    WHERE paid_at IS NULL AND usd_amount > 0
  `).get();
  
  const personalLoansIQD = db.prepare(`
    SELECT SUM(iqd_amount) as total 
    FROM personal_loans 
    WHERE paid_at IS NULL AND iqd_amount > 0
  `).get();

  // Combine personal loans data
  const personalLoans = [];
  if (personalLoansUSD.total > 0) {
    personalLoans.push({ currency: 'USD', total: personalLoansUSD.total });
  }
  if (personalLoansIQD.total > 0) {
    personalLoans.push({ currency: 'IQD', total: personalLoansIQD.total });
  }

  return {
    customer: customerDebts,
    company: companyDebts,
    personal: personalLoans
  };
}

module.exports = {
  getCustomerDebts,
  addCustomerDebt,
  payCustomerDebt,
  markCustomerDebtPaid,
  deleteCustomerDebt,
  getCompanyDebts,
  addCompanyDebt,
  addCompanyDebtWithItems,
  payCompanyDebt,
  markCompanyDebtPaid,
  deleteCompanyDebt,
  getCompanyDebtItems,
  addCompanyDebtItem,
  deleteCompanyDebtItem,
  updateCompanyDebtItem,
  getPersonalLoans,
  addPersonalLoan,
  payPersonalLoan,
  markPersonalLoanPaid,
  deletePersonalLoan,
  getTotalDebts
};
