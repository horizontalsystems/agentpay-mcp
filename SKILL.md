---
name: agentpay
description: >-
  AgentPay universal x402 client: fetch_paid_service with url/method/body for any x402 HTTP API via WalletConnect on Android.
  No service catalog. NEVER use AGENT_PRIVATE_KEY or x402_session_* tools. After MCP install or pairing, ALWAYS paste the APK
  link and raw wc: URI in your user-visible reply — never summarize tool output without those URLs.
---

# AgentPay

AgentPay lets the agent request paid actions that are approved on the user's Android wallet. Keys never leave the phone.

## Installed via `npx skills add` (start here)

If the user ran:

```bash
npx skills add horizontalsystems/agentpay-mcp --skill agentpay --yes --global
```

That installs **agent instructions + a full repo copy** to **`~/.agents/skills/agentpay/`** (includes prebuilt `build/index.js`). It does **not** register OpenClaw MCP or pair the wallet by itself.

**Do this next (one pass, no extra questions):**

```bash
export AGENTPAY_MCP_ROOT="${AGENTPAY_MCP_ROOT:-$HOME/.agents/skills/agentpay}"
export OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
export AGENTPAY_BACKEND_URL="${AGENTPAY_BACKEND_URL:-http://host.docker.internal:3000}"
export AGENTPAY_AGENT_ID="${AGENTPAY_AGENT_ID:-agent_123}"

node "$AGENTPAY_MCP_ROOT/build/index.js" doctor   # must print status: ok

# OpenClaw expects a stable path — symlink skills copy (do not npm install -g agentpay-mcp)
mkdir -p "$OPENCLAW_HOME"
ln -sfn "$AGENTPAY_MCP_ROOT" "$OPENCLAW_HOME/agentpay-mcp"

cd "$AGENTPAY_MCP_ROOT"
npm run install:openclaw
source "$AGENTPAY_MCP_ROOT/openclaw.env"
./scripts/openclaw-verify-mcp.sh
./scripts/openclaw-register-mcp.sh   # ONCE — skips if already registered
```

Then tell the user to **install the Android app** and say **"pair my wallet"** when ready:

**Android APK:** https://rafaelekol.github.io/agentpay/agentPay.apk  
(or MCP tool `get_android_app_link`)

**Never** run bare `npm install` in the skill directory unless `doctor` fails and you are rebuilding from source.

## npm name collision — read this first

**Do NOT run `npm install -g agentpay-mcp`.** The npm registry package `agentpay-mcp@4.x` is a **different project** (`up2itnow0822/agentpay-mcp`) with tools like `x402_session_start`, `x402_pay`, and binary `dist/index.js`.

**This skill** is for **GitHub `horizontalsystems/agentpay-mcp`** only — tools `get_android_app_link`, `fetch_paid_service`, `get_pairing_link`, `get_spending_status`, binary **`build/index.js`**.

Verify after install:

```bash
node "$AGENTPAY_MCP_ROOT/build/index.js" tools
node "$AGENTPAY_MCP_ROOT/build/index.js" doctor
npm run verify:openclaw
```

Expected tools JSON includes `"api": "walletconnect-x402-v2"` and the three tool names above. If you see `x402_session_*`, you installed the wrong package.

**No npm registry for `@agentpay/sdk`:** the GitHub repo ships a **prebuilt `build/index.js`** (SDK bundled inside) plus vendored `sdk/` for rebuilds. **`git pull` + `npm run install:openclaw` does not need `npm install` on the MCP package** when the bundle passes `node build/index.js doctor`.

## x402 — read this before any paid API call

**AgentPay MCP is a universal x402 client.** There is **no service catalog** and **no `list_x402_services` tool**. Call any x402 HTTP endpoint with `url` + optional `method`, `headers`, `body`.

| Do | Don't |
|----|-------|
| `fetch_paid_service({ url, method?, body? })` | `AGENT_PRIVATE_KEY` / hot wallet private key |
| Discover APIs from provider docs, x402 Bazaar, or user | `list_x402_services` (removed) |
| `get_pairing_link` when WC session is dead | `x402_session_start`, `x402_session_fetch`, `x402_pay` |
| mcporter: `agentpay.fetch_paid_service` | Direct `POST /v1/pay-and-call` with registry serviceIds |

**Exa search (x402):**

```bash
mcporter call agentpay.fetch_paid_service \
  url=https://api.exa.ai/search \
  method=POST \
  body='{"query":"smart money new tokens Base last 24h","numResults":5}'
```

**Nansen smart-money holdings (x402):**

