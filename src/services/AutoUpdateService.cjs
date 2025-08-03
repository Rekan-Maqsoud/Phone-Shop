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
        autoUpdateEnabled: true,
        autoDownload: false, // Don't auto-download, ask user first
        checkOnStartup: true,
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
    // Configure update server (you'll need to set this up)
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
      this.sendToRenderer('update-error', error.message);
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
      
      const result = await autoUpdater.checkForUpdates();
      this.checkInProgress = false;
      
      if (manual && !this.updateAvailable) {
        this.showNoUpdatesDialog();
      }
      
      return result;
    } catch (error) {
      this.checkInProgress = false;
      console.error('[AutoUpdate] Check failed:', error);
      
      if (manual) {
        this.showErrorDialog(error.message);
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
      throw error;
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
