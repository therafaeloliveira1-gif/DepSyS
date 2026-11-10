@echo off
chcp 65001 >nul
title Motos Mendes - Detener DepSyS
cls

echo =============================================================================
echo        MOTOS MENDES S.A. - DETENIENDO SERVICIOS DE DEPSYS
echo =============================================================================
echo.

echo [*] Cerrando ventanas de DepSyS y Servidor Apache...
taskkill /F /FI "WINDOWTITLE eq DepSyS-*" /T >nul 2>&1
taskkill /F /IM httpd.exe >nul 2>&1
taskkill /F /IM cloudflared.exe >nul 2>&1

echo [*] Liberando puertos del deposito (80, 3001, 3003, 3008, 3015)...
powershell -NoProfile -Command "80, 3001, 3003, 3008, 3015 | ForEach-Object { Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }" >nul 2>&1

echo.
echo =============================================================================
echo                  TODOS LOS SERVICIOS HAN SIDO DETENIDOS
echo =============================================================================
echo.
timeout /t 2 >nul
