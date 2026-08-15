$sampleRate = 22050
$duration = 0.6
$numSamples = [int]($sampleRate * $duration)
$bytesPerSample = 2
$dataSize = $numSamples * $bytesPerSample

$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)

# WAV Header
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("RIFF"))
$bw.Write([int32](36 + $dataSize))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("WAVE"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("fmt "))
$bw.Write([int32]16)
$bw.Write([int16]1)
$bw.Write([int16]1)
$bw.Write([int32]$sampleRate)
$bw.Write([int32]($sampleRate * $bytesPerSample))
$bw.Write([int16]$bytesPerSample)
$bw.Write([int16]16)
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("data"))
$bw.Write([int32]$dataSize)

# Generate 3-note melodic chime: C5 (523Hz), E5 (659Hz), G5 (784Hz)
for ($i = 0; $i -lt $numSamples; $i++) {
    $t = $i / $sampleRate

    $freq = 523.25
    if ($t -gt 0.12 -and $t -le 0.24) { $freq = 659.25 }
    elseif ($t -gt 0.24) { $freq = 783.99 }

    $envelope = 1.0
    if ($t -gt 0.4) {
        $envelope = [math]::Max(0.0, 1.0 - (($t - 0.4) / 0.2))
    }

    $val = [math]::Sin(2.0 * [math]::PI * $freq * $t) * 0.5 * $envelope
    $s16 = [int16]($val * 32767)
    $bw.Write($s16)
}

$bw.Flush()
$bytes = $ms.ToArray()
$base64 = [Convert]::ToBase64String($bytes)
$dataUri = "data:audio/wav;base64," + $base64

Set-Content -Path "audio_base64.txt" -Value $dataUri
Write-Host "Base64 WAV size: $($base64.Length) chars"
