const CloudBackupService = require('./src/services/CloudBackupService.cjs');
const fs = require('fs');
const path = require('path');

async function debugBackupDownload() {
  console.log('=== Debug Backup Download Test ===');
  
  const backupService = new CloudBackupService();
  
  // Set a test session (you'll need to get this from the app)
  console.log('Backup service initialized');
  
  // Check if we have authentication
  console.log('Authenticated:', backupService.isAuthenticated);
  
  // Test file paths
  const dbPath = path.join(__dirname, 'database', 'shop.sqlite');
  console.log('Database path:', dbPath);
  console.log('Database exists:', fs.existsSync(dbPath));
  
  if (fs.existsSync(dbPath)) {
    const dbStats = fs.statSync(dbPath);
    console.log('Database size:', dbStats.size, 'bytes');
    
    // Check if it's a valid SQLite file
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(dbPath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    
    const header = buffer.toString('utf8', 0, 15);
    console.log('Database header:', JSON.stringify(header));
    console.log('Is valid SQLite:', header.startsWith('SQLite format 3'));
  }
}

debugBackupDownload().catch(console.error);
