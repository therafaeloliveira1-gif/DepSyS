@echo off
chcp 65001 >nul
set "JAVA_HOME=C:\Users\Marketing\java-21-openjdk-21.0.4.0.7-1.win.jdk.x86_64"
set "ANDROID_HOME=C:\Users\Marketing\AppData\Local\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"

echo ========================================================
echo  🏍️ MOTOS MENDES - COMPILADOR DE APK RELEASE (FIRMADO)
echo     DepSyS Picking para Colectores de Datos
echo ========================================================
echo.

echo [1/3] Compilando frontend web Vite...
cd /d "C:\WorkSpace\DepSyS\app-picking"
call npm run build

echo.
echo [2/3] Sincronizando con Capacitor Android...
if exist "android\capacitor-cordova-android-plugins" (
    rmdir /s /q "android\capacitor-cordova-android-plugins" >nul 2>&1
)
call npx cap sync android

echo.
echo [3/3] Compilando APK Release firmado con depsystem-picking.keystore...
cd /d "C:\WorkSpace\DepSyS\app-picking\android"
call gradlew.bat assembleRelease

if exist "app\build\outputs\apk\release\app-release.apk" (
    copy /y "app\build\outputs\apk\release\app-release.apk" "..\MendesPicking-DepSyS.apk"
    copy /y "app\build\outputs\apk\release\app-release.apk" "..\..\MendesPicking-DepSyS.apk"
)

echo.
echo ========================================================
echo  🎉 [EXITO] APK firmado compilado correctamente en:
echo     C:\WorkSpace\DepSyS\app-picking\MendesPicking-DepSyS.apk
echo     C:\WorkSpace\DepSyS\MendesPicking-DepSyS.apk
echo ========================================================
echo.
cd /d "C:\WorkSpace\DepSyS\app-picking"
rem pause
