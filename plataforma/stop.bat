@echo off
REM ============================================================
REM ReEstructura.Gov — detener servicios
REM Mata cualquier proceso de Django runserver (python.exe) y
REM Next.js dev (node.exe) escuchando en 8000 / 3000.
REM ============================================================

echo Deteniendo procesos en puerto 8000 (backend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Deteniendo procesos en puerto 3000 (frontend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Cerrando ventanas de consola "ReEstructura Backend" y "ReEstructura Frontend"...
taskkill /FI "WINDOWTITLE eq ReEstructura Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq ReEstructura Frontend*" /F >nul 2>&1

echo Listo.
