# PowerShell script to convert PNG to ICO
param(
    [string]$InputPath = "public\app-icon-new.png",
    [string]$OutputPath = "public\app-icon.ico"
)

Add-Type -AssemblyName System.Drawing

try {
    # Load the PNG image
    $image = [System.Drawing.Image]::FromFile((Resolve-Path $InputPath))
    
    # Create a new bitmap with 256x256 size
    $bitmap = New-Object System.Drawing.Bitmap(256, 256)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Set high quality rendering
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Draw the resized image
    $graphics.DrawImage($image, 0, 0, 256, 256)
    
    # Save as ICO (using PNG format but with ICO extension)
    $bitmap.Save((Resolve-Path -Path . | Join-Path -ChildPath $OutputPath), [System.Drawing.Imaging.ImageFormat]::Png)
    
    Write-Host "✅ Successfully converted $InputPath to $OutputPath" -ForegroundColor Green
    
    # Cleanup
    $graphics.Dispose()
    $bitmap.Dispose()
    $image.Dispose()
    
} catch {
    Write-Host "❌ Error converting image: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Using the existing favicon.ico instead..." -ForegroundColor Yellow
    
    # Fallback: copy the existing favicon.ico
    Copy-Item "public\favicon.ico" $OutputPath -Force
    Write-Host "✅ Copied favicon.ico to $OutputPath" -ForegroundColor Green
}
