#!/usr/bin/env bash
set -euo pipefail

# Start PM2 processes with environment loaded from .env
# Run from repo root on the server: sudo ./deploy/pm2/start-prod.sh

if [ ! -f .env ]; then
  echo ".env file not found in repo root. Create it with production variables before running."
  exit 1
fi

# Export variables from .env (simple parser)
export $(grep -v '^#' .env | xargs)

# Ensure dist exists
if [ ! -d dist ]; then
  echo "Building backend..."
  npm run build
fi

# Start PM2
pm2 start deploy/pm2/ecosystem.config.js --env production
pm2 save

echo "PM2 started. Run 'pm2 status' to verify."