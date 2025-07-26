# Simple solution: Create a basic ICO file using built-in .NET methods

Add-Type -AssemblyName System.Drawing

try {
    # Load the PNG image
    $png = [System.Drawing.Image]::FromFile("$pwd\public\app-icon-new.png")
    
    # Create a 256x256 bitmap from the PNG
    $bitmap = New-Object System.Drawing.Bitmap(256, 256)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.DrawImage($png, 0, 0, 256, 256)
    
    # Create an icon from the bitmap
    $hicon = $bitmap.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hicon)
    
    # Save as ICO file
    $fileStream = [System.IO.File]::Create("$pwd\public\app-icon.ico")
    $icon.Save($fileStream)
    $fileStream.Close()
    
    Write-Host "✅ Successfully created app-icon.ico" -ForegroundColor Green
    
    # Cleanup
    $graphics.Dispose()
    $bitmap.Dispose()
    $png.Dispose()
    $icon.Dispose()
}
catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
