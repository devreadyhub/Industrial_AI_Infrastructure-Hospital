#!/usr/bin/env bash
# Install an origin certificate (PEM cert & key) and reload nginx.
# Usage: sudo ./install_origin_cert.sh /path/to/cert.pem /path/to/key.pem
set -euo pipefail
if [[ $(id -u) -ne 0 ]]; then
  echo "This script must be run as root (sudo)." >&2
  exit 2
fi

CERT_SRC=${1:-}
KEY_SRC=${2:-}
if [[ -z "$CERT_SRC" || -z "$KEY_SRC" ]]; then
  echo "Usage: $0 /path/to/cert.pem /path/to/key.pem" >&2
  exit 2
fi

CERT_DST=/etc/ssl/certs/hospital_origin.pem
KEY_DST=/etc/ssl/private/hospital_origin.key

echo "Backing up existing cert/key if present..."
mkdir -p /etc/ssl/certs /etc/ssl/private
if [[ -f "$CERT_DST" ]]; then mv "$CERT_DST" "${CERT_DST}.bak.$(date +%s)"; fi
if [[ -f "$KEY_DST" ]]; then mv "$KEY_DST" "${KEY_DST}.bak.$(date +%s)"; fi

cp "$CERT_SRC" "$CERT_DST"
cp "$KEY_SRC" "$KEY_DST"
chmod 644 "$CERT_DST"
chmod 600 "$KEY_DST"

echo "Testing nginx configuration..."
nginx -t

echo "Reloading nginx..."
systemctl reload nginx

echo "Installed cert to $CERT_DST and key to $KEY_DST and reloaded nginx."
exit 0
