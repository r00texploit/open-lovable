#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root" >&2
  exit 1
fi

SANDBOX_SUBNET="${VPS_SANDBOX_SUBNET:-172.30.0.0/24}"

iptables -N VPS-SANDBOX-EGRESS 2>/dev/null || true
for destination in 0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.168.0.0/16 224.0.0.0/4 240.0.0.0/4; do
  iptables -C VPS-SANDBOX-EGRESS -d "$destination" -j REJECT 2>/dev/null || \
    iptables -A VPS-SANDBOX-EGRESS -d "$destination" -j REJECT
done
iptables -C VPS-SANDBOX-EGRESS -j RETURN 2>/dev/null || \
  iptables -A VPS-SANDBOX-EGRESS -j RETURN

iptables -C DOCKER-USER -s "$SANDBOX_SUBNET" -j VPS-SANDBOX-EGRESS 2>/dev/null || \
  iptables -I DOCKER-USER 1 -s "$SANDBOX_SUBNET" -j VPS-SANDBOX-EGRESS

echo "Sandbox egress firewall installed for $SANDBOX_SUBNET"
