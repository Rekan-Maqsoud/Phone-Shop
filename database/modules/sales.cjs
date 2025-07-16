// Sales management functions

function getSales(db) {
  const stmt = db.prepare(`
    SELECT sales.*, 
           COUNT(sale_items.id) as item_count,
           GROUP_CONCAT(sale_items.name || ' x' || sale_items.quantity) as items_summary
    FROM sales 
    LEFT JOIN sale_items ON sales.id = sale_items.sale_id 
    GROUP BY sales.id 
    ORDER BY sales.created_at DESC
  `);
  
  const sales = stmt.all();
  
  // Get items for each sale with detailed info including currency conversions
  const saleItemsStmt = db.prepare(`
    SELECT si.*, 
      p.name as product_name, p.ram, p.storage, p.model, p.category, p.currency as product_currency_from_table,
      a.name as accessory_name, a.type as accessory_type, a.currency as accessory_currency_from_table
    FROM sale_items si
    LEFT JOIN products p ON si.product_id = p.id AND si.is_accessory = 0
    LEFT JOIN accessories a ON si.product_id = a.id AND si.is_accessory = 1
    WHERE si.sale_id = ?
  `);

  // Get discounts for each sale
  const discountsStmt = db.prepare(`
    SELECT discount_type, discount_value, currency
    FROM discounts
    WHERE transaction_type = 'sale' AND reference_id = ?
    LIMIT 1
  `);
  
  return sales.map(sale => {
    const items = saleItemsStmt.all(sale.id).map(item => {
      // Ensure product_currency is set correctly
      const productCurrency = item.product_currency || 
                            item.product_currency_from_table || 
                            item.accessory_currency_from_table || 
                            'IQD';
      
      // Debug log for zero buying prices to help identify the issue
      if (item.buying_price === 0 || item.buying_price === null) {
        console.warn('Zero buying price in sales data:', {
          sale_id: sale.id,
          item_name: item.name,
          buying_price: item.buying_price,
          product_currency: productCurrency,
          sale_currency: sale.currency,
          product_id: item.product_id,
          is_accessory: item.is_accessory
        });
      }
      
      return {
        ...item,
        product_currency: productCurrency,
        selling_price: item.price, // Map database 'price' field to frontend 'selling_price'
        original_selling_price: item.original_selling_price || item.price, // Use stored original or fallback to current price
        // Use the pre-calculated values from sale time if available
        profit_in_sale_currency: item.profit_in_sale_currency || item.profit,
        buying_price_in_sale_currency: item.buying_price_in_sale_currency || item.buying_price
      };
    });

    // Get discount information for this sale
    const discount = discountsStmt.get(sale.id);
    
    // Add multi-currency payment info if present
    let multi_currency_payment = undefined;
    if (sale.is_multi_currency) {
      multi_currency_payment = {
        usd_amount: sale.paid_amount_usd || 0,
        iqd_amount: sale.paid_amount_iqd || 0
      };
    }
    const multi_currency = sale.is_multi_currency ? {
      enabled: true
    } : null;
    
    return {
      ...sale,
      items,
      multi_currency,
      multi_currency_payment,
      // Add discount information in the format expected by the frontend
      discount: discount ? {
        type: discount.discount_type,
        value: discount.discount_value
      } : null,
      discount_type: discount?.discount_type || null,
      discount_value: discount?.discount_value || 0,
      discount_currency: discount?.currency || sale.currency,
      // Include exchange rates for historical reference
      exchange_rates: {
        usd_to_iqd: sale.exchange_rate_usd_to_iqd || 1440,
        iqd_to_usd: sale.exchange_rate_iqd_to_usd || 0.000694
      }
    };
  });
}

function getSaleById(db, id) {
  return db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
}

function getSaleItems(db, saleId) {
  return db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
}

