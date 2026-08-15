Add-Type -AssemblyName System.Drawing

function Create-PwaIcon {
    param(
        [string]$SourcePath,
        [string]$OutputPath,
        [int]$Size
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Dark background #070c1a
    $bgColor = [System.Drawing.ColorTranslator]::FromHtml("#070c1a")
    $bgBrush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)

    # Subtle gold border #f59e0b
    $goldColor = [System.Drawing.ColorTranslator]::FromHtml("#f59e0b")
    $goldPen = New-Object System.Drawing.Pen($goldColor, [math]::Max(4, [int]($Size * 0.02)))
    $g.DrawRectangle($goldPen, 4, 4, $Size - 8, $Size - 8)

    # Load logo.png
    $srcImg = [System.Drawing.Image]::FromFile($SourcePath)

    # Compute scaling preserving aspect ratio
    $padding = [int]($Size * 0.04)
    $maxW = $Size - ($padding * 2)
    $maxH = $Size - ($padding * 2)

    $ratioW = $maxW / $srcImg.Width
    $ratioH = $maxH / $srcImg.Height
    $ratio = [math]::Min($ratioW, $ratioH)

    $destW = [int]($srcImg.Width * $ratio)
    $destH = [int]($srcImg.Height * $ratio)

    $destX = [int](($Size - $destW) / 2)
    $destY = [int](($Size - $destH) / 2)

    $g.DrawImage($srcImg, $destX, $destY, $destW, $destH)

    $srcImg.Dispose()
    $g.Dispose()

    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Successfully generated $OutputPath ($Size x $Size)"
}

$logoPath = "C:\Users\kuvvat\.gemini\antigravity\scratch\ezo-stile-app\logo.png"

Create-PwaIcon -SourcePath $logoPath -OutputPath "C:\Users\kuvvat\.gemini\antigravity\scratch\ezo-stile-app\icon-512.png" -Size 512
Create-PwaIcon -SourcePath $logoPath -OutputPath "C:\Users\kuvvat\.gemini\antigravity\scratch\ezo-stile-app\icon-192.png" -Size 192

Copy-Item "icon-512.png" "docs/icon-512.png" -Force
Copy-Item "icon-192.png" "docs/icon-192.png" -Force
Copy-Item "icon-512.png" "icon.png" -Force
Copy-Item "icon-512.png" "docs/icon.png" -Force
