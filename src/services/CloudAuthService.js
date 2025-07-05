// Cloud authentication service for renderer process
import { Client, Account, ID } from 'appwrite';

class CloudAuthService {
  constructor() {
    this.client = new Client();
    this.account = null;
    this.isAuthenticated = false;
    this.currentUser = null;
    this.authListeners = [];
    
    // Initialize Appwrite client
    this.client
      .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
      .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '685ddcd00006c06a72f0');
    
    this.account = new Account(this.client);
  }

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const session = await this.account.createEmailPasswordSession(email, password);
      const user = await this.account.get();
      
      this.currentUser = user;
      this.isAuthenticated = true;
      
      // Share session with main process
      await this.shareSessionWithMain();
      
      // Notify listeners
      this.notifyAuthListeners(true);
      
      return { success: true, user };
    } catch (error) {
      console.error('[CloudAuthService] Sign in failed:', error);
      return { success: false, message: error.message };
    }
  }

  // Sign up with email and password
  async signUp(email, password, name) {
    try {
      const user = await this.account.create(ID.unique(), email, password, name);
      
      // After creating account, sign in
      const signInResult = await this.signIn(email, password);
      if (signInResult.success) {
        return { success: true, user };
      } else {
        return { success: false, message: 'Account created but sign in failed' };
      }
    } catch (error) {
      console.error('[CloudAuthService] Sign up failed:', error);
      return { success: false, message: error.message };
    }
  }

  // Sign out
  async signOut() {
    try {
      await this.account.deleteSession('current');
      this.currentUser = null;
      this.isAuthenticated = false;
      
      // Clear session from main process
      await this.clearSessionFromMain();
      
      // Notify listeners
      this.notifyAuthListeners(false);
      
      return { success: true };
    } catch (error) {
      console.error('[CloudAuthService] Sign out failed:', error);
      return { success: false, message: error.message };
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      if (this.isAuthenticated && this.currentUser) {
        return this.currentUser;
      }
      
      // Try to get user from current session
      const user = await this.account.get();
      if (user) {
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Share session with main process
        await this.shareSessionWithMain();
        
        return user;
      }
      
      // No user found
      this.isAuthenticated = false;
      this.currentUser = null;
      return null;
    } catch (error) {
      // Session doesn't exist or expired
      this.isAuthenticated = false;
      this.currentUser = null;
      return null;
    }
  }

  // Check if user is authenticated
  async checkAuth() {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  // Initialize authentication on app startup
  async initializeAuth() {
    try {
     
      
      // First check if there's an existing session
      const user = await this.account.get();
      if (user) {
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Share session with main process
        await this.shareSessionWithMain();
        
        // Notify listeners
        this.notifyAuthListeners(true);
        
        return true;
      } else {
        return false;
      }
    } catch (error) {   
      this.isAuthenticated = false;
      this.currentUser = null;
      
      // Notify listeners
      this.notifyAuthListeners(false);
      
      return false;
    }
  }

  // Share session with main process
  async shareSessionWithMain() {
    try {
      if (this.currentUser && window.api?.setCloudBackupSession) {
        // Get JWT token for sharing with main process
        const jwt = await this.account.createJWT();
        
        const sessionData = {
          userId: this.currentUser.$id,
          userEmail: this.currentUser.email,
          userName: this.currentUser.name,
          jwt: jwt.jwt
        };
        
        await window.api.setCloudBackupSession(sessionData);
      }
    } catch (error) {
      console.error('[CloudAuthService] Failed to share session with main process:', error);
    }
  }

  // Clear session from main process
  async clearSessionFromMain() {
    try {
      if (window.api?.clearCloudBackupSession) {
        await window.api.clearCloudBackupSession();
      }
    } catch (error) {
      console.error('[CloudAuthService] Failed to clear session from main process:', error);
    }
  }

  // Add auth state listener
  addAuthListener(callback) {
    this.authListeners.push(callback);
  }

  // Remove auth state listener
  removeAuthListener(callback) {
    this.authListeners = this.authListeners.filter(listener => listener !== callback);
  }

  // Notify all auth listeners
  notifyAuthListeners(isAuthenticated) {
    this.authListeners.forEach(listener => {
      try {
        listener(isAuthenticated, this.currentUser);
      } catch (error) {
        console.error('[CloudAuthService] Error in auth listener:', error);
      }
    });
  }
}

// Export singleton instance
export default new CloudAuthService();
