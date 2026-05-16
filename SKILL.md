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

## Pairing

When the user asks to connect or pair their wallet, call the **`get_pairing_link`** MCP tool (do not run shell `connect` in agent flows).

1. Call `agentpay.get_pairing_link` (via mcporter or your MCP host).
2. Send the returned `https://link.reown.com/wc?uri=...` URL to the user.
3. Tell them to open it in Unstoppable Wallet or any WalletConnect v2 wallet on their phone.
4. Do **not** wait for approval — pairing completes asynchronously on the device.

Do not use `pay_and_call_service` until pairing is complete.

## Making a payment

```bash
mcporter call agentpay.pay_and_call_service serviceId="<id>" amountUsd=<amount> description="<reason>"
```

Known `serviceId` values: `exa_search`, `nansen_smart_money_holdings`.

## Checking spending

```bash
mcporter call agentpay.get_spending_status
```

## When to use

- User says "connect my AgentPay wallet" or "pair my wallet" → `get_pairing_link`, send the URL to the user
- User asks to pay for a service via AgentPay → `pay_and_call_service`
- User asks about balance or spending → `get_spending_status`

## Docker / persistent volume setup

OpenClaw containers lose global npm and non-mounted paths on restart. Use mounted volumes and the install script.

| What | Path |
|------|------|
| OpenClaw home | `/home/node/.openclaw` |
| Agent workspace | `/home/node/.openclaw/workspace` |
| AgentPay MCP | `/home/node/.openclaw/agentpay-mcp/` |
| mcporter config | `/home/node/.openclaw/mcporter/mcporter.json` |
| mcporter npm prefix | `/home/node/.openclaw/tools/mcporter/` |
| AgentPay config (optional) | Set `AGENTPAY_CONFIG_DIR=/home/node/.openclaw/agentpay` |

First run from the repo (or image build):

```bash
export AGENTPAY_BACKEND_URL=http://your-backend:3000
export AGENTPAY_AGENT_ID=agent_123
export AGENTPAY_CONFIG_DIR=/home/node/.openclaw/agentpay
export MCPORTER_CONFIG=/home/node/.openclaw/mcporter/mcporter.json
npm run install:openclaw -w agentpay-mcp
source /home/node/.openclaw/agentpay-mcp/openclaw.env
```

Docker env (add to agent shell):

```bash
export MCPORTER_CONFIG=/home/node/.openclaw/mcporter/mcporter.json
export AGENTPAY_CONFIG_DIR=/home/node/.openclaw/agentpay
export PATH="/home/node/.openclaw/tools/mcporter/node_modules/.bin:$PATH"
```

Use mcporter with an explicit config when the working directory is not stable:

```bash
mcporter --config "$MCPORTER_CONFIG" call agentpay.get_pairing_link
```

Do **not** rely on `npm install -g mcporter` inside Docker — install to `$OPENCLAW_HOME/tools/mcporter` via `scripts/openclaw-install.sh`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `AgentPay is not configured` | Run `agentpay init`; check config at `$AGENTPAY_CONFIG_DIR/config.json` or `~/.agentpay/config.json` |
| Config lost after Docker restart | Set `AGENTPAY_CONFIG_DIR` to a mounted path (e.g. `/home/node/.openclaw/agentpay`) and re-run install script |
| mcporter not found after restart | Re-run `scripts/openclaw-install.sh` or use `$OPENCLAW_HOME/tools/mcporter/node_modules/.bin/mcporter` |
| Wrong MCP / no agentpay server | Set `MCPORTER_CONFIG` to `/home/node/.openclaw/mcporter/mcporter.json` (Docker) or `~/.mcporter/mcporter.json` |
| Pairing fails | Backend must be up; run `get_pairing_link` again; user must open the full Reown URL on phone |
| Payment fails after pairing | WalletConnect session inactive — re-pair; verify `serviceId` and backend logs |
| Skill missing after restart | Install from persistent path: `/home/node/.openclaw/agentpay-mcp/SKILL.md` |
| Workspace was `/app` | Point workspace to `/home/node/.openclaw/workspace` and reinstall skill |
