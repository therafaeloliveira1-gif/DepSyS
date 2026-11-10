@echo off
chcp 65001 >nul
title Compilar APK DepSyS
cd /d "c:\WorkSpace\DepSyS\app-picking"
call build_apk.bat
