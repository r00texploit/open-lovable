#!/bin/sh
set -eu

: "${VPS_AGENT_TOKEN:?Export VPS_AGENT_TOKEN before running}"
: "${VPS_BASE_DOMAIN:?Export VPS_BASE_DOMAIN before running}"

AGENT_URL="${VPS_AGENT_URL:-http://127.0.0.1:3001}"
ROUTER_URL="${VPS_PUBLIC_ROUTER_URL:-http://127.0.0.1:8080}"
STAMP="$(date +%s)"
SANDBOX_ID="smoke-sandbox-$STAMP"
SITE_ID="smoke-site-$STAMP"
SUBDOMAIN="smoke-$STAMP"
AUTH="Authorization: Bearer $VPS_AGENT_TOKEN"

cleanup() {
  curl -fsS -X DELETE -H "$AUTH" "$AGENT_URL/sandboxes/$SANDBOX_ID" >/dev/null 2>&1 || true
  curl -fsS -X DELETE -H "$AUTH" "$AGENT_URL/deployments/$SITE_ID" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

curl -fsS "$AGENT_URL/health" >/dev/null
unauthorized="$(curl -sS -o /dev/null -w '%{http_code}' "$AGENT_URL/routes")"
[ "$unauthorized" = "401" ] || { echo "Expected unauthenticated /routes to return 401" >&2; exit 1; }

curl -fsS -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  --data "{\"sandboxName\":\"$SANDBOX_ID\",\"sandboxId\":\"$SANDBOX_ID\",\"subdomain\":\"$SUBDOMAIN-preview\",\"baseDomain\":\"$VPS_BASE_DOMAIN\",\"setupOnCreate\":true,\"timeoutMinutes\":10}" \
  "$AGENT_URL/sandboxes" >/dev/null

SANDBOX_JSON="$(curl -fsS -H "$AUTH" "$AGENT_URL/sandboxes/$SANDBOX_ID")"
CONTAINER_ID="$(printf '%s' "$SANDBOX_JSON" | node -e "let data='';process.stdin.on('data',c=>data+=c).on('end',()=>process.stdout.write(JSON.parse(data).containerId))")"
EXPECTED_RUNTIME="${VPS_SANDBOX_RUNTIME:-runsc}"
[ "$(docker inspect --format '{{.HostConfig.Runtime}}' "$CONTAINER_ID")" = "$EXPECTED_RUNTIME" ] || {
  echo "Sandbox is not using the expected OCI runtime" >&2; exit 1;
}
[ "$(docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' "$CONTAINER_ID")" = "true" ] || {
  echo "Sandbox root filesystem is not read-only" >&2; exit 1;
}
[ "$(docker inspect --format '{{.Config.User}}' "$CONTAINER_ID")" = "1000:1000" ] || {
  echo "Sandbox is not running as the production non-root user" >&2; exit 1;
}
[ "$(docker inspect --format '{{.State.Health.Status}}' vps-sandbox-firewall)" = "healthy" ] || {
  echo "Sandbox egress firewall is not healthy" >&2; exit 1;
}
docker exec "$CONTAINER_ID" node -e \
  "fetch('http://169.254.169.254/latest/meta-data/', {signal: AbortSignal.timeout(3000)}).then(()=>process.exit(1)).catch(()=>process.exit(0))" || {
  echo "Sandbox can reach the cloud metadata address" >&2; exit 1;
}

curl -fsS -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  --data '{"command":"printf smoke-ok"}' \
  "$AGENT_URL/sandboxes/$SANDBOX_ID/exec" | grep -q 'smoke-ok'

curl -fsS -H "Host: $SUBDOMAIN-preview.$VPS_BASE_DOMAIN" "$ROUTER_URL/" | grep -q 'Sandbox App'

escape_status="$(curl -sS -o /dev/null -w '%{http_code}' -H "$AUTH" \
  "$AGENT_URL/sandboxes/$SANDBOX_ID/files?path=%2Fetc%2Fpasswd")"
[ "$escape_status" = "500" ] || { echo "Sandbox path escape was not rejected" >&2; exit 1; }

INDEX_CONTENT='PGgxPnZwcy1zbW9rZS1vazwvaDE+'
curl -fsS -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  --data "{\"siteId\":\"$SITE_ID\",\"subdomain\":\"$SUBDOMAIN\",\"files\":[{\"path\":\"index.html\",\"content\":\"$INDEX_CONTENT\",\"encoding\":\"base64\"}]}" \
  "$AGENT_URL/deployments" >/dev/null

curl -fsS -H "Host: $SUBDOMAIN.$VPS_BASE_DOMAIN" "$ROUTER_URL/" | grep -q 'vps-smoke-ok'

CUSTOM_DOMAIN="$SUBDOMAIN.example.invalid"
DOMAIN_TOKEN='smoke-domain-verification-token-1234567890'
curl -fsS -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  --data "{\"domain\":\"$CUSTOM_DOMAIN\",\"siteId\":\"$SITE_ID\",\"verificationToken\":\"$DOMAIN_TOKEN\"}" \
  "$AGENT_URL/domains" >/dev/null
ask_status="$(curl -sS -o /dev/null -w '%{http_code}' "$AGENT_URL/caddy/ask?domain=$CUSTOM_DOMAIN")"
[ "$ask_status" = "200" ] || { echo "Caddy domain authorization failed" >&2; exit 1; }

echo "VPS production smoke test passed"
