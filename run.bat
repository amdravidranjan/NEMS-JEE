@echo off
echo ============================================================
echo  JEE Allotment System
echo ============================================================
echo.

REM Try python from PATH first, then common install locations
set PYTHON=python
where python >nul 2>&1
if %errorlevel% neq 0 (
    if exist "C:\Python312\python.exe"  set PYTHON=C:\Python312\python.exe
    if exist "C:\Python311\python.exe"  set PYTHON=C:\Python311\python.exe
    if exist "C:\Python310\python.exe"  set PYTHON=C:\Python310\python.exe
    if exist "C:\Python39\python.exe"   set PYTHON=C:\Python39\python.exe
)

echo Using: %PYTHON%
echo.
echo Installing dependencies (flask + oracledb)...
%PYTHON% -m pip install flask oracledb --quiet
echo.
echo Starting server on http://localhost:5000
echo Press Ctrl+C to stop.
echo.
%PYTHON% app.py
pause
