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
  
  // Buying costs
  const buyingCosts = db.prepare(`
    SELECT 
      currency,
      SUM(total_price) as total_cost,
      COUNT(*) as purchase_count
    FROM buying_history 
    WHERE DATE(date) BETWEEN ? AND ?
    GROUP BY currency
  `).all(startDate, endDate);
  
  return {
    period: { year, month, startDate, endDate },
    sales: salesData,
    products: productSales,
    purchases: buyingCosts
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
  
  // Today's sales
  const todaySales = db.prepare(`
    SELECT currency, SUM(total) as total, COUNT(*) as count
    FROM sales 
    WHERE DATE(created_at) = ?
    GROUP BY currency
  `).all(today);
  
  // This month's sales
  const monthSales = db.prepare(`
    SELECT currency, SUM(total) as total, COUNT(*) as count
    FROM sales 
    WHERE DATE(created_at) >= ?
    GROUP BY currency
  `).all(thisMonth);
  
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
    today: todaySales,
    thisMonth: monthSales,
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
        totalTransactions: report.transaction_count
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
  
  // Calculate additional metrics
  const totalSalesUSD = baseReport.sales.find(s => s.currency === 'USD')?.total_revenue || 0;
  const totalSalesIQD = baseReport.sales.find(s => s.currency === 'IQD')?.total_revenue || 0;
  
  const totalPurchasesUSD = baseReport.purchases.find(p => p.currency === 'USD')?.total_cost || 0;
  const totalPurchasesIQD = baseReport.purchases.find(p => p.currency === 'IQD')?.total_cost || 0;
  
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
    created_at: new Date().toISOString()
  };
  
  try {
    const result = db.prepare(`
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
