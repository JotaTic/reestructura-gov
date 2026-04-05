@echo off
REM ============================================================
REM ReEstructura.Gov — arranque de backend + frontend
REM Lanza Django (puerto 8000) y Next.js (puerto 3000) en dos
REM ventanas nuevas. Cierra ambas cuando termines (o usa stop.bat).
REM ============================================================
setlocal
cd /d "%~dp0"

if not exist "backend\.venv\Scripts\python.exe" (
    echo El venv no existe. Ejecuta primero setup.bat
    exit /b 1
)
if not exist "frontend\node_modules" (
    echo Las dependencias del frontend no estan instaladas. Ejecuta primero setup.bat
    exit /b 1
)

echo.
echo === Arrancando backend Django en http://localhost:8000/ ===
start "ReEstructura Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe manage.py runserver 8000"

echo === Arrancando frontend Next.js en http://localhost:3000/ ===
start "ReEstructura Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================================
echo  Backend:  http://localhost:8000/
echo  Frontend: http://localhost:3000/
echo  Admin:    http://localhost:8000/admin/   (admin / admin123)
echo  API Docs: http://localhost:8000/api/docs/
echo ============================================================
echo.
echo Se abrieron dos ventanas de consola. Cierralas (Ctrl+C en cada
echo una) o ejecuta stop.bat para detener ambos servicios.
echo.
echo Abriendo el navegador en 5 segundos...
timeout /t 5 /nobreak >nul
start "" http://localhost:3000/

endlocal
