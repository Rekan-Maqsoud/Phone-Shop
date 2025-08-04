// Auto Update Service for Mobile Roma
// Handles checking, downloading, and installing updates

const { autoUpdater } = require('electron-updater');
const { dialog, BrowserWindow } = require('electron');
const settings = require('electron-settings');

class AutoUpdateService {
  constructor() {
    this.mainWindow = null;
    this.updateAvailable = false;
    this.updateDownloaded = false;
    this.checkInProgress = false;
    
    // Configure autoUpdater
    this.configureAutoUpdater();
    
    // Set default settings
    this.initializeSettings();
  }

  async initializeSettings() {
    try {
      // Default update settings
      const defaults = {
        autoUpdateEnabled: false, // Disabled by default until releases are available
        autoDownload: false, // Don't auto-download, ask user first
        checkOnStartup: false, // Disabled by default to prevent startup errors
        updateChannel: 'latest' // Can be 'latest', 'beta', 'alpha'
      };

      for (const [key, value] of Object.entries(defaults)) {
        const existing = await settings.get(`updates.${key}`);
        if (existing === undefined) {
          await settings.set(`updates.${key}`, value);
        }
      }
    } catch (error) {
      console.error('[AutoUpdate] Failed to initialize settings:', error);
    }
  }

  configureAutoUpdater() {
    // Set environment variables before any electron-updater operations
    process.env.ELECTRON_UPDATER_ALLOW_UNSIGNED = 'true';
    process.env.ELECTRON_UPDATER_DISABLE_SIGNATURE_VERIFICATION = 'true';
    
    // Configure update server
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'Rekan-Maqsoud', // Your GitHub username
      repo: 'Phone-Shop',     // Your repository name
      private: false,         // Set to true if private repo
      releaseType: 'release'  // 'release', 'prerelease', or 'draft'
    });

    // Auto-download disabled by default for safety
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    
    // Set logger to help with debugging
    autoUpdater.logger = require('electron-log');
    autoUpdater.logger.transports.file.level = 'debug';

    // Event handlers
    autoUpdater.on('checking-for-update', () => {
      console.log('[AutoUpdate] Checking for updates...');
      this.sendToRenderer('update-checking');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('[AutoUpdate] Update available:', info.version);
      this.updateAvailable = true;
      this.sendToRenderer('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate
      });
      this.showUpdateAvailableDialog(info);
    });

    autoUpdater.on('update-not-available', () => {
      console.log('[AutoUpdate] No updates available');
      this.sendToRenderer('update-not-available');
    });

    autoUpdater.on('error', (error) => {
      console.error('[AutoUpdate] Error:', error);
      this.checkInProgress = false;
      
      // Enhanced error handling for common issues
      let userMessage = error.message;
      if (error.message.includes('404')) {
        userMessage = 'No releases found on GitHub. Please ensure releases are published or check your internet connection.';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        userMessage = 'Network error: Unable to check for updates. Please check your internet connection.';
      } else if (error.message.includes('authentication') || error.message.includes('token')) {
        userMessage = 'Authentication error: Unable to access update server.';
      }
      
      this.sendToRenderer('update-error', userMessage);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      console.log(`[AutoUpdate] Download progress: ${progressObj.percent}%`);
      this.sendToRenderer('update-download-progress', {
        percent: Math.round(progressObj.percent),
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[AutoUpdate] Update downloaded:', info.version);
      this.updateDownloaded = true;
      this.sendToRenderer('update-downloaded', {
        version: info.version
      });
      this.showUpdateReadyDialog(info);
    });
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  sendToRenderer(event, data = null) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(event, data);
    }
  }

  async checkForUpdates(manual = false) {
    try {
      if (this.checkInProgress) {
        console.log('[AutoUpdate] Check already in progress');
        return;
      }

      const enabled = await settings.get('updates.autoUpdateEnabled');
      if (!enabled && !manual) {
        console.log('[AutoUpdate] Auto updates disabled');
        return;
      }

      this.checkInProgress = true;
      console.log('[AutoUpdate] Starting update check...');
      
      // Add timeout and better error handling
      const checkPromise = autoUpdater.checkForUpdates();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Update check timed out after 30 seconds')), 30000);
      });
      
      const result = await Promise.race([checkPromise, timeoutPromise]);
      this.checkInProgress = false;
      
      if (manual && !this.updateAvailable) {
        this.showNoUpdatesDialog();
      }
      
      return result;
    } catch (error) {
      this.checkInProgress = false;
      console.error('[AutoUpdate] Check failed:', error);
      
      // Enhanced error handling for different scenarios
      let userMessage = error.message;
      if (error.message.includes('404')) {
        userMessage = 'No releases found. This might be because:\n\n• No releases have been published yet\n• Repository access issues\n• Internet connection problems\n\nPlease try again later or contact support.';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Update check timed out. Please check your internet connection and try again.';
      }
      
      if (manual) {
        this.showErrorDialog(userMessage);
      }
      
      throw error;
    }
  }

  async downloadUpdate() {
    try {
      if (!this.updateAvailable) {
        throw new Error('No update available to download');
      }

      console.log('[AutoUpdate] Starting download...');
      this.sendToRenderer('update-download-started');
      
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('[AutoUpdate] Download failed:', error);
      this.sendToRenderer('update-download-error', error.message);
      
      // If automatic download fails, try manual download to Downloads folder
      if (error.message.includes('verifySignature') || error.message.includes('signature') || error.message.includes('not signed')) {
        await this.downloadToUserFolder();
      }
      
      throw error;
    }
  }

  async downloadToUserFolder() {
    try {
      const { app } = require('electron');
      const path = require('path');
      const fs = require('fs');
      const https = require('https');
      
      // Get the latest release info
      const response = await fetch('https://api.github.com/repos/Rekan-Maqsoud/Phone-Shop/releases/latest');
      const releaseData = await response.json();
      
      // Find the .exe file in assets
      const exeAsset = releaseData.assets.find(asset => asset.name.endsWith('.exe'));
      if (!exeAsset) {
        throw new Error('No executable found in latest release');
      }
      
      // Get Downloads folder path
      const downloadsPath = app.getPath('downloads');
      const fileName = exeAsset.name;
      const filePath = path.join(downloadsPath, fileName);
      
      // Show download dialog
      const shouldDownload = await this.showManualDownloadDialog(fileName, filePath);
      if (!shouldDownload) return;
      
      // Download the file
      await this.downloadFile(exeAsset.browser_download_url, filePath);
      
      // Show completion dialog
      await this.showDownloadCompleteDialog(filePath);
      
    } catch (error) {
      console.error('[AutoUpdate] Manual download failed:', error);
      await this.showManualDownloadErrorDialog(error.message);
    }
  }

  async downloadFile(url, filePath) {
    return new Promise((resolve, reject) => {
      const https = require('https');
      const fs = require('fs');
      const path = require('path');
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const file = fs.createWriteStream(filePath);
      let downloadedBytes = 0;
      let totalBytes = 0;
      
      const request = https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirect
          return this.downloadFile(response.headers.location, filePath).then(resolve).catch(reject);
        }
        
        totalBytes = parseInt(response.headers['content-length'], 10);
        
        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
          
          // Send progress update
          this.sendToRenderer('update-download-progress', {
            percent,
            transferred: downloadedBytes,
            total: totalBytes,
            bytesPerSecond: 0
          });
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });
        
        file.on('error', (err) => {
          fs.unlink(filePath, () => {}); // Delete partial file
          reject(err);
        });
      });
      
      request.on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete partial file
        reject(err);
      });
    });
  }

  async showManualDownloadDialog(fileName, filePath) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return false;

    const response = await dialog.showMessageBox(this.mainWindow, {
      type: 'warning',
      title: 'Manual Download Required',
      message: 'Automatic update failed due to security restrictions.',
      detail: `Would you like to download "${fileName}" to your Downloads folder?\n\nYou can then run the installer manually to update the application.`,
      buttons: ['Download to Downloads Folder', 'Open GitHub Releases', 'Cancel'],
      defaultId: 0,
      cancelId: 2
    });

    switch (response.response) {
      case 0: // Download to Downloads Folder
        return true;
      case 1: // Open GitHub Releases
        require('electron').shell.openExternal('https://github.com/Rekan-Maqsoud/Phone-Shop/releases/latest');
        return false;
      case 2: // Cancel
        return false;
    }
  }

  async showDownloadCompleteDialog(filePath) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const { shell } = require('electron');
    const path = require('path');
    const fileName = path.basename(filePath);

    const response = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Download Complete',
      message: `Update downloaded successfully!`,
      detail: `"${fileName}" has been saved to your Downloads folder.\n\nWould you like to run the installer now or open the Downloads folder?`,
      buttons: ['Run Installer Now', 'Open Downloads Folder', 'Close'],
      defaultId: 0,
      cancelId: 2
    });

    switch (response.response) {
      case 0: // Run Installer Now
        try {
          await shell.openPath(filePath);
        } catch (error) {
          console.error('[AutoUpdate] Failed to open installer:', error);
          shell.showItemInFolder(filePath);
        }
        break;
      case 1: // Open Downloads Folder
        shell.showItemInFolder(filePath);
        break;
      case 2: // Close
        break;
    }
  }

  async showManualDownloadErrorDialog(errorMessage) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const response = await dialog.showMessageBox(this.mainWindow, {
      type: 'error',
      title: 'Download Failed',
      message: 'Failed to download update file',
      detail: `${errorMessage}\n\nWould you like to visit GitHub releases to download manually?`,
      buttons: ['Open GitHub Releases', 'Close'],
      defaultId: 0,
      cancelId: 1
    });

    if (response.response === 0) {
      require('electron').shell.openExternal('https://github.com/Rekan-Maqsoud/Phone-Shop/releases/latest');
    }
  }

  async installUpdate() {
    try {
      if (!this.updateDownloaded) {
        throw new Error('No update downloaded to install');
      }

      console.log('[AutoUpdate] Installing update...');
      this.sendToRenderer('update-installing');
      
      // This will restart the app with the new version
      autoUpdater.quitAndInstall(false, true);
    } catch (error) {
      console.error('[AutoUpdate] Install failed:', error);
      this.sendToRenderer('update-install-error', error.message);
      throw error;
    }
  }

  async showUpdateAvailableDialog(info) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const response = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Mobile Roma v${info.version} is available!`,
      detail: `Current version: ${require('../../package.json').version}\nNew version: ${info.version}\n\nWould you like to download this update now?`,
      buttons: ['Download Now', 'Download Later', 'Skip This Version'],
      defaultId: 0,
      cancelId: 1
    });

    switch (response.response) {
      case 0: // Download Now
        await this.downloadUpdate();
        break;
      case 1: // Download Later
        console.log('[AutoUpdate] User chose to download later');
        break;
      case 2: // Skip This Version
        await settings.set(`updates.skippedVersion`, info.version);
        console.log('[AutoUpdate] User skipped version:', info.version);
        break;
    }
  }

  async showUpdateReadyDialog(info) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const response = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Mobile Roma v${info.version} has been downloaded and is ready to install.`,
      detail: 'The application will restart to complete the installation. Make sure to save any unsaved work.',
      buttons: ['Install Now', 'Install on Exit', 'Cancel'],
      defaultId: 0,
      cancelId: 2
    });

    switch (response.response) {
      case 0: // Install Now
        await this.installUpdate();
        break;
      case 1: // Install on Exit
        autoUpdater.autoInstallOnAppQuit = true;
        console.log('[AutoUpdate] Update will install on app exit');
        break;
      case 2: // Cancel
        console.log('[AutoUpdate] User cancelled installation');
        break;
    }
  }

  async showNoUpdatesDialog() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'No Updates',
      message: 'You are running the latest version of Mobile Roma.',
      detail: `Current version: ${require('../../package.json').version}`,
      buttons: ['OK']
    });
  }

  async showErrorDialog(errorMessage) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    await dialog.showMessageBox(this.mainWindow, {
      type: 'error',
      title: 'Update Error',
      message: 'Failed to check for updates',
      detail: errorMessage,
      buttons: ['OK']
    });
  }

  // Settings management
  async getUpdateSettings() {
    try {
      return {
        autoUpdateEnabled: await settings.get('updates.autoUpdateEnabled', true),
        autoDownload: await settings.get('updates.autoDownload', false),
        checkOnStartup: await settings.get('updates.checkOnStartup', true),
        updateChannel: await settings.get('updates.updateChannel', 'latest'),
        skippedVersion: await settings.get('updates.skippedVersion', null)
      };
    } catch (error) {
      console.error('[AutoUpdate] Failed to get settings:', error);
      return {};
    }
  }

  async updateSettings(newSettings) {
    try {
      for (const [key, value] of Object.entries(newSettings)) {
        await settings.set(`updates.${key}`, value);
      }
      
      // Apply new settings
      if (newSettings.autoDownload !== undefined) {
        autoUpdater.autoDownload = newSettings.autoDownload;
      }
      
      console.log('[AutoUpdate] Settings updated:', newSettings);
      return true;
    } catch (error) {
      console.error('[AutoUpdate] Failed to update settings:', error);
      return false;
    }
  }

  // Cleanup
  destroy() {
    autoUpdater.removeAllListeners();
    this.mainWindow = null;
  }
}

module.exports = AutoUpdateService;
