#!/usr/bin/env bash
# Verify AgentPay MCP is the horizontalsystems build (not npm impostor v4.x).
set -euo pipefail

AGENTPAY_MCP_ROOT="${AGENTPAY_MCP_ROOT:-/home/node/.openclaw/agentpay-mcp}"
MCPORTER_CONFIG="${MCPORTER_CONFIG:-${OPENCLAW_HOME:-/home/node/.openclaw}/mcporter/mcporter.json}"
EXPECTED_BIN="$AGENTPAY_MCP_ROOT/build/index.js"
ERR=0

echo "[verify] AGENTPAY_MCP_ROOT=$AGENTPAY_MCP_ROOT"

if [[ ! -f "$EXPECTED_BIN" ]]; then
  echo "[verify] FAIL: missing $EXPECTED_BIN" >&2
  echo "[verify] Fix: git clone https://github.com/horizontalsystems/agentpay-mcp.git \"$AGENTPAY_MCP_ROOT\" && cd \"$AGENTPAY_MCP_ROOT\" && npm install && npm run build" >&2
  ERR=1
else
  if grep -q 'get_pairing_link' "$EXPECTED_BIN" && grep -q 'fetch_paid_service' "$EXPECTED_BIN" && grep -q 'walletconnect-x402-v2' "$EXPECTED_BIN"; then
    echo "[verify] OK: bundle has fetch_paid_service + get_pairing_link (v2 API)"
  else
    echo "[verify] FAIL: $EXPECTED_BIN is not horizontalsystems/agentpay-mcp v2 (missing expected tools/API marker)" >&2
    ERR=1
  fi
  if grep -qE "registerTool\(['\"]x402_session_start['\"]" "$EXPECTED_BIN" 2>/dev/null; then
    echo "[verify] FAIL: bundle is npm impostor (x402_session_start tool registered)" >&2
    ERR=1
  fi
fi

# Wrong npm global package (different repo: up2itnow0822/agentpay-mcp, dist/index.js)
if command -v npm >/dev/null 2>&1; then
  GLOBAL_VER="$(npm list -g agentpay-mcp --depth=0 2>/dev/null | grep agentpay-mcp || true)"
  if [[ -n "$GLOBAL_VER" ]]; then
    echo "[verify] WARN: global npm agentpay-mcp installed ($GLOBAL_VER) — NOT horizontalsystems MCP; ignore for OpenClaw" >&2
    echo "[verify]       npm uninstall -g agentpay-mcp   # optional cleanup" >&2
  fi
fi

if [[ -f "$MCPORTER_CONFIG" ]]; then
  if grep -q 'dist/index.js' "$MCPORTER_CONFIG"; then
    echo "[verify] FAIL: mcporter config uses dist/index.js (npm v4.x path)" >&2
    ERR=1
  elif ! grep -q "$AGENTPAY_MCP_ROOT/build/index.js" "$MCPORTER_CONFIG"; then
    echo "[verify] FAIL: mcporter config does not point to $EXPECTED_BIN" >&2
    echo "[verify]       Current args:" >&2
    grep -A2 '"args"' "$MCPORTER_CONFIG" >&2 || true
    ERR=1
  else
    echo "[verify] OK: mcporter config points to build/index.js"
  fi
else
  echo "[verify] WARN: no mcporter config at $MCPORTER_CONFIG (run openclaw-install.sh)"
fi

if command -v node >/dev/null 2>&1 && [[ -f "$EXPECTED_BIN" ]]; then
  TOOLS="$(node "$EXPECTED_BIN" tools 2>/dev/null || true)"
  if [[ -n "$TOOLS" ]]; then
    echo "[verify] CLI tools: $TOOLS"
  fi
fi

if [[ "$ERR" -ne 0 ]]; then
  echo "[verify] FAILED — see messages above" >&2
  exit 1
fi

echo "[verify] All checks passed"
