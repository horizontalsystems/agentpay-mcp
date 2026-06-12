#!/usr/bin/env bash
# First-run setup for OpenClaw / Docker: persistent mcporter + AgentPay configs.
# Usage:
#   AGENTPAY_BACKEND_URL=http://host:3000 AGENTPAY_AGENT_ID=agent_123 \
#     ./scripts/openclaw-install.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

OPENCLAW_HOME="${OPENCLAW_HOME:-/home/node/.openclaw}"
AGENTPAY_MCP_ROOT="${AGENTPAY_MCP_ROOT:-$OPENCLAW_HOME/agentpay-mcp}"
MCPORTER_CONFIG="${MCPORTER_CONFIG:-$OPENCLAW_HOME/mcporter/mcporter.json}"
MCPORTER_PREFIX="${MCPORTER_PREFIX:-$OPENCLAW_HOME/tools/mcporter}"
AGENTPAY_BACKEND_URL="${AGENTPAY_BACKEND_URL:-http://206.189.229.113:3000}"
AGENTPAY_AGENT_ID="${AGENTPAY_AGENT_ID:-agent_123}"
AGENTPAY_API_KEY="${AGENTPAY_API_KEY:-}"
AGENTPAY_CONFIG_DIR="${AGENTPAY_CONFIG_DIR:-$OPENCLAW_HOME/agentpay}"

echo "[openclaw-install] OPENCLAW_HOME=$OPENCLAW_HOME"
echo "[openclaw-install] AGENTPAY_MCP_ROOT=$AGENTPAY_MCP_ROOT"
echo "[openclaw-install] MCPORTER_CONFIG=$MCPORTER_CONFIG"

mkdir -p "$(dirname "$MCPORTER_CONFIG")" "$MCPORTER_PREFIX" "$OPENCLAW_HOME" "$AGENTPAY_CONFIG_DIR"
export AGENTPAY_CONFIG_DIR AGENTPAY_BACKEND_URL AGENTPAY_AGENT_ID AGENTPAY_API_KEY

MCP_ROOT_ABS="$(cd "$MCP_ROOT" && pwd)"
mkdir -p "$AGENTPAY_MCP_ROOT"
AGENTPAY_MCP_ROOT_ABS="$(cd "$AGENTPAY_MCP_ROOT" && pwd)"

# Copy to persistent path when install runs from a different directory (e.g. CI checkout → volume)
if [[ "$MCP_ROOT_ABS" != "$AGENTPAY_MCP_ROOT_ABS" ]]; then
  echo "[openclaw-install] Copying MCP package to $AGENTPAY_MCP_ROOT_ABS"
  rsync -a --delete \
    --exclude node_modules \
    "$MCP_ROOT_ABS/" "$AGENTPAY_MCP_ROOT_ABS/" \
    || cp -r "$MCP_ROOT_ABS/." "$AGENTPAY_MCP_ROOT_ABS/"
fi

cd "$AGENTPAY_MCP_ROOT_ABS"

# Runtime uses prebuilt build/index.js (SDK bundled inside). No npm registry needed.
BUNDLE="$AGENTPAY_MCP_ROOT_ABS/build/index.js"
if [[ -f "$BUNDLE" ]] && node "$BUNDLE" doctor >/dev/null 2>&1; then
  echo "[openclaw-install] Prebuilt bundle OK — skipping npm install/build (no @agentpay/sdk from npm required)"
elif [[ -f package.json && -d sdk ]]; then
  echo "[openclaw-install] Rebuilding from source (vendored sdk/ in repo)..."
  npm install
  npm run build
elif [[ -f package.json ]]; then
  echo "[openclaw-install] ERROR: build/index.js missing or invalid, and no sdk/ for rebuild." >&2
  echo "[openclaw-install] Fix: git pull horizontalsystems/agentpay-mcp (includes prebuilt build/ + sdk/)" >&2
  exit 1
else
  echo "[openclaw-install] ERROR: no package.json or build/index.js at $AGENTPAY_MCP_ROOT_ABS" >&2
  exit 1
fi

if ! node "$BUNDLE" doctor >/dev/null 2>&1; then
  echo "[openclaw-install] ERROR: bundle failed doctor check after install" >&2
  node "$BUNDLE" doctor || true
  exit 1
fi

# mcporter → persistent prefix (survives container restart; do not rely on global npm)
echo "[openclaw-install] Installing mcporter to $MCPORTER_PREFIX"
npm install --prefix "$MCPORTER_PREFIX" mcporter@latest

# AgentPay CLI config ($AGENTPAY_CONFIG_DIR/config.json — persistent volume)
if [[ -f "$AGENTPAY_CONFIG_DIR/config.json" && "${AGENTPAY_INSTALL_FORCE:-}" != "1" ]]; then
  echo "[openclaw-install] AgentPay config exists — skipping agentpay init (set AGENTPAY_INSTALL_FORCE=1 to overwrite)"
else
  node "$AGENTPAY_MCP_ROOT/build/index.js" init \
    --backend-url "$AGENTPAY_BACKEND_URL" \
    --agent-id "$AGENTPAY_AGENT_ID" \
    ${AGENTPAY_API_KEY:+--api-key "$AGENTPAY_API_KEY"}
fi

