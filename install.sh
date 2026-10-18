#!/usr/bin/env bash
# ==============================================================================
# Push System — High-Performance Socket.IO & Push Server Installation Script
# Target Port: 3050
# ==============================================================================

set -e

PORT=3050
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}"
echo "=========================================================="
echo "   🚀 PUSH SYSTEM INSTALLER — CONFIGURED FOR PORT ${PORT}"
echo "   Real-Time Socket.IO + Native Push + Large Scale Batching"
echo "=========================================================="
echo -e "${NC}"

cd "$APP_DIR"

# 1. Check Node.js
echo -e "${BLUE}[1/5] Checking Node.js runtime...${NC}"
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js detected: ${NODE_VERSION}${NC}"

# 2. Install NPM dependencies
echo -e "${BLUE}[2/5] Installing dependencies...${NC}"
if [ -f "package.json" ]; then
    npm install --no-audit
    echo -e "${GREEN}✓ Dependencies installed successfully.${NC}"
else
    echo -e "${RED}Error: package.json not found in ${APP_DIR}.${NC}"
    exit 1
fi

# 3. Setup environment configuration (.env)
echo -e "${BLUE}[3/5] Configuring environment for Port ${PORT}...${NC}"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env from .env.example${NC}"
    else
        cat <<EOF > .env
PORT=${PORT}
DB_HOST=127.0.0.1
DB_USER=root
DB_PASS=
DB_NAME=push_system
REDIS_URL=redis://127.0.0.1:6379

ADMIN_KEY=push_admin_secret_key
SITE_KEY=push_site_public_key

WELCOME_TITLE=Thanks For Subscribing
WELCOME_BODY=You Will Receive Updates Even When Website Is Closed
WELCOME_URL=/test/
WORKER_CONCURRENCY=10
EOF
        echo -e "${GREEN}✓ Created new .env file${NC}"
    fi
fi

# Ensure PORT is 3050 in .env
if grep -q "^PORT=" .env; then
    # Cross-platform sed for Linux/macOS
    sed -i.bak "s/^PORT=.*/PORT=${PORT}/" .env && rm -f .env.bak
else
    echo "PORT=${PORT}" >> .env
fi
echo -e "${GREEN}✓ PORT explicitly set to ${PORT} in .env${NC}"

# 4. Check Redis (Optional)
echo -e "${BLUE}[4/5] Checking Redis service...${NC}"
if command -v redis-cli >/dev/null 2>&1 && redis-cli ping >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Local Redis server is active and running.${NC}"
    sed -i.bak "s/^ENABLE_REDIS=.*/ENABLE_REDIS=true/" .env 2>/dev/null || echo "ENABLE_REDIS=true" >> .env
    rm -f .env.bak
else
    echo -e "${YELLOW}Notice: Redis is not running locally.${NC}"
    if grep -q "^ENABLE_REDIS=" .env; then
        sed -i.bak "s/^ENABLE_REDIS=.*/ENABLE_REDIS=false/" .env && rm -f .env.bak
    else
        echo "ENABLE_REDIS=false" >> .env
    fi
    echo -e "${GREEN}✓ Configured ENABLE_REDIS=false for standalone Socket.IO mode.${NC}"

    # Offer to install Redis if on Debian/Ubuntu VPS
    if command -v apt-get >/dev/null 2>&1; then
        echo -e "${CYAN}Optional: Would you like to install Redis now for horizontal clustering? (y/N): ${NC}"
        read -t 10 -n 1 -r INSTALL_REDIS || INSTALL_REDIS="n"
        echo
        if [[ $INSTALL_REDIS =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Installing redis-server via apt...${NC}"
            apt-get update -y && apt-get install -y redis-server
            systemctl enable redis-server && systemctl start redis-server
            sed -i.bak "s/^ENABLE_REDIS=.*/ENABLE_REDIS=true/" .env && rm -f .env.bak
            echo -e "${GREEN}✓ Redis server installed and started.${NC}"
        fi
    fi
fi

# 5. Summary & Startup Instructions
echo -e "${CYAN}"
echo "=========================================================="
echo "   🎉 Installation Complete!"
echo "=========================================================="
echo -e "${NC}"
echo -e "Your server is ready to run on ${GREEN}http://localhost:${PORT}${NC}"
echo ""
echo -e "📌 ${YELLOW}Test Web Page:${NC}   http://localhost:${PORT}/test/"
echo -e "📌 ${YELLOW}Admin Dashboard:${NC} http://localhost:${PORT}/admin/"
echo -e "📌 ${YELLOW}Client SDK:${NC}      http://localhost:${PORT}/sdk.js"
echo ""
echo -e "${BLUE}Start Options:${NC}"
echo -e "  1) Direct foreground start:   ${GREEN}node server.js${NC}"
echo -e "  2) PM2 Process Manager:       ${GREEN}pm2 start server.js --name push-system --watch${NC}"
echo ""

read -p "Would you like to start the push server now on port ${PORT}? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Starting server on port ${PORT}...${NC}"
    node server.js
fi
