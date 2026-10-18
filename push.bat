@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM Git Push Script for Windows - Username: shahilali5
REM ==============================================================================

set "GIT_USER=Shahilali5"
set "DEFAULT_REPO=https://github.com/Shahilali5/web-push.git"

if "%~1"=="" (
    set "COMMIT_MSG=feat: initial release of WebPush open source Socket.IO notification engine"
) else (
    set "COMMIT_MSG=%~1"
)

echo ==========================================================
echo    Git Push Script - User: %GIT_USER%
echo ==========================================================

REM 1. Initialize git if not present
if not exist ".git" (
    echo [1/5] Initializing Git repository...
    git init -b main
) else (
    echo [1/5] Existing Git repository detected.
)

REM 2. Configure user name
echo [2/5] Configuring Git user to %GIT_USER%...
git config user.name "%GIT_USER%"

REM 3. Check remote origin
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo [3/5] Adding remote origin: %DEFAULT_REPO%
    git remote add origin %DEFAULT_REPO%
) else (
    echo [3/5] Remote origin already configured.
)

REM 4. Stage and commit
echo [4/5] Staging and committing files...
git add .
git commit -m "%COMMIT_MSG%"

REM 5. Push
echo [5/5] Pushing to GitHub...
git push -u origin main

echo ==========================================================
echo    Push completed!
echo ==========================================================
pause
