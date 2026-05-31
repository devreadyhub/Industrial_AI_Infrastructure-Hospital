#!/usr/bin/env bash
# Verify DNS/curl for the public host and show Content-Type + snippet
set -euo pipefail
HOST=${1:-hospital1000.devready.ng}
TMP=$(mktemp)

echo "DNS A/AAAA for $HOST:"
dig +short $HOST A AAAA || true

echo "\nCurling public host (verbose):"
curl -sS -D "$TMP.headers" -o "$TMP.body" -k "https://$HOST/api/auth/login" \
  -H 'Content-Type: application/json' -d '{"staffId":"STAFF-REC-01","password":"demo123"}' || true

echo "\nResponse headers:"
cat "$TMP.headers"

CT=$(grep -i '^Content-Type:' -m1 "$TMP.headers" || true)
echo "\nDetected Content-Type: ${CT:-(none)}"

echo "\nFirst 240 bytes of body:"
head -c 240 "$TMP.body" | sed -n '1,240p'

rm -f "$TMP.headers" "$TMP.body"
exit 0
