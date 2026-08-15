Add-Type -AssemblyName System.Drawing

function Create-CleanPwaIcon {
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

    # 1. Fill entire canvas background with dark theme (#070c1a)
    $bgColor = [System.Drawing.ColorTranslator]::FromHtml("#070c1a")
    $bgBrush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)

    # 2. Draw user logo image edge-to-edge cleanly with ZERO added borders or strokes
    $srcImg = [System.Drawing.Image]::FromFile($SourcePath)

    $ratioW = $Size / $srcImg.Width
    $ratioH = $Size / $srcImg.Height
    $ratio = [math]::Min($ratioW, $ratioH)

    $destW = [int]($srcImg.Width * $ratio)
    $destH = [int]($srcImg.Height * $ratio)

    $destX = [int](($Size - $destW) / 2.0)
    $destY = [int](($Size - $destH) / 2.0)

    $g.DrawImage($srcImg, $destX, $destY, $destW, $destH)

    $srcImg.Dispose()
    $bgBrush.Dispose()
    $g.Dispose()

    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated clean borderless icon $OutputPath ($Size x $Size)"
}

$iconBasePath = "C:\Users\kuvvat\.gemini\antigravity\scratch\ezo-stile-app\icon-base.jpg"

Create-CleanPwaIcon -SourcePath $iconBasePath -OutputPath "C:\Users\kuvvat\.gemini\antigravity\scratch\ezo-stile-app\icon-512.png" -Size 512
Create-CleanPwaIcon -SourcePath $iconBasePath -OutputPath "C:\Users\kuvvat\.gemini\antigravity\scratch\ezo-stile-app\icon-192.png" -Size 192

Copy-Item "icon-512.png" "docs/icon-512.png" -Force
Copy-Item "icon-192.png" "docs/icon-192.png" -Force
Copy-Item "icon-512.png" "apple-touch-icon.png" -Force
Copy-Item "icon-512.png" "docs/apple-touch-icon.png" -Force
Copy-Item "icon-512.png" "icon.png" -Force
Copy-Item "icon-512.png" "docs/icon.png" -Force
