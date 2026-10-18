#!/usr/bin/env bash
# ==============================================================================
# One-Click Git Push Script for Shahil (Username: shahilali5)
# ==============================================================================

set -e

GIT_USER="Shahilali5"
DEFAULT_REPO="https://github.com/Shahilali5/web-push.git"
COMMIT_MSG="${1:-feat: initial release of WebPush open source Socket.IO notification engine}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}"
echo "=========================================================="
echo "   🚀 GIT PUSH SCRIPT — AUTHOR: ${GIT_USER}"
echo "=========================================================="
echo -e "${NC}"

# 1. Initialize git if not already present
if [ ! -d ".git" ]; then
    echo -e "${BLUE}[1/5] Initializing Git repository...${NC}"
    git init -b main
    echo -e "${GREEN}✓ Git repository initialized.${NC}"
else
    echo -e "${GREEN}✓ Existing Git repository detected.${NC}"
fi

# 2. Configure user name
echo -e "${BLUE}[2/5] Configuring Git user to ${GIT_USER}...${NC}"
git config user.name "${GIT_USER}"
echo -e "${GREEN}✓ git config user.name set to '${GIT_USER}'.${NC}"

# 3. Check or configure remote origin
echo -e "${BLUE}[3/5] Checking remote origin...${NC}"
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

if [ -z "$CURRENT_REMOTE" ]; then
    echo -e "${YELLOW}No remote origin configured yet.${NC}"
    read -p "Enter GitHub repository URL [Default: ${DEFAULT_REPO}]: " USER_REPO
    REPO_TO_SET="${USER_REPO:-$DEFAULT_REPO}"
    git remote add origin "$REPO_TO_SET"
    echo -e "${GREEN}✓ Remote origin set to ${REPO_TO_SET}${NC}"
else
    echo -e "${GREEN}✓ Existing remote origin found: ${CURRENT_REMOTE}${NC}"
fi

# 4. Stage & Commit
echo -e "${BLUE}[4/5] Staging files and creating commit...${NC}"
git add .
if git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${YELLOW}No new changes detected to commit.${NC}"
else
    git commit -m "${COMMIT_MSG}"
    echo -e "${GREEN}✓ Changes committed with message: \"${COMMIT_MSG}\"${NC}"
fi

# 5. Push to remote
echo -e "${BLUE}[5/5] Pushing to GitHub (main branch)...${NC}"
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
if [ -z "$CURRENT_BRANCH" ]; then
    CURRENT_BRANCH="main"
fi

git push -u origin "$CURRENT_BRANCH"

echo -e "${CYAN}"
echo "=========================================================="
echo "   🎉 Successfully pushed to GitHub!"
echo "   Account: https://github.com/${GIT_USER}"
echo "=========================================================="
echo -e "${NC}"
