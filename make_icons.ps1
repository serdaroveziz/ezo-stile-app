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

    # 1. Fill entire canvas with solid Gold background first (#f59e0b) to cover all 4 corners completely
    $goldColor = [System.Drawing.ColorTranslator]::FromHtml("#f59e0b")
    $goldBrush = New-Object System.Drawing.SolidBrush($goldColor)
    $g.FillRectangle($goldBrush, 0, 0, $Size, $Size)

    # 2. Draw inner dark background rectangle leaving a solid Gold Frame (border thickness: 3.5% of icon size)
    $borderThick = [int]($Size * 0.035)
    $innerSize = $Size - ($borderThick * 2)

    $bgColor = [System.Drawing.ColorTranslator]::FromHtml("#070c1a")
    $bgBrush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($bgBrush, $borderThick, $borderThick, $innerSize, $innerSize)

    # 3. Load logo.png and scale it up BIGGER inside the dark inner area
    $srcImg = [System.Drawing.Image]::FromFile($SourcePath)

    $innerPadding = [int]($Size * 0.02)
    $maxW = $innerSize - ($innerPadding * 2)
    $maxH = $innerSize - ($innerPadding * 2)

    $ratioW = $maxW / $srcImg.Width
    $ratioH = $maxH / $srcImg.Height
    $ratio = [math]::Min($ratioW, $ratioH)

    $destW = [int]($srcImg.Width * $ratio)
    $destH = [int]($srcImg.Height * $ratio)

    $destX = [int]($borderThick + ($innerSize - $destW) / 2)
    $destY = [int]($borderThick + ($innerSize - $destH) / 2)

    $g.DrawImage($srcImg, $destX, $destY, $destW, $destH)

    $srcImg.Dispose()
    $goldBrush.Dispose()
    $bgBrush.Dispose()
    $g.Dispose()

    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated premium gold border icon $OutputPath ($Size x $Size)"
}

$logoPath = "C:\Users\kuvvat\.gemini\antigravity\scratch\ezo-stile-app\logo.png"

Create-PwaIcon -SourcePath $logoPath -OutputPath "C:\Users\kuvvat\.gemini\antigravity\scratch\ezo-stile-app\icon-512.png" -Size 512
Create-PwaIcon -SourcePath $logoPath -OutputPath "C:\Users\kuvvat\.gemini\antigravity\scratch\ezo-stile-app\icon-192.png" -Size 192

Copy-Item "icon-512.png" "docs/icon-512.png" -Force
Copy-Item "icon-192.png" "docs/icon-192.png" -Force
Copy-Item "icon-512.png" "apple-touch-icon.png" -Force
Copy-Item "icon-512.png" "docs/apple-touch-icon.png" -Force
Copy-Item "icon-512.png" "icon.png" -Force
Copy-Item "icon-512.png" "docs/icon.png" -Force
