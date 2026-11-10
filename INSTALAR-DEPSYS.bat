@echo off
chcp 65001 > nul
title Instalador DepSyS Industrial - Motos Mendes S.A.
color 0A

echo ===============================================================
echo   INSTALADOR DEPSYS INDUSTRIAL (WINDOWS DESKTOP)
echo   Motos Mendes S.A.
echo ===============================================================
echo.

set "SETUP_EXE=c:\WorkSpace\DepSyS\app-supervisor\src-tauri\target\release\bundle\nsis\DepSyS Industrial_1.0.0_x64-setup.exe"
set "MSI_EXE=c:\WorkSpace\DepSyS\app-supervisor\src-tauri\target\release\bundle\msi\DepSyS Industrial_1.0.0_x64_es-ES.msi"

if exist "%SETUP_EXE%" (
    echo Iniciando instalador oficial de DepSyS Industrial (1.93 MB)...
    start "" "%SETUP_EXE%"
    exit /b 0
)

if exist "%MSI_EXE%" (
    echo Iniciando instalador MSI de DepSyS Industrial...
    msiexec /i "%MSI_EXE%"
    exit /b 0
)

echo [ERROR] No se encontraron los instaladores compilados.
echo Ejecuta primero COMPILAR-DESKTOP.bat
pause
exit /b 1
