import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';

class CloudAuthService {
  constructor() {
    this.client = new Client();
    this.account = null;
    this.databases = null;
    this.storage = null;
    this.user = null;
    
    // Initialize Appwrite client with environment variables
    this.client
      .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);
    
    this.account = new Account(this.client);
    this.databases = new Databases(this.client);
    this.storage = new Storage(this.client);
    
    // Configuration from environment variables
    this.DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    this.BACKUPS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_BACKUPS_COLLECTION_ID;
    this.BACKUP_BUCKET_ID = import.meta.env.VITE_APPWRITE_BACKUP_BUCKET_ID;
  }

  // Authentication methods
  async createAccount(email, password, name) {
    if (!email || !password || !name) return;
    try {
      const response = await this.account.create(ID.unique(), email, password, name);
      await this.login(email, password);
      return { success: true, user: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async login(email, password) {
    if (!email || !password) return;
    try {
      const session = await this.account.createEmailPasswordSession(email, password);
      this.user = await this.account.get();
      return { success: true, user: this.user, session };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async logout() {
    if (!this.user) return;
    try {
      await this.account.deleteSession('current');
      this.user = null;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getCurrentUser() {
    try {
      if (!this.user) {
        this.user = await this.account.get();
      }
      return { success: true, user: this.user };
    } catch (error) {
      // Silently ignore 401 errors (user not logged in)
      if (error?.response?.status === 401 || error?.code === 401 || error?.message?.includes('Unauthorized')) {
        return { success: false, error: 'Not logged in' };
      }
      return { success: false, error: error.message };
    }
  }

  async resetPassword(email) {
    if (!this.user) return;
    try {
      await this.account.createRecovery(
        email,
        'http://localhost:5173/reset-password' // You can customize this URL
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updatePassword(password, oldPassword) {
    if (!this.user) return;
    try {
      await this.account.updatePassword(password, oldPassword);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Backup methods
  async uploadBackup(backupFile, backupName, description = '') {
    try {
      if (!this.user) {
        throw new Error('User not authenticated');
      }

      // Upload file to storage
      const fileUpload = await this.storage.createFile(
        this.BACKUP_BUCKET_ID,
        ID.unique(),
        backupFile
      );

      // Get next version and ensure it's a string and not too long
      let version = await this.getNextBackupVersion();
      version = String(version).slice(0, 255); // Appwrite string limit

      // Create backup record in database
      const backupRecord = await this.databases.createDocument(
        this.DATABASE_ID,
        this.BACKUPS_COLLECTION_ID,
        ID.unique(),
        {
          userId: this.user.$id,
          fileName: backupName,
          description: description,
          fileId: fileUpload.$id,
          fileSize: fileUpload.sizeOriginal,
          uploadDate: new Date().toISOString(),
          version // always a string, max 255 chars
        }
      );

      return { 
        success: true, 
        backup: backupRecord,
        fileId: fileUpload.$id 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getBackups() {
    try {
      if (!this.user) {
        throw new Error('User not authenticated');
      }

      const response = await this.databases.listDocuments(
        this.DATABASE_ID,
        this.BACKUPS_COLLECTION_ID,
        [
          Query.equal('userId', this.user.$id),
          Query.orderDesc('uploadDate'),
          Query.limit(50)
        ]
      );

      return { success: true, backups: response.documents };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async downloadBackup(backupId) {
    try {
      if (!this.user) {
        throw new Error('User not authenticated');
      }

      // Get backup record
      const backup = await this.databases.getDocument(
        this.DATABASE_ID,
        this.BACKUPS_COLLECTION_ID,
        backupId
      );

      // Verify ownership
      if (backup.userId !== this.user.$id) {
        throw new Error('Access denied');
      }

      // Get download URL
      const downloadUrl = this.storage.getFileDownload(
        this.BACKUP_BUCKET_ID,
        backup.fileId
      );

      return { 
        success: true, 
        downloadUrl,
        backup 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteBackup(backupId) {
    try {
      if (!this.user) {
        throw new Error('User not authenticated');
      }

      // Get backup record
      const backup = await this.databases.getDocument(
        this.DATABASE_ID,
        this.BACKUPS_COLLECTION_ID,
        backupId
      );

      // Verify ownership
      if (backup.userId !== this.user.$id) {
        throw new Error('Access denied');
      }

      // Delete file from storage
      await this.storage.deleteFile(this.BACKUP_BUCKET_ID, backup.fileId);

      // Delete backup record
      await this.databases.deleteDocument(
        this.DATABASE_ID,
        this.BACKUPS_COLLECTION_ID,
        backupId
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getNextBackupVersion() {
    try {
      if (!this.user) return 1;

      const response = await this.databases.listDocuments(
        this.DATABASE_ID,
        this.BACKUPS_COLLECTION_ID,
        [
          Query.equal('userId', this.user.$id),
          Query.orderDesc('version'),
          Query.limit(1)
        ]
      );

      return response.documents.length > 0 ? response.documents[0].version + 1 : 1;
    } catch (error) {
      return 1;
    }
  }

  // Auto backup management
  async getAutoBackupSettings() {
    try {
      if (!this.user) {
        throw new Error('User not authenticated');
      }

      // You can store user preferences in a separate collection
      // For now, we'll use localStorage as fallback
      return {
        enabled: localStorage.getItem('autoCloudBackup') === 'true',
        frequency: localStorage.getItem('autoCloudBackupFrequency') || 'daily'
      };
    } catch (error) {
      return { enabled: false, frequency: 'daily' };
    }
  }

  async updateAutoBackupSettings(enabled, frequency = 'daily') {
    try {
      localStorage.setItem('autoCloudBackup', enabled.toString());
      localStorage.setItem('autoCloudBackupFrequency', frequency);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Utility methods
  isAuthenticated() {
    return this.user !== null;
  }

  getUserInfo() {
    return this.user;
  }

  async getStorageUsage() {
    try {
      if (!this.user) {
        throw new Error('User not authenticated');
      }

      const backups = await this.getBackups();
      if (!backups.success) return { success: false, error: backups.error };

      const totalSize = backups.backups.reduce((sum, backup) => sum + (backup.fileSize || 0), 0);
      const count = backups.backups.length;

      return {
        success: true,
        totalSize,
        count,
        formattedSize: this.formatFileSize(totalSize)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Create singleton instance
const cloudAuthService = new CloudAuthService();
export default cloudAuthService;