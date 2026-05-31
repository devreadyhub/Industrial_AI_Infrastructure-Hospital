#!/usr/bin/env bash
set -euo pipefail

# Hospital Production Deployment Verification Script
# Tests frontend loading (with CSS), backend API, and SSL configuration

DOMAIN="hospital1000.devready.ng"
BACKEND_URL="http://127.0.0.1:4000"
FRONTEND_URL="https://${DOMAIN}"

echo "======================================"
echo "Hospital Production Deployment Verification"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
}

fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  exit 1
}

warn() {
  echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

info() {
  echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

echo "1) Checking Backend Status..."
echo "   Testing: ${BACKEND_URL}/api/health"
if curl -s --max-time 5 "${BACKEND_URL}/api/health" | grep -q "ok\|status"; then
  pass "Backend health endpoint responding"
else
  fail "Backend not responding. Ensure PM2 is running: pm2 status"
fi

echo ""
echo "2) Checking Nginx Configuration..."
sudo nginx -t > /dev/null 2>&1 && pass "Nginx config is valid" || fail "Nginx config has errors"

echo ""
echo "3) Checking Frontend Files..."
if [ -f /var/www/hospital/index.html ]; then
  pass "Frontend index.html exists"
else
  warn "Frontend files not found at /var/www/hospital; copy with: sudo cp -r client/dist/* /var/www/hospital/"
fi

if [ -f /var/www/hospital/index.html ] && grep -q "assets" /var/www/hospital/index.html; then
  pass "Frontend index.html references assets"
else
  warn "Frontend HTML may not reference assets correctly"
fi

echo ""
echo "4) Checking SSL Certificate..."
if [ -f /etc/ssl/certs/hospital_origin.pem ]; then
  pass "SSL certificate file found"
  EXPIRY=$(sudo openssl x509 -in /etc/ssl/certs/hospital_origin.pem -noout -enddate 2>/dev/null | cut -d= -f2)
  info "Certificate expires: ${EXPIRY}"
else
  warn "SSL certificate not found at /etc/ssl/certs/hospital_origin.pem"
  info "If using Let's Encrypt, check: /etc/letsencrypt/live/${DOMAIN}/"
fi

echo ""
echo "5) Testing Frontend HTTPS Connection..."
echo "   Testing: ${FRONTEND_URL}/"
RESPONSE=$(curl -s --insecure --max-time 10 -w "\n%{http_code}" "${FRONTEND_URL}/" 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
CONTENT=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  pass "Frontend responding with HTTP 200"
else
  warn "Frontend returned HTTP ${HTTP_CODE} (expected 200)"
fi

if echo "$CONTENT" | grep -q "<html\|<!DOCTYPE"; then
  pass "Frontend serving HTML content"
else
  fail "Frontend not serving HTML (got: ${CONTENT:0:100}...)"
fi

if echo "$CONTENT" | grep -q "\.css\|\.js"; then
  pass "Frontend HTML references stylesheets/scripts"
else
  warn "Frontend HTML may not reference CSS/JS files"
fi

echo ""
echo "6) Checking CSS Delivery..."
echo "   Fetching CSS files..."
if [ -d /var/www/hospital/assets ]; then
  CSS_FILE=$(find /var/www/hospital/assets -name "*.css" -type f | head -1)
  if [ -n "$CSS_FILE" ]; then
    CSS_FILENAME=$(basename "$CSS_FILE")
    echo "   Testing: ${FRONTEND_URL}/assets/${CSS_FILENAME}"
    CSS_RESPONSE=$(curl -s --insecure -I "${FRONTEND_URL}/assets/${CSS_FILENAME}" 2>/dev/null)
    
    if echo "$CSS_RESPONSE" | grep -q "200 OK"; then
      pass "CSS file served with 200 OK"
    else
      fail "CSS file returned error: $(echo "$CSS_RESPONSE" | head -1)"
    fi
    
    if echo "$CSS_RESPONSE" | grep -q "text/css"; then
      pass "CSS served with correct MIME type (text/css)"
    else
      CSS_MIME=$(echo "$CSS_RESPONSE" | grep -i "content-type" | head -1)
      warn "CSS MIME type may be incorrect: ${CSS_MIME}"
    fi
  fi
fi

echo ""
echo "7) Testing API Endpoints..."
echo "   Testing: ${FRONTEND_URL}/api/health"
API_RESPONSE=$(curl -s --insecure --max-time 5 "${FRONTEND_URL}/api/health" 2>/dev/null)
if echo "$API_RESPONSE" | grep -q "ok\|status"; then
  pass "API health endpoint responding with JSON"
  echo "   Response: ${API_RESPONSE:0:100}"
else
  fail "API not returning expected JSON. Response: ${API_RESPONSE:0:100}"
fi

echo ""
echo "8) Checking Backend Process (PM2)..."
if pm2 list | grep -q "hospital-backend"; then
  pass "Backend process running under PM2"
  pm2 list | grep hospital
else
  warn "Backend process not found in PM2. Start with: pm2 start deploy/pm2/ecosystem.config.js --env production"
fi

echo ""
echo "======================================"
echo "Deployment Verification Complete"
echo "======================================"
echo ""
echo "Frontend: ${FRONTEND_URL}"
echo "Admin Login: ${ADMIN_STAFF_ID} / ChangeMe@Admin2026 (change in .env)"
echo ""
echo "Next steps:"
echo "1. Access frontend and verify CSS/styling loads"
echo "2. Login with admin credentials"
echo "3. Test all application features"
echo "4. Monitor logs: tail -f /var/log/nginx/access.log"
echo "5. Monitor backend: pm2 logs hospital-backend"
echo ""
