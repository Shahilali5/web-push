# ==============================================================================
# One-Click Git Push Script for Windows PowerShell
# Repository: https://github.com/Shahilali5/web-push.git
# ==============================================================================

param(
    [string]$CommitMessage = "feat: initial release of WebPush open source Socket.IO notification engine"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   🚀 PUSHING TO GITHUB: Shahilali5/web-push" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Initialize git if not present
if (-not (Test-Path ".git")) {
    Write-Host "[1/5] Initializing Git repository on branch 'main'..." -ForegroundColor Yellow
    git init -b main
} else {
    Write-Host "[1/5] Existing Git repository detected." -ForegroundColor Green
}

# 2. Configure user
Write-Host "[2/5] Configuring Git user to Shahilali5..." -ForegroundColor Yellow
git config user.name "Shahilali5"

# 3. Configure remote
$RemoteUrl = "https://github.com/Shahilali5/web-push.git"
Write-Host "[3/5] Setting remote origin to $RemoteUrl..." -ForegroundColor Yellow

$existingRemote = git remote get-url origin 2>$null
if ($null -eq $existingRemote -or $existingRemote -eq "") {
    git remote add origin $RemoteUrl
} else {
    git remote set-url origin $RemoteUrl
}

# 4. Stage and commit
Write-Host "[4/5] Staging all files and committing..." -ForegroundColor Yellow
git add .
git commit -m "$CommitMessage"

# 5. Push to main branch
Write-Host "[5/5] Pushing to main branch on GitHub..." -ForegroundColor Green
git branch -M main
git push -u origin main

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   🎉 SUCCESS! Pushed to https://github.com/Shahilali5/web-push" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
