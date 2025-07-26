# PNG to ICO Converter Script
# This will create a proper ICO file from your PNG

Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName System.Drawing

function Convert-PngToIco {
    param(
        [string]$PngPath,
        [string]$IcoPath
    )
    
    try {
        # Create a temporary bitmap
        $png = [System.Drawing.Image]::FromFile($PngPath)
        
        # Create icon sizes: 16x16, 32x32, 48x48, 256x256
        $sizes = @(16, 32, 48, 256)
        
        # Create a memory stream for the ICO file
        $icoStream = New-Object System.IO.MemoryStream
        
        # Write ICO header
        $writer = New-Object System.IO.BinaryWriter($icoStream)
        $writer.Write([uint16]0)       # Reserved (must be 0)
        $writer.Write([uint16]1)       # Type (1 for ICO)
        $writer.Write([uint16]$sizes.Count)  # Number of images
        
        $imageOffset = 6 + ($sizes.Count * 16)  # Header + directory entries
        $imageStreams = @()
        
        # Create directory entries and image data
        foreach ($size in $sizes) {
            # Create resized bitmap
            $bitmap = New-Object System.Drawing.Bitmap($size, $size)
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.DrawImage($png, 0, 0, $size, $size)
            
            # Convert to PNG bytes
            $pngStream = New-Object System.IO.MemoryStream
            $bitmap.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
            $pngBytes = $pngStream.ToArray()
            $imageStreams += $pngBytes
            
            # Write directory entry
            $writer.Write([byte]($size -eq 256 ? 0 : $size))  # Width (0 means 256)
            $writer.Write([byte]($size -eq 256 ? 0 : $size))  # Height (0 means 256)
            $writer.Write([byte]0)         # Color count (0 for 24/32-bit)
            $writer.Write([byte]0)         # Reserved
            $writer.Write([uint16]1)       # Color planes
            $writer.Write([uint16]32)      # Bits per pixel
            $writer.Write([uint32]$pngBytes.Length)  # Image size
            $writer.Write([uint32]$imageOffset)      # Image offset
            
            $imageOffset += $pngBytes.Length
            
            $graphics.Dispose()
            $bitmap.Dispose()
            $pngStream.Dispose()
        }
        
        # Write image data
        foreach ($imageData in $imageStreams) {
            $writer.Write($imageData)
        }
        
        # Save to file
        $icoBytes = $icoStream.ToArray()
        [System.IO.File]::WriteAllBytes($IcoPath, $icoBytes)
        
        $writer.Dispose()
        $icoStream.Dispose()
        $png.Dispose()
        
        Write-Host "✅ Successfully created ICO file: $IcoPath" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Error creating ICO: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Convert the PNG to ICO
$pngPath = Resolve-Path "public\app-icon-new.png"
$icoPath = Join-Path (Get-Location) "public\app-icon.ico"

Convert-PngToIco -PngPath $pngPath -IcoPath $icoPath
