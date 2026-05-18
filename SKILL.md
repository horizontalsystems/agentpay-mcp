---
name: agentpay
description: >-
  AgentPay payment firewall: pair the user's Android wallet and request paid
  actions via MCP. Use when the user mentions AgentPay, connect/pair wallet, pay
  for a service, balance, or spending limits.
---

# AgentPay

AgentPay lets the agent request paid actions that are approved on the user's Android wallet. Keys never leave the phone.

## Setup (one-time)

```bash
npm install -g agentpay-mcp mcporter
agentpay init
mcporter config add agentpay --command agentpay --arg start --scope home
```

Set backend URL and agent id via env before `init`, or edit `~/.agentpay/config.json` after:

```bash
export AGENTPAY_BACKEND_URL=http://localhost:3000
export AGENTPAY_AGENT_ID=agent_123
agentpay init
```

Ensure the AgentPay backend is running and `WC_PROJECT_ID` is configured server-side before pairing or spending.

## Discover x402 services

```bash
mcporter call agentpay.list_x402_services
```

Returns registered services (built-in + `config/x402-services.json`). Each entry has `serviceId`, `url`, `method`, and `argsHint`.

## Pairing

When the user asks to connect or pair their wallet, call **`get_pairing_link`** (not shell `connect`).

1. Call `agentpay.get_pairing_link`
2. Send the `https://link.reown.com/wc?uri=...` URL to the user
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

Also add the same `serviceId` to the backend catalog (`backend/src/servicesCatalog.ts`) with `x402: true`.

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
npm run install:openclaw -w agentpay-mcp
source /home/node/.openclaw/agentpay-mcp/openclaw.env
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Mock `$AI` / `$AGENT` result | Use `fetch_paid_service`, not `pay_and_call_service` |
| Unknown serviceId | Run `list_x402_services` or add `config/x402-services.json` |
| Config lost after Docker restart | Set `AGENTPAY_CONFIG_DIR` to a mounted path |
| 402 after wallet approve | Backend must sign typed-data (`eth_signTypedData_v4`), not `personal_sign` |
