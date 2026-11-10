@echo off
title Cloudflare Tunnel - DepSyS Motos Mendes
cls

echo =============================================================================
echo        MOTOS MENDES S.A. - ACTIVANDO ACCESO PUBLICO POR INTERNET (CLOUDFLARE)
echo =============================================================================
echo.

:: 1. Verificar y arrancar Apache si no esta corriendo
powershell -Command "$c = Get-NetTCPConnection -LocalPort 80 -ErrorAction SilentlyContinue; if (-not $c) { Write-Host '[*] Iniciando Servidor Apache en puerto 80...' -ForegroundColor Yellow; Start-Process -FilePath 'C:\Apache24\bin\httpd.exe' -WorkingDirectory 'C:\Apache24' -WindowStyle Hidden; Start-Sleep -Seconds 2 }"

:: 2. Arrancar el Tunel Cloudflare
powershell -ExecutionPolicy Bypass -File "c:\WorkSpace\DepSyS\tunnel\start_tunnel.ps1"

echo.
echo Presione cualquier tecla para cerrar esta ventana informativa (el tunel sigue activo).
pause >nul
