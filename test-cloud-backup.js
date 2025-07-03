const CloudBackupService = require('./src/services/CloudBackupService.cjs');
const path = require('path');

async function testCloudBackup() {
  const backupService = new CloudBackupService();
  
  // Test authentication status
  console.log('Testing cloud backup service...');
  console.log('Authenticated:', backupService.isAuthenticated);
  
  // Test database path
  const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
  console.log('Database path:', dbPath);
  console.log('Database exists:', require('fs').existsSync(dbPath));
  
  if (require('fs').existsSync(dbPath)) {
    console.log('Database size:', require('fs').statSync(dbPath).size, 'bytes');
  }
}

testCloudBackup().catch(console.error);
