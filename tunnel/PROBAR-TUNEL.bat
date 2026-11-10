@echo off
title Diagnostico Tunel Cloudflare - DepSyS
cls
echo =============================================================================
echo        DIAGNOSTICO DE CONECTIVIDAD DEL TUNEL - MOTOS MENDES DEPSYS
echo =============================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Write-Host '[1/4] Probando Apache Local en puerto 80...' -ForegroundColor Cyan; " ^
    "$ap = Test-NetConnection -ComputerName localhost -Port 80 -WarningAction SilentlyContinue; " ^
    "if ($ap.TcpTestSucceeded) { Write-Host '  -> Apache LOCAL OPERATIVO (Puerto 80 Abierto)' -ForegroundColor Green } else { Write-Host '  -> [ALERTA] Apache local NO responde en el puerto 80' -ForegroundColor Red }; " ^
    "Write-Host ''; " ^
    "Write-Host '[2/4] Verificando Servicio del Tunel Cloudflare...' -ForegroundColor Cyan; " ^
    "$srv = Get-Service -Name cloudflared -ErrorAction SilentlyContinue; " ^
    "if ($srv -and $srv.Status -eq 'Running') { Write-Host '  -> Tunel Cloudflared: ACTIVO Y CORRIENDO' -ForegroundColor Green } else { Write-Host '  -> [ALERTA] Servicio Cloudflare NO esta corriendo' -ForegroundColor Yellow }; " ^
    "Write-Host ''; " ^
    "Write-Host '[3/4] Comprobando DNS de depsys.motosmendes.com...' -ForegroundColor Cyan; " ^
    "$dns = Resolve-DnsName depsys.motosmendes.com -ErrorAction SilentlyContinue; " ^
    "if ($dns) { Write-Host ('  -> DNS Responde: ' + ($dns | Select-Object -ExpandProperty NameHost -ErrorAction SilentlyContinue)) -ForegroundColor Green } else { Write-Host '  -> [ALERTA] No resuelve DNS para depsys.motosmendes.com' -ForegroundColor Yellow }; " ^
    "Write-Host ''; " ^
    "Write-Host '[4/4] Probando acceso a la API local...' -ForegroundColor Cyan; " ^
    "try { $res = Invoke-RestMethod -Uri 'http://localhost/api/DepSyS_Api/status.php' -TimeoutSec 3; Write-Host ('  -> API Local Status: ' + $res.status) -ForegroundColor Green } catch { Write-Host '  -> [INFO] Apache responde en http://localhost/' -ForegroundColor Gray }; "

echo.
echo =============================================================================
pause
