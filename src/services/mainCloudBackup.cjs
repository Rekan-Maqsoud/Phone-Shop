// Node.js (main process) Appwrite cloud backup for Electron
const { Client, Account, Storage, ID } = require('appwrite');
const fs = require('fs');

// These should be securely loaded from environment or settings
const APPWRITE_ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID;
const APPWRITE_BACKUP_BUCKET_ID = process.env.VITE_APPWRITE_BACKUP_BUCKET_ID;

// Credentials (should be securely stored, for demo only)
const APPWRITE_EMAIL = process.env.APPWRITE_EMAIL;
const APPWRITE_PASSWORD = process.env.APPWRITE_PASSWORD;

function getAppwriteClient() {
  const client = new Client();
  client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
  return client;
}

async function loginAppwrite(client) {
  const account = new Account(client);
  await account.createEmailPasswordSession(APPWRITE_EMAIL, APPWRITE_PASSWORD);
  return account;
}

async function uploadBackupToCloud(localBackupPath) {
  const client = getAppwriteClient();
  await loginAppwrite(client);
  const storage = new Storage(client);
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
  const autoBackupName = `auto-backup-${timestamp}.sqlite`;
  const fileBuffer = fs.readFileSync(localBackupPath);
  const result = await storage.createFile(
    APPWRITE_BACKUP_BUCKET_ID,
    ID.unique(),
    fileBuffer,
    autoBackupName
  );
  return result;
}

module.exports = { uploadBackupToCloud };
