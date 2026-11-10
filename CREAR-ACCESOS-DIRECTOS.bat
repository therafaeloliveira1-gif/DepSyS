@echo off
chcp 65001 > nul
title Crear Accesos Directos de DepSyS Industrial
color 0C

echo ===============================================================
echo   CREANDO ACCESOS DIRECTOS EN EL ESCRITORIO DE WINDOWS
echo   DepSyS Industrial • Motos Mendes S.A.
echo ===============================================================
echo.

set "TARGET_EXE=c:\WorkSpace\DepSyS\app-supervisor\src-tauri\target\release\depsys-desktop.exe"
set "ICON_FILE=c:\WorkSpace\DepSyS\app-supervisor\src-tauri\icons\icon.ico"

if not exist "%TARGET_EXE%" (
    echo [ERROR] No se encontro el ejecutable compilado.
    echo Ejecuta primero COMPILAR-DESKTOP.bat
    pause
    exit /b 1
)

powershell -NoProfile -Command "$desktop = [System.Environment]::GetFolderPath('Desktop'); $lnkPath = Join-Path $desktop 'DepSyS Industrial.lnk'; $wsh = New-Object -ComObject WScript.Shell; $sc = $wsh.CreateShortcut($lnkPath); $sc.TargetPath = '%TARGET_EXE%'; $sc.WorkingDirectory = 'c:\WorkSpace\DepSyS\app-supervisor\src-tauri\target\release'; $sc.IconLocation = '%ICON_FILE%'; $sc.Save()"

if %errorlevel% equ 0 (
    echo [OK] Acceso directo 'DepSyS Industrial' creado exitosamente en tu Escritorio.
) else (
    echo [ERROR] No se pudo crear el acceso directo en el escritorio.
)

echo.
pause