```bash
mcporter call agentpay.fetch_paid_service \
  url=https://api.nansen.ai/api/v1/smart-money/holdings \
  method=POST \
  body='{"chains":["ethereum"]}'
```

**OpenClaw:** verify wallet paired: `curl "$AGENTPAY_BACKEND_URL/v1/wc/status"` → `"active": true` before paid calls.

## First-time setup — agent rules (read first)

When the user says **install AgentPay**, **continue with instructions**, or **set up agentpay**:

1. **Do not ask** for backend URL, agent id, or “do you want to proceed?” unless the user gave different values or a command failed.
2. **Use the operator's configured values** (set by whoever deployed the backend):
   - `AGENTPAY_BACKEND_URL=<your AgentPay backend URL>`
   - `AGENTPAY_AGENT_ID=<your agent id>` (demo: `agent_123`)
3. **Run setup in one pass** (shell), then share the **Android APK link** (`get_android_app_link` or https://rafaelekol.github.io/agentpay/agentPay.apk) — max **one** question at the end: “Install the app, then say *pair my wallet*.”
4. **Surface any Snyk/Socket alerts** from `npx skills add` to the user in one line; proceed once they're comfortable.
5. **OpenClaw / Docker:** run `npm run install:openclaw` and **`openclaw-register-mcp.sh` ONCE** at first setup. **Never re-run** install/register during normal chats — it rewrites OpenClaw MCP config and can break the agent harness. **Never** `gateway config.patch` for `mcp.servers`.

## OpenClaw install (Docker / gateway agent) — ONE TIME ONLY

**Critical:** Do **not** re-run `npm run install:openclaw` or `openclaw-register-mcp.sh` on every session or when troubleshooting paid calls. That re-syncs the MCP entry, churns OpenClaw config, and can clear the claude-cli harness registry. Only re-run if the user explicitly asks to reinstall, or `openclaw mcp show agentpay` fails.

```bash
export OPENCLAW_HOME="${OPENCLAW_HOME:-/home/node/.openclaw}"
export AGENTPAY_BACKEND_URL="${AGENTPAY_BACKEND_URL:-http://206.189.229.113:3000}"
export AGENTPAY_AGENT_ID="${AGENTPAY_AGENT_ID:-agent_123}"

# Clone horizontalsystems MCP (NOT npm install -g agentpay-mcp)
if [[ ! -f "$OPENCLAW_HOME/agentpay-mcp/build/index.js" ]]; then
  git clone https://github.com/horizontalsystems/agentpay-mcp.git "$OPENCLAW_HOME/agentpay-mcp"
fi

cd "$OPENCLAW_HOME/agentpay-mcp"
git pull
npm run install:openclaw          # uses prebuilt build/ — no npm registry for @agentpay/sdk
source "$OPENCLAW_HOME/agentpay-mcp/openclaw.env"
node build/index.js doctor        # must print status: ok
./scripts/openclaw-verify-mcp.sh
./scripts/openclaw-register-mcp.sh   # skips if agentpay already registered
```

If MCP already exists: `openclaw mcp probe agentpay` — do **not** register again.

Force reinstall only when user requests or paths changed:
`AGENTPAY_MCP_FORCE=1 ./scripts/openclaw-register-mcp.sh`

### Verify

```bash
openclaw mcp list
openclaw mcp probe agentpay
mcporter --config "$MCPORTER_CONFIG" call agentpay.get_spending_status
```

## Setup (one-time, non-OpenClaw)

```bash
export AGENTPAY_BACKEND_URL="${AGENTPAY_BACKEND_URL:-http://206.189.229.113:3000}"
export AGENTPAY_AGENT_ID="${AGENTPAY_AGENT_ID:-agent_123}"

git clone https://github.com/horizontalsystems/agentpay-mcp.git
cd agentpay-mcp
node build/index.js doctor   # prebuilt bundle — no npm install required for runtime
npm install -g mcporter   # mcporter only — NOT agentpay-mcp from npm
node build/index.js init --backend-url "$AGENTPAY_BACKEND_URL" --agent-id "$AGENTPAY_AGENT_ID"
mcporter config add agentpay --command node --arg "$(pwd)/build/index.js" --arg start --scope home
```

**After setup:** share **Android APK** → user installs app → say **“pair my wallet”** → **`get_pairing_link`**.

## User-facing messages (mandatory — all runtimes)

MCP tools return data **to you**. The user does **not** see tool output unless **you paste it** in your reply. Follow these rules every time:

### After MCP install / setup

When AgentPay setup completes, your **user-visible reply MUST include** the full APK URL on its own line:

```
https://rafaelekol.github.io/agentpay/agentPay.apk
```

Call `get_android_app_link` if needed, then **paste the URL** — do not say “I shared the link” without including it. Do not use a markdown link or shortened URL; paste the full `https://` URL so the user can tap or copy it.

### Pairing (`get_pairing_link`)

When you call `get_pairing_link`, your **user-visible reply MUST include both**:

1. **The APK link** (full URL above) — if the user may not have the app yet  
2. **The raw `wc:` URI** exactly as returned — on its own line, nothing else on that line

**Include the APK link and the raw `wc:` URI in your reply to the user.** Do not paraphrase, summarize, or omit either. Never wrap the `wc:` URI in `https://link.reown.com/...`.

Example user-visible reply shape:

```
Install AgentPay on Android (if you haven't yet):
https://rafaelekol.github.io/agentpay/agentPay.apk

Open the app → WalletConnect → Connect, then paste this URI:
wc:...
```

### What NOT to do

- Do not say “check the tool output above” — the user cannot see it  
- Do not replace the `wc:` URI with a Reown/deep link  
- Do not skip the APK link on first install or first pairing

## Android app

**APK:** https://rafaelekol.github.io/agentpay/agentPay.apk

Call **`get_android_app_link`** after MCP install or when the user has no app. **Always paste this URL in your reply** before first pairing.

## Pairing

Call **`get_pairing_link`** when user asks to connect. Returns three messages: APK link + instructions + raw `wc:` URI. **Paste the APK link and raw `wc:` URI in your reply to the user** (never wrap `wc:` in link.reown.com).

## Calling paid APIs (any x402 service)

**Always use `fetch_paid_service` with a full URL.** Flow: HTTP request → 402 → phone signs USDC → paid retry.

```bash
mcporter call agentpay.fetch_paid_service \
  url=https://api.example.com/v1/paid-endpoint \
  method=POST \
  body='{"foo":"bar"}'
```

Optional `label=short-name` for backend audit logs (defaults to url).

## Checking spending

```bash
mcporter call agentpay.get_spending_status
```

## When to use

- Install Android app → `get_android_app_link` (or APK URL above)
- Pair wallet → `get_pairing_link`
- Any x402 paid API → `fetch_paid_service({ url, ... })` — discover URL from docs/Bazaar/user
- Balance / spend today → `get_spending_status`

## Agent behavior (important)

- **Always paste in your user-visible reply:** APK URL `https://rafaelekol.github.io/agentpay/agentPay.apk` after install; **APK link + raw `wc:` URI** after `get_pairing_link`. Never summarize without including both URLs.
- **Never** re-run `openclaw-register-mcp.sh`, `npm run install:openclaw`, or `openclaw mcp add agentpay` after initial setup — use `get_pairing_link` / `fetch_paid_service` / `get_spending_status` instead.
- **Never** ask the user to pick from a fixed service list — use the URL for the API they need.
- **Never** set `AGENT_PRIVATE_KEY`.
- On `PAYMENT_REJECTED`: user declined on phone — tell them, retry; do **not** re-pair.
- On `WC_SESSION_DEAD` / `NO_ACTIVE_SESSION`: `get_pairing_link`, reconnect, retry.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `PAYMENT_REJECTED` | User declined USDC — retry same `fetch_paid_service` call |
| `WC_SESSION_DEAD` / no response ~8–10s | Re-pair via `get_pairing_link` |
| `WalletConnect session not active` | `get_pairing_link`; raw `wc:` URI only |
| `Invalid agent or service` | Wrong backend path — use MCP `fetch_paid_service`, not direct pay-and-call |
| Config churn / harness reload | Agent re-ran `openclaw mcp add` — **stop**; verify with `openclaw mcp show agentpay`; only `AGENTPAY_MCP_FORCE=1 ./scripts/openclaw-register-mcp.sh` if user asks to reinstall |
| Wrong tools (`x402_session_*`, no `get_pairing_link`) | Installed npm `agentpay-mcp@4.x` impostor — clone GitHub `horizontalsystems/agentpay-mcp`, run `doctor`, fix mcporter path to `build/index.js` |
| `@agentpay/sdk` 404 on npm install | **Expected** — SDK is bundled in `build/index.js`. Use `git pull` + `node build/index.js doctor`; do not run bare `npm install` unless rebuilding from source (repo includes vendored `sdk/`) |
| Config lost after Docker restart | Set `AGENTPAY_CONFIG_DIR` to a mounted path; run install once on fresh volume |
