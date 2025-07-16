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
      (debt_id, item_name, quantity, unit_price, currency) 
      VALUES (?, ?, ?, ?, ?)`);
    
    items.forEach(item => {
      insertItem.run(debtId, item.item_name, item.quantity, item.unit_price, currency);
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
  return db.prepare('SELECT * FROM personal_loans WHERE paid_at IS NULL ORDER BY created_at DESC').all();
}

function addPersonalLoan(db, { person_name, amount, description, currency = 'IQD' }) {
  const now = new Date().toISOString();
  const result = db.prepare('INSERT INTO personal_loans (person_name, amount, description, created_at, currency) VALUES (?, ?, ?, ?, ?)')
    .run(person_name, amount, description, now, currency);
  
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
    payment_currency_used, 
    payment_usd_amount = 0, 
    payment_iqd_amount = 0 
  } = paymentData || {};
  
  const now = paid_at || new Date().toISOString();
  
  const transaction = db.transaction(() => {
    try {
      // Get loan info before updating for transaction record
      const loanInfo = db.prepare('SELECT person_name, amount, description, currency FROM personal_loans WHERE id = ?').get(id);
      
      // Update the loan record
      const updateStmt = db.prepare(`
        UPDATE personal_loans 
        SET paid_at = ?, 
            payment_usd_amount = ?, 
            payment_iqd_amount = ?,
            payment_currency_used = ?
        WHERE id = ?
      `);
      
      const result = updateStmt.run(
        now, 
        payment_usd_amount || 0, 
        payment_iqd_amount || 0,
        payment_currency_used || 'USD',
        id
      );
      
      // Record transaction - track the actual payment amounts received
      const addTransactionStmt = db.prepare(`
        INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      addTransactionStmt.run(
        'personal_loan_payment',
        payment_usd_amount || 0,
        payment_iqd_amount || 0,
        `Personal loan payment received: ${loanInfo.person_name} - ${loanInfo.description || 'Payment'}`,
        id,
        'personal_loan',
        now
      );
      
      // Add to the user's balance based on the actual payment amounts (loan being paid back)
      // Add USD amount if any USD was received
      if (payment_usd_amount > 0) {
        settings.updateBalance(db, 'USD', payment_usd_amount);
      }
      
      // Add IQD amount if any IQD was received
      if (payment_iqd_amount > 0) {
        settings.updateBalance(db, 'IQD', payment_iqd_amount);
      }
      
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('Error marking personal loan as paid:', error);
      return false;
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
  
  const personalLoans = db.prepare(`
    SELECT currency, SUM(amount) as total 
    FROM personal_loans 
    WHERE paid_at IS NULL 
    GROUP BY currency
  `).all();
  
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
