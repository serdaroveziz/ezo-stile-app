@echo off
title EZO STILE Randevu Uygulamasi
color 0A
echo ========================================================
echo   EZO STİLE VIP Berber ^& Kuafor Randevu Uygulamasi
echo ========================================================
echo.
cd /d "%~dp0"

echo Uygulama tarayicinizda aninda aciliyor...
start "" "%~dp0index.html"

echo.
echo ========================================================
echo   EZO STİLE Basariyla Acildi!
echo ========================================================
timeout /t 2
