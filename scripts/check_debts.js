const Database = require('better-sqlite3');
const db = new Database('./database/shop.sqlite');

console.log('--- Recent sales (with is_debt) ---');
console.table(db.prepare('SELECT * FROM sales ORDER BY id DESC LIMIT 10').all());

console.log('--- Recent debts ---');
console.table(db.prepare('SELECT * FROM debts ORDER BY id DESC LIMIT 10').all());

console.log('--- Debts joined with sales ---');
console.table(db.prepare(`
  SELECT d.*, s.is_debt, s.total, s.created_at
  FROM debts d
  JOIN sales s ON d.sale_id = s.id
  ORDER BY d.id DESC LIMIT 10
`).all());
