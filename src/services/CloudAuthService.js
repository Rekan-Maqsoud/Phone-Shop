import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';

let globalInstance = null;

class CloudAuthService {
  constructor() {
    this._isAuthenticated = false;
    this._listeners = [];
    this.client = new Client();
    this.account = null;
    this.databases = null;
    this.storage = null;
    this.user = null;
    this._authCheckInterval = null;
    this._networkTimeout = 10000; // 10 second timeout for requests
    this._sessionShared = false; // Track if session has been shared with main process
    this._universalAuthState = false; // Single source of truth for authentication
    
    // Debug environment variables
    console.log('CloudAuthService: Environment variables:', {
      endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT,
      projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID,
      databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
      collectionsId: import.meta.env.VITE_APPWRITE_BACKUPS_COLLECTION_ID,
      bucketId: import.meta.env.VITE_APPWRITE_BACKUP_BUCKET_ID,
      mode: import.meta.env.MODE,
      prod: import.meta.env.PROD
    });
    
    // Initialize Appwrite client with environment variables
    this.client
      .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
      .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '685ddcd00006c06a72f0');
    
    this.account = new Account(this.client);
    this.databases = new Databases(this.client);
    this.storage = new Storage(this.client);
    
    // Configuration from environment variables with fallbacks for production
    this.DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '685ddd3d003b13f80483';
    this.BACKUPS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_BACKUPS_COLLECTION_ID || '685ddd94003cac4491a5';
    this.BACKUP_BUCKET_ID = import.meta.env.VITE_APPWRITE_BACKUP_BUCKET_ID || '685ddea60039b672ee60';
    
    // Validate configuration
    const configValidation = this.validateConfiguration();
    if (!configValidation.isValid) {
      console.warn('CloudAuthService: Configuration validation failed:', configValidation.message);
      console.warn('CloudAuthService: Using fallback configuration values for production.');
      // Use fallback values for production
      this._offlineMode = false;
    } else {
      console.log('CloudAuthService: Configuration validated successfully');
      this._offlineMode = false;
    }
    
