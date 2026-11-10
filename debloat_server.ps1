# ==============================================================================
# SCRIPT DE OPTIMIZACION Y LIMPIEZA TOTAL - DEPSYS SERVER 24/7
# Motos Mendes S.A. - Windows 10 Pro 22H2
# ==============================================================================

Write-Host ">>> Iniciando limpieza profunda de Windows 10 Server..." -ForegroundColor Cyan

# 1. Habilitar Acceso Remoto Administrativo Total (LAN)
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' -Name 'LocalAccountTokenFilterPolicy' -Value 1 -Type DWord -Force

# 2. Desinstalar Aplicaciones Basura (Bloatware) de Microsoft
$bloatware = @(
    "*Xbox*",
    "*Zune*",
    "*BingNews*",
    "*BingWeather*",
    "*BingFinance*",
    "*BingSports*",
    "*GetHelp*",
    "*Getstarted*",
    "*SolitaireCollection*",
    "*SkypeApp*",
    "*YourPhone*",
    "*WindowsFeedbackHub*",
    "*People*",
    "*OneNote*",
    "*3DViewer*",
    "*MixedReality*",
    "*Cortana*"
)

foreach ($app in $bloatware) {
    Get-AppxPackage -AllUsers -Name $app -ErrorAction SilentlyContinue | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue
    Get-AppxProvisionedPackage -Online | Where-Object { $_.PackageName -like $app } | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue
}

# 3. Desactivar Telemetria y Rastreo de Fondo
$servicesToDisable = @(
    "DiagTrack",         # Connected User Experiences and Telemetry
    "dmwappushservice",  # WAP Push Service
    "SysMain"            # Superfetch (libera 300-500MB RAM y uso de disco)
)

foreach ($svc in $servicesToDisable) {
    Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue
    Set-Service -Name $svc -StartupType Disabled -ErrorAction SilentlyContinue
}

# 4. Desactivar Cortana y Busqueda en Bing de la Barra de Tareas
if (-not (Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search')) {
    New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search' -Force | Out-Null
}
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search' -Name 'AllowCortana' -Value 0 -Type DWord -Force
Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Search' -Name 'BingSearchEnabled' -Value 0 -Type DWord -Force

# 5. Activar Plan de Alto Rendimiento 24/7 (Cero suspension, maximo rendimiento CPU)
powercfg -setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c
powercfg -change -standby-timeout-ac 0
powercfg -change -monitor-timeout-ac 30
powercfg -change -disk-timeout-ac 0

# 6. Desactivar Reinicios Forzados de Windows Update durante Horario Laboral
if (-not (Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU')) {
    New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -Force | Out-Null
}
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -Name 'NoAutoRebootWithLoggedOnUsers' -Value 1 -Type DWord -Force
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -Name 'AUOptions' -Value 2 -Type DWord -Force # Notificar antes de descargar

Write-Host ">>> OPTIMIZACION COMPLETADA: Windows 10 Pro preparado como Servidor DepSyS." -ForegroundColor Green

