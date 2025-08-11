const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'shop.sqlite');
const db = new Database(dbPath);

try {
  console.log('=== Checking ZMC/ZNC company debts ===');
  const debts = db.prepare(`
    SELECT id, company_name, amount, currency, created_at, paid_at, 
           iqd_amount, usd_amount
    FROM company_debts 
    WHERE LOWER(company_name) IN ('zmc', 'znc') 
    ORDER BY created_at DESC
  `).all();

  console.log('Found debts:', JSON.stringify(debts, null, 2));

  console.log('\n=== Checking migrations table ===');
  try {
    const migrations = db.prepare('SELECT * FROM migrations').all();
    console.log('Applied migrations:', migrations);
  } catch (e) {
    console.log('No migrations table found');
  }

  console.log('\n=== Checking table schema ===');
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='company_debts'").get();
  console.log('Table schema:', schema);

  // Also check for any similar company names
  console.log('\n=== Checking all company names that might match ===');
  const allCompanies = db.prepare(`
    SELECT DISTINCT company_name, COUNT(*) as count
    FROM company_debts 
    WHERE company_name LIKE '%z%' OR company_name LIKE '%m%' OR company_name LIKE '%c%'
    GROUP BY company_name
    ORDER BY company_name
  `).all();
  console.log('Companies with z, m, or c:', allCompanies);

} catch (error) {
  console.error('Error:', error);
} finally {
  db.close();
}
