#!/usr/bin/env bash
# ==============================================================================
# WebPush Automated HTTPS & SSL Setup Script (Nginx + Let's Encrypt Certbot)
# Proxies HTTPS (Port 443) -> WebPush Node.js Server (Port 3050)
# ==============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}"
echo "=========================================================="
echo "   🔒 WEBPUSH AUTOMATED HTTPS & FREE SSL SETUP"
echo "   Nginx Reverse Proxy + Let's Encrypt Certbot"
echo "=========================================================="
echo -e "${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root or with sudo: sudo ./setup-https.sh${NC}"
  exit 1
fi

DOMAIN="$1"
EMAIL="$2"

if [ -z "$DOMAIN" ]; then
    echo -e "${YELLOW}Enter your domain name that points to this VPS IP:${NC}"
    echo -e "(Example: push.yourdomain.com or if you don't have a domain, use a free sslip.io domain like: 13-50-251-171.sslip.io)"
    read -p "Domain: " DOMAIN
fi

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Domain name is required for HTTPS. Exiting.${NC}"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    read -p "Enter your email for Let's Encrypt SSL renewal notices: " EMAIL
fi

EMAIL="${EMAIL:-admin@${DOMAIN}}"

# 1. Install Nginx and Certbot
echo -e "${BLUE}[1/5] Installing Nginx and Certbot...${NC}"
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx ufw

# 2. Allow Firewall Ports
echo -e "${BLUE}[2/5] Configuring firewall for HTTP (80) and HTTPS (443)...${NC}"
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw allow 3050/tcp || true

# 3. Create Nginx Configuration
echo -e "${BLUE}[3/5] Setting up Nginx reverse proxy for Port 3050...${NC}"
cat <<EOF > /etc/nginx/sites-available/webpush
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:3050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket support
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/webpush /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
echo -e "${GREEN}✓ Nginx reverse proxy configured successfully.${NC}"

# 4. Request SSL Certificate with Certbot
echo -e "${BLUE}[4/5] Obtaining free SSL certificate from Let's Encrypt...${NC}"
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect

systemctl reload nginx

echo -e "${CYAN}"
echo "=========================================================="
echo "   🎉 HTTPS Setup Complete with Valid SSL Certificate!"
echo "=========================================================="
echo -e "${NC}"
echo -e "Your Push System is now live with HTTPS:"
echo -e "👉 ${GREEN}https://${DOMAIN}/test/${NC}"
echo -e "👉 ${GREEN}https://${DOMAIN}/admin/${NC}"
echo ""
echo -e "${YELLOW}Note: Make sure Port 80 and 443 are also open in your AWS EC2 Security Group!${NC}"
