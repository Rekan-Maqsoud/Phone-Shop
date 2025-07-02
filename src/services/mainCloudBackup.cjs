// Node.js (main process) Appwrite cloud backup for Electron
const { Client, Account, Storage, ID, Databases, Query } = require('appwrite');
const fs = require('fs');

// These should be securely loaded from environment or settings
const APPWRITE_ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID || '685ddcd00006c06a72f0';
const APPWRITE_BACKUP_BUCKET_ID = process.env.VITE_APPWRITE_BACKUP_BUCKET_ID || '685ddea60039b672ee60';
const APPWRITE_DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || '685ddd3d003b13f80483';
const APPWRITE_BACKUPS_COLLECTION_ID = process.env.VITE_APPWRITE_BACKUPS_COLLECTION_ID || '685ddd94003cac4491a5';

function getAppwriteClient() {
  const client = new Client();
  client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
  return client;
}

// Shared client and services - initialize once and reuse
let sharedClient = null;
let sharedAccount = null;
let sharedStorage = null;
let sharedDatabases = null;
let cachedSessionData = null; // Store session data from renderer process

async function setSession(sessionData) {
  console.log('MainCloudBackup: Setting session data:', { userId: sessionData.userId, userEmail: sessionData.userEmail });
  cachedSessionData = sessionData;
  
  // Initialize services with the new session
  if (sharedClient) {
    try {
      // Clear existing session if any
      await clearSession();
    } catch (e) {
      // Ignore errors when clearing
    }
  }
  
  // Re-initialize with new session
  sharedClient = getAppwriteClient();
  sharedAccount = new Account(sharedClient);
  sharedStorage = new Storage(sharedClient);
  sharedDatabases = new Databases(sharedClient);
  
  // Set the session using the session data from renderer process
  try {
    // Use Appwrite's setJWT method if we have a JWT token
    if (sessionData.jwt) {
      sharedClient.setJWT(sessionData.jwt);
      console.log('MainCloudBackup: JWT set successfully in main process');
    } else if (sessionData.sessionId) {
      // Alternative: create a cookie string for session
      const sessionCookie = `a_session_${APPWRITE_PROJECT_ID}=${sessionData.sessionId}`;
      sharedClient.headers['cookie'] = sessionCookie;
      console.log('MainCloudBackup: Session cookie set in main process');
    }
  } catch (error) {
    console.warn('MainCloudBackup: Failed to set session in main process:', error.message);
  }
}

async function clearSession() {
  console.log('MainCloudBackup: Clearing session data');
  cachedSessionData = null;
  
  if (sharedAccount) {
    try {
      await sharedAccount.deleteSession('current');
    } catch (e) {
      // Ignore errors when clearing session
    }
  }
  
  // Reset all shared services
  sharedClient = null;
  sharedAccount = null;
  sharedStorage = null;
  sharedDatabases = null;
}

async function initializeServices() {
  if (!sharedClient) {
    sharedClient = getAppwriteClient();
    sharedAccount = new Account(sharedClient);
    sharedStorage = new Storage(sharedClient);
    sharedDatabases = new Databases(sharedClient);
  }
  
  // If we have cached session data, we can work with it
  // The main process will rely on the cached session data instead of network auth
  if (cachedSessionData && cachedSessionData.userId) {
    console.log('MainCloudBackup: Using cached session data for operations:', cachedSessionData.userEmail);
    return { client: sharedClient, account: sharedAccount, storage: sharedStorage, databases: sharedDatabases };
  }
  
  // If no cached session, we cannot proceed
  throw new Error('User not authenticated - please sign in to use cloud backup features');
}

async function uploadBackupToCloud(localBackupPath) {
  if (!localBackupPath || !fs.existsSync(localBackupPath)) {
    throw new Error('Local backup file does not exist.');
  }
  
  const { storage, databases } = await initializeServices();
  
  // Use a consistent filename for auto backups to avoid creating multiple files
  const autoBackupName = 'auto-backup-latest.sqlite';
  const fileBuffer = fs.readFileSync(localBackupPath);
  
  // Use consistent file ID for auto backups based on user ID
  const fileId = `auto-backup-${cachedSessionData.userId}`;
  
  try {
    // Check if backup record exists first
    let existingBackup = null;
    try {
      const backupsResult = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_BACKUPS_COLLECTION_ID,
        [
          Query.equal('userId', cachedSessionData.userId),
          Query.equal('fileName', autoBackupName),
          Query.limit(1)
        ]
      );
      existingBackup = backupsResult.documents.length > 0 ? backupsResult.documents[0] : null;
    } catch (dbError) {
      console.log('MainCloudBackup: No existing backup record found');
    }

    // Delete existing file if it exists
    if (existingBackup && existingBackup.fileId) {
      try {
        await storage.deleteFile(APPWRITE_BACKUP_BUCKET_ID, existingBackup.fileId);
        console.log('MainCloudBackup: Deleted existing backup file');
        // Wait a moment for deletion to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (deleteError) {
        console.log('MainCloudBackup: No existing file to delete or delete failed:', deleteError.message);
      }
    }
    
    // Create the new backup file with consistent ID
    const result = await storage.createFile(
      APPWRITE_BACKUP_BUCKET_ID,
      fileId,
      fileBuffer,
      autoBackupName
    );
    
    console.log('MainCloudBackup: Successfully uploaded backup file with ID:', fileId);

    // Update or create backup record
    if (existingBackup) {
      // Update existing record
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_BACKUPS_COLLECTION_ID,
        existingBackup.$id,
        {
          fileId: result.$id,
          fileSize: result.sizeOriginal,
          uploadDate: new Date().toISOString(),
          description: 'Auto backup (updated)'
        }
      );
      console.log('MainCloudBackup: Updated existing backup record');
    } else {
      // Create new record
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_BACKUPS_COLLECTION_ID,
        ID.unique(),
        {
          userId: cachedSessionData.userId,
          fileName: autoBackupName,
          description: 'Auto backup',
          fileId: result.$id,
          fileSize: result.sizeOriginal,
          uploadDate: new Date().toISOString(),
          version: '1'
        }
      );
      console.log('MainCloudBackup: Created new backup record');
    }
    
    return result;
  } catch (error) {
    console.error('MainCloudBackup: Error uploading backup:', error);
    throw error;
  }
}

