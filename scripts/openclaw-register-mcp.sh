#!/usr/bin/env bash
# Register AgentPay as a native OpenClaw MCP server.
# OpenClaw agents CANNOT use gateway config.patch on mcp.servers — use this CLI instead.
#
# Usage:
#   source /home/node/.openclaw/agentpay-mcp/openclaw.env
#   ./scripts/openclaw-register-mcp.sh
set -euo pipefail

AGENTPAY_MCP_ROOT="${AGENTPAY_MCP_ROOT:-/home/node/.openclaw/agentpay-mcp}"
AGENTPAY_BACKEND_URL="${AGENTPAY_BACKEND_URL:-http://206.189.229.113:3000}"
AGENTPAY_CONFIG_DIR="${AGENTPAY_CONFIG_DIR:-/home/node/.openclaw/agentpay}"
AGENTPAY_AGENT_ID="${AGENTPAY_AGENT_ID:-agent_123}"
OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"

if [[ ! -f "$AGENTPAY_MCP_ROOT/build/index.js" ]]; then
  echo "Missing $AGENTPAY_MCP_ROOT/build/index.js — run npm run build or openclaw-install.sh first." >&2
  exit 1
fi

exec "$OPENCLAW_BIN" mcp add agentpay \
  --command node \
  --arg "$AGENTPAY_MCP_ROOT/build/index.js" \
  --arg start \
  --env "AGENTPAY_BACKEND_URL=$AGENTPAY_BACKEND_URL" \
  --env "AGENTPAY_CONFIG_DIR=$AGENTPAY_CONFIG_DIR" \
  --env "AGENTPAY_AGENT_ID=$AGENTPAY_AGENT_ID"
