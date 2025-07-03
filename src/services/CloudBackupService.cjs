// Simple cloud backup service for Electron
const { Client, Account, Storage, ID, Databases, Query } = require('appwrite');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Add File polyfill for Node.js environment
if (typeof global.File === 'undefined') {
  global.File = class File {
    constructor(bits, name, options = {}) {
      this.name = name;
      this.type = options.type || 'application/octet-stream';
      this.size = 0;
      this.bits = bits;
      
      // Calculate size
      if (Array.isArray(bits)) {
        this.size = bits.reduce((total, bit) => {
          if (bit instanceof Buffer) return total + bit.length;
          if (typeof bit === 'string') return total + Buffer.byteLength(bit);
          if (bit instanceof ArrayBuffer) return total + bit.byteLength;
          return total;
        }, 0);
      }
      
      // Convert to buffer for easy access
      this.buffer = Buffer.concat(bits.map(bit => {
        if (bit instanceof Buffer) return bit;
        if (typeof bit === 'string') return Buffer.from(bit);
        if (bit instanceof ArrayBuffer) return Buffer.from(bit);
        return Buffer.from([]);
      }));
    }
    
    stream() {
      const { Readable } = require('stream');
      return Readable.from(this.buffer);
    }
    
    arrayBuffer() {
      return Promise.resolve(this.buffer.buffer.slice(this.buffer.byteOffset, this.buffer.byteOffset + this.buffer.byteLength));
    }
  };
}

class CloudBackupService {
  constructor() {
    this.client = new Client();
    this.account = null;
    this.storage = null;
    this.databases = null;
    this.isAuthenticated = false;
    this.currentUser = null;
    this.autoBackupEnabled = true;
    
    // Initialize Appwrite client
    this.client
      .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
      .setProject(process.env.VITE_APPWRITE_PROJECT_ID || '685ddcd00006c06a72f0');
    
    this.account = new Account(this.client);
    this.storage = new Storage(this.client);
    this.databases = new Databases(this.client);
    
    // Configuration
    this.DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || '685ddd3d003b13f80483';
    this.BACKUPS_COLLECTION_ID = process.env.VITE_APPWRITE_BACKUPS_COLLECTION_ID || '685ddd94003cac4491a5';
    this.BACKUP_BUCKET_ID = process.env.VITE_APPWRITE_BACKUP_BUCKET_ID || '685ddea60039b672ee60';
    
    console.log('[CloudBackupService] Initialized with config:', {
      endpoint: this.client.config.endpoint,
      project: this.client.config.project,
      database: this.DATABASE_ID,
      collection: this.BACKUPS_COLLECTION_ID,
      bucket: this.BACKUP_BUCKET_ID
    });
  }

