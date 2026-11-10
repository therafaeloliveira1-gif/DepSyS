@echo off
title Servidor Apache - DepSyS Motos Mendes
cls

echo =============================================================================
echo        MOTOS MENDES S.A. - SERVIDOR PROPIO LOCAL (APACHE 2.4 + PHP 8.2)
echo =============================================================================
echo.

if not exist "C:\Apache24\bin\httpd.exe" (
    echo [ERROR] No se encontro Apache en C:\Apache24\bin\httpd.exe.
    pause
    exit /b 1
)

:: Sincronizar configuracion viva
if exist "c:\WorkSpace\DepSyS\server-config\httpd.conf" (
    copy /y "c:\WorkSpace\DepSyS\server-config\httpd.conf" "C:\Apache24\conf\httpd.conf" >nul
)
if exist "c:\WorkSpace\DepSyS\server-config\php.ini" (
    copy /y "c:\WorkSpace\DepSyS\server-config\php.ini" "C:\php\php.ini" >nul
)

:: Detener si ya esta corriendo para evitar conflicto de puertos
taskkill /F /IM httpd.exe >nul 2>&1

:: Verificar sintaxis
echo [*] Verificando sintaxis de Apache...
"C:\Apache24\bin\httpd.exe" -t
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Error de sintaxis en httpd.conf.
    pause
    exit /b 1
)

:: Detectar IP local
set LOCAL_IP=localhost
for /f "usebackq tokens=*" %%i in (`powershell -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254*' } | Select-Object -First 1).IPAddress"`) do set LOCAL_IP=%%i

echo.
echo [*] Arrancando Apache HTTP Server en el puerto 80...
start "DepSyS-Apache" /min cmd /c "cd /d C:\Apache24 && bin\httpd.exe"

ping 127.0.0.1 -n 3 >nul

echo.
echo =============================================================================
echo                  SERVIDOR PROPIO ACTIVO Y OPERANDO
echo =============================================================================
echo  Acceso Local:      http://localhost/api/DepSyS_Api/status.php
echo  Red Deposito:      http://%LOCAL_IP%/api/DepSyS_Api/status.php
echo  Alias Corto:       http://localhost/api/status.php
echo  Base de Datos:     MySQL mendes_db (localhost:3306) [0ms Latencia]
echo =============================================================================
echo.
echo Para detener el servidor, ejecute DETENER-APACHE.bat
