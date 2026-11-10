@echo off
title Detener Apache - DepSyS
cls

echo =============================================================================
echo        MOTOS MENDES S.A. - DETENIENDO SERVIDOR APACHE
echo =============================================================================
echo.

taskkill /F /IM httpd.exe >nul 2>&1
powershell -Command "Get-NetTCPConnection -LocalPort 80 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [*] Servidor Apache detenido y puerto 80 liberado.
ping 127.0.0.1 -n 2 >nul
