// Reports and analytics functions

function getMonthlyReport(db, year, month) {
  // First, try to get from stored monthly_reports table
  const storedReport = db.prepare('SELECT * FROM monthly_reports WHERE month = ? AND year = ?').get(month, year);
  
  if (storedReport) {
    // Parse JSON fields
    try {
      const topProducts = storedReport.top_products ? JSON.parse(storedReport.top_products) : [];
      const enhanced = storedReport.analytics_data ? JSON.parse(storedReport.analytics_data) : {};
      
      return {
        ...storedReport,
        topProducts,
        enhanced,
        avgTransactionValue: {
          usd: storedReport.avg_transaction_usd,
          iqd: storedReport.avg_transaction_iqd
        },
        totalTransactions: storedReport.transaction_count
      };
    } catch (error) {
      console.error('Error parsing stored report JSON:', error);
    }
  }
  
  // Fallback to generating report on-the-fly
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
  
  // Sales data
  const salesData = db.prepare(`
    SELECT 
      currency,
      COUNT(*) as transaction_count,
      SUM(total) as total_revenue,
      AVG(total) as avg_transaction
    FROM sales 
    WHERE DATE(created_at) BETWEEN ? AND ?
    GROUP BY currency
  `).all(startDate, endDate);
  
  // Product sales breakdown
  const productSales = db.prepare(`
    SELECT 
      si.name,
      si.currency,
      SUM(si.quantity) as total_sold,
      SUM(si.price * si.quantity) as revenue,
      SUM(si.profit * si.quantity) as profit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE DATE(s.created_at) BETWEEN ? AND ?
    GROUP BY si.name, si.currency
    ORDER BY revenue DESC
  `).all(startDate, endDate);
  
  // Buying costs from buying_history - this should match exactly what buying history section shows
  const buyingCosts = db.prepare(`
    SELECT 
      'USD' as currency,
      SUM(
        CASE 
          WHEN currency = 'MULTI' THEN COALESCE(multi_currency_usd, 0)
          WHEN currency = 'USD' THEN total_price
          ELSE 0
        END
      ) as total_cost,
      COUNT(CASE WHEN currency = 'USD' OR (currency = 'MULTI' AND COALESCE(multi_currency_usd, 0) > 0) THEN 1 END) as purchase_count
    FROM buying_history 
    WHERE DATE(date) BETWEEN ? AND ?
    
    UNION ALL
    
    SELECT 
      'IQD' as currency,
      SUM(
        CASE 
          WHEN currency = 'MULTI' THEN COALESCE(multi_currency_iqd, 0)
          WHEN currency = 'IQD' THEN total_price
          ELSE 0
        END
      ) as total_cost,
      COUNT(CASE WHEN currency = 'IQD' OR (currency = 'MULTI' AND COALESCE(multi_currency_iqd, 0) > 0) THEN 1 END) as purchase_count
    FROM buying_history 
    WHERE DATE(date) BETWEEN ? AND ?
  `).all(startDate, endDate, startDate, endDate);

  // Same-day returns that should be subtracted from spending
  const sameDayReturns = db.prepare(`
    SELECT 
      CASE 
        WHEN t.amount_usd > 0 AND t.amount_iqd > 0 THEN 'MULTI'
        WHEN t.amount_usd > 0 THEN 'USD'
        ELSE 'IQD'
      END as currency,
      SUM(CASE WHEN t.amount_usd > 0 THEN t.amount_usd ELSE 0 END) as usd_amount,
      SUM(CASE WHEN t.amount_iqd > 0 THEN t.amount_iqd ELSE 0 END) as iqd_amount,
      COUNT(*) as return_count
    FROM transactions t
    WHERE t.type IN ('purchase_return', 'item_return', 'buying_history_item_return')
      AND DATE(t.created_at) BETWEEN ? AND ?
      -- Only include returns where the original purchase was on the same day
      AND EXISTS (
        SELECT 1 FROM buying_history bh 
        WHERE bh.id = t.reference_id 
        AND DATE(bh.date) = DATE(t.created_at)
      )
    GROUP BY currency
  `).all(startDate, endDate);

  // Company debt payments (spending that should be included in reports)
  const companyDebtPayments = db.prepare(`
    SELECT 
      CASE 
        WHEN amount_usd > 0 AND amount_iqd > 0 THEN 'MULTI'
        WHEN amount_usd > 0 THEN 'USD'
        ELSE 'IQD'
      END as currency,
      SUM(CASE WHEN amount_usd > 0 THEN amount_usd ELSE 0 END) as usd_amount,
      SUM(CASE WHEN amount_iqd > 0 THEN amount_iqd ELSE 0 END) as iqd_amount,
      COUNT(*) as payment_count
    FROM transactions 
    WHERE type = 'company_debt_payment' 
      AND DATE(created_at) BETWEEN ? AND ?
    GROUP BY currency
  `).all(startDate, endDate);

  // Personal loans given out (tracked separately from operational spending)
  const personalLoansGiven = db.prepare(`
    SELECT 
      CASE 
        WHEN amount_usd < 0 AND amount_iqd < 0 THEN 'MULTI'
        WHEN amount_usd < 0 THEN 'USD'
        WHEN amount_iqd < 0 THEN 'IQD'
        ELSE NULL
      END as currency,
      SUM(CASE WHEN amount_usd < 0 THEN ABS(amount_usd) ELSE 0 END) as usd_amount,
      SUM(CASE WHEN amount_iqd < 0 THEN ABS(amount_iqd) ELSE 0 END) as iqd_amount,
      COUNT(*) as loan_count
    FROM transactions 
    WHERE (amount_usd < 0 OR amount_iqd < 0)
      AND type = 'personal_loan' -- Only personal loans
      AND DATE(created_at) BETWEEN ? AND ?
    GROUP BY currency
    HAVING currency IS NOT NULL
  `).all(startDate, endDate);

  // Other spending transactions (negative amounts) - EXCLUDE sales returns AND personal loans
  const otherSpendingTransactions = db.prepare(`
    SELECT 
      CASE 
        WHEN amount_usd < 0 AND amount_iqd < 0 THEN 'MULTI'
        WHEN amount_usd < 0 THEN 'USD'
        WHEN amount_iqd < 0 THEN 'IQD'
        ELSE NULL
      END as currency,
      SUM(CASE WHEN amount_usd < 0 THEN ABS(amount_usd) ELSE 0 END) as usd_amount,
      SUM(CASE WHEN amount_iqd < 0 THEN ABS(amount_iqd) ELSE 0 END) as iqd_amount,
      COUNT(*) as transaction_count
    FROM transactions 
    WHERE (amount_usd < 0 OR amount_iqd < 0)
      AND type NOT IN ('sale_return', 'debt_sale_return', 'personal_loan') -- Exclude sales returns AND personal loans
      AND DATE(created_at) BETWEEN ? AND ?
    GROUP BY currency
    HAVING currency IS NOT NULL
  `).all(startDate, endDate);
  
  // Combine buying costs with company debt payments
  const combinedPurchases = [...buyingCosts];
  
  // Add company debt payments to spending (but log them separately for debugging)
  companyDebtPayments.forEach(payment => {
    if (payment.currency === 'MULTI') {
      // Add USD component
      const existingUSD = combinedPurchases.find(p => p.currency === 'USD');
      if (existingUSD) {
        existingUSD.total_cost += payment.usd_amount;
        existingUSD.purchase_count += payment.payment_count;
      } else {
        combinedPurchases.push({
          currency: 'USD',
          total_cost: payment.usd_amount,
          purchase_count: payment.payment_count
        });
      }
      
      // Add IQD component
      const existingIQD = combinedPurchases.find(p => p.currency === 'IQD');
      if (existingIQD) {
        existingIQD.total_cost += payment.iqd_amount;
        existingIQD.purchase_count += payment.payment_count;
      } else {
        combinedPurchases.push({
          currency: 'IQD',
          total_cost: payment.iqd_amount,
          purchase_count: payment.payment_count
        });
      }
    } else {
      // Single currency payment
      const existing = combinedPurchases.find(p => p.currency === payment.currency);
      const amount = payment.currency === 'USD' ? payment.usd_amount : payment.iqd_amount;
      
      if (existing) {
        existing.total_cost += amount;
        existing.purchase_count += payment.payment_count;
      } else {
        combinedPurchases.push({
          currency: payment.currency,
          total_cost: amount,
          purchase_count: payment.payment_count
        });
      }
    }
  });

  // Add other spending transactions (excluding sales returns and personal loans)
  otherSpendingTransactions.forEach(transaction => {
    if (transaction.currency === 'MULTI') {
      // Add USD component
      const existingUSD = combinedPurchases.find(p => p.currency === 'USD');
      if (existingUSD) {
        existingUSD.total_cost += transaction.usd_amount;
        existingUSD.purchase_count += transaction.transaction_count;
      } else {
        combinedPurchases.push({
          currency: 'USD',
          total_cost: transaction.usd_amount,
          purchase_count: transaction.transaction_count
        });
      }
      
      // Add IQD component
      const existingIQD = combinedPurchases.find(p => p.currency === 'IQD');
      if (existingIQD) {
        existingIQD.total_cost += transaction.iqd_amount;
        existingIQD.purchase_count += transaction.transaction_count;
      } else {
        combinedPurchases.push({
          currency: 'IQD',
          total_cost: transaction.iqd_amount,
          purchase_count: transaction.transaction_count
        });
      }
    } else {
      // Single currency transaction
      const existing = combinedPurchases.find(p => p.currency === transaction.currency);
      const amount = transaction.currency === 'USD' ? transaction.usd_amount : transaction.iqd_amount;
      
      if (existing) {
        existing.total_cost += amount;
        existing.purchase_count += transaction.transaction_count;
      } else {
        combinedPurchases.push({
          currency: transaction.currency,
          total_cost: amount,
          purchase_count: transaction.transaction_count
        });
      }
    }
  });

  // Subtract same-day returns from spending totals
  sameDayReturns.forEach(returnData => {
    if (returnData.currency === 'MULTI') {
      // Subtract USD component
      const existingUSD = combinedPurchases.find(p => p.currency === 'USD');
      if (existingUSD) {
        existingUSD.total_cost = Math.max(0, existingUSD.total_cost - returnData.usd_amount);
      }
      
      // Subtract IQD component  
      const existingIQD = combinedPurchases.find(p => p.currency === 'IQD');
      if (existingIQD) {
        existingIQD.total_cost = Math.max(0, existingIQD.total_cost - returnData.iqd_amount);
      }
    } else {
      // Single currency return
      const existing = combinedPurchases.find(p => p.currency === returnData.currency);
      const amount = returnData.currency === 'USD' ? returnData.usd_amount : returnData.iqd_amount;
      
      if (existing) {
        existing.total_cost = Math.max(0, existing.total_cost - amount);
      }
    }
  });
  
  return {
    period: { year, month, startDate, endDate },
    sales: salesData,
    products: productSales,
    purchases: combinedPurchases,
    personalLoans: personalLoansGiven,
    // Include breakdown for debugging spending calculations
    spendingBreakdown: {
      buyingHistory: buyingCosts,
      companyDebtPayments: companyDebtPayments,
      otherSpending: otherSpendingTransactions,
      sameDayReturns: sameDayReturns
    }
  };
}

