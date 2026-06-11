#!/usr/bin/env bash
# Register AgentPay as a native OpenClaw MCP server (ONE-TIME — idempotent).
# Re-running `openclaw mcp add` on every agent chat rewrites OpenClaw config and can
# reload/clear the claude-cli harness registry. This script skips if already registered.
#
# Usage:
#   source /home/node/.openclaw/agentpay-mcp/openclaw.env
#   ./scripts/openclaw-register-mcp.sh
#
# Force re-register (only when you intentionally change command/env paths):
#   AGENTPAY_MCP_FORCE=1 ./scripts/openclaw-register-mcp.sh
set -euo pipefail

AGENTPAY_MCP_ROOT="${AGENTPAY_MCP_ROOT:-/home/node/.openclaw/agentpay-mcp}"
AGENTPAY_BACKEND_URL="${AGENTPAY_BACKEND_URL:-http://206.189.229.113:3000}"
AGENTPAY_CONFIG_DIR="${AGENTPAY_CONFIG_DIR:-/home/node/.openclaw/agentpay}"
AGENTPAY_AGENT_ID="${AGENTPAY_AGENT_ID:-agent_123}"
OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"
MCP_NAME="${AGENTPAY_MCP_NAME:-agentpay}"

if [[ ! -f "$AGENTPAY_MCP_ROOT/build/index.js" ]]; then
  echo "Missing $AGENTPAY_MCP_ROOT/build/index.js — run npm run build or openclaw-install.sh first." >&2
  exit 1
fi

if [[ "${AGENTPAY_MCP_FORCE:-}" != "1" ]]; then
  if "$OPENCLAW_BIN" mcp show "$MCP_NAME" >/dev/null 2>&1; then
    echo "[openclaw-register] $MCP_NAME already registered — skipping (avoids OpenClaw config churn)."
    echo "[openclaw-register] Verify: $OPENCLAW_BIN mcp probe $MCP_NAME"
    echo "[openclaw-register] To force re-register: AGENTPAY_MCP_FORCE=1 $0"
    exit 0
  fi
fi

echo "[openclaw-register] Registering $MCP_NAME (first time or AGENTPAY_MCP_FORCE=1)..."

exec "$OPENCLAW_BIN" mcp add "$MCP_NAME" \
  --command node \
  --arg "$AGENTPAY_MCP_ROOT/build/index.js" \
  --arg start \
  --env "AGENTPAY_BACKEND_URL=$AGENTPAY_BACKEND_URL" \
  --env "AGENTPAY_CONFIG_DIR=$AGENTPAY_CONFIG_DIR" \
  --env "AGENTPAY_AGENT_ID=$AGENTPAY_AGENT_ID"
