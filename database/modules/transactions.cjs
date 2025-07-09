// Transaction management functions

function getTransactions(db, limit = 50) {
  return db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT ?').all(limit);
}

function addTransaction(db, { type, amount_usd = 0, amount_iqd = 0, description, reference_id = null, reference_type = null }) {
  const now = new Date().toISOString();
  return db.prepare(`
    INSERT INTO transactions (type, amount_usd, amount_iqd, description, reference_id, reference_type, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(type, amount_usd, amount_iqd, description, reference_id, reference_type, now);
}

function getTransactionsByType(db, type, limit = 50) {
  return db.prepare('SELECT * FROM transactions WHERE type = ? ORDER BY created_at DESC LIMIT ?').all(type, limit);
}

function getTransactionsByDateRange(db, startDate, endDate) {
  return db.prepare('SELECT * FROM transactions WHERE DATE(created_at) BETWEEN ? AND ? ORDER BY created_at DESC')
    .all(startDate, endDate);
}

function getTransactionsByReference(db, reference_type, reference_id) {
  return db.prepare('SELECT * FROM transactions WHERE reference_type = ? AND reference_id = ? ORDER BY created_at DESC')
    .all(reference_type, reference_id);
}

function deleteTransaction(db, id) {
  return db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
}

function getTotalTransactionsByType(db, type, startDate = null, endDate = null) {
  let query = `
    SELECT 
      SUM(amount_usd) as total_usd,
      SUM(amount_iqd) as total_iqd,
      COUNT(*) as transaction_count
    FROM transactions 
    WHERE type = ?
  `;
  
  const params = [type];
  
  if (startDate && endDate) {
    query += ' AND DATE(created_at) BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  
  return db.prepare(query).get(...params);
}

module.exports = {
  getTransactions,
  addTransaction,
  getTransactionsByType,
  getTransactionsByDateRange,
  getTransactionsByReference,
  deleteTransaction,
  getTotalTransactionsByType
};
