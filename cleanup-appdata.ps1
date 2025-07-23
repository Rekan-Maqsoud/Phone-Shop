# Mobile Roma AppData Cleanup Script
# This script removes all Mobile Roma application data from the user's AppData directory
# Run this script if you want to completely reset the application or clean up after uninstall

Write-Host "Mobile Roma AppData Cleanup Tool" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Define the AppData path
$appDataPath = $env:APPDATA
$mobileRomaPath = Join-Path $appDataPath "mobile-roma"
$alternativePath1 = Join-Path $appDataPath "Mobile Roma"
$alternativePath2 = Join-Path $appDataPath "com.mobilerema.phoneShop"

Write-Host "Checking for Mobile Roma data directories..." -ForegroundColor Yellow

$pathsToCheck = @($mobileRomaPath, $alternativePath1, $alternativePath2)
$foundPaths = @()

foreach ($path in $pathsToCheck) {
    if (Test-Path $path) {
        $foundPaths += $path
        Write-Host "Found: $path" -ForegroundColor Red
    }
}

if ($foundPaths.Count -eq 0) {
    Write-Host "No Mobile Roma data directories found." -ForegroundColor Green
    Write-Host "AppData is already clean!" -ForegroundColor Green
    pause
    exit
}

Write-Host ""
Write-Host "WARNING: This will permanently delete all Mobile Roma data including:" -ForegroundColor Red
Write-Host "- Database (all sales, inventory, customer data)" -ForegroundColor Red
Write-Host "- Application settings and preferences" -ForegroundColor Red
Write-Host "- Backup configurations" -ForegroundColor Red
Write-Host "- All cached data" -ForegroundColor Red
Write-Host ""

$confirmation = Read-Host "Are you sure you want to delete all Mobile Roma data? Type 'YES' to confirm"

if ($confirmation -eq "YES") {
    Write-Host ""
    Write-Host "Removing Mobile Roma application data..." -ForegroundColor Yellow
    
    foreach ($path in $foundPaths) {
        try {
            Remove-Item $path -Recurse -Force -ErrorAction Stop
            Write-Host "Successfully removed: $path" -ForegroundColor Green
        }
        catch {
            Write-Host "Failed to remove: $path" -ForegroundColor Red
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Cleanup completed!" -ForegroundColor Green
    Write-Host "All Mobile Roma data has been removed from AppData." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Operation cancelled. No data was deleted." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
pause
