@echo off
chcp 65001 > nul
title DepSyS Industrial - Terminal Nativa Desktop
color 0C

echo ===============================================================
echo   INICIANDO DEPSYS INDUSTRIAL DESKTOP (TAURI / WEBVIEW2)
echo   Motos Mendes S.A.
echo ===============================================================
echo.

set "EXE_PATH=c:\WorkSpace\DepSyS\app-supervisor\src-tauri\target\release\depsys-desktop.exe"

if not exist "%EXE_PATH%" (
    echo [ERROR] No se encontro el ejecutable compilado.
    echo Ejecuta primero COMPILAR-DESKTOP.bat
    pause
    exit /b 1
)

start "" "%EXE_PATH%"
exit
