# Auto-Update System for Mobile Roma

This document explains how the auto-update system works and how to use it for your production app.

## Overview

The auto-update system allows your users to receive updates automatically without manually downloading and installing new versions. The system is built using `electron-updater` and integrates with GitHub releases.

## How It Works

1. **Update Check**: The app checks for updates on startup (configurable)
2. **User Notification**: If an update is available, users are notified via dialog
3. **Download**: Users can choose to download the update immediately or later
4. **Installation**: Once downloaded, users can install the update (app restarts automatically)

## Features

- ✅ **Safe Updates**: Users are always prompted before downloading/installing
- ✅ **Progress Tracking**: Real-time download progress display
- ✅ **Settings Control**: Users can configure update behavior
- ✅ **Manual Checks**: Users can manually check for updates
- ✅ **Rollback Safety**: Updates can be skipped if needed
- ✅ **Production Ready**: Only works in packaged apps, disabled in development

## Configuration

### In the App

Users can configure update behavior in **Admin Panel → App Updates**:

- **Enable Auto Updates**: Turn automatic update checking on/off
- **Check on Startup**: Check for updates when app starts
- **Auto Download**: Automatically download updates (not recommended for production)

### For Developers

The update configuration is in `package.json`:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "Rekan-Maqsoud",
      "repo": "Phone-Shop",
      "private": false,
      "releaseType": "release"
    }
  }
}
```

## Publishing Updates

### Method 1: Using npm scripts

```bash
# Build and publish to GitHub releases
npm run publish

# Build without publishing (for testing)
npm run draft
```

### Method 2: Manual GitHub Release

1. Create a new release on GitHub
2. Upload the installer files from the `release/` folder
3. Make sure the release is marked as "Latest release"

## File Structure

```
src/
├── services/
│   └── AutoUpdateService.cjs    # Main update service
├── components/
│   └── UpdateSettingsSection.jsx # UI for update settings
├── main.cjs                     # Integration with main process
└── preload.js                   # API exposure to renderer
```

## Security

- Updates are only downloaded from the official GitHub repository
- Users are always notified before any action is taken
- Updates can be skipped or postponed by users
- Digital signatures can be added for extra security (requires code signing certificate)

## Important Notes

### For Production Deployment

1. **Version Bump**: Always increment the version in `package.json` before building
2. **Testing**: Test the update process thoroughly before releasing
3. **Backup**: Users are automatically prompted to backup before installing updates
4. **GitHub Token**: You may need to set `GH_TOKEN` environment variable for publishing

### User Experience

- Users see a notification when updates are available
- Download progress is shown in real-time
- App automatically restarts after installation
- All user data is preserved during updates

### Troubleshooting

If updates fail:
1. Check internet connection
2. Verify GitHub repository access
3. Check app permissions
4. Review console logs for specific error messages

## Example Usage

### Checking for Updates Manually

```javascript
// In renderer process
const result = await window.api.checkForUpdates(true);
```

### Getting Update Settings

```javascript
// In renderer process
const settings = await window.api.getUpdateSettings();
```

### Updating Settings

```javascript
// In renderer process
await window.api.updateUpdateSettings({
  autoUpdateEnabled: true,
  checkOnStartup: false
});
```

## Development vs Production

- **Development**: Auto-updates are disabled completely
- **Production**: Auto-updates work with GitHub releases
- **Testing**: Use `npm run draft` to build without publishing

## Benefits for Users

1. **Always Up to Date**: Automatic security and feature updates
2. **Easy Process**: No need to manually download and install
3. **Safe**: Can skip updates or install later
4. **Transparent**: Clear progress indication and control

## Benefits for You

1. **Easy Distribution**: Push updates directly to all users
2. **Bug Fixes**: Quickly deploy critical fixes
3. **Feature Rollout**: Gradually release new features
4. **Analytics**: Track update adoption rates

This system ensures your users always have the latest version while maintaining full control over when and how updates are applied.
