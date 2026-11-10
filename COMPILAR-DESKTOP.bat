@echo off
chcp 65001 > nul
title DepSyS Desktop - Compilador de Instalador Windows
color 0C

echo ===============================================================
echo   DEPSYS INDUSTRIAL - COMPILADOR DESKTOP (TAURI / WEBVIEW2)
echo   Motos Mendes S.A.
echo ===============================================================
echo.

cd /d "c:\WorkSpace\DepSyS\app-supervisor"

echo [1/3] Compilando Frontend React de produccion...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la compilacion del frontend.
    pause
    exit /b %errorlevel%
)
echo.

echo [2/3] Compilando Binario Nativo Windows (.exe) con Tauri y Rust...
set "Path=%PATH%;%USERPROFILE%\.cargo\bin"
call npx tauri build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la compilacion nativa de Tauri.
    pause
    exit /b %errorlevel%
)
echo.

echo ===============================================================
echo   [OK] COMPILACION EXITOSA
echo   El instalador se encuentra en:
echo   c:\WorkSpace\DepSyS\app-supervisor\src-tauri\target\release\bundle\
echo ===============================================================
echo.
pause