  // Set user session for authentication
  async setSession(sessionData) {
    try {
      if (sessionData.jwt) {
        this.client.setJWT(sessionData.jwt);
        this.isAuthenticated = true;
        this.currentUser = sessionData;
        console.log('[CloudBackupService] Session set successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[CloudBackupService] Failed to set session:', error);
      return false;
    }
  }

  // Clear session
  async clearSession() {
    try {
      this.client.setJWT('');
      this.isAuthenticated = false;
      this.currentUser = null;
      console.log('[CloudBackupService] Session cleared');
    } catch (error) {
      console.error('[CloudBackupService] Failed to clear session:', error);
    }
  }

  // Enable/disable auto backup
  setAutoBackup(enabled) {
    this.autoBackupEnabled = enabled;
    console.log('[CloudBackupService] Auto backup', enabled ? 'enabled' : 'disabled');
  }

  // Create backup and upload to cloud
  async createBackup(dbPath, description = '') {
    if (!this.isAuthenticated) {
      console.log('[CloudBackupService] Not authenticated, skipping backup');
      return { success: false, message: 'Not authenticated' };
    }

    try {
      console.log('[CloudBackupService] Creating backup from:', dbPath);
      
      if (!fs.existsSync(dbPath)) {
        throw new Error('Database file not found');
      }

      // Read database file
      const dbBuffer = fs.readFileSync(dbPath);
      const fileName = `phone-shop-backup-${Date.now()}.sqlite`;
      
      // Check if backup already exists and delete it
      try {
        const existingBackups = await this.databases.listDocuments(
          this.DATABASE_ID,
          this.BACKUPS_COLLECTION_ID,
          [
            Query.equal('userId', this.currentUser.userId),
            Query.equal('fileName', fileName)
          ]
        );
        
        for (const backup of existingBackups.documents) {
          await this.storage.deleteFile(this.BACKUP_BUCKET_ID, backup.fileId);
          await this.databases.deleteDocument(this.DATABASE_ID, this.BACKUPS_COLLECTION_ID, backup.$id);
        }
      } catch (error) {
        console.log('[CloudBackupService] No existing backup to delete or error:', error.message);
      }

      // Upload file to storage
      // Create file upload for AppWrite - use direct buffer approach
      const fileId = ID.unique();
      console.log('[CloudBackupService] Uploading file with ID:', fileId);
        try {
        // Try to upload directly with buffer first using our File polyfill
        let file;
        try {
          // For newer versions of AppWrite, try direct buffer upload
          const fileObj = new File([dbBuffer], fileName, { type: 'application/vnd.sqlite3' });
          console.log('[CloudBackupService] Created File object with size:', fileObj.size);
          
          file = await this.storage.createFile(
            this.BACKUP_BUCKET_ID,
            fileId,
            fileObj,
            []
          );
          console.log('[CloudBackupService] Direct upload successful:', file.$id);
        } catch (directUploadError) {
          console.log('[CloudBackupService] Direct upload failed, trying with temporary file...');
          console.log('[CloudBackupService] Direct upload error:', directUploadError.message);
          
          // Fallback to temporary file approach
          const tempDir = path.join(os.tmpdir(), 'mobile-roma-backups');
          
          // Ensure temp directory exists
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          const tempPath = path.join(tempDir, `temp-backup-${fileId}.sqlite`);
          console.log('[CloudBackupService] Creating temporary file at:', tempPath);
          
          // Write buffer to temporary file
          fs.writeFileSync(tempPath, dbBuffer);
          
          // Verify file was created and has correct content
          if (!fs.existsSync(tempPath)) {
            throw new Error('Failed to create temporary backup file');
          }
          
          const tempStats = fs.statSync(tempPath);
          console.log('[CloudBackupService] Temporary file created, size:', tempStats.size);
          
          // Verify the temp file is a valid SQLite file
          const tempBuffer = Buffer.alloc(16);
          const tempFd = fs.openSync(tempPath, 'r');
          fs.readSync(tempFd, tempBuffer, 0, 16, 0);
          fs.closeSync(tempFd);
          
          const tempHeader = tempBuffer.toString('utf8', 0, 15);
          console.log('[CloudBackupService] Temp file header:', JSON.stringify(tempHeader));
          
          if (!tempHeader.startsWith('SQLite format 3')) {
            throw new Error('Source database file is not valid SQLite');
          }

          try {
            // Create readable stream for upload
            const fileStream = fs.createReadStream(tempPath);
            
            file = await this.storage.createFile(
              this.BACKUP_BUCKET_ID,
              fileId,
              fileStream,
              []
            );
            
            console.log('[CloudBackupService] File uploaded successfully via stream:', file.$id);
          } finally {
            // Clean up temporary file
            if (fs.existsSync(tempPath)) {
              fs.unlinkSync(tempPath);
            }
          }
        }
        
        console.log('[CloudBackupService] File uploaded successfully:', file.$id);
        
        // Create backup record
        const backupRecord = await this.databases.createDocument(
          this.DATABASE_ID,
          this.BACKUPS_COLLECTION_ID,
          ID.unique(),
          {
            userId: this.currentUser.userId,
            fileName: fileName,
            fileId: file.$id,
            description: description || `Backup created at ${new Date().toISOString()}`,
            fileSize: dbBuffer.length,
            uploadDate: new Date().toISOString(),
            version: '1.0'
          }
        );

        console.log('[CloudBackupService] Backup created successfully:', backupRecord.$id);
        return { 
          success: true, 
          message: 'Backup created successfully',
          backupId: backupRecord.$id,
          fileName: fileName
        };
      } catch (uploadError) {
        console.error('[CloudBackupService] Upload error:', uploadError);
        throw uploadError;
      }
    } catch (error) {
      console.error('[CloudBackupService] Backup creation failed:', error);
      return { 
        success: false, 
        message: error.message || 'Backup creation failed'
      };
    }
  }

  // Download backup from cloud
  async downloadBackup(backupId, downloadPath) {
    if (!this.isAuthenticated) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      // Get backup record
      const backupRecord = await this.databases.getDocument(
        this.DATABASE_ID,
        this.BACKUPS_COLLECTION_ID,
        backupId
      );

      if (backupRecord.userId !== this.currentUser.userId) {
        throw new Error('Unauthorized access to backup');
      }

      // Download file - use getFileView approach directly since getFileDownload seems to have issues
      console.log('[CloudBackupService] Starting download for file ID:', backupRecord.fileId);
      
      let bufferData;
      
      try {
        console.log('[CloudBackupService] Using getFileView + fetch approach');
        const fileUrl = await this.storage.getFileView(
          this.BACKUP_BUCKET_ID,
          backupRecord.fileId
        );
        
        console.log('[CloudBackupService] Got file URL:', fileUrl);
        
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        bufferData = Buffer.from(arrayBuffer);
        console.log('[CloudBackupService] Download successful, size:', bufferData.length);
      } catch (viewError) {
        console.error('[CloudBackupService] getFileView approach failed:', viewError);
        
        // Fallback to getFileDownload approach
        try {
          console.log('[CloudBackupService] Trying getFileDownload as fallback');
          const fileData = await this.storage.getFileDownload(
            this.BACKUP_BUCKET_ID,
            backupRecord.fileId
          );

          console.log('[CloudBackupService] Downloaded file data type:', typeof fileData);
          console.log('[CloudBackupService] Downloaded file data constructor:', fileData.constructor.name);
          console.log('[CloudBackupService] Downloaded file data length/byteLength:', fileData.length || fileData.byteLength || 'unknown');

          // Handle different response types from AppWrite
          if (fileData && typeof fileData.arrayBuffer === 'function') {
            console.log('[CloudBackupService] Converting Response to ArrayBuffer');
            const arrayBuffer = await fileData.arrayBuffer();
            bufferData = Buffer.from(arrayBuffer);
          } else if (fileData instanceof Uint8Array) {
            console.log('[CloudBackupService] Converting Uint8Array to Buffer');
            bufferData = Buffer.from(fileData);
          } else if (fileData instanceof ArrayBuffer) {
            console.log('[CloudBackupService] Converting ArrayBuffer to Buffer');
            bufferData = Buffer.from(fileData);
          } else if (Buffer.isBuffer(fileData)) {
            console.log('[CloudBackupService] File data is already a Buffer');
            bufferData = fileData;
          } else if (typeof fileData === 'string') {
            console.log('[CloudBackupService] Got string data, length:', fileData.length);
            console.log('[CloudBackupService] String preview:', fileData.substring(0, 100));
            console.log('[CloudBackupService] Checking if it\'s a URL...');
            
            // Check if it's a URL (AppWrite sometimes returns URLs)
            if (fileData.startsWith('http://') || fileData.startsWith('https://')) {
              console.log('[CloudBackupService] String is a URL, fetching content...');
              const response = await fetch(fileData);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const arrayBuffer = await response.arrayBuffer();
              bufferData = Buffer.from(arrayBuffer);
            } else {
              console.log('[CloudBackupService] String is not a URL, trying base64 decode...');
              try {
                bufferData = Buffer.from(fileData, 'base64');
              } catch (base64Error) {
                console.error('[CloudBackupService] Base64 decode failed:', base64Error);
                throw new Error('Invalid string data format - not URL or base64');
              }
            }
          } else {
            // Last resort: try to convert to buffer
            try {
              console.log('[CloudBackupService] Attempting generic Buffer conversion');
              bufferData = Buffer.from(fileData);
            } catch (conversionError) {
              console.error('[CloudBackupService] Failed to convert file data to buffer:', conversionError);
              console.error('[CloudBackupService] File data type was:', typeof fileData);
              console.error('[CloudBackupService] File data constructor:', fileData?.constructor?.name);
              throw new Error('Failed to convert downloaded data to buffer');
            }
          }
        } catch (downloadError) {
          console.error('[CloudBackupService] Both download approaches failed');
          throw new Error(`Failed to download backup file: ${downloadError.message}`);
        }
      }

      // Verify the downloaded data is a valid SQLite file
      if (bufferData.length < 16) {
        throw new Error('Downloaded file is too small to be a SQLite database');
      }

      const header = bufferData.toString('utf8', 0, 15);
      console.log('[CloudBackupService] File header:', JSON.stringify(header));
      console.log('[CloudBackupService] First 32 bytes as hex:', bufferData.subarray(0, Math.min(32, bufferData.length)).toString('hex'));
      
      if (!header.startsWith('SQLite format 3')) {
        // Try different encodings
        const headerLatin1 = bufferData.toString('latin1', 0, 15);
        const headerBinary = bufferData.toString('binary', 0, 15);
        
        console.log('[CloudBackupService] Header (latin1):', JSON.stringify(headerLatin1));
        console.log('[CloudBackupService] Header (binary):', JSON.stringify(headerBinary));
        
        if (!headerLatin1.startsWith('SQLite format 3') && !headerBinary.startsWith('SQLite format 3')) {
          console.error('[CloudBackupService] Downloaded file is not a valid SQLite database. Header:', header);
          console.error('[CloudBackupService] First 64 bytes as hex:', bufferData.subarray(0, Math.min(64, bufferData.length)).toString('hex'));
          throw new Error('Downloaded file is not a valid SQLite database. This might be a corruption during download.');
        }
      }

      // Save to specified path
      fs.writeFileSync(downloadPath, bufferData);
      
      // Verify the saved file
      const savedFileStats = fs.statSync(downloadPath);
      console.log('[CloudBackupService] Saved file size:', savedFileStats.size);
      
      // Double-check the saved file
      const savedBuffer = Buffer.alloc(16);
      const savedFd = fs.openSync(downloadPath, 'r');
      fs.readSync(savedFd, savedBuffer, 0, 16, 0);
      fs.closeSync(savedFd);
      
      const savedHeader = savedBuffer.toString('utf8', 0, 15);
      console.log('[CloudBackupService] Saved file header:', JSON.stringify(savedHeader));
      
      if (!savedHeader.startsWith('SQLite format 3')) {
        throw new Error('File corruption detected after saving to disk');
      }

      console.log('[CloudBackupService] Backup downloaded and verified successfully:', downloadPath);
      return { 
        success: true, 
        message: 'Backup downloaded successfully',
        filePath: downloadPath
      };
    } catch (error) {
      console.error('[CloudBackupService] Backup download failed:', error);
      return { 
        success: false, 
        message: error.message || 'Download failed'
      };
    }
  }

