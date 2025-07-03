// Test script for auto backup cleanup
const { Client, Account, Storage, ID, Databases, Query } = require('appwrite');

// Initialize Appwrite client
const client = new Client();
client
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('685ddcd00006c06a72f0')
  .setJWT('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2ZyYS5jbG91ZC5hcHB3cml0ZS5pby92MSIsImF1ZCI6IjY4NWRkY2QwMDAwNmMwNmE3MmYwIiwic3ViIjoiNjg1ZGRjZGMwMDI3MzQzM2Y3YTMiLCJpYXQiOjE3NTE1MTg2MjUsImV4cCI6MTc1MTUxOTIyNSwibmJmIjoxNzUxNTE4NjI1LCJqdGkiOiJkZGY5NWQyNS1jNGVkLTQ4YjQtODFiZC1iMGU0NGY4YjFiNTEifQ.rqaXcFrjvJjJvZGWfXWlxqrWvgXGxGxBs0yKJxpXE6c');

const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = '685ddd3d003b13f80483';
const BACKUPS_COLLECTION_ID = '685ddd94003cac4491a5';
const BACKUP_BUCKET_ID = '685ddea60039b672ee60';

async function testAutoBackupCleanup() {
  try {
    console.log('Testing auto backup cleanup logic...');
    
    // Get all auto backups
    const autoBackups = await databases.listDocuments(
      DATABASE_ID,
      BACKUPS_COLLECTION_ID,
      [
        Query.equal('userId', '685ddddc0027343f7a3'),
        Query.startsWith('description', 'Auto backup'),
        Query.orderDesc('uploadDate')
      ]
    );

    console.log('Found', autoBackups.documents.length, 'auto backups');
    
    autoBackups.documents.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup.fileName} - ${backup.description} - ${backup.uploadDate}`);
    });

    // Test the cleanup logic (commented out for safety)
    // for (const backup of autoBackups.documents) {
    //   console.log('Would delete:', backup.fileName);
    // }

  } catch (error) {
    console.error('Error testing auto backup cleanup:', error);
  }
}

// Test the cleanup logic
testAutoBackupCleanup();
