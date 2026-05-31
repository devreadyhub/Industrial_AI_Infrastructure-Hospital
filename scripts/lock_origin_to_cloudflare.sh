#!/usr/bin/env bash
# Fetch Cloudflare IP ranges and add firewall rules to allow only Cloudflare to reach 80/443
# WARNING: Run carefully — test before applying on remote systems.
set -euo pipefail
if [[ $(id -u) -ne 0 ]]; then
  echo "This script must be run as root (sudo)." >&2
  exit 2
fi

CF_IPV4_URL="https://www.cloudflare.com/ips-v4"
CF_IPV6_URL="https://www.cloudflare.com/ips-v6"

echo "Fetching Cloudflare IP ranges..."
CF4=$(curl -sS $CF_IPV4_URL)
CF6=$(curl -sS $CF_IPV6_URL)

echo "Applying UFW rules (adds allow rules for Cloudflare ranges, port 80 and 443)."
# Ensure ufw is installed
if command -v ufw >/dev/null 2>&1; then
  for ip in $CF4; do
    ufw allow from $ip to any port 80 proto tcp comment 'cf-ip'
    ufw allow from $ip to any port 443 proto tcp comment 'cf-ip'
  done
  for ip in $CF6; do
    ufw allow from $ip to any port 80 proto tcp comment 'cf-ip'
    ufw allow from $ip to any port 443 proto tcp comment 'cf-ip'
  done
  echo "UFW rules added. You may want to deny other sources explicitly or adjust policies."
else
  echo "ufw not found — printing iptables commands instead."
  for ip in $CF4; do
    echo "iptables -I INPUT -p tcp -s $ip --dport 80 -j ACCEPT"
    echo "iptables -I INPUT -p tcp -s $ip --dport 443 -j ACCEPT"
  done
  for ip in $CF6; do
    echo "ip6tables -I INPUT -p tcp -s $ip --dport 80 -j ACCEPT"
    echo "ip6tables -I INPUT -p tcp -s $ip --dport 443 -j ACCEPT"
  done
  echo "After applying accept rules, insert a DROP rule for other sources if that's desired."
fi

echo "Done. Review rules with 'ufw status numbered' or 'iptables -L -n'."
exit 0
