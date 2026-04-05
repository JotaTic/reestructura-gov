@echo off
REM ============================================================
REM ReEstructura.Gov — setup inicial
REM Instala dependencias, aplica migraciones, carga seeds y
REM crea los usuarios por perfil. Ejecutar UNA sola vez (o cuando
REM cambien dependencias / fixtures).
REM ============================================================
setlocal
cd /d "%~dp0"

echo.
echo === [1/6] Verificando entorno virtual Python ===
if not exist "backend\.venv\Scripts\python.exe" (
    echo No se encontro el venv. Creando...
    python -m venv backend\.venv
    if errorlevel 1 (
        echo ERROR: no se pudo crear el venv. Asegurate de tener Python 3.11+ en PATH.
        exit /b 1
    )
)

echo.
echo === [2/6] Instalando dependencias Python ===
call backend\.venv\Scripts\python.exe -m pip install --upgrade pip >nul
call backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
if errorlevel 1 (
    echo ERROR: fallo instalando requirements.txt
    exit /b 1
)

echo.
echo === [3/6] Aplicando migraciones Django ===
call backend\.venv\Scripts\python.exe backend\manage.py migrate
if errorlevel 1 (
    echo ERROR: fallo en migrate
    exit /b 1
)

echo.
echo === [4/6] Cargando datos semilla ===
call backend\.venv\Scripts\python.exe backend\manage.py loaddata backend\apps\nomenclatura\fixtures\decreto_785_2005.json 2>nul
call backend\.venv\Scripts\python.exe backend\manage.py loaddata backend\apps\legal\fixtures\seed_legal.json 2>nul
call backend\.venv\Scripts\python.exe backend\manage.py loaddata backend\apps\actos\fixtures\seed_templates.json 2>nul
call backend\.venv\Scripts\python.exe backend\manage.py loaddata backend\apps\jota\fixtures\seed_jota.json 2>nul

echo.
echo === [5/6] Creando usuarios por perfil ===
call backend\.venv\Scripts\python.exe backend\manage.py seed_users

echo.
echo === [6/6] Instalando dependencias del frontend ===
if not exist "frontend\node_modules" (
    pushd frontend
    call npm install
    popd
) else (
    echo node_modules ya existe. Si quieres reinstalar, borra frontend\node_modules y vuelve a correr.
)

echo.
echo ============================================================
echo Setup completo. Ejecuta ahora start.bat para levantar todo.
echo ============================================================
endlocal
