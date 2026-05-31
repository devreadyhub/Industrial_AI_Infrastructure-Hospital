#!/usr/bin/env bash
set -euo pipefail

# Production deploy helper (requires sudo for nginx actions)
# Run on the server in the repository root.

if [ "$EUID" -ne 0 ]; then
  echo "Warning: some steps require sudo; you may be prompted for a password."
fi

echo "1) Build frontend from client directory"
cd client && npx vite build && cd ..

echo "2) Copy frontend to /var/www/hospital"
sudo mkdir -p /var/www/hospital
sudo rm -rf /var/www/hospital/*
sudo cp -r client/dist/* /var/www/hospital/
sudo chown -R www-data:www-data /var/www/hospital

echo "3) Ensure Nginx is installed"
if ! command -v nginx >/dev/null 2>&1; then
  echo "Installing nginx..."
  sudo apt update
  sudo apt install -y nginx
fi

echo "4) Ensure Nginx config is in place"
if [ -f deploy/nginx/hospital.conf ]; then
  sudo cp deploy/nginx/hospital.conf /etc/nginx/sites-available/hospital.conf
  sudo ln -sf /etc/nginx/sites-available/hospital.conf /etc/nginx/sites-enabled/hospital.conf
  sudo nginx -t
  sudo systemctl reload nginx
  echo "✓ Nginx configured and reloaded"
else
  echo "deploy/nginx/hospital.conf not found; please copy it to /etc/nginx/sites-available/hospital.conf"
  exit 1
fi

echo "4) Build backend and start with PM2"
# Build TypeScript backend (assumes project configured for production build)
npm run build || true

# Start PM2 using ecosystem file
if [ -f deploy/pm2/ecosystem.config.js ]; then
  pm2 start deploy/pm2/ecosystem.config.js --env production
  pm2 save
  pm2 startup
else
  echo "deploy/pm2/ecosystem.config.js not found; start your backend with pm2 manually"
fi

echo "Deployment steps executed. Verify https://<your-domain> and check /api/health"
