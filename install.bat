@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM WebPush Windows 1-Click Installer — Port 3050
REM ==============================================================================

echo ==========================================================
echo    WebPush Windows Installer (Port 3050)
echo    Pure Socket.IO - Zero Firebase - High Performance
echo ==========================================================

REM 1. Check Node.js
echo [1/4] Checking Node.js installation...
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo [OK] Node.js detected: %NODE_VER%

REM 2. Install dependencies
echo [2/4] Installing NPM dependencies...
call npm install --no-audit
if errorlevel 1 (
    echo [WARNING] npm install reported warnings or errors, continuing...
) else (
    echo [OK] Dependencies installed successfully.
)

REM 3. Configure .env
echo [3/4] Configuring .env for Port 3050...
if not exist ".env" (
    if exist ".env.example" (
        copy /y .env.example .env >nul
        echo [OK] Created .env from .env.example
    ) else (
        (
            echo PORT=3050
            echo DB_HOST=127.0.0.1
            echo DB_USER=root
            echo DB_PASS=
            echo DB_NAME=push_system
            echo REDIS_URL=redis://127.0.0.1:6379
            echo ADMIN_KEY=push_admin_secret_key
            echo SITE_KEY=push_site_public_key
            echo WELCOME_TITLE=Thanks For Subscribing
            echo WELCOME_BODY=You Will Receive Updates Even When Website Is Closed
            echo WELCOME_URL=/test/
            echo WORKER_CONCURRENCY=10
        ) > .env
        echo [OK] Created new .env file
    )
) else (
    echo [OK] Existing .env file found.
)

REM 4. Summary & Start Option
echo ==========================================================
echo    Installation Complete!
echo    Ready to run on http://localhost:3050
echo ==========================================================
echo.
echo Test Web Lab:     http://localhost:3050/test/
echo Admin Dashboard:  http://localhost:3050/admin/
echo.

set /p START_NOW="Start WebPush server now on port 3050? (Y/n): "
if /i "%START_NOW%"=="n" (
    echo You can start the server anytime using: node server.js
    pause
    exit /b 0
)

echo Starting WebPush server...
node server.js
pause
