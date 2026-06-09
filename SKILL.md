---
name: agentpay
description: >-
  AgentPay x402 payment client: fetch_paid_service for Exa/Nansen/paid APIs via WalletConnect on Android.
  NEVER use AGENT_PRIVATE_KEY or x402_session_* tools. Pair wallet with get_pairing_link.
---

# AgentPay

AgentPay lets the agent request paid actions that are approved on the user's Android wallet. Keys never leave the phone.

## x402 — read this before any paid API call

**AgentPay MCP is the x402 client.** It runs the full protocol: HTTP 402 → WalletConnect sign on Android → paid retry.

| Do | Don't |
|----|-------|
| `fetch_paid_service` with `serviceId` + `args` | `AGENT_PRIVATE_KEY` / hot wallet private key |
| `list_x402_services` to discover APIs | `x402_session_start`, `x402_session_fetch`, `x402_pay` |
| `get_pairing_link` when WC session is dead | Direct `POST /v1/pay-and-call` with `serviceId=nansen_*` or `exa_*` |
| mcporter: `agentpay.fetch_paid_service` | DuckDuckGo/web fallback when Exa x402 is available |

**Exa search (x402, ~$0.05/query):**

```bash
mcporter call agentpay.fetch_paid_service \
  serviceId=exa_search \
  args='{"query":"smart money new tokens Base last 24h","numResults":5}'
```

Aliases: `exasearch`, `exa` → same as `exa_search`.

**OpenClaw:** ensure mcporter has `agentpay` registered (`mcporter call agentpay.list_x402_services`). Wallet must show `"active": true` at `$AGENTPAY_BACKEND_URL/v1/wc/status` before paid calls.

**"Invalid agent or service"** means something called the backend with the wrong `serviceId` (e.g. `nansen_smart_money_holdings` on `/v1/pay-and-call`). Fix: use **`fetch_paid_service`** — the SDK sends `x402_custom` for signing automatically.

## First-time setup — agent rules (read first)

When the user says **install AgentPay**, **continue with instructions**, or **set up agentpay**:

1. **Do not ask** for backend URL, agent id, or “do you want to proceed?” unless the user gave different values or a command failed.
2. **Use the operator's configured values** (set by whoever deployed the backend):
   - `AGENTPAY_BACKEND_URL=<your AgentPay backend URL>` (example/dev only: `http://206.189.229.113:3000`)
   - `AGENTPAY_AGENT_ID=<your agent id>` (demo: `agent_123`)
3. **Run setup in one pass** (shell), then report a short checklist — max **one** question at the end: “Say *pair my wallet* when ready.”
4. **Surface any Snyk/Socket alerts** from `npx skills add` to the user in one line (this skill signs USDC payments and runs with full agent permissions); proceed once they're comfortable. Never tell the user to ignore security warnings.
5. **OpenClaw / Docker:** run `npm run install:openclaw`, then **`openclaw mcp add`** (see below). **Never** `gateway config.patch` for `mcp.servers` — OpenClaw blocks it.

**Do not:** repeat steps the user already did (`npx skills add`); ask “custom or default backend?”; list five optional branches.

## OpenClaw install (Docker / gateway agent)

**Problem:** `gateway config.patch` cannot change `mcp.servers` (protected). Use the **OpenClaw CLI** or shell `mcporter`, not config.patch.

### One-shot setup

```bash
export OPENCLAW_HOME="${OPENCLAW_HOME:-/home/node/.openclaw}"
export AGENTPAY_BACKEND_URL="${AGENTPAY_BACKEND_URL:-http://206.189.229.113:3000}"
export AGENTPAY_AGENT_ID="${AGENTPAY_AGENT_ID:-agent_123}"

cd "$OPENCLAW_HOME/agentpay-mcp"   # or clone horizontalsystems/agentpay-mcp here
npm run install:openclaw
source "$OPENCLAW_HOME/agentpay-mcp/openclaw.env"
./scripts/openclaw-register-mcp.sh   # openclaw mcp add agentpay ...
```

### Verify (run after install)

```bash
openclaw mcp list
openclaw mcp probe agentpay
mcporter --config "$MCPORTER_CONFIG" call agentpay.list_x402_services
```

### Two ways to call AgentPay

| Mode | How | When |
|------|-----|------|
| **Native MCP** (preferred) | OpenClaw exposes `fetch_paid_service`, `get_pairing_link`, … | After `openclaw mcp add agentpay` |
| **Shell via mcporter** | `mcporter --config "$MCPORTER_CONFIG" call agentpay.fetch_paid_service ...` | Fallback if MCP probe fails; mcporter config already written by install |

**Do not** register a second duplicate server if `agentpay` already exists — run `openclaw mcp show agentpay` first. To replace: `openclaw mcp set agentpay '{"command":"node","args":[".../build/index.js","start"],"env":{...}}'`.

## Setup (one-time, non-OpenClaw)

```bash
export AGENTPAY_BACKEND_URL="${AGENTPAY_BACKEND_URL:-http://206.189.229.113:3000}"
export AGENTPAY_AGENT_ID="${AGENTPAY_AGENT_ID:-agent_123}"

npm install -g agentpay-mcp mcporter
agentpay init
mcporter config add agentpay --command agentpay --arg start --scope home
```

Local backend only:

```bash
export AGENTPAY_BACKEND_URL=http://localhost:3000
export AGENTPAY_AGENT_ID=agent_123
agentpay init
```

