// Node.js (main process) Appwrite cloud backup for Electron
const { Client, Account, Storage, ID, Databases, Query } = require('appwrite');
const fs = require('fs');

// These should be securely loaded from environment or settings
const APPWRITE_ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID;
const APPWRITE_BACKUP_BUCKET_ID = process.env.VITE_APPWRITE_BACKUP_BUCKET_ID;
const APPWRITE_DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID;
const APPWRITE_BACKUPS_COLLECTION_ID = process.env.VITE_APPWRITE_BACKUPS_COLLECTION_ID;

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
  sharedClient = null;
  await initializeServices();
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
  
  // If we have cached session data from the renderer process, use it
  if (cachedSessionData) {
    console.log('MainCloudBackup: Using cached session for user:', cachedSessionData.userEmail);
    
    // Try to validate the cached session
    try {
      const user = await sharedAccount.get();
      if (user && user.$id === cachedSessionData.userId) {
        console.log('MainCloudBackup: Cached session is valid for user:', user.email);
        return { client: sharedClient, account: sharedAccount, storage: sharedStorage, databases: sharedDatabases };
      } else {
        console.log('MainCloudBackup: Cached session user mismatch, clearing cache');
        cachedSessionData = null;
      }
    } catch (error) {
      console.log('MainCloudBackup: Cached session validation failed:', error.message);
      cachedSessionData = null;
    }
  }
  
  // If no cached session or validation failed, try to check for existing session
  let user = null;
  let retryCount = 0;
  const maxRetries = 3; // Reduced retries since we should have cached session
  
  while (!user && retryCount < maxRetries) {
    try {
      user = await sharedAccount.get();
      if (user && user.$id) {
        console.log('MainCloudBackup: Successfully authenticated user:', user.email);
        break; // Success
      }
    } catch (error) {
      retryCount++;
      console.log(`MainCloudBackup: Auth check attempt ${retryCount}/${maxRetries}`, error.message);
      
      if (retryCount < maxRetries) {
        // Reduced wait time since we expect cached session to work
        const waitTime = Math.min(500 * retryCount, 2000); // Max 2 seconds
        console.log(`MainCloudBackup: Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error('MainCloudBackup: Failed to authenticate after', maxRetries, 'attempts');
        throw new Error('User not authenticated - please sign in to use cloud backup features');
      }
    }
  }
  
  return { client: sharedClient, account: sharedAccount, storage: sharedStorage, databases: sharedDatabases };
}

async function uploadBackupToCloud(localBackupPath) {
  if (!localBackupPath || !fs.existsSync(localBackupPath)) {
    throw new Error('Local backup file does not exist.');
  }
  
  const { storage } = await initializeServices();
  
  // Use a consistent filename for auto backups to avoid creating multiple files
  const autoBackupName = 'auto-backup-latest.sqlite';
  const fileBuffer = fs.readFileSync(localBackupPath);
  const fileId = 'auto-backup-latest';
  
  try {
    // First, try to delete the existing file if it exists
    try {
      await storage.deleteFile(APPWRITE_BACKUP_BUCKET_ID, fileId);
      console.log('MainCloudBackup: Deleted existing backup file');
    } catch (deleteError) {
      // File doesn't exist, which is fine
      console.log('MainCloudBackup: No existing file to delete (normal for first backup)');
    }
    
    // Create the new backup file
    const result = await storage.createFile(
      APPWRITE_BACKUP_BUCKET_ID,
      fileId,
      fileBuffer,
      autoBackupName
    );
    
    console.log('MainCloudBackup: Successfully uploaded backup file');
    return result;
  } catch (error) {
    console.error('MainCloudBackup: Error uploading backup:', error);
    throw error;
  }
}

async function getBackups() {
  try {
    const { databases, account } = await initializeServices();
    
    // If we have cached session data, use it directly
    if (cachedSessionData) {
      console.log('MainCloudBackup: Using cached session for getBackups:', cachedSessionData.userEmail);
      
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_BACKUPS_COLLECTION_ID,
        [
          Query.equal('userId', cachedSessionData.userId),
          Query.orderDesc('uploadDate'),
          Query.limit(50)
        ]
      );

      return { success: true, backups: response.documents };
    }
    
    // Fallback to standard auth verification with reduced retries
    let user = null;
    let retryCount = 0;
    const maxRetries = 2; // Reduced since we should have cached session
    
    while (!user && retryCount < maxRetries) {
      try {
        user = await account.get();
        if (user && user.$id) {
          console.log('MainCloudBackup: User authenticated for getBackups:', user.email);
          break;
        }
      } catch (error) {
        retryCount++;
        console.log(`MainCloudBackup: getBackups auth attempt ${retryCount}/${maxRetries}`, error.message);
        
        if (retryCount < maxRetries) {
          const waitTime = 1000 * retryCount;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (!user || !user.$id) {
      throw new Error('User not authenticated - please sign in to use cloud backup features');
    }

    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_BACKUPS_COLLECTION_ID,
      [
        Query.equal('userId', user.$id),
        Query.orderDesc('uploadDate'),
        Query.limit(50)
      ]
    );

    return { success: true, backups: response.documents };
  } catch (error) {
    console.error('MainCloudBackup: Error getting backups:', error);
    return { success: false, error: error.message };
  }
}

async function getStorageUsage() {
  try {
    const { account } = await initializeServices();
    
    // If we have cached session data, use it directly
    if (cachedSessionData) {
      console.log('MainCloudBackup: Using cached session for getStorageUsage:', cachedSessionData.userEmail);
      
      const backupsResult = await getBackups();
      if (!backupsResult.success) {
        return { success: false, error: backupsResult.error };
      }

      const totalSize = backupsResult.backups.reduce((sum, backup) => sum + (backup.fileSize || 0), 0);
      const count = backupsResult.backups.length;

      return {
        success: true,
        totalSize,
        count,
        formattedSize: formatFileSize(totalSize)
      };
    }
    
    // Fallback to standard auth verification with reduced retries
    let user = null;
    let retryCount = 0;
    const maxRetries = 2; // Reduced since we should have cached session
    
    while (!user && retryCount < maxRetries) {
      try {
        user = await account.get();
        if (user && user.$id) {
          console.log('MainCloudBackup: User authenticated for getStorageUsage:', user.email);
          break;
        }
      } catch (error) {
        retryCount++;
        console.log(`MainCloudBackup: getStorageUsage auth attempt ${retryCount}/${maxRetries}`, error.message);
        
        if (retryCount < maxRetries) {
          const waitTime = 1000 * retryCount;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (!user || !user.$id) {
      throw new Error('User not authenticated - please sign in to use cloud backup features');
    }

    const backupsResult = await getBackups();
    if (!backupsResult.success) {
      return { success: false, error: backupsResult.error };
    }

    const totalSize = backupsResult.backups.reduce((sum, backup) => sum + (backup.fileSize || 0), 0);
    const count = backupsResult.backups.length;

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
    const { databases, storage, account } = await initializeServices();
    const user = await account.get();
    
    if (!user || !user.$id) {
      throw new Error('User not authenticated');
    }

    // Get backup record
    const backup = await databases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_BACKUPS_COLLECTION_ID,
      backupId
    );

    // Verify ownership
    if (backup.userId !== user.$id) {
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
      
      // Write file
      fs.writeFileSync(downloadPath, Buffer.from(fileBuffer));
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
