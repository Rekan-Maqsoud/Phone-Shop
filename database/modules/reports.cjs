// Reports and analytics functions

function getMonthlyReport(db, year, month) {
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
  return db.prepare('SELECT * FROM monthly_reports ORDER BY year DESC, month DESC').all();
}

module.exports = {
  getMonthlyReport,
  getYearlyReport,
  getTopSellingProducts,
  getProfitAnalysis,
  getInventoryValue,
  getCustomerAnalysis,
  getDashboardStats,
  getMonthlyReports
};