async function getBackups() {
  try {
    // Ensure we have cached session data
    if (!cachedSessionData || !cachedSessionData.userId) {
      throw new Error('User not authenticated - please sign in to use cloud backup features');
    }
    
    const { databases } = await initializeServices();
    
    console.log('MainCloudBackup: Getting backups for user:', cachedSessionData.userEmail);
    
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_BACKUPS_COLLECTION_ID,
      [
        Query.equal('userId', cachedSessionData.userId),
        Query.orderDesc('uploadDate'),
        Query.limit(50)
      ]
    );

    console.log('MainCloudBackup: Successfully retrieved', response.documents.length, 'backups');
    return { success: true, backups: response.documents };
  } catch (error) {
    console.error('MainCloudBackup: Error getting backups:', error);
    return { success: false, error: error.message };
  }
}

async function getStorageUsage() {
  try {
    // Ensure we have cached session data
    if (!cachedSessionData || !cachedSessionData.userId) {
      throw new Error('User not authenticated - please sign in to use cloud backup features');
    }
    
    console.log('MainCloudBackup: Getting storage usage for user:', cachedSessionData.userEmail);
    
    const backupsResult = await getBackups();
    if (!backupsResult.success) {
      return { success: false, error: backupsResult.error };
    }

    const totalSize = backupsResult.backups.reduce((sum, backup) => sum + (backup.fileSize || 0), 0);
    const count = backupsResult.backups.length;

    console.log('MainCloudBackup: Storage usage calculated -', count, 'backups,', formatFileSize(totalSize));
    return {
      success: true,
      totalSize,
      count,
      formattedSize: formatFileSize(totalSize)
    };
  } catch (error) {
    console.error('MainCloudBackup: Error getting storage usage:', error);
    return { success: false, error: error.message };
  }
}

// Format file size helper function
function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

async function downloadBackup(backupId, downloadPath) {
  try {
    // Ensure we have cached session data
    if (!cachedSessionData || !cachedSessionData.userId) {
      throw new Error('User not authenticated - please sign in to use cloud backup features');
    }
    
    const { databases, storage } = await initializeServices();
    
    console.log('MainCloudBackup: Downloading backup', backupId, 'for user:', cachedSessionData.userEmail);

    // Get backup record
    const backup = await databases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_BACKUPS_COLLECTION_ID,
      backupId
    );

    // Verify ownership using cached session data
    if (backup.userId !== cachedSessionData.userId) {
      throw new Error('Access denied');
    }

    // Get file from storage
    const fileBuffer = await storage.getFileDownload(
      APPWRITE_BACKUP_BUCKET_ID,
      backup.fileId
    );

    // Save to specified path
    if (downloadPath) {
      const path = require('path');
      const dir = path.dirname(downloadPath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Handle the file buffer properly - Appwrite returns Uint8Array
      let bufferToWrite;
      if (fileBuffer instanceof Uint8Array) {
        bufferToWrite = Buffer.from(fileBuffer);
      } else if (fileBuffer instanceof ArrayBuffer) {
        bufferToWrite = Buffer.from(fileBuffer);
      } else if (Buffer.isBuffer(fileBuffer)) {
        bufferToWrite = fileBuffer;
      } else {
        // If it's already a buffer or other format, try to convert
        bufferToWrite = Buffer.from(fileBuffer);
      }
      
      // Write file as binary
      fs.writeFileSync(downloadPath, bufferToWrite);
      
      // Verify the downloaded file is valid SQLite
      try {
        const verifyBuffer = fs.readFileSync(downloadPath);
        if (verifyBuffer.length < 16 || !verifyBuffer.toString('utf8', 0, 15).startsWith('SQLite format 3')) {
          console.error('MainCloudBackup: Downloaded file is not valid SQLite format');
          console.error('MainCloudBackup: File header:', verifyBuffer.slice(0, 16).toString('hex'));
          throw new Error('Downloaded file is not a valid SQLite database backup');
        }
        console.log('MainCloudBackup: Downloaded file verified as valid SQLite database');
      } catch (verifyError) {
        console.error('MainCloudBackup: File verification failed:', verifyError.message);
        // Clean up invalid file
        if (fs.existsSync(downloadPath)) {
          fs.unlinkSync(downloadPath);
        }
        throw verifyError;
      }
      
      console.log('MainCloudBackup: Backup downloaded successfully to:', downloadPath);
    }

    return { 
      success: true, 
      backup: backup,
      data: fileBuffer,
      path: downloadPath
    };
  } catch (error) {
    console.error('MainCloudBackup: Error downloading backup:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { 
  uploadBackupToCloud, 
  getBackups, 
  getStorageUsage, 
  downloadBackup,
  setSession,
  clearSession
};