  // List all backups for current user
  async listBackups() {
    if (!this.isAuthenticated) {
      return { success: false, message: 'Not authenticated', backups: [] };
    }

    try {
      const response = await this.databases.listDocuments(
        this.DATABASE_ID,
        this.BACKUPS_COLLECTION_ID,
        [
          Query.equal('userId', this.currentUser.userId),
          Query.orderDesc('uploadDate')
        ]
      );

      return { 
        success: true, 
        backups: response.documents 
      };
    } catch (error) {
      console.error('[CloudBackupService] Failed to list backups:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to list backups',
        backups: []
      };
    }
  }

  // Delete backup
  async deleteBackup(backupId) {
    if (!this.isAuthenticated) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      // Get backup record
      const backupRecord = await this.databases.getDocument(
        this.DATABASE_ID,
        this.BACKUPS_COLLECTION_ID,
        backupId
      );

      if (backupRecord.userId !== this.currentUser.userId) {
        throw new Error('Unauthorized access to backup');
      }

      // Delete file from storage
      await this.storage.deleteFile(this.BACKUP_BUCKET_ID, backupRecord.fileId);

      // Delete backup record
      await this.databases.deleteDocument(
        this.DATABASE_ID,
        this.BACKUPS_COLLECTION_ID,
        backupId
      );

      console.log('[CloudBackupService] Backup deleted successfully:', backupId);
      return { 
        success: true, 
        message: 'Backup deleted successfully'
      };
    } catch (error) {
      console.error('[CloudBackupService] Backup deletion failed:', error);
      return { 
        success: false, 
        message: error.message || 'Deletion failed'
      };
    }
  }

  // Auto backup trigger (called after data changes)
  async autoBackup(dbPath) {
    if (!this.autoBackupEnabled) {
      console.log('[CloudBackupService] Auto backup disabled');
      return { success: false, message: 'Auto backup disabled' };
    }
    
    if (!this.isAuthenticated) {
      console.log('[CloudBackupService] Not authenticated, skipping auto backup');
      return { success: false, message: 'Not authenticated' };
    }

    try {
      console.log('[CloudBackupService] Starting auto backup for:', dbPath);
      
      // First, delete any existing auto backups
      await this.deleteOldAutoBackups();
      
      // Create the new auto backup
      const description = `Auto backup - ${new Date().toISOString()}`;
      return await this.createBackup(dbPath, description);
    } catch (error) {
      console.error('[CloudBackupService] Auto backup failed:', error);
      return { success: false, message: error.message };
    }
  }

  // Delete old auto backups (keep only the latest one)
  async deleteOldAutoBackups() {
    if (!this.isAuthenticated) {
      console.log('[CloudBackupService] Not authenticated, skipping auto backup cleanup');
      return;
    }

    try {
      console.log('[CloudBackupService] Cleaning up old auto backups');
      
      // Get all auto backups for this user
      const autoBackups = await this.databases.listDocuments(
        this.DATABASE_ID,
        this.BACKUPS_COLLECTION_ID,
        [
          Query.equal('userId', this.currentUser.userId),
          Query.startsWith('description', 'Auto backup'),
          Query.orderDesc('uploadDate')
        ]
      );

      console.log('[CloudBackupService] Found', autoBackups.documents.length, 'auto backups');

      // Delete all auto backups (we'll create a new one after this)
      for (const backup of autoBackups.documents) {
        try {
          console.log('[CloudBackupService] Deleting old auto backup:', backup.fileName);
          
          // Delete file from storage
          await this.storage.deleteFile(this.BACKUP_BUCKET_ID, backup.fileId);
          
          // Delete backup record
          await this.databases.deleteDocument(
            this.DATABASE_ID,
            this.BACKUPS_COLLECTION_ID,
            backup.$id
          );
          
          console.log('[CloudBackupService] Deleted old auto backup:', backup.fileName);
        } catch (deleteError) {
          console.error('[CloudBackupService] Failed to delete old auto backup:', backup.fileName, deleteError);
          // Continue with other backups even if one fails
        }
      }
      
      console.log('[CloudBackupService] Auto backup cleanup completed');
    } catch (error) {
      console.error('[CloudBackupService] Auto backup cleanup failed:', error);
      // Don't fail the entire auto backup process if cleanup fails
    }
  }

  // Trigger auto backup - wrapper method for main process calls
  async triggerAutoBackup() {
    // This method is called from main process, it needs the DB path
    // We'll need to get the DB path from the main process
    return { success: false, message: 'Method should be called with DB path' };
  }
}

module.exports = CloudBackupService;
