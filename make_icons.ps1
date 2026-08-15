Add-Type -AssemblyName System.Drawing

function Add-RoundedRectangle {
    param(
        [System.Drawing.Drawing2D.GraphicsPath]$Path,
        [float]$X,
        [float]$Y,
        [float]$Width,
        [float]$Height,
        [float]$Radius
    )
    $d = $Radius * 2.0
    $Path.AddArc($X, $Y, $d, $d, 180, 90)
    $Path.AddArc($X + $Width - $d, $Y, $d, $d, 270, 90)
    $Path.AddArc($X + $Width - $d, $Y + $Height - $d, $d, $d, 0, 90)
    $Path.AddArc($X, $Y + $Height - $d, $d, $d, 90, 90)
    $Path.CloseFigure()
}

function Create-InstagramStyleIcon {
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

    # 2. Draw smooth Instagram-style rounded gold border frame
    $margin = [float]($Size * 0.04)   # 20px on 512px
    $cornerR = [float]($Size * 0.16)  # ~82px radius on 512px matching iOS/Android rounded corners
    $penWidth = [float]($Size * 0.035) # 18px stroke width

    $goldColor = [System.Drawing.ColorTranslator]::FromHtml("#f59e0b")
    $goldPen = New-Object System.Drawing.Pen($goldColor, $penWidth)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $w = $Size - ($margin * 2.0)
    $h = $Size - ($margin * 2.0)
    Add-RoundedRectangle -Path $path -X $margin -Y $margin -Width $w -Height $h -Radius $cornerR

    $g.DrawPath($goldPen, $path)

    # 3. Load logo.png and scale it up cleanly inside
    $srcImg = [System.Drawing.Image]::FromFile($SourcePath)

    $innerMargin = $margin + $penWidth + ([float]($Size * 0.02))
    $maxW = $Size - ($innerMargin * 2.0)
    $maxH = $Size - ($innerMargin * 2.0)

    $ratioW = $maxW / $srcImg.Width
    $ratioH = $maxH / $srcImg.Height
    $ratio = [math]::Min($ratioW, $ratioH)

    $destW = [int]($srcImg.Width * $ratio)
    $destH = [int]($srcImg.Height * $ratio)

    $destX = [int](($Size - $destW) / 2.0)
    $destY = [int](($Size - $destH) / 2.0)

    $g.DrawImage($srcImg, $destX, $destY, $destW, $destH)

    $srcImg.Dispose()
    $goldPen.Dispose()
    $bgBrush.Dispose()
    $path.Dispose()
    $g.Dispose()

    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated Instagram-style rounded gold icon $OutputPath ($Size x $Size)"
}

$logoPath = "C:\Users\kuvvat\.gemini\antigravity\scratch\ezo-stile-app\logo.png"

Create-InstagramStyleIcon -SourcePath $logoPath -OutputPath "C:\Users\kuvvat\.gemini\antigravity\scratch\ezo-stile-app\icon-512.png" -Size 512
Create-InstagramStyleIcon -SourcePath $logoPath -OutputPath "C:\Users\kuvvat\.gemini\antigravity\scratch\ezo-stile-app\icon-192.png" -Size 192

Copy-Item "icon-512.png" "docs/icon-512.png" -Force
Copy-Item "icon-192.png" "docs/icon-192.png" -Force
Copy-Item "icon-512.png" "apple-touch-icon.png" -Force
Copy-Item "icon-512.png" "docs/apple-touch-icon.png" -Force
Copy-Item "icon-512.png" "icon.png" -Force
Copy-Item "icon-512.png" "docs/icon.png" -Force
