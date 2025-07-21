// Incentive management functions for employee bonuses and commissions
const settings = require('./settings.cjs');

function getIncentives(db) {
  try {
    return db.prepare('SELECT * FROM incentives ORDER BY created_at DESC').all();
  } catch (error) {
    console.error('❌ [incentives.cjs] Error getting incentives:', error);
    return [];
  }
}

function addIncentive(db, { company_name, amount, description, currency = 'IQD' }) {
  try {
    // Validate required parameters
    if (!company_name || !amount || amount <= 0) {
      throw new Error('Invalid incentive data: company_name and positive amount are required');
    }
    
    const now = new Date().toISOString();
    const transaction = db.transaction(() => {
      const result = db.prepare('INSERT INTO incentives (company_name, amount, description, created_at, currency) VALUES (?, ?, ?, ?, ?)')
        .run(company_name, amount, description, now, currency);
      
      // Add to shop balance
      if (currency === 'USD') {
        const currentBalance = settings.getSetting(db, 'balanceUSD') || '0';
        const newBalance = parseFloat(currentBalance) + amount;
        settings.setSetting(db, 'balanceUSD', newBalance.toString());
      } else if (currency === 'IQD') {
        const currentBalance = settings.getSetting(db, 'balanceIQD') || '0';
        const newBalance = parseFloat(currentBalance) + amount;
        settings.setSetting(db, 'balanceIQD', newBalance.toString());
      }
      
      return result;
    });
    
    return transaction();
  } catch (error) {
    console.error('❌ [incentives.cjs] Error adding incentive:', error);
    throw error;
  }
}

function removeIncentive(db, id) {
  try {
    if (!id || isNaN(Number(id))) {
      throw new Error('Invalid incentive ID provided');
    }
    
    const transaction = db.transaction(() => {
      // Get the incentive to remove from balance
      const incentive = db.prepare('SELECT * FROM incentives WHERE id = ?').get(id);
      if (!incentive) {
        throw new Error('Incentive not found');
      }
      
      // Remove from shop balance
      if (incentive.currency === 'USD') {
        const currentBalance = settings.getSetting(db, 'balanceUSD') || '0';
        const newBalance = parseFloat(currentBalance) - incentive.amount;
        settings.setSetting(db, 'balanceUSD', newBalance.toString());
      } else if (incentive.currency === 'IQD') {
        const currentBalance = settings.getSetting(db, 'balanceIQD') || '0';
        const newBalance = parseFloat(currentBalance) - incentive.amount;
        settings.setSetting(db, 'balanceIQD', newBalance.toString());
      }
      
      // Delete the incentive
      return db.prepare('DELETE FROM incentives WHERE id = ?').run(id);
    });
    
    return transaction();
  } catch (error) {
    console.error('❌ [incentives.cjs] Error removing incentive:', error);
    throw error;
  }
}

function updateIncentive(db, id, { company_name, amount, description, currency }) {
  try {
    if (!id || isNaN(Number(id))) {
      throw new Error('Invalid incentive ID provided');
    }
    
    const transaction = db.transaction(() => {
      // Get the current incentive
      const currentIncentive = db.prepare('SELECT * FROM incentives WHERE id = ?').get(id);
      if (!currentIncentive) {
        throw new Error('Incentive not found');
      }
      
      // Adjust balance for the difference
      const oldAmount = currentIncentive.amount;
      const oldCurrency = currentIncentive.currency;
      const newAmount = amount || oldAmount;
      const newCurrency = currency || oldCurrency;
      
      // If currency changed, remove old and add new
      if (oldCurrency !== newCurrency) {
        // Remove old amount
        if (oldCurrency === 'USD') {
          const currentBalance = settings.getSetting(db, 'balanceUSD') || '0';
          const newBalance = parseFloat(currentBalance) - oldAmount;
          settings.setSetting(db, 'balanceUSD', newBalance.toString());
        } else if (oldCurrency === 'IQD') {
          const currentBalance = settings.getSetting(db, 'balanceIQD') || '0';
          const newBalance = parseFloat(currentBalance) - oldAmount;
          settings.setSetting(db, 'balanceIQD', newBalance.toString());
        }
        
        // Add new amount
        if (newCurrency === 'USD') {
          const currentBalance = settings.getSetting(db, 'balanceUSD') || '0';
          const newBalance = parseFloat(currentBalance) + newAmount;
          settings.setSetting(db, 'balanceUSD', newBalance.toString());
        } else if (newCurrency === 'IQD') {
          const currentBalance = settings.getSetting(db, 'balanceIQD') || '0';
          const newBalance = parseFloat(currentBalance) + newAmount;
          settings.setSetting(db, 'balanceIQD', newBalance.toString());
        }
      } else {
        // Same currency, just adjust the difference
        const difference = newAmount - oldAmount;
        if (newCurrency === 'USD') {
          const currentBalance = settings.getSetting(db, 'balanceUSD') || '0';
          const newBalance = parseFloat(currentBalance) + difference;
          settings.setSetting(db, 'balanceUSD', newBalance.toString());
        } else if (newCurrency === 'IQD') {
          const currentBalance = settings.getSetting(db, 'balanceIQD') || '0';
          const newBalance = parseFloat(currentBalance) + difference;
          settings.setSetting(db, 'balanceIQD', newBalance.toString());
        }
      }
      
      // Update the incentive
      return db.prepare('UPDATE incentives SET company_name = ?, amount = ?, description = ?, currency = ? WHERE id = ?')
        .run(company_name || currentIncentive.company_name, newAmount, description || currentIncentive.description, newCurrency, id);
    });
    
    return transaction();
  } catch (error) {
    console.error('❌ [incentives.cjs] Error updating incentive:', error);
    throw error;
  }
}

// Get incentives by company name
function getIncentivesByCompany(db, companyName) {
  try {
    return db.prepare('SELECT * FROM incentives WHERE company_name LIKE ? ORDER BY created_at DESC')
      .all(`%${companyName}%`);
  } catch (error) {
    console.error('❌ [incentives.cjs] Error getting incentives by company:', error);
    return [];
  }
}

// Get total incentives by currency
function getIncentiveTotals(db) {
  try {
    const usdTotal = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM incentives WHERE currency = ?').get('USD');
    const iqdTotal = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM incentives WHERE currency = ?').get('IQD');
    
    return {
      USD: usdTotal.total || 0,
      IQD: iqdTotal.total || 0
    };
  } catch (error) {
    console.error('❌ [incentives.cjs] Error getting incentive totals:', error);
    return { USD: 0, IQD: 0 };
  }
}

module.exports = {
  getIncentives,
  addIncentive,
  removeIncentive,
  updateIncentive,
  getIncentivesByCompany,
  getIncentiveTotals
};