# mcporter MCP server entry (shell fallback — does not touch OpenClaw native mcp config)
TEMPLATE="$AGENTPAY_MCP_ROOT/config/mcporter.openclaw.json"
if [[ ! -f "$TEMPLATE" ]]; then
  TEMPLATE="$MCP_ROOT/config/mcporter.openclaw.json"
fi

mkdir -p "$(dirname "$MCPORTER_CONFIG")"
NEW_MCPORTER="$(mktemp)"
sed \
  -e "s|__AGENTPAY_MCP_ROOT__|$AGENTPAY_MCP_ROOT|g" \
  -e "s|__AGENTPAY_BACKEND_URL__|$AGENTPAY_BACKEND_URL|g" \
  -e "s|__AGENTPAY_AGENT_ID__|$AGENTPAY_AGENT_ID|g" \
  -e "s|__AGENTPAY_CONFIG_DIR__|$AGENTPAY_CONFIG_DIR|g" \
  "$TEMPLATE" > "$NEW_MCPORTER"

if [[ -f "$MCPORTER_CONFIG" && "${AGENTPAY_INSTALL_FORCE:-}" != "1" ]] && cmp -s "$NEW_MCPORTER" "$MCPORTER_CONFIG"; then
  echo "[openclaw-install] mcporter config unchanged — skipping write"
  rm -f "$NEW_MCPORTER"
else
  mv "$NEW_MCPORTER" "$MCPORTER_CONFIG"
  echo "[openclaw-install] Wrote mcporter config: $MCPORTER_CONFIG"
fi

# Force mcporter rewrite if it still points at npm impostor (dist/index.js) or wrong root
if [[ -f "$MCPORTER_CONFIG" ]] && ! grep -q "$AGENTPAY_MCP_ROOT/build/index.js" "$MCPORTER_CONFIG"; then
  echo "[openclaw-install] mcporter path wrong — rewriting to $AGENTPAY_MCP_ROOT/build/index.js"
  sed \
    -e "s|__AGENTPAY_MCP_ROOT__|$AGENTPAY_MCP_ROOT|g" \
    -e "s|__AGENTPAY_BACKEND_URL__|$AGENTPAY_BACKEND_URL|g" \
    -e "s|__AGENTPAY_AGENT_ID__|$AGENTPAY_AGENT_ID|g" \
    -e "s|__AGENTPAY_CONFIG_DIR__|$AGENTPAY_CONFIG_DIR|g" \
    "$TEMPLATE" > "$MCPORTER_CONFIG"
fi

VERIFY_SCRIPT="$AGENTPAY_MCP_ROOT/scripts/openclaw-verify-mcp.sh"
chmod +x "$VERIFY_SCRIPT" 2>/dev/null || true
if [[ -x "$VERIFY_SCRIPT" ]]; then
  AGENTPAY_MCP_ROOT="$AGENTPAY_MCP_ROOT" MCPORTER_CONFIG="$MCPORTER_CONFIG" "$VERIFY_SCRIPT" || true
fi

ENV_FILE="$AGENTPAY_MCP_ROOT/openclaw.env"
cat > "$ENV_FILE" <<EOF
# Generated by openclaw-install.sh — source in shell profile
export OPENCLAW_HOME="$OPENCLAW_HOME"
export AGENTPAY_MCP_ROOT="$AGENTPAY_MCP_ROOT"
export MCPORTER_CONFIG="$MCPORTER_CONFIG"
export MCPORTER_PREFIX="$MCPORTER_PREFIX"
export AGENTPAY_BACKEND_URL="$AGENTPAY_BACKEND_URL"
export AGENTPAY_AGENT_ID="$AGENTPAY_AGENT_ID"
export AGENTPAY_CONFIG_DIR="$AGENTPAY_CONFIG_DIR"
export PATH="\$MCPORTER_PREFIX/node_modules/.bin:\$PATH"
EOF

REGISTER_SCRIPT="$AGENTPAY_MCP_ROOT/scripts/openclaw-register-mcp.sh"
chmod +x "$REGISTER_SCRIPT" 2>/dev/null || true

echo ""
echo "[openclaw-install] Done."
echo "  AgentPay config:  $AGENTPAY_CONFIG_DIR/config.json"
echo "  mcporter config:  $MCPORTER_CONFIG"
echo "  mcporter binary:  $MCPORTER_PREFIX/node_modules/.bin/mcporter"
echo "  Env bootstrap:    source $ENV_FILE"
echo ""
echo "Register native OpenClaw MCP ONCE (skips if already registered — avoids config churn):"
echo "  source $ENV_FILE"
echo "  $REGISTER_SCRIPT"
echo ""
echo "Do NOT re-run install or register on every chat — only if MCP is missing or you changed paths."
echo "  Force: AGENTPAY_INSTALL_FORCE=1 npm run install:openclaw"
echo "  Force register: AGENTPAY_MCP_FORCE=1 $REGISTER_SCRIPT"
echo ""
echo "Verify:"
echo "  openclaw mcp list"
echo "  openclaw mcp probe agentpay"
echo "  mcporter --config \"$MCPORTER_CONFIG\" call agentpay.get_spending_status"
echo ""
echo "Install skill from: $AGENTPAY_MCP_ROOT/SKILL.md"
echo ""
echo "Android app (share with user before pairing):"
echo "  https://rafaelekol.github.io/agentpay/agentPay.apk"
