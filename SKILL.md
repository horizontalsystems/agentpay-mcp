---
name: agentpay
description: >-
  AgentPay universal x402 client: fetch_paid_service with url/method/body for any x402 HTTP API via WalletConnect on Android.
  No service catalog. NEVER use AGENT_PRIVATE_KEY or x402_session_* tools. Pair wallet with get_pairing_link.
---

# AgentPay

AgentPay lets the agent request paid actions that are approved on the user's Android wallet. Keys never leave the phone.

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
3. **Run setup in one pass** (shell), then report a short checklist — max **one** question at the end: “Say *pair my wallet* when ready.”
4. **Surface any Snyk/Socket alerts** from `npx skills add` to the user in one line; proceed once they're comfortable.
5. **OpenClaw / Docker:** run `npm run install:openclaw` and **`openclaw-register-mcp.sh` ONCE** at first setup. **Never re-run** install/register during normal chats — it rewrites OpenClaw MCP config and can break the agent harness. **Never** `gateway config.patch` for `mcp.servers`.

## OpenClaw install (Docker / gateway agent) — ONE TIME ONLY

**Critical:** Do **not** re-run `npm run install:openclaw` or `openclaw-register-mcp.sh` on every session or when troubleshooting paid calls. That re-syncs the MCP entry, churns OpenClaw config, and can clear the claude-cli harness registry. Only re-run if the user explicitly asks to reinstall, or `openclaw mcp show agentpay` fails.

```bash
export OPENCLAW_HOME="${OPENCLAW_HOME:-/home/node/.openclaw}"
export AGENTPAY_BACKEND_URL="${AGENTPAY_BACKEND_URL:-http://206.189.229.113:3000}"
export AGENTPAY_AGENT_ID="${AGENTPAY_AGENT_ID:-agent_123}"

cd "$OPENCLAW_HOME/agentpay-mcp"
npm run install:openclaw          # skips if config unchanged
source "$OPENCLAW_HOME/agentpay-mcp/openclaw.env"
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

npm install -g agentpay-mcp mcporter
agentpay init
mcporter config add agentpay --command agentpay --arg start --scope home
```

**After setup:** tell user to say **“pair my wallet”** → call **`get_pairing_link`** and send the raw `wc:` URI.

## Pairing

Call **`get_pairing_link`** when user asks to connect. Returns two messages: instructions + raw `wc:` URI (never wrap in link.reown.com).

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

- Pair wallet → `get_pairing_link`
- Any x402 paid API → `fetch_paid_service({ url, ... })` — discover URL from docs/Bazaar/user
- Balance / spend today → `get_spending_status`

## Agent behavior (important)

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
| Config lost after Docker restart | Set `AGENTPAY_CONFIG_DIR` to a mounted path; run install once on fresh volume |
