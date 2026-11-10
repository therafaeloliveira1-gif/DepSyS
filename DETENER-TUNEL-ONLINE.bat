@echo off
title Detener Tunel Cloudflare - DepSyS
cls

echo =============================================================================
echo        MOTOS MENDES S.A. - DETENIENDO TUNEL PUBLICO CLOUDFLARE
echo =============================================================================
echo.

taskkill /F /IM cloudflared.exe >nul 2>&1

echo [*] Tunel Cloudflare cerrado. El servidor Apache sigue operando normalmente en la red local.
ping 127.0.0.1 -n 2 >nul
