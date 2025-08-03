# How to Release Updates for Mobile Roma

This guide shows you how to publish updates that your users will receive automatically.

## Quick Start

1. **Update Version**: Edit `package.json` and increment the version number
   ```json
   {
     "version": "1.2.4"  // Change this
   }
   ```

2. **Build the Application**:
   ```bash
   npm run build
   ```

3. **Create Release**:
   ```bash
   npm run publish
   ```

That's it! Your users will be notified of the update automatically.

## Step-by-Step Process

### 1. Prepare Your Update

- Make your code changes
- Test thoroughly in development mode
- Update version in `package.json`:
  ```json
  {
    "version": "1.2.4"  // Increment: 1.2.3 → 1.2.4
  }
  ```

### 2. Build for Production

```bash
# Build the frontend
npm run build

# Build the Electron app (creates installer)
npm run make
```

### 3. Publish the Update

```bash
# This will build and upload to GitHub releases
npm run publish
```

Or manually:

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Tag version: `v1.2.4`
4. Upload files from `release/` folder:
   - `Mobile Roma Setup 1.2.4.exe`
   - `Mobile Roma Setup 1.2.4.exe.blockmap`
   - `latest.yml`

### 4. Verify the Release

- Check that the release is marked as "Latest release"
- Verify all files are uploaded correctly
- Test the update process with a test installation

## User Experience

When you publish an update:

1. **Notification**: Users see "Update Available" dialog
2. **Choice**: Users can:
   - Download now
   - Download later
   - Skip this version
3. **Download**: Progress bar shows download status
4. **Install**: User clicks "Install & Restart"
5. **Restart**: App restarts with new version

## Update Settings (for Users)

Users can control update behavior in **Admin Panel → App Updates**:

- ✅ Enable auto-update checks
- ✅ Check for updates on startup
- ❌ Auto-download (disabled by default for safety)

## Version Numbering

Use semantic versioning:
- `1.2.3` → `1.2.4` (patch: bug fixes)
- `1.2.3` → `1.3.0` (minor: new features)
- `1.2.3` → `2.0.0` (major: breaking changes)

## Testing Updates

### Before Release:
```bash
# Build without publishing
npm run draft

# Test the installer manually
# Install it on a test machine
# Verify everything works
```

### After Release:
- Install previous version
- Test the update process
- Verify data is preserved
- Check that all features work

## Troubleshooting

### Common Issues:

1. **Update not showing**: 
   - Check GitHub release is published
   - Verify version number is higher
   - Check internet connection

2. **Download fails**:
   - Check file permissions
   - Verify firewall settings
   - Try again later

3. **Install fails**:
   - Close app completely
   - Run as administrator
   - Check disk space

### Debug Mode:
Check console logs for detailed error messages:
```
F12 → Console → Look for [AutoUpdate] messages
```

## Best Practices

### For You:
- ✅ Always test before publishing
- ✅ Increment version numbers correctly
- ✅ Write clear release notes
- ✅ Keep backups of working versions
- ❌ Don't force immediate updates
- ❌ Don't skip version testing

### For Users:
- 📱 App automatically backs up data before updates
- 🔒 Users can skip problematic updates
- ⏰ Updates can be postponed
- 🛡️ Only official updates are allowed

## Emergency Rollback

If you need to rollback an update:

1. **Create hotfix**: Fix the issue in code
2. **Increment version**: e.g., 1.2.4 → 1.2.5
3. **Publish quickly**: Use `npm run publish`
4. **Notify users**: Through your normal channels

## Security Notes

- Updates only come from your official GitHub repository
- Users are always prompted before installation
- No automatic silent updates
- Digital signatures recommended for production

This system ensures your users always have the latest features and bug fixes while maintaining full control over the update process!
