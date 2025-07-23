# Mobile Roma Installation & Data Management

## Installation Process

Mobile Roma uses a custom NSIS installer that provides:
- **Interactive Installation**: Choose installation directory
- **Desktop & Start Menu Shortcuts**: Easy access to the application
- **Professional Installer Experience**: Clean, branded installation process

## Data Storage Location

Mobile Roma stores all application data in your Windows AppData directory:
```
%APPDATA%\mobile-roma\
```

This includes:
- **Database**: `shop.sqlite` (all sales, inventory, customer data)
- **Settings**: Application preferences and configurations
- **Backup Data**: Cloud backup configurations
- **Cache**: Temporary application data

## Uninstallation Options

When uninstalling Mobile Roma, you have **two options**:

### Option 1: Keep Your Data (Recommended for Updates)
- Removes the application but preserves all your data
- Perfect for application updates or temporary removal
- Your data will be available if you reinstall Mobile Roma

### Option 2: Complete Removal (Clean Uninstall)
- Removes both the application AND all data
- **WARNING**: This permanently deletes all sales records, inventory, and settings
- Use this option only if you want to completely remove Mobile Roma

## Manual Data Cleanup

If you need to manually clean application data, you have two options:

### Method 1: PowerShell Script (Recommended)
Run the included cleanup script:
```powershell
powershell -ExecutionPolicy Bypass -File cleanup-appdata.ps1
```

### Method 2: Manual Deletion
1. Open File Explorer
2. Navigate to: `%APPDATA%\mobile-roma`
3. Delete the entire folder

**⚠️ WARNING**: Manual deletion permanently removes all your business data!

## Data Backup Recommendations

Before uninstalling or cleaning data:
1. **Export your data** using the built-in backup feature
2. **Copy the database** from `%APPDATA%\mobile-roma\shop.sqlite`
3. **Document your settings** for easy restoration

## Troubleshooting

### Issue: "Database not found" after reinstall
**Solution**: Your data might be in a different AppData location. Check these folders:
- `%APPDATA%\mobile-roma`
- `%APPDATA%\Mobile Roma`
- `%APPDATA%\com.mobilerema.phoneShop`

### Issue: Permission errors during uninstall
**Solution**: 
1. Close Mobile Roma completely
2. Run uninstaller as Administrator
3. Ensure no background processes are running

### Issue: Incomplete data removal
**Solution**: Use the PowerShell cleanup script provided

## Best Practices

1. **Regular Backups**: Use the cloud backup feature regularly
2. **Update Carefully**: Choose "Keep Data" when updating
3. **Clean Uninstall**: Only use complete removal when switching to different management software
4. **Test Restores**: Periodically test your backup restoration process

## Support

For installation issues or data recovery assistance, refer to the main application documentation or contact support through the application's help menu.
