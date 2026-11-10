@echo off
chcp 65001 > nul
title PUBLICAR NUEVA VERSION DE DEPSYS EN GITHUB
color 0C

echo ========================================================
echo       PUBLICAR Y COMPILAR DEPSYS EN GITHUB RELEASES
echo       Motos Mendes S.A. • Sistema de Depósito y Picking
echo ========================================================
echo.
cd /d "%~dp0"

for /f "tokens=1,2" %%a in ('node scripts/get_version.cjs') do (
    set CURR_VER=%%a
    set NEXT_VER=%%b
)

echo Versión actual en package.json: %CURR_VER%
echo Presiona [ENTER] para usar la siguiente versión sugerida (%NEXT_VER%)
echo o escribe una versión personalizada:
set /p USER_VER="Nueva Versión [%NEXT_VER%]: "

if "%USER_VER%"=="" (
    set TARGET_VER=%NEXT_VER%
) else (
    set TARGET_VER=%USER_VER%
)

echo.
echo ¿Qué deseas compilar y publicar para v%TARGET_VER%?
echo   [1] Solo DepSyS Desktop (.exe / Windows)
echo   [2] Solo App-Picking (.apk / Colectores Láser)
echo   [3] Ecosistema Completo (Desktop + Picking)
echo.
set /p TARGET_OPT="Selecciona una opción [1-3] (Por defecto 3): "
if "%TARGET_OPT%"=="" set TARGET_OPT=3

if "%TARGET_OPT%"=="1" (
    set TARGET_TYPE=desktop
) else if "%TARGET_OPT%"=="2" (
    set TARGET_TYPE=picking
) else (
    set TARGET_TYPE=all
)

echo.
echo ========================================================
echo [1/4] Actualizando números de versión a v%TARGET_VER%...
echo ========================================================
node scripts/bump_version.cjs %TARGET_VER%

if "%TARGET_TYPE%"=="desktop" goto compilar_desktop
if "%TARGET_TYPE%"=="picking" goto compilar_picking
if "%TARGET_TYPE%"=="all" goto compilar_ambos

:compilar_desktop
echo.
echo ========================================================
echo [2/4] Compilando DepSyS Desktop Windows (.exe)...
echo ========================================================
cd /d "%~dp0DepSyS"
call npm run build
set "Path=%PATH%;%USERPROFILE%\.cargo\bin"
call npx tauri build
cd /d "%~dp0"
goto sync_git

:compilar_picking
echo.
echo ========================================================
echo [2/4] Compilando App-Picking Android (.apk)...
echo ========================================================
cd /d "%~dp0app-picking"
call build_apk.bat
cd /d "%~dp0"
goto sync_git

:compilar_ambos
echo.
echo ========================================================
echo [2/4] Compilando App-Picking Android (.apk)...
echo ========================================================
cd /d "%~dp0app-picking"
call build_apk.bat

echo.
echo ========================================================
echo Compilando DepSyS Desktop Windows (.exe)...
echo ========================================================
cd /d "%~dp0DepSyS"
call npm run build
set "Path=%PATH%;%USERPROFILE%\.cargo\bin"
call npx tauri build
cd /d "%~dp0"

:sync_git
echo.
echo ========================================================
echo [3/4] Sincronizando código fuente con GitHub Privado...
echo ========================================================
git add .
git commit -m "Release v%TARGET_VER% (%TARGET_TYPE%)"
git push origin main

echo.
echo ========================================================
echo [4/4] Subiendo instaladores a GitHub Releases...
echo ========================================================
node scripts/publish_release.cjs %TARGET_VER% %TARGET_TYPE%

echo.
echo ========================================================
echo   🎉 ¡PUBLICACIÓN COMPLETADA CON ÉXITO PARA v%TARGET_VER%!
echo ========================================================
echo.
pause