function getDebtSales(db) {
  const stmt = db.prepare(`
    SELECT sales.*, 
           COUNT(sale_items.id) as item_count,
           GROUP_CONCAT(sale_items.name || ' x' || sale_items.quantity) as items_summary
    FROM sales 
    LEFT JOIN sale_items ON sales.id = sale_items.sale_id 
    WHERE sales.is_debt = 1
    GROUP BY sales.id 
    ORDER BY sales.created_at DESC
  `);
  
  const sales = stmt.all();
  
  // Get items for each sale with detailed info including currency conversions
  const saleItemsStmt = db.prepare(`
    SELECT si.*, 
      p.name as product_name, p.ram, p.storage, p.model, p.category, p.currency as product_currency_from_table,
      a.name as accessory_name, a.type as accessory_type, a.currency as accessory_currency_from_table
    FROM sale_items si
    LEFT JOIN products p ON si.product_id = p.id AND si.is_accessory = 0
    LEFT JOIN accessories a ON si.product_id = a.id AND si.is_accessory = 1
    WHERE si.sale_id = ?
  `);
  
  return sales.map(sale => {
    const items = saleItemsStmt.all(sale.id).map(item => {
      // Ensure product_currency is set correctly
      const productCurrency = item.product_currency || 
                            item.product_currency_from_table || 
                            item.accessory_currency_from_table || 
                            'IQD';
      
      // Debug log for zero buying prices to help identify the issue
      if (item.buying_price === 0 || item.buying_price === null) {
        console.warn('Zero buying price in debt sales data:', {
          sale_id: sale.id,
          item_name: item.name,
          buying_price: item.buying_price,
          product_currency: productCurrency,
          sale_currency: sale.currency,
          product_id: item.product_id,
          is_accessory: item.is_accessory
        });
      }
      
      return {
        ...item,
        product_currency: productCurrency,
        selling_price: item.price, // Map database 'price' field to frontend 'selling_price'
        original_selling_price: item.original_selling_price || item.price, // Use stored original or fallback to current price
        // Use the pre-calculated values from sale time if available
        profit_in_sale_currency: item.profit_in_sale_currency || item.profit,
        buying_price_in_sale_currency: item.buying_price_in_sale_currency || item.buying_price
      };
    });
    
    // No longer include payment amounts - only track if it was multi-currency
    const multi_currency = sale.is_multi_currency ? {
      enabled: true
    } : null;
    
    return {
      ...sale,
      items,
      multi_currency,
      // Include exchange rates for historical reference
      exchange_rates: {
        usd_to_iqd: sale.exchange_rate_usd_to_iqd || 1440,
        iqd_to_usd: sale.exchange_rate_iqd_to_usd || 0.000694
      }
    };
  });
}

function addSale(db, { total, customer_name, is_debt = 0, currency = 'IQD', paid_amount_usd = 0, paid_amount_iqd = 0, is_multi_currency = 0 }) {
  const now = new Date().toISOString();
  return db.prepare('INSERT INTO sales (created_at, total, customer_name, is_debt, currency, paid_amount_usd, paid_amount_iqd, is_multi_currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(now, total, customer_name, is_debt, currency, paid_amount_usd, paid_amount_iqd, is_multi_currency);
}

function addSaleItem(db, { sale_id, product_id, quantity, price, buying_price = 0, profit = 0, is_accessory = 0, name, currency = 'IQD' }) {
  return db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(sale_id, product_id, quantity, price, buying_price, profit, is_accessory, name, currency);
}

function deleteSale(db, id) {
  const deleteItems = db.prepare('DELETE FROM sale_items WHERE sale_id = ?');
  const deleteSale = db.prepare('DELETE FROM sales WHERE id = ?');
  
  const transaction = db.transaction(() => {
    deleteItems.run(id);
    deleteSale.run(id);
  });
  
  return transaction();
}

function getSalesInDateRange(db, startDate, endDate) {
  const stmt = db.prepare(`
    SELECT sales.*, 
           GROUP_CONCAT(sale_items.name || ' x' || sale_items.quantity) as items_summary
    FROM sales 
    LEFT JOIN sale_items ON sales.id = sale_items.sale_id 
    WHERE DATE(sales.created_at) BETWEEN ? AND ?
    GROUP BY sales.id 
    ORDER BY sales.created_at DESC
  `);
  return stmt.all(startDate, endDate);
}

function getTotalSalesForPeriod(db, startDate, endDate) {
  const stmt = db.prepare(`
    SELECT 
      currency,
      SUM(total) as total_sales,
      COUNT(*) as transaction_count
    FROM sales 
    WHERE DATE(created_at) BETWEEN ? AND ?
    GROUP BY currency
  `);
  return stmt.all(startDate, endDate);
}

function getSalesReport(db, startDate, endDate) {
  const stmt = db.prepare(`
    SELECT 
      sale_items.name,
      SUM(sale_items.quantity) as total_quantity,
      SUM(sale_items.price * sale_items.quantity) as total_revenue,
      SUM(sale_items.profit * sale_items.quantity) as total_profit,
      sale_items.currency
    FROM sale_items
    JOIN sales ON sale_items.sale_id = sales.id
    WHERE DATE(sales.created_at) BETWEEN ? AND ?
    GROUP BY sale_items.name, sale_items.currency
    ORDER BY total_revenue DESC
  `);
  return stmt.all(startDate, endDate);
}

module.exports = {
  getSales,
  getSaleById,
  getSaleItems,
  getDebtSales,
  addSale,
  addSaleItem,
  deleteSale,
  getSalesInDateRange,
  getTotalSalesForPeriod,
  getSalesReport
};
