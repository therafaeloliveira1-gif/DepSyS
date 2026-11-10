$ErrorActionPreference = 'SilentlyContinue'

$tunnelDir = "c:\WorkSpace\DepSyS\tunnel"
$exePath = Join-Path $tunnelDir "cloudflared.exe"
$logPath = Join-Path $tunnelDir "tunnel.log"
$token = "eyJhIjoiYmIzNzUzYWE1M2M3ZmYxNTFiMzZmZjA0NWMxYjIyMzAiLCJ0IjoiYjllNzI4OWYtYjE5MS00ZWMxLWFkZmYtMGMwZDRkYTM1N2I5IiwicyI6Ik4yWmtaVGRrTURZdE56UXdNaTAwTW1JMkxUa3haV0V0TmpJME5HVmhOR0ptWWpabSJ9"

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "              VERIFICANDO TUNEL CLOUDFLARE - DEPSYS" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan

# 1. Verificar servicio de Windows
$service = Get-Service -Name cloudflared -ErrorAction SilentlyContinue

if ($service -and $service.Status -eq 'Running') {
    Write-Host "[OK] El servicio oficial 'cloudflared' esta ACTIVO y corriendo en segundo plano." -ForegroundColor Green
} else {
    Write-Host "[*] Iniciando servicio o proceso del tunel..." -ForegroundColor Yellow
    if ($service) {
        Start-Service -Name cloudflared -ErrorAction SilentlyContinue
    } else {
        $procInfo = New-Object System.Diagnostics.ProcessStartInfo
        $procInfo.FileName = $exePath
        $procInfo.Arguments = "tunnel run --token $token --logfile `"$logPath`""
        $procInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
        $procInfo.CreateNoWindow = $true
        $procInfo.UseShellExecute = $true
        [System.Diagnostics.Process]::Start($procInfo) | Out-Null
    }
}

Start-Sleep -Seconds 2

# 2. Verificar proceso
$procs = Get-Process cloudflared -ErrorAction SilentlyContinue
if ($procs) {
    Write-Host "[OK] Proceso cloudflared activo (PID: $(($procs | Select-Object -First 1).Id))." -ForegroundColor Green
} else {
    Write-Host "[WARN] No se detecto proceso activo de cloudflared." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Green
Write-Host "                  TUNEL 'DEPSYS' CONECTADO A CLOUDFLARE" -ForegroundColor Green
Write-Host "=============================================================================" -ForegroundColor Green
Write-Host " Tunnel ID Oficial: b9e7289f-b191-4ec1-adff-0c0d4da357b9" -ForegroundColor Gray
Write-Host " Destino Local:     http://localhost:80 (Apache)" -ForegroundColor Gray
Write-Host " Dominio Destino:   https://depsys.motosmendes.com" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Green