    // Only start periodic auth check if not in offline mode
    if (!this._offlineMode) {
      this._initializeAuthState();
    }
  }

  // Initialize authentication state once
  async _initializeAuthState() {
    try {
      console.log('CloudAuthService: Initializing authentication state...');
      this.user = await this.account.get();
      
      if (this.user && this.user.$id) {
        this._universalAuthState = true;
        this.setAuthenticated(true);
        console.log('CloudAuthService: User already authenticated:', this.user.email);
        
        // Share session with main process if not already shared
        await this._shareSessionWithMainProcess();
      } else {
        this._universalAuthState = false;
        this.setAuthenticated(false);
        console.log('CloudAuthService: No existing session found');
      }
    } catch (error) {
      console.log('CloudAuthService: No existing session or invalid session');
      this._universalAuthState = false;
      this.setAuthenticated(false);
      this.user = null;
    }
  }

  // Share session with main process (only called once)
  async _shareSessionWithMainProcess() {
    if (this._sessionShared || !this.user || !window.api?.setCloudSession) {
      return;
    }

    try {
      const session = await this.account.getSession('current');
      
      // Try to get JWT token for better session sharing
      let jwtToken = null;
      try {
        const jwtResponse = await this.account.createJWT();
        jwtToken = jwtResponse.jwt;
      } catch (jwtError) {
        console.warn('CloudAuthService: Failed to create JWT token:', jwtError.message);
      }
      
      await window.api.setCloudSession({
        sessionId: session.$id,
        userId: this.user.$id,
        userEmail: this.user.email,
        sessionSecret: session.secret || session.sessionId,
        jwt: jwtToken
      });
      
      this._sessionShared = true;
      console.log('CloudAuthService: Session shared with main process');
    } catch (sessionError) {
      console.warn('CloudAuthService: Failed to share session with main process:', sessionError);
    }
  }

  // Configuration validation
  validateConfiguration() {
    const missingVars = [];
    
    const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
    const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '685ddcd00006c06a72f0';
    const databaseId = this.DATABASE_ID;
    const backupsCollectionId = this.BACKUPS_COLLECTION_ID;
    const backupBucketId = this.BACKUP_BUCKET_ID;
    
    if (!endpoint) missingVars.push('VITE_APPWRITE_ENDPOINT');
    if (!projectId) missingVars.push('VITE_APPWRITE_PROJECT_ID');
    if (!databaseId) missingVars.push('VITE_APPWRITE_DATABASE_ID');
    if (!backupsCollectionId) missingVars.push('VITE_APPWRITE_BACKUPS_COLLECTION_ID');
    if (!backupBucketId) missingVars.push('VITE_APPWRITE_BACKUP_BUCKET_ID');
    
    return {
      isValid: missingVars.length === 0,
      missingVars,
      message: missingVars.length > 0 
        ? `Missing environment variables: ${missingVars.join(', ')}` 
        : 'Configuration is valid'
    };
  }

  // Get universal authentication state (no network calls)
  isAuthenticated() {
    return this._universalAuthState && this.user !== null;
  }

  // Get current user (uses cached state, no network calls)
  getUser() {
    return this.user;
  }

  // Authentication methods
  async createAccount(email, password, name) {
    // Validate required parameters
    if (!email || !password || !name) {
      return { 
        success: false, 
        error: 'Email, password, and name are required' 
      };
    }
    
    try {
      const response = await this.account.create(ID.unique(), email, password, name);
      await this.login(email, password);
      return { success: true, user: response };
    } catch (error) {
      let errorMessage = error.message;
      
      // Provide user-friendly error messages
      if (error.message.includes('email already exists') || error.message.includes('user_already_exists')) {
        errorMessage = 'An account with this email already exists';
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address';
      } else if (error.message.includes('Password must be')) {
        errorMessage = 'Password must be at least 8 characters long';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  async login(email, password) {
    if (!email || !password) return { success: false, error: 'Email and password are required' };
    
    try {
      // Create timeout promise for login operations
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout - please check your internet connection')), this._networkTimeout)
      );
      
      // First, try to logout any existing session
      try {
        await Promise.race([
          this.account.deleteSession('current'),
          timeoutPromise
        ]);
      } catch (e) {
        // Ignore error if no session exists or timeout on logout
      }
      
      // Create new session with timeout
      const session = await Promise.race([
        this.account.createEmailPasswordSession(email, password),
        timeoutPromise
      ]);
      
      // Get user info with timeout
      this.user = await Promise.race([
        this.account.get(),
        timeoutPromise
      ]);
      
      // Verify we have valid user data
      if (!this.user || !this.user.$id) {
        throw new Error('Failed to retrieve user information');
      }
      
      this._universalAuthState = true;
      this.setAuthenticated(true);
      
      // Share session with main process for cloud backup operations (only once)
      await this._shareSessionWithMainProcess();
      
      return { success: true, user: this.user, session };
    } catch (error) {
      this.user = null;
      this._universalAuthState = false;
      this.setAuthenticated(false);
      
      // Handle timeout specifically
      if (error.message === 'Login timeout - please check your internet connection') {
        return { success: false, error: error.message };
      }
      
      // Provide user-friendly error messages
      let errorMessage = error.message;
      if (error?.message?.includes('Invalid credentials')) {
        errorMessage = 'Invalid email or password';
      } else if (error?.message?.includes('User not found')) {
        errorMessage = 'Account not found';
      } else if (error?.message?.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please try again later';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  async logout() {
    if (!this.user) return;
    try {
      await this.account.deleteSession('current');
      this.user = null;
      this._universalAuthState = false;
      this._sessionShared = false;
      this.setAuthenticated(false);
      
      // Clear session from main process
      if (window.api?.clearCloudSession) {
        try {
          await window.api.clearCloudSession();
          console.log('CloudAuthService: Session cleared from main process');
        } catch (sessionError) {
          console.warn('CloudAuthService: Failed to clear session from main process:', sessionError);
        }
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getCurrentUser() {
    // Return cached user state without making network calls
    if (this._universalAuthState && this.user && this.user.$id) {
      return { success: true, user: this.user };
    } else {
      return { success: false, error: 'Not logged in' };
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
  async uploadBackup(backupFile, backupName = 'backup.sqlite', description = '') {
    try {
      if (!this._universalAuthState || !this.user) {
        throw new Error('User not authenticated - please sign in to use cloud backup features');
      }

      // Validate environment variables
      if (!this.DATABASE_ID || !this.BACKUPS_COLLECTION_ID || !this.BACKUP_BUCKET_ID) {
        throw new Error('Appwrite configuration missing. Please check environment variables.');
      }

      // Sanitize backupName
      backupName = this._sanitizeFileName(backupName);

      // Ensure backupFile is a File with a valid name
      if (!(backupFile instanceof File)) {
        backupFile = new File([backupFile], backupName, {
          type: 'application/octet-stream'
        });
      } else if (!backupFile.name || backupFile.name !== backupName) {
        backupFile = new File([backupFile], backupName, {
          type: backupFile.type || 'application/octet-stream'
        });
      }

      console.log(`CloudAuthService: Starting backup upload - File: ${backupName}, Size: ${backupFile.size} bytes`);

      // For auto backups, ensure we only have one file and record
      if (backupName === 'auto-backup-latest.sqlite') {
        // Check for existing auto backup record
        response = await this.databases.listDocuments(
          this.DATABASE_ID,
          this.BACKUPS_COLLECTION_ID,
          [
            Query.equal('userId', this.user.$id),
            Query.equal('fileName', backupName),
            Query.limit(1)
          ]
        );
        
        existingBackup = response.documents.length > 0 ? response.documents[0] : null;
        
        if (existingBackup) {
          fileId = existingBackup.fileId;
          console.log('CloudAuthService: Found existing auto backup record:', existingBackup.$id);
          
          // Delete the old file first
          try {
            await this.storage.deleteFile(this.BACKUP_BUCKET_ID, fileId);
            console.log('CloudAuthService: Deleted old auto backup file:', fileId);
            // Wait for deletion to complete
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (deleteErr) {
            console.warn('CloudAuthService: Could not delete old auto backup file:', deleteErr.message);
          }
          
          // Use consistent file ID for auto backups
          fileId = `auto-backup-${this.user.$id}`;
        } else {
          // Use consistent file ID for new auto backup
          fileId = `auto-backup-${this.user.$id}`;
        }
      } else {
        // For manual backups, check for existing records
        response = await this.databases.listDocuments(
          this.DATABASE_ID,
          this.BACKUPS_COLLECTION_ID,
          [
            Query.equal('userId', this.user.$id),
            Query.equal('fileName', backupName),
            Query.orderDesc('uploadDate'),
            Query.limit(1)
          ]
        );
        
        existingBackup = response.documents.length > 0 ? response.documents[0] : null;
        if (existingBackup) {
          fileId = existingBackup.fileId;
          console.log('CloudAuthService: Found existing manual backup record:', existingBackup.$id);
        }
      }

      let fileUpload;
      let fileExists = false;
      if (fileId) {
        // Check if file exists in storage
        try {
          await this.storage.getFile(this.BACKUP_BUCKET_ID, fileId);
          fileExists = true;
          console.log('CloudAuthService: Existing file found in storage:', fileId);
        } catch (e) {
          fileExists = false;
          console.log('CloudAuthService: Existing file not found in storage, will create new');
        }
      }

      // Create new file (old file was already deleted above if it existed)
      try {
        const newFileId = fileId || ID.unique();
        console.log('CloudAuthService: Creating new backup file with ID:', newFileId);
        
        fileUpload = await this.storage.createFile(
          this.BACKUP_BUCKET_ID,
          newFileId,
          backupFile
        );
        fileId = fileUpload.$id;
        console.log('CloudAuthService: New file created successfully:', fileId);
      } catch (createErr) {
        // If file creation fails with ID conflict, try with unique ID
        if (createErr.message.includes('already exists') || createErr.message.includes('unique')) {
          console.warn('CloudAuthService: File ID conflict, trying with unique ID');
          const uniqueFileId = ID.unique();
          fileUpload = await this.storage.createFile(
            this.BACKUP_BUCKET_ID,
            uniqueFileId,
            backupFile
          );
          fileId = fileUpload.$id;
          console.log('CloudAuthService: File created with unique ID:', fileId);
        } else {
          throw createErr;
        }
      }

      // Update or create backup record
      if (existingBackup) {
        // Update existing record
        await this.databases.updateDocument(
          this.DATABASE_ID,
          this.BACKUPS_COLLECTION_ID,
          existingBackup.$id,
          { 
            fileId: fileId, 
            fileSize: fileUpload.sizeOriginal, 
            uploadDate: new Date().toISOString(),
            description: description || existingBackup.description
          }
        );
        console.log('CloudAuthService: Updated existing backup record');
      } else {
        // Create new backup record
        console.log('CloudAuthService: Creating new backup record...');
        await this.databases.createDocument(
          this.DATABASE_ID,
          this.BACKUPS_COLLECTION_ID,
          ID.unique(),
          {
            userId: this.user.$id,
            fileName: backupName,
            description: description,
            fileId: fileId,
            fileSize: fileUpload.sizeOriginal,
            uploadDate: new Date().toISOString(),
            version: '1'
          }
        );
        console.log('CloudAuthService: New backup record created');
      }

      // Return the latest backup record with verification
      try {
        const latestRecord = await this.databases.listDocuments(
          this.DATABASE_ID,
          this.BACKUPS_COLLECTION_ID,
          [
            Query.equal('userId', this.user.$id),
            Query.equal('fileName', backupName),
            Query.orderDesc('uploadDate'),
            Query.limit(1)
          ]
        );
        
        if (latestRecord.documents.length === 0) {
          throw new Error('Backup record not found after upload');
        }
        
        const backupRecord = latestRecord.documents[0];
        console.log('CloudAuthService: Backup upload completed successfully');

        return {
          success: true,
          backup: backupRecord,
          fileId: fileId
        };
      } catch (verificationError) {
        console.error('CloudAuthService: Backup verification failed:', verificationError);
        throw new Error(`Verification error: ${verificationError.message}`);
      }
    } catch (error) {
      console.error('CloudAuthService: Upload backup error:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.message.includes('400') || error.message.includes('Bad Request')) {
        errorMessage = 'Bad request - please check your Appwrite configuration and permissions';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Authentication failed - please log in again';
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorMessage = 'Access denied - insufficient permissions';
      } else if (error.message.includes('404') || error.message.includes('Not Found')) {
        errorMessage = 'Resource not found - please check your Appwrite configuration';
      } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        errorMessage = 'Rate limit exceeded - please try again later';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error - please check your internet connection';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  async getBackups() {
    try {
      // Use cached user if authenticated, otherwise return authentication error
      if (!this._universalAuthState || !this.user) {
        throw new Error('User not authenticated - please sign in to use cloud backup features');
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
      console.error('CloudAuthService: getBackups error:', error);
      return { success: false, error: error.message };
    }
  }

  async downloadBackup(backupId) {
    try {
      if (!this._universalAuthState || !this.user) {
        throw new Error('User not authenticated - please sign in to use cloud backup features');
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
      if (!this._universalAuthState || !this.user) {
        throw new Error('User not authenticated - please sign in to use cloud backup features');
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
      if (!this._universalAuthState || !this.user) return 1;

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

  // Auto backup management - now automatically enabled when authenticated
  async getAutoBackupSettings() {
    try {
      if (!this._universalAuthState || !this.user) {
        return { enabled: false, frequency: 'instant' };
      }

      // Auto cloud backup is always enabled when authenticated
      return {
        enabled: true, // Always true when authenticated
        frequency: 'instant' // Instant backup after every change
      };
    } catch (error) {
      return { enabled: false, frequency: 'instant' };
    }
  }

  async updateAutoBackupSettings(enabled, frequency = 'instant') {
    try {
      // Cloud backup is always enabled when authenticated, no need to store settings
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Unified auto backup function - called from the unified backup system
  async performAutoBackup() {
    try {
      // Use cached authentication state instead of re-checking
      if (!this._universalAuthState || !this.user || !this.user.$id) {
        return { success: false, error: 'User not authenticated' };
      }

      // First, verify backup integrity and cleanup if needed
      try {
        await this.cleanupOrphanedBackups();
        const integrityCheck = await this.verifyBackupIntegrity();
        console.log('CloudAuthService: Integrity check result:', integrityCheck.message);
      } catch (cleanupError) {
        console.warn('CloudAuthService: Cleanup/integrity check failed:', cleanupError.message);
      }

      // Get the current backup file path
      if (!window.api?.getCurrentBackupPath || !window.api?.readBackupFile) {
        return { success: false, error: 'Backup API not available' };
      }

      const pathResult = await window.api.getCurrentBackupPath();
      if (!pathResult.success || !pathResult.path) {
        return { success: false, error: 'Current backup path not found' };
      }

      const backupFile = await window.api.readBackupFile(pathResult.path);
      if (!backupFile || backupFile.length === 0) {
        return { success: false, error: 'Failed to read current backup file' };
      }

      // Use a fixed file name for auto backup so it can be updated
      const backupName = 'auto-backup-latest.sqlite';
      const file = new File([backupFile], backupName, {
        type: 'application/octet-stream'
      });

      console.log(`CloudAuthService: Starting auto backup, file size: ${file.size} bytes`);
      const result = await this.uploadBackupWithRetry(file, backupName, 'Automatic backup');
      
      if (result.success) {
        console.log('CloudAuthService: Auto backup completed successfully');
        
        // Verify the backup was actually saved
        try {
          const verifyResult = await this.verifyBackupIntegrity();
          if (verifyResult.success && verifyResult.exists) {
            console.log('CloudAuthService: Backup integrity verified after upload');
          }
        } catch (verifyError) {
          console.warn('CloudAuthService: Post-upload verification failed:', verifyError.message);
        }
      } else {
        console.error('CloudAuthService: Auto backup failed:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('CloudAuthService: Auto backup error:', error);
      return { success: false, error: error.message };
    }
  }

  // Authentication state tracking and event system
  async checkAuth() {
    // Return cached universal authentication state without network calls
    return this._universalAuthState;
  }

  // Session validation and restoration
  async verifySession() {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session verification timeout')), this._networkTimeout)
      );
      
      // Try to get the current session with timeout
      const session = await Promise.race([
        this.account.getSession('current'),
        timeoutPromise
      ]);
      
      if (session && !this._isSessionExpired(session)) {
        // Session exists and is valid, get user info with timeout
        this.user = await Promise.race([
          this.account.get(),
          timeoutPromise
        ]);
        
        if (this.user && this.user.$id) {
          this.setAuthenticated(true);
          return { success: true, user: this.user };
        }
      }
      
      // No valid session or user
      this.user = null;
      this.setAuthenticated(false);
      return { success: false, error: 'No valid session' };
    } catch (error) {
      // Handle timeout specifically
      if (error.message === 'Session verification timeout') {
        console.warn('CloudAuthService: Session verification timed out');
        return { success: false, error: 'Session verification timeout' };
      }
      
      // Session is invalid or expired
      this.user = null;
      this.setAuthenticated(false);
      return { success: false, error: error.message };
    }
  }

  _isSessionExpired(session) {
    if (!session || !session.expire) return true;
    
    const now = new Date();
    const expireDate = new Date(session.expire);
    
    // Consider session expired if it expires within 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    return (expireDate.getTime() - now.getTime()) < fiveMinutes;
  }

  isAuthenticated() {
    return this._universalAuthState;
  }

  onAuthChange(listener) {
    this._listeners.push(listener);
  }

  offAuthChange(listener) {
    this._listeners = this._listeners.filter(l => l !== listener);
  }

  _notify() {
    this._listeners.forEach(l => l(this._universalAuthState));
  }

  setAuthenticated(val) {
    this._isAuthenticated = val; // Keep for compatibility
    this._universalAuthState = val; // Set universal state
    this._notify();
  }

  // Utility methods
  async getStorageUsage() {
    try {
      // Use cached user if authenticated, otherwise return authentication error
      if (!this._universalAuthState || !this.user) {
        throw new Error('User not authenticated - please sign in to use cloud backup features');
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
      console.error('CloudAuthService: getStorageUsage error:', error);
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

  // Utility to sanitize and validate file names for Appwrite
  _sanitizeFileName(name) {
    if (!name || typeof name !== 'string') return 'backup.sqlite';
    // Remove invalid characters and trim length
    let sanitized = name.replace(/[^a-zA-Z0-9._-]/g, '-');
    if (sanitized.length === 0) sanitized = 'backup.sqlite';
    if (sanitized.length > 255) sanitized = sanitized.slice(0, 255);
    return sanitized;
  }

  // Backup cleanup and integrity methods
  async cleanupOrphanedBackups() {
    try {
      if (!this._universalAuthState || !this.user) {
        throw new Error('User not authenticated - please sign in to use cloud backup features');
      }

      // Get all backup records for this user
      const response = await this.databases.listDocuments(
        this.DATABASE_ID,
        this.BACKUPS_COLLECTION_ID,
        [
          Query.equal('userId', this.user.$id),
          Query.orderDesc('uploadDate'),
          Query.limit(100)
        ]
      );

      const backups = response.documents;
      const autoBackupRecords = backups.filter(backup => backup.fileName === 'auto-backup-latest.sqlite');

      // If we have more than one auto-backup record, keep only the latest
      if (autoBackupRecords.length > 1) {
        console.log(`CloudAuthService: Found ${autoBackupRecords.length} auto-backup records, cleaning up...`);
        
        const latestBackup = autoBackupRecords[0]; // Already sorted by uploadDate desc
        const oldBackups = autoBackupRecords.slice(1);

        for (const oldBackup of oldBackups) {
          try {
            // Delete the file from storage
            await this.storage.deleteFile(this.BACKUP_BUCKET_ID, oldBackup.fileId);
            // Delete the database record
            await this.databases.deleteDocument(
              this.DATABASE_ID,
              this.BACKUPS_COLLECTION_ID,
              oldBackup.$id
            );
            console.log('CloudAuthService: Cleaned up old backup:', oldBackup.$id);
          } catch (error) {
            console.warn('CloudAuthService: Error cleaning up backup:', error.message);
          }
        }
      }

      return { success: true, cleaned: autoBackupRecords.length - 1 };
    } catch (error) {
      console.error('CloudAuthService: Cleanup error:', error);
      return { success: false, error: error.message };
    }
  }

  async verifyBackupIntegrity() {
    try {
      if (!this._universalAuthState || !this.user) {
        throw new Error('User not authenticated - please sign in to use cloud backup features');
      }

      // Get the latest auto-backup record
      const response = await this.databases.listDocuments(
        this.DATABASE_ID,
        this.BACKUPS_COLLECTION_ID,
        [
          Query.equal('userId', this.user.$id),
          Query.equal('fileName', 'auto-backup-latest.sqlite'),
          Query.orderDesc('uploadDate'),
          Query.limit(1)
        ]
      );

      if (response.documents.length === 0) {
        return { success: true, exists: false, message: 'No auto-backup found' };
      }

      const backup = response.documents[0];

      // Check if the file actually exists in storage
      try {
        const file = await this.storage.getFile(this.BACKUP_BUCKET_ID, backup.fileId);
        return { 
          success: true, 
          exists: true, 
          backup: backup,
          fileSize: file.sizeOriginal,
          message: 'Backup integrity verified' 
        };
      } catch (storageError) {
        console.warn('CloudAuthService: File missing from storage:', storageError.message);
        
        // File is missing, delete the orphaned record
        try {
          await this.databases.deleteDocument(
            this.DATABASE_ID,
            this.BACKUPS_COLLECTION_ID,
            backup.$id
          );
          console.log('CloudAuthService: Removed orphaned backup record');
        } catch (deleteError) {
          console.error('CloudAuthService: Error removing orphaned record:', deleteError.message);
        }

        return { 
          success: true, 
          exists: false, 
          message: 'Backup file missing, record cleaned up' 
        };
      }
    } catch (error) {
      console.error('CloudAuthService: Integrity check error:', error);
      return { success: false, error: error.message };
    }
  }

  // Manual backup creation with versioning (for data safety)
  async createManualBackup(description = 'Manual backup') {
    try {
      if (!this._universalAuthState || !this.user) {
        throw new Error('User not authenticated - please sign in to use cloud backup features');
      }

      // Get the current backup file path
      if (!window.api?.getCurrentBackupPath || !window.api?.readBackupFile) {
        return { success: false, error: 'Backup API not available' };
      }

      const pathResult = await window.api.getCurrentBackupPath();
      if (!pathResult.success || !pathResult.path) {
        return { success: false, error: 'Current backup path not found' };
      }

      const backupFile = await window.api.readBackupFile(pathResult.path);
      if (!backupFile || backupFile.length === 0) {
        return { success: false, error: 'Failed to read current backup file' };
      }

      // Create a timestamped backup name for manual backups
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `manual-backup-${timestamp}.sqlite`;
      
      const file = new File([backupFile], backupName, {
        type: 'application/octet-stream'
      });

      console.log(`CloudAuthService: Creating manual backup: ${backupName}`);
      const result = await this.uploadBackupWithRetry(file, backupName, description);
      
      if (result.success) {
        console.log('CloudAuthService: Manual backup created successfully');
      } else {
        console.error('CloudAuthService: Manual backup failed:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('CloudAuthService: Manual backup error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get backup statistics
  async getBackupStats() {
    try {
      if (!this._universalAuthState || !this.user) {
        throw new Error('User not authenticated - please sign in to use cloud backup features');
      }

      const backupsResult = await this.getBackups();
      if (!backupsResult.success) {
        return { success: false, error: backupsResult.error };
      }

      const backups = backupsResult.backups;
      const autoBackups = backups.filter(b => b.fileName === 'auto-backup-latest.sqlite');
      const manualBackups = backups.filter(b => b.fileName.startsWith('manual-backup-'));
      
      const totalSize = backups.reduce((sum, backup) => sum + (backup.fileSize || 0), 0);
      const latestBackup = backups.length > 0 ? backups[0] : null;

      return {
        success: true,
        stats: {
          totalBackups: backups.length,
          autoBackups: autoBackups.length,
          manualBackups: manualBackups.length,
          totalSize,
          formattedSize: this.formatFileSize(totalSize),
          latestBackup,
          hasAutoBackup: autoBackups.length > 0
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Robust upload with retry logic
  async uploadBackupWithRetry(backupFile, backupName, description, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`CloudAuthService: Upload attempt ${attempt}/${maxRetries}`);
        const result = await this.uploadBackup(backupFile, backupName, description);
        
        if (result.success) {
          console.log(`CloudAuthService: Upload succeeded on attempt ${attempt}`);
          return result;
        } else {
          lastError = result.error;
          console.warn(`CloudAuthService: Upload attempt ${attempt} failed:`, result.error);
          
          // Don't retry for authentication errors
          if (result.error.includes('not authenticated') || result.error.includes('Unauthorized')) {
            break;
          }
          
          // Wait before retry (exponential backoff)
          if (attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            console.log(`CloudAuthService: Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      } catch (error) {
        lastError = error.message;
        console.error(`CloudAuthService: Upload attempt ${attempt} error:`, error);
        
        // Don't retry for certain errors
        if (error.message.includes('not authenticated') || error.message.includes('Unauthorized')) {
          break;
        }
        
        // Wait before retry
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`CloudAuthService: Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    return { success: false, error: `Upload failed after ${maxRetries} attempts. Last error: ${lastError}` };
  }
}

// Create and export singleton instance to prevent initialization issues
if (!globalInstance) {
  globalInstance = new CloudAuthService();
}

export default globalInstance;