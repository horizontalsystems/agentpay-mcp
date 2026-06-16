#!/usr/bin/env bash
# Sync mcp-server + vendored sdk to horizontalsystems/agentpay-mcp clone.
# Usage: ./scripts/sync-standalone.sh [/path/to/agentpay-mcp]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MONOREPO_ROOT="$(cd "$MCP_ROOT/.." && pwd)"
STANDALONE="${1:-${AGENTPAY_MCP_STANDALONE:-$MONOREPO_ROOT/../agentpay-mcp}}"

if [[ ! -d "$STANDALONE/.git" ]]; then
  echo "Standalone repo not found: $STANDALONE" >&2
  exit 1
fi

echo "[sync] MCP → $STANDALONE"

rsync -a --delete \
  --exclude node_modules \
  "$MONOREPO_ROOT/sdk/" "$STANDALONE/sdk/"

rsync -a --delete \
  --exclude node_modules \
  "$MCP_ROOT/src/" "$STANDALONE/src/"

rsync -a --delete \
  --exclude node_modules \
  "$MCP_ROOT/scripts/" "$STANDALONE/scripts/"

rsync -a --delete \
  "$MCP_ROOT/config/" "$STANDALONE/config/"

rsync -a --delete \
  "$MCP_ROOT/build/" "$STANDALONE/build/"

for f in SKILL.md README.md openclaw.env.example tsconfig.json; do
  cp "$MCP_ROOT/$f" "$STANDALONE/$f"
done

# Standalone package.json: SDK is vendored (file:./sdk), runtime uses prebuilt build/index.js
cat > "$STANDALONE/package.json" <<'EOF'
{
  "name": "agentpay-mcp",
  "version": "2.0.0",
  "description": "AgentPay MCP firewall CLI — configure once, run as stdio MCP server for LLM agents",
  "bin": {
    "agentpay": "./build/index.js"
  },
  "files": [
    "build",
    "sdk",
    "SKILL.md",
    "README.md",
    "openclaw.env.example",
    "config",
    "scripts"
  ],
  "scripts": {
    "build": "node scripts/build.mjs",
    "prepublishOnly": "npm run build",
    "start": "node build/index.js start",
    "setup": "node build/index.js setup",
    "init": "node build/index.js init",
    "install:openclaw": "bash scripts/openclaw-install.sh",
    "verify:openclaw": "bash scripts/openclaw-verify-mcp.sh"
  },
  "keywords": ["mcp", "agentpay", "walletconnect", "x402", "llm", "skills"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/horizontalsystems/agentpay-mcp.git"
  },
  "engines": { "node": ">=18" },
  "dependencies": {},
  "devDependencies": {
    "@agentpay/sdk": "file:./sdk",
    "@modelcontextprotocol/sdk": "^1.29.0",
    "axios": "^1.6.0",
    "commander": "^12.1.0",
    "conf": "^13.0.0",
    "inquirer": "^12.0.0",
    "zod": "^3.23.8",
    "@types/node": "^20.0.0",
    "esbuild": "^0.24.0",
    "typescript": "^5.0.0"
  }
}
EOF

if [[ ! -f "$STANDALONE/.gitignore" ]]; then
  printf 'node_modules/\n.DS_Store\n*.log\n' > "$STANDALONE/.gitignore"
fi

chmod +x "$STANDALONE/scripts/"*.sh 2>/dev/null || true
echo "[sync] Done. Commit and push from $STANDALONE"
