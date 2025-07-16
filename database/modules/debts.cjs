// Customer and company debt management functions
const settings = require('./settings.cjs');

function getCustomerDebts(db) {
  return db.prepare('SELECT * FROM customer_debts ORDER BY created_at DESC').all();
}

function addCustomerDebt(db, { customer_name, amount, description, currency = 'IQD', sale_id = null }) {
  const now = new Date().toISOString();
  return db.prepare('INSERT INTO customer_debts (customer_name, amount, description, created_at, currency, sale_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(customer_name, amount, description, now, currency, sale_id);
}

function payCustomerDebt(db, id) {
  const now = new Date().toISOString();
  return db.prepare('UPDATE customer_debts SET paid_at = ? WHERE id = ?').run(now, id);
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
      
      if (payment_usd_amount === 0 && payment_iqd_amount === 0 && debtInfo) {
        // No custom payment amounts specified, use the debt's original amount
        if (debtInfo.currency === 'USD') {
          finalUSDAmount = debtInfo.amount;
          finalIQDAmount = 0;
        } else {
          finalUSDAmount = 0;
          finalIQDAmount = debtInfo.amount;
        }
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
      
      // Add to the user's balance based on the actual payment amounts received
      // Add USD amount if any USD was paid by customer
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
  return db.prepare('DELETE FROM customer_debts WHERE id = ?').run(id);
}

function getCompanyDebts(db) {
  return db.prepare('SELECT * FROM company_debts WHERE paid_at IS NULL ORDER BY created_at DESC').all();
}

function addCompanyDebt(db, { company_name, amount, description, has_items = 0, currency = 'IQD', multi_currency = null }) {
  const now = new Date().toISOString();
  
  // If multi-currency is enabled, store both amounts and set currency to 'MULTI'
  if (multi_currency && multi_currency.enabled) {
    return db.prepare(`INSERT INTO company_debts 
      (company_name, amount, description, created_at, has_items, currency, usd_amount, iqd_amount) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(company_name, 0, description, now, has_items, 'MULTI', 
           multi_currency.usdAmount || 0, multi_currency.iqdAmount || 0);
  } else {
    // Single currency
    return db.prepare(`INSERT INTO company_debts 
      (company_name, amount, description, created_at, has_items, currency) 
      VALUES (?, ?, ?, ?, ?, ?)`)
      .run(company_name, amount, description, now, has_items, currency);
  }
}

function payCompanyDebt(db, id) {
  const now = new Date().toISOString();
  return db.prepare('UPDATE company_debts SET paid_at = ? WHERE id = ?').run(now, id);
}

// Enhanced function for marking company debt as paid with multi-currency support and balance deduction
function markCompanyDebtPaid(db, id, paymentData) {
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
      const debtInfo = db.prepare('SELECT company_name, amount, description, currency, usd_amount, iqd_amount FROM company_debts WHERE id = ?').get(id);
      
      // If no specific payment amounts are provided, use the debt's original amount and currency
      let finalUSDAmount = payment_usd_amount;
      let finalIQDAmount = payment_iqd_amount;
      
      if (payment_usd_amount === 0 && payment_iqd_amount === 0 && debtInfo) {
        // No custom payment amounts specified, use the debt's original amount
        if (debtInfo.currency === 'MULTI') {
          finalUSDAmount = debtInfo.usd_amount || 0;
          finalIQDAmount = debtInfo.iqd_amount || 0;
        } else if (debtInfo.currency === 'USD') {
          finalUSDAmount = debtInfo.amount;
          finalIQDAmount = 0;
        } else {
          finalUSDAmount = 0;
          finalIQDAmount = debtInfo.amount;
        }
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
        payment_currency_used || debtInfo?.currency || 'USD',
        id
      );
      
      // Record transaction - track the actual payment amounts made
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
      
      // Add entries to buying history for spending tracking
      if (finalUSDAmount > 0) {
        try {
          const addBuyingHistoryUSD = db.prepare(`
            INSERT INTO buying_history (item_name, quantity, unit_price, total_price, date, currency, type, reference_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          addBuyingHistoryUSD.run(
            `Company debt payment: ${debtInfo.company_name}`,
            1,
            finalUSDAmount,
            finalUSDAmount,
            now,
            'USD',
            'debt_payment',
            id
          );
        } catch (columnError) {
          const addBuyingHistoryUSDBasic = db.prepare(`
            INSERT INTO buying_history (item_name, quantity, unit_price, total_price, date, currency) 
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          
          addBuyingHistoryUSDBasic.run(
            `Company debt payment: ${debtInfo.company_name}`,
            1,
            finalUSDAmount,
            finalUSDAmount,
            now,
            'USD'
          );
        }
      }
      
      if (finalIQDAmount > 0) {
        try {
          const addBuyingHistoryIQD = db.prepare(`
            INSERT INTO buying_history (item_name, quantity, unit_price, total_price, date, currency, type, reference_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          addBuyingHistoryIQD.run(
            `Company debt payment: ${debtInfo.company_name}`,
            1,
            finalIQDAmount,
            finalIQDAmount,
            now,
            'IQD',
            'debt_payment',
            id
          );
        } catch (columnError) {
          const addBuyingHistoryIQDBasic = db.prepare(`
            INSERT INTO buying_history (item_name, quantity, unit_price, total_price, date, currency) 
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          
          addBuyingHistoryIQDBasic.run(
            `Company debt payment: ${debtInfo.company_name}`,
            1,
            finalIQDAmount,
            finalIQDAmount,
            now,
            'IQD'
          );
        }
      }
      
      // Deduct from the user's balance based on the actual payment amounts
      // Deduct USD amount if any USD was paid
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
      return false;
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

function addCompanyDebtWithItems(db, { company_name, description, items, currency = 'IQD', multi_currency = null }) {
  const now = new Date().toISOString();
  
  // Calculate total amount from items
  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  
  const transaction = db.transaction(() => {
    let debtResult;
    
    // Create the main debt record
    if (multi_currency && multi_currency.enabled) {
      debtResult = db.prepare(`INSERT INTO company_debts 
        (company_name, amount, description, created_at, has_items, currency, usd_amount, iqd_amount) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(company_name, 0, description, now, 1, 'MULTI', 
             multi_currency.usdAmount || 0, multi_currency.iqdAmount || 0);
    } else {
      debtResult = db.prepare(`INSERT INTO company_debts 
        (company_name, amount, description, created_at, has_items, currency) 
        VALUES (?, ?, ?, ?, ?, ?)`)
        .run(company_name, totalAmount, description, now, 1, currency);
    }
    
    const debtId = debtResult.lastInsertRowid;
    
    // Add all items
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

      // Validate payment doesn't exceed remaining amounts
      if (payment_usd_amount > remainingUSD) {
        return { success: false, message: `USD payment of $${payment_usd_amount} exceeds remaining balance of $${remainingUSD}` };
      }
      if (payment_iqd_amount > remainingIQD) {
        return { success: false, message: `IQD payment of ${payment_iqd_amount} IQD exceeds remaining balance of ${remainingIQD} IQD` };
      }

      // Calculate new payment totals
      const newPaymentUSD = (loanInfo.payment_usd_amount || 0) + payment_usd_amount;
      const newPaymentIQD = (loanInfo.payment_iqd_amount || 0) + payment_iqd_amount;

      // Update the loan record
      const updateStmt = db.prepare(`
        UPDATE personal_loans 
        SET paid_at = ?, 
            payment_usd_amount = ?, 
            payment_iqd_amount = ?
        WHERE id = ?
      `);
      
      const result = updateStmt.run(
        now, 
        newPaymentUSD,
        newPaymentIQD,
        id
      );

      if (result.changes === 0) {
        return { success: false, message: 'Failed to update loan or loan not found' };
      }

      // Add the payment amounts to the current balance
      if (payment_usd_amount > 0) {
        const settings = require('./settings.cjs');
        settings.updateBalance(db, 'USD', payment_usd_amount);
      }
      if (payment_iqd_amount > 0) {
        const settings = require('./settings.cjs');
        settings.updateBalance(db, 'IQD', payment_iqd_amount);
      }
      
      // Record transaction - track the actual payment amounts received
      const description = `Loan payment from ${loanInfo.person_name}`;
      const addTransactionStmt = db.prepare(`
        INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      addTransactionStmt.run(
        'loan_payment',
        payment_usd_amount || 0,
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
