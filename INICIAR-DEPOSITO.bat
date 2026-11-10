@echo off
chcp 65001 >nul
title Motos Mendes - DepSyS Launcher
cls

echo =============================================================================
echo        MOTOS MENDES S.A. - SISTEMA DE DEPOSITO Y CONTROL (DEPSYS)
echo =============================================================================
echo.

:: Detectar IP local de red para colectores moviles
set LOCAL_IP=localhost
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254*' } | Select-Object -First 1).IPAddress"`) do set LOCAL_IP=%%i

echo [*] Red local detectada... IP del Servidor: %LOCAL_IP%
echo [*] Limpiando procesos previos en puertos 80, 3001, 3003 y 3015...
taskkill /F /IM httpd.exe >nul 2>&1
powershell -NoProfile -Command "80, 3001, 3003, 3008, 3015 | ForEach-Object { Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }" >nul 2>&1

echo.
:: 1. Servidor Propio Apache 2.4 + PHP 8.2 (Puerto 80)
echo  [1/4] Arrancando Servidor Apache + PHP (Puerto 80)...
if exist "c:\WorkSpace\DepSyS\server-config\httpd.conf" copy /y "c:\WorkSpace\DepSyS\server-config\httpd.conf" "C:\Apache24\conf\httpd.conf" >nul 2>&1
if exist "c:\WorkSpace\DepSyS\server-config\php.ini" copy /y "c:\WorkSpace\DepSyS\server-config\php.ini" "C:\php\php.ini" >nul 2>&1
powershell -NoProfile -Command "Start-Process -FilePath 'C:\Apache24\bin\httpd.exe' -WorkingDirectory 'C:\Apache24' -WindowStyle Hidden"

:: 2. Backend API (Node.js + Firebird Bridge + MySQL mendes_db - Puerto 3015)
echo  [2/4] Arrancando Backend API Node/Firebird (Puerto 3015)...
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c title DepSyS-Backend && npm start' -WorkingDirectory 'c:\WorkSpace\DepSyS\backend-api' -WindowStyle Minimized"

:: 3. App Picking Movil Android / Separador (Vite Puerto 3001)
echo  [3/4] Arrancando App Picking Movil (Puerto 3001)...
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c title DepSyS-Picking && npm run dev' -WorkingDirectory 'c:\WorkSpace\DepSyS\app-picking' -WindowStyle Minimized"

:: 4. Suite Web Unificada DepSyS - Terminales PC (Vite Puerto 3003)
echo  [4/4] Arrancando Suite Web Unificada DepSyS (Puerto 3003)...
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c title DepSyS-Web && npm run dev' -WorkingDirectory 'c:\WorkSpace\DepSyS\app-supervisor' -WindowStyle Minimized"

echo.
echo [*] Esperando a que los servidores esten en linea...
timeout /t 4 /nobreak >nul

echo.
echo =============================================================================
echo                      DEPSYS EN OPERACION
echo =============================================================================
echo.
echo   SERVIDOR APACHE / PHP:        http://localhost/api/DepSyS_Api/status.php
echo   BACKEND NODE / FIREBIRD:      http://localhost:3015/api/status
echo   COLECTORES ANDROID (Picking): http://%LOCAL_IP%:3001
echo   SUITE WEB UNIFICADA (PC):     http://localhost:3003   (o http://%LOCAL_IP%:3003)
echo.
echo   Para apagar todos los servicios ejecute: DETENER-DEPOSITO.bat
echo =============================================================================
echo.

start "" "http://localhost:3003"
timeout /t 3 >nul
