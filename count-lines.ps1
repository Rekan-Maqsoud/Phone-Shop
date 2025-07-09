# PowerShell script to count lines of code in the project
# Excludes node_modules, .git, dist, build directories and common generated files

Write-Host "=== Phone Shop Project - Lines of Code Count ===" -ForegroundColor Green
Write-Host "Date: $(Get-Date)" -ForegroundColor Gray
Write-Host ""

function Count-Lines {
    param($Pattern, $Description)
    
    $files = Get-ChildItem -Recurse -Include $Pattern | 
             Where-Object { $_.FullName -notmatch "node_modules|\.git|dist|build|\.next" -and
                           $_.Name -notmatch "package-lock\.json|yarn\.lock|pnpm-lock\.yaml|\.min\." }
    
    if ($files.Count -gt 0) {
        $totalLines = ($files | Get-Content | Measure-Object -Line).Lines
        Write-Host "$Description $totalLines lines" -ForegroundColor Cyan
        return $totalLines
    } else {
        Write-Host "$Description 0 lines" -ForegroundColor Yellow
        return 0
    }
}

# Count different file types
$jsLines = Count-Lines @("*.js", "*.jsx", "*.ts", "*.tsx", "*.cjs", "*.mjs") "📱 JavaScript/TypeScript Files:"
$cssLines = Count-Lines @("*.css", "*.scss", "*.sass", "*.less") "🎨 CSS/Style Files:"
$htmlLines = Count-Lines @("*.html", "*.htm", "*.vue") "📄 HTML/Template Files:"
$configLines = Count-Lines @("*.json", "*.yml", "*.yaml", "*.toml", "*.xml") "📋 Configuration Files:"
$docLines = Count-Lines @("*.md", "*.txt", "*.rst") "📝 Documentation Files:"

Write-Host ""
Write-Host "📊 TOTAL PROJECT LINES: $($jsLines + $cssLines + $htmlLines + $configLines + $docLines)" -ForegroundColor Green -BackgroundColor Black

Write-Host ""
Write-Host "💾 Most significant JavaScript/TypeScript files by line count:" -ForegroundColor Magenta

$largeFiles = Get-ChildItem -Recurse -Include "*.js", "*.jsx", "*.ts", "*.tsx", "*.cjs", "*.mjs" | 
              Where-Object { $_.FullName -notmatch "node_modules|\.git|dist|build" } |
              ForEach-Object { 
                  $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines
                  [PSCustomObject]@{
                      File = $_.FullName.Replace($PWD.Path + "\", "")
                      Lines = $lines
                  }
              } |
              Sort-Object Lines -Descending |
              Select-Object -First 10

$largeFiles | ForEach-Object {
    Write-Host "  $($_.Lines) lines - $($_.File)" -ForegroundColor White
}

Write-Host ""
Write-Host "🗂️  Directory breakdown:" -ForegroundColor Yellow

# Source files
if (Test-Path "src") {
    $srcFiles = Get-ChildItem -Path "src" -Recurse -Include "*.js", "*.jsx", "*.ts", "*.tsx", "*.css"
    if ($srcFiles.Count -gt 0) {
        $srcLines = ($srcFiles | Get-Content | Measure-Object -Line).Lines
        Write-Host "Source files (src/): $srcLines lines" -ForegroundColor Cyan
    }
}

# Database files
if (Test-Path "database") {
    $dbFiles = Get-ChildItem -Path "database" -Recurse -Include "*.js", "*.cjs", "*.sql"
    if ($dbFiles.Count -gt 0) {
        $dbLines = ($dbFiles | Get-Content | Measure-Object -Line).Lines
        Write-Host "Database files (database/): $dbLines lines" -ForegroundColor Cyan
    }
}

# Config files in root
$configFiles = Get-ChildItem -Path "." -File -Include "*.json", "*.js", "*.cjs", "*.config.*" | 
               Where-Object { $_.Name -notmatch "package-lock\.json" }
if ($configFiles.Count -gt 0) {
    $configRootLines = ($configFiles | Get-Content | Measure-Object -Line).Lines
    Write-Host "Configuration files (root): $configRootLines lines" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "✅ Count completed! Use this script anytime with: .\count-lines.ps1" -ForegroundColor Green

# Create a note file for easy reference
$noteContent = @"
# Phone Shop Project - Line Count Command

To count lines of code in this project, use one of these commands:

## PowerShell (Windows):
``````powershell
.\count-lines.ps1
``````

## Bash (Linux/Mac/WSL):
``````bash
./count-lines.sh
``````

## Manual count (PowerShell one-liner):
``````powershell
(Get-ChildItem -Recurse -Include "*.js","*.jsx","*.ts","*.tsx","*.cjs","*.css","*.html","*.md" | Where-Object { `$_.FullName -notmatch "node_modules|\.git|dist|build" } | Get-Content | Measure-Object -Line).Lines
``````

## What's excluded:
- node_modules/
- .git/
- dist/
- build/
- .next/
- package-lock.json, yarn.lock, pnpm-lock.yaml
- *.min.js, *.min.css files

Last updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

$noteContent | Out-File -FilePath "LINE_COUNT_COMMANDS.md" -Encoding UTF8
Write-Host "Saved quick reference to LINE_COUNT_COMMANDS.md" -ForegroundColor Green