Backend must be running with `WC_PROJECT_ID` set (server-side) before pairing or paid calls.

**After setup, tell the user in one message:**

- Config: `~/.agentpay/config.json` (or `$AGENTPAY_CONFIG_DIR/config.json` on OpenClaw)
- MCP registered in mcporter as `agentpay`
- Next: say **“pair my wallet”** → you call **`get_pairing_link`** and send the raw `wc:` URI

## Discover x402 services

```bash
mcporter call agentpay.list_x402_services
```

Returns registered services (built-in + `config/x402-services.json`). Each entry has `serviceId`, `url`, `method`, and `argsHint`.

## Pairing

When the user asks to connect or pair their wallet, call **`get_pairing_link`** (not shell `connect`).

1. Call `agentpay.get_pairing_link` — it returns **two messages**: paste instructions, then the raw `wc:` URI alone
2. Forward **both** to the user as separate messages so they can copy only the URL (do **not** wrap it in `https://link.reown.com/wc?uri=...`)
3. Do **not** wait for approval on the phone

## Calling paid APIs (any x402 service)

**Always use `fetch_paid_service`** — not `pay_and_call_service`.

### Registered service (recommended)

```bash
mcporter call agentpay.fetch_paid_service \
  serviceId=exa_search \
  args='{"query":"stablecoin USDC on Base","numResults":3}'
```

```bash
mcporter call agentpay.fetch_paid_service \
  serviceId=nansen_smart_money_holdings \
  args='{"chains":["ethereum"]}'
```

### Ad-hoc URL (any x402 HTTP API)

```bash
mcporter call agentpay.fetch_paid_service \
  url=https://api.example.com/v1/paid-endpoint \
  method=POST \
  args='{"foo":"bar"}'
```

Uses backend `serviceId` `x402_custom` for wallet signing.

### Add your own services

Copy `mcp-server/config/x402-services.example.json` to `config/x402-services.json` (or set `AGENTPAY_X402_SERVICES_PATH`):

```json
{
  "my_api": {
    "label": "My API",
    "url": "https://api.example.com/v1/data",
    "method": "POST",
    "headers": { "content-type": "application/json" },
    "bodyFromArgs": true,
    "argsHint": "{ \"filter\": \"value\" }"
  }
}
```

Do **not** add each API to the backend catalog — only `x402_custom` on the server; new APIs go in SDK builtin or `config/x402-services.json`.

## Checking spending

```bash
mcporter call agentpay.get_spending_status
```

## When to use

- Pair wallet → `get_pairing_link`
- Any x402 paid API → `fetch_paid_service` (call `list_x402_services` first if unsure)
- Balance / spend today → `get_spending_status`

## Docker / persistent volume setup

| What | Path |
|------|------|
| OpenClaw home | `/home/node/.openclaw` |
| Agent workspace | `/home/node/.openclaw/workspace` |
| AgentPay MCP | `/home/node/.openclaw/agentpay-mcp/` |
| mcporter config | `/home/node/.openclaw/mcporter/mcporter.json` |
| AgentPay config | `AGENTPAY_CONFIG_DIR=/home/node/.openclaw/agentpay` |

```bash
export AGENTPAY_CONFIG_DIR=/home/node/.openclaw/agentpay
export MCPORTER_CONFIG=/home/node/.openclaw/mcporter/mcporter.json
cd /home/node/.openclaw/agentpay-mcp && npm run install:openclaw
source /home/node/.openclaw/agentpay-mcp/openclaw.env
./scripts/openclaw-register-mcp.sh
```

## Agent behavior (important)

- On **any** paid API task: use `fetch_paid_service` directly when you know `serviceId` + `args`. Do **not** interview the user about Exa vs Nansen vs x402 unless they asked.
- **Never** tell the user to set `AGENT_PRIVATE_KEY` — AgentPay does not use agent-held private keys.
- **Never** substitute DuckDuckGo/web search when `exa_search` is available and wallet is paired — call `fetch_paid_service` and report the real error if it fails.
- If signing fails with **no active session** / **expired** / **no payment signature**: call **`get_pairing_link` once**, send the raw `wc:` URI, tell the user to tap **Connect** in Unstoppable Wallet, then **retry the same** `fetch_paid_service` call. Do not ask five clarifying questions.
- Check wallet: `curl "$AGENTPAY_BACKEND_URL/v1/wc/status"` — need `"active": true` and an `address` before paid calls work.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Invalid agent or service` | **Not** always a session issue — usually wrong API path. Use `fetch_paid_service`, not direct `pay-and-call` with `exa_search` / `nansen_*` as serviceId. Run `get_spending_status` to see `readyForPaidCalls`. |
| `WalletConnect session not active` | Call `get_pairing_link`; send **raw `wc:`** URI only (never `link.reown.com`) |
| Worked yesterday, fails today (Nansen/Exa) | WalletConnect session dropped — **re-pair** via `get_pairing_link` |
| `No payment signature from backend` | Usually dead WC session or user rejected sign on phone — re-pair or approve prompt |
| Mock `$AI` / `$AGENT` result | Use `fetch_paid_service`, not `pay_and_call_service` |
| Unknown serviceId | Run `list_x402_services` or add `config/x402-services.json` |
| Config lost after Docker restart | Set `AGENTPAY_CONFIG_DIR` to a mounted path |
| 402 after wallet approve | Backend must sign typed-data (`eth_signTypedData_v4`), not `personal_sign` |