function getYearlyReport(db, year) {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  
  // Monthly breakdown
  const monthlyData = [];
  for (let month = 1; month <= 12; month++) {
    const monthReport = getMonthlyReport(db, year, month);
    monthlyData.push(monthReport);
  }
  
  // Yearly totals
  const yearlyTotals = db.prepare(`
    SELECT 
      currency,
      COUNT(*) as transaction_count,
      SUM(total) as total_revenue,
      AVG(total) as avg_transaction
    FROM sales 
    WHERE DATE(created_at) BETWEEN ? AND ?
    GROUP BY currency
  `).all(startDate, endDate);
  
  return {
    year,
    monthly: monthlyData,
    totals: yearlyTotals
  };
}

function getTopSellingProducts(db, limit = 10, startDate = null, endDate = null) {
  let query = `
    SELECT 
      si.name,
      si.currency,
      SUM(si.quantity) as total_sold,
      SUM(si.price * si.quantity) as revenue,
      SUM(si.profit * si.quantity) as profit,
      COUNT(DISTINCT si.sale_id) as transaction_count
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
  `;
  
  const params = [];
  if (startDate && endDate) {
    query += ' WHERE DATE(s.created_at) BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  
  query += `
    GROUP BY si.name, si.currency
    ORDER BY total_sold DESC
    LIMIT ?
  `;
  params.push(limit);
  
  return db.prepare(query).all(...params);
}

function getProfitAnalysis(db, startDate, endDate) {
  const profitData = db.prepare(`
    SELECT 
      si.currency,
      SUM(si.quantity * si.profit) as total_profit,
      SUM(si.quantity * si.price) as total_revenue,
      SUM(si.quantity * si.buying_price) as total_cost,
      COUNT(DISTINCT si.sale_id) as transaction_count
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE DATE(s.created_at) BETWEEN ? AND ?
    GROUP BY si.currency
  `).all(startDate, endDate);
  
  return profitData.map(row => ({
    ...row,
    profit_margin: row.total_revenue > 0 ? (row.total_profit / row.total_revenue * 100) : 0
  }));
}

function getInventoryValue(db) {
  const productValue = db.prepare(`
    SELECT 
      currency,
      SUM(stock * buying_price) as total_value,
      COUNT(*) as product_count
    FROM products 
    WHERE archived = 0
    GROUP BY currency
  `).all();
  
  const accessoryValue = db.prepare(`
    SELECT 
      currency,
      SUM(stock * buying_price) as total_value,
      COUNT(*) as accessory_count
    FROM accessories 
    WHERE archived = 0
    GROUP BY currency
  `).all();
  
  return {
    products: productValue,
    accessories: accessoryValue
  };
}

function getCustomerAnalysis(db, startDate = null, endDate = null) {
  let query = `
    SELECT 
      customer_name,
      currency,
      COUNT(*) as purchase_count,
      SUM(total) as total_spent,
      AVG(total) as avg_purchase,
      MAX(created_at) as last_purchase
    FROM sales 
    WHERE customer_name IS NOT NULL AND customer_name != ''
  `;
  
  const params = [];
  if (startDate && endDate) {
    query += ' AND DATE(created_at) BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  
  query += `
    GROUP BY customer_name, currency
    ORDER BY total_spent DESC
  `;
  
  return db.prepare(query).all(...params);
}

function getDashboardStats(db) {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7) + '-01';
  
  // Today's sales (including debt payments made today)
  const todaySales = db.prepare(`
    SELECT currency, SUM(total) as total, COUNT(*) as count
    FROM sales 
    WHERE DATE(created_at) = ?
    GROUP BY currency
  `).all(today);

  // Today's debt payments (add these to today's sales)
  const todayDebtPayments = db.prepare(`
    SELECT 
      CASE 
        WHEN cd.payment_usd_amount > 0 AND cd.payment_iqd_amount > 0 THEN 'MULTI'
        WHEN cd.payment_usd_amount > 0 THEN 'USD'
        ELSE 'IQD'
      END as currency,
      SUM(CASE WHEN cd.payment_usd_amount > 0 THEN cd.payment_usd_amount ELSE 0 END) as usd_total,
      SUM(CASE WHEN cd.payment_iqd_amount > 0 THEN cd.payment_iqd_amount ELSE 0 END) as iqd_total,
      COUNT(*) as count
    FROM customer_debts cd
    WHERE DATE(cd.paid_at) = ? AND cd.paid_at IS NOT NULL
    GROUP BY currency
  `).all(today);

  // Today's incentives (add these to today's income)
  const todayIncentives = db.prepare(`
    SELECT currency, SUM(amount) as total, COUNT(*) as count
    FROM incentives 
    WHERE DATE(created_at) = ?
    GROUP BY currency
  `).all(today);

  // Merge debt payments and incentives with sales
  const combinedTodaySales = [...todaySales];
  todayDebtPayments.forEach(payment => {
    if (payment.currency === 'MULTI') {
      // Add USD component
      const existingUSD = combinedTodaySales.find(s => s.currency === 'USD');
      if (existingUSD) {
        existingUSD.total += payment.usd_total;
        existingUSD.count += payment.count;
      } else {
        combinedTodaySales.push({
          currency: 'USD',
          total: payment.usd_total,
          count: payment.count
        });
      }
      
      // Add IQD component
      const existingIQD = combinedTodaySales.find(s => s.currency === 'IQD');
      if (existingIQD) {
        existingIQD.total += payment.iqd_total;
        existingIQD.count += payment.count;
      } else {
        combinedTodaySales.push({
          currency: 'IQD',
          total: payment.iqd_total,
          count: payment.count
        });
      }
    } else {
      // Single currency payment
      const existing = combinedTodaySales.find(s => s.currency === payment.currency);
      const amount = payment.currency === 'USD' ? payment.usd_total : payment.iqd_total;
      
      if (existing) {
        existing.total += amount;
        existing.count += payment.count;
      } else {
        combinedTodaySales.push({
          currency: payment.currency,
          total: amount,
          count: payment.count
        });
      }
    }
  });

  // Add incentives to today's income
  todayIncentives.forEach(incentive => {
    const existing = combinedTodaySales.find(s => s.currency === incentive.currency);
    if (existing) {
      existing.total += incentive.total;
      existing.count += incentive.count;
    } else {
      combinedTodaySales.push({
        currency: incentive.currency,
        total: incentive.total,
        count: incentive.count
      });
    }
  });
  
  // This month's sales
  const monthSales = db.prepare(`
    SELECT currency, SUM(total) as total, COUNT(*) as count
    FROM sales 
    WHERE DATE(created_at) >= ?
    GROUP BY currency
  `).all(thisMonth);

  // This month's debt payments
  const monthDebtPayments = db.prepare(`
    SELECT 
      CASE 
        WHEN cd.payment_usd_amount > 0 AND cd.payment_iqd_amount > 0 THEN 'MULTI'
        WHEN cd.payment_usd_amount > 0 THEN 'USD'
        ELSE 'IQD'
      END as currency,
      SUM(CASE WHEN cd.payment_usd_amount > 0 THEN cd.payment_usd_amount ELSE 0 END) as usd_total,
      SUM(CASE WHEN cd.payment_iqd_amount > 0 THEN cd.payment_iqd_amount ELSE 0 END) as iqd_total,
      COUNT(*) as count
    FROM customer_debts cd
    WHERE DATE(cd.paid_at) >= ? AND cd.paid_at IS NOT NULL
    GROUP BY currency
  `).all(thisMonth);

  // This month's incentives
  const monthIncentives = db.prepare(`
    SELECT currency, SUM(amount) as total, COUNT(*) as count
    FROM incentives 
    WHERE DATE(created_at) >= ?
    GROUP BY currency
  `).all(thisMonth);

  // Merge debt payments and incentives with monthly sales
  const combinedMonthSales = [...monthSales];
  monthDebtPayments.forEach(payment => {
    if (payment.currency === 'MULTI') {
      // Add USD component
      const existingUSD = combinedMonthSales.find(s => s.currency === 'USD');
      if (existingUSD) {
        existingUSD.total += payment.usd_total;
        existingUSD.count += payment.count;
      } else {
        combinedMonthSales.push({
          currency: 'USD',
          total: payment.usd_total,
          count: payment.count
        });
      }
      
      // Add IQD component
      const existingIQD = combinedMonthSales.find(s => s.currency === 'IQD');
      if (existingIQD) {
        existingIQD.total += payment.iqd_total;
        existingIQD.count += payment.count;
      } else {
        combinedMonthSales.push({
          currency: 'IQD',
          total: payment.iqd_total,
          count: payment.count
        });
      }
    } else {
      // Single currency payment
      const existing = combinedMonthSales.find(s => s.currency === payment.currency);
      const amount = payment.currency === 'USD' ? payment.usd_total : payment.iqd_total;
      
      if (existing) {
        existing.total += amount;
        existing.count += payment.count;
      } else {
        combinedMonthSales.push({
          currency: payment.currency,
          total: amount,
          count: payment.count
        });
      }
    }
  });

  // Add incentives to monthly income
  monthIncentives.forEach(incentive => {
    const existing = combinedMonthSales.find(s => s.currency === incentive.currency);
    if (existing) {
      existing.total += incentive.total;
      existing.count += incentive.count;
    } else {
      combinedMonthSales.push({
        currency: incentive.currency,
        total: incentive.total,
        count: incentive.count
      });
    }
  });
  
  // Pending debts
  const pendingDebts = db.prepare(`
    SELECT 
      'customer' as type, currency, SUM(amount) as total
    FROM customer_debts 
    WHERE paid_at IS NULL
    GROUP BY currency
    UNION ALL
    SELECT 
      'company' as type, currency, SUM(amount) as total
    FROM company_debts 
    WHERE paid_at IS NULL
    GROUP BY currency
  `).all();
  
  // Low stock alerts
  const lowStock = {
    products: db.prepare('SELECT COUNT(*) as count FROM products WHERE stock <= 5 AND archived = 0').get(),
    accessories: db.prepare('SELECT COUNT(*) as count FROM accessories WHERE stock <= 5 AND archived = 0').get()
  };
  
  return {
    today: combinedTodaySales,
    thisMonth: combinedMonthSales,
    debts: pendingDebts,
    lowStock
  };
}

function getMonthlyReports(db) {
  const reports = db.prepare('SELECT * FROM monthly_reports ORDER BY year DESC, month DESC').all();
  
  return reports.map(report => {
    try {
      return {
        ...report,
        topProducts: report.top_products ? JSON.parse(report.top_products) : [],
        enhanced: report.analytics_data ? JSON.parse(report.analytics_data) : {},
        avgTransactionValue: {
          usd: report.avg_transaction_usd,
          iqd: report.avg_transaction_iqd
        },
        totalTransactions: report.transaction_count,
        personalLoans: [
          ...(report.total_personal_loans_usd > 0 ? [{ currency: 'USD', usd_amount: report.total_personal_loans_usd, iqd_amount: 0, loan_count: 1 }] : []),
          ...(report.total_personal_loans_iqd > 0 ? [{ currency: 'IQD', usd_amount: 0, iqd_amount: report.total_personal_loans_iqd, loan_count: 1 }] : [])
        ]
      };
    } catch (error) {
      console.error('Error parsing report JSON:', error);
      return report;
    }
  });
}

function createMonthlyReport(db, month, year) {
  // Generate comprehensive monthly report
  const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
  const startDate = `${monthStr}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];
  
  // Check if report already exists
  const existingReport = db.prepare('SELECT * FROM monthly_reports WHERE month = ? AND year = ?').get(month, year);
  if (existingReport) {
    return { success: false, message: 'Report already exists for this month' };
  }
  
  // Get basic monthly report data
  const baseReport = getMonthlyReport(db, year, month);
  
  // Calculate additional metrics including company debt payments
  const totalSalesUSD = baseReport.sales.find(s => s.currency === 'USD')?.total_revenue || 0;
  const totalSalesIQD = baseReport.sales.find(s => s.currency === 'IQD')?.total_revenue || 0;
  
  const totalPurchasesUSD = baseReport.purchases.find(p => p.currency === 'USD')?.total_cost || 0;
  const totalPurchasesIQD = baseReport.purchases.find(p => p.currency === 'IQD')?.total_cost || 0;
  
  const totalPersonalLoansUSD = baseReport.personalLoans.find(p => p.currency === 'USD')?.usd_amount || 0;
  const totalPersonalLoansIQD = baseReport.personalLoans.find(p => p.currency === 'IQD')?.iqd_amount || 0;
  
  // Calculate profit (simplified)
  const profitUSD = totalSalesUSD - totalPurchasesUSD;
  const profitIQD = totalSalesIQD - totalPurchasesIQD;
  
  // Insert into database with correct column names
  const reportData = {
    month,
    year,
    total_sales_usd: totalSalesUSD,
    total_sales_iqd: totalSalesIQD,
    total_profit_usd: profitUSD,
    total_profit_iqd: profitIQD,
    total_spent_usd: totalPurchasesUSD,
    total_spent_iqd: totalPurchasesIQD,
    total_personal_loans_usd: totalPersonalLoansUSD,
    total_personal_loans_iqd: totalPersonalLoansIQD,
    created_at: new Date().toISOString()
  };
  
  try {
    // Try with personal loans columns first
    let result;
    try {
      result = db.prepare(`
        INSERT OR REPLACE INTO monthly_reports 
        (month, year, total_sales_usd, total_sales_iqd, total_profit_usd, total_profit_iqd, 
         total_spent_usd, total_spent_iqd, total_personal_loans_usd, total_personal_loans_iqd,
         transaction_count, avg_transaction_usd, avg_transaction_iqd,
         top_products, analytics_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        reportData.month, reportData.year, reportData.total_sales_usd, reportData.total_sales_iqd,
        reportData.total_profit_usd, reportData.total_profit_iqd, reportData.total_spent_usd,
        reportData.total_spent_iqd, reportData.total_personal_loans_usd, reportData.total_personal_loans_iqd,
        baseReport.totalTransactions, 
        baseReport.avgTransactionValue?.usd || 0, baseReport.avgTransactionValue?.iqd || 0,
        JSON.stringify(baseReport.topProducts || []), 
        JSON.stringify(baseReport.enhanced || {}),
        reportData.created_at
      );
    } catch (columnError) {
      // Fallback to original schema without personal loans columns
      result = db.prepare(`
        INSERT OR REPLACE INTO monthly_reports 
        (month, year, total_sales_usd, total_sales_iqd, total_profit_usd, total_profit_iqd, 
         total_spent_usd, total_spent_iqd, transaction_count, avg_transaction_usd, avg_transaction_iqd,
         top_products, analytics_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        reportData.month, reportData.year, reportData.total_sales_usd, reportData.total_sales_iqd,
        reportData.total_profit_usd, reportData.total_profit_iqd, reportData.total_spent_usd,
        reportData.total_spent_iqd, baseReport.totalTransactions, 
        baseReport.avgTransactionValue?.usd || 0, baseReport.avgTransactionValue?.iqd || 0,
        JSON.stringify(baseReport.topProducts || []), 
        JSON.stringify(baseReport.enhanced || {}),
        reportData.created_at
      );
    }
    
    return { 
      success: true, 
      id: result.lastInsertRowid,
      data: { ...reportData, ...baseReport }
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = {
  getMonthlyReport,
  getYearlyReport,
  getTopSellingProducts,
  getProfitAnalysis,
  getInventoryValue,
  getCustomerAnalysis,
  getDashboardStats,
  getMonthlyReports,
  createMonthlyReport
};
