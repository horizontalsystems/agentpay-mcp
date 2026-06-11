import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AgentPay, AgentPayError, explorerTxUrl, fetchPaidService } from '@agentpay/sdk';
import type { AgentPayErrorCode } from '@agentpay/sdk';
import { z } from 'zod';
import type { AgentPayConfig } from './config.js';
import { getConfigPath } from './config.js';
import { fetchPairingUri, PAIRING_INSTRUCTIONS } from './connect.js';

function textResult(payload: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) }],
    isError
  };
}

function multiTextResult(parts: string[], isError = false) {
  return {
    content: parts.map((text) => ({ type: 'text' as const, text })),
    isError
  };
}

function hintForErrorCode(code: AgentPayErrorCode | undefined, message: string): string {
  switch (code) {
    case 'PAYMENT_REJECTED':
      return (
        'code=PAYMENT_REJECTED: User declined USDC on phone. Say "You rejected the payment — tap Approve and I will retry." ' +
        'Retry the same fetch_paid_service. Do NOT re-pair.'
      );
    case 'WC_SESSION_DEAD':
    case 'NO_ACTIVE_SESSION':
      return (
        `code=${code}: WalletConnect session is dead or not paired. Call get_pairing_link, send raw wc: URI, user taps Connect, retry.`
      );
    case 'NO_PAYMENT_SIGNATURE':
      return (
        'code=NO_PAYMENT_SIGNATURE: Stale MCP/SDK — redeploy agentpay-mcp. If updated: ask user if they saw a signing prompt; rejection vs dead session need backend code field.'
      );
    case 'CATALOG_MISMATCH':
      return 'code=CATALOG_MISMATCH: Backend missing x402_custom catalog — deploy latest backend or fix AGENTPAY_BACKEND_URL.';
    default:
      break;
  }

  const m = message.toLowerCase();
  if (m.includes('payment verification failed') || m.includes('simulation failed') || m.includes('signer mismatch')) {
    return 'On-chain payment failed after signing — wrong account, insufficient USDC, or facilitator timeout. Re-pair with funded account via get_pairing_link.';
  }
  return 'Read the "code" field in this JSON — never guess from timing alone.';
}

function resolveErrorCode(err: unknown, message: string): AgentPayErrorCode | undefined {
  if (err instanceof AgentPayError) return err.code;
  const m = message.toLowerCase();
  if (m.includes('payment rejected')) return 'PAYMENT_REJECTED';
  if (m.includes('session dead on relay')) return 'WC_SESSION_DEAD';
  if (m.includes('no active session')) return 'NO_ACTIVE_SESSION';
  if (m.includes('no payment signature')) return 'NO_PAYMENT_SIGNATURE';
  return undefined;
}

type StatusLog = {
  time: string;
  cost: number;
  status: string;
  serviceId: string;
  reason?: string;
};

type StatusResponse = {
  wallet?: { balance: number };
  logs?: StatusLog[];
  error?: string;
};

function authHeaders(apiKey?: string): HeadersInit | undefined {
  if (!apiKey) return undefined;
  return { Authorization: `Bearer ${apiKey}` };
}

export async function startMcpServer(config: AgentPayConfig): Promise<void> {
  const agentPay = new AgentPay(config.agentId, {
    baseUrl: config.backendUrl,
    apiKey: config.apiKey
  });

  async function fetchSpendingStatus() {
    const url = `${config.backendUrl.replace(/\/$/, '')}/v1/status?agentId=${encodeURIComponent(config.agentId)}`;
    const res = await fetch(url, { headers: authHeaders(config.apiKey) });
    const data = (await res.json()) as StatusResponse;
    if (!res.ok) {
      throw new Error(data.error ?? `status HTTP ${res.status}`);
    }

    const today = new Date().toDateString();
    const logs = data.logs ?? [];
    const spentTodayUsd = logs
      .filter((row) => row.status === 'APPROVED' && new Date(row.time).toDateString() === today)
      .reduce((sum, row) => sum + (row.cost ?? 0), 0);

    const recent = logs.slice(-10).reverse();

    let walletConnect: { active: boolean; address: string | null; topic: string | null } | null =
      null;
    try {
      walletConnect = await agentPay.getWalletConnectStatus();
    } catch {
      walletConnect = null;
    }

    return {
      agentId: config.agentId,
      backendUrl: config.backendUrl,
      configPath: getConfigPath(),
      walletConnect,
      readyForPaidCalls: Boolean(walletConnect?.active && walletConnect?.address),
      walletBalanceUsd: data.wallet?.balance ?? null,
      spentTodayUsd,
      note: 'Daily spending limits are enforced in the Android app; this summary is from backend activity logs.',
      recentActivity: recent.map((row) => ({
        time: row.time,
        serviceId: row.serviceId,
        costUsd: row.cost,
        status: row.status,
        reason: row.reason
      }))
    };
  }

  const server = new McpServer(
    {
      name: 'agentpay-firewall',
      version: '1.0.0'
    },
    {
      instructions: [
        'AgentPay IS the x402 payment client. Call ANY HTTP API that supports x402 via fetch_paid_service — no service catalog, no serviceId.',
        'fetch_paid_service({ url, method?, headers?, body? }) — url is required. Agent discovers x402 endpoints from docs, Bazaar, or user input.',
        'Examples: Exa POST https://api.exa.ai/search body { query, numResults }. Nansen POST https://api.nansen.ai/api/v1/smart-money/holdings body { chains: ["ethereum"] }.',
        'NEVER ask for AGENT_PRIVATE_KEY or use x402_session_* tools. NEVER call list_x402_services — it does not exist.',
        'Payment flow: HTTP 402 → WalletConnect USDC sign on user phone → paid retry. SPENDS REAL MONEY — tell user cost, report paidAmountBaseUnits + settlement tx.',
        'get_pairing_link to pair wallet (raw wc: URI, two messages). get_spending_status for budget/activity.',
        'fetch_paid_service errors have "code": PAYMENT_REJECTED = user declined (retry, no re-pair); WC_SESSION_DEAD / NO_ACTIVE_SESSION = get_pairing_link.',
        'Backend: AGENTPAY_BACKEND_URL / AGENTPAY_AGENT_ID. OpenClaw: register MCP ONCE via openclaw-register-mcp.sh — NEVER re-run mcp add during normal operation (causes config churn).'
      ].join(' ')
    }
  );

  server.registerTool(
    'fetch_paid_service',
    {
      title: 'AgentPay: call any x402-paid HTTP API',
      description: [
        'Universal x402 client — call ANY HTTP endpoint that returns 402 Payment Required.',
        'Provide url (required), method (default POST), optional headers and JSON body. No service catalog or serviceId.',
        'SPENDS REAL USDC on Base; user approves on Android wallet via WalletConnect.',
        'Flow: request → 402 + PAYMENT-REQUIRED → phone signs EIP-712 USDC authorization → retry with PAYMENT-SIGNATURE → API response.',
        'Do NOT use AGENT_PRIVATE_KEY or x402_session_* tools.'
      ].join(' '),
      inputSchema: z.object({
        url: z.string().url().describe('Full x402 API URL (from provider docs, Bazaar, or user)'),
        method: z
          .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'])
          .optional()
          .describe('HTTP method (default POST when body present, else GET)'),
        headers: z.record(z.string()).optional().describe('Optional request headers'),
        body: z.unknown().optional().describe('JSON request body for POST/PUT/PATCH'),
        label: z.string().optional().describe('Optional short name for logs (defaults to url)')
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true
      }
    },
    async (input) => {
      try {
        const wc = await agentPay.getWalletConnectStatus();
        if (!wc.active || !wc.address) {
          return textResult(
            {
              success: false,
              error: 'WalletConnect session not active on backend',
              walletConnect: wc,
              action:
                'Call get_pairing_link, forward BOTH messages to the user (instructions + raw wc: URI only). Never use link.reown.com. Then retry fetch_paid_service.',
              configPath: getConfigPath(),
              agentId: config.agentId,
              backendUrl: config.backendUrl
            },
            true
          );
        }

        const method = input.method ?? (input.body !== undefined && input.body !== null ? 'POST' : 'GET');

        const result = await fetchPaidService(
          {
            url: input.url,
            method,
            headers: input.headers,
            body: input.body,
            registryId: input.label?.trim() || input.url
          },
          agentPay
        );

        const settlement = result.settlement;
        return textResult({
          success: true,
          url: input.url,
          paid: result.paid,
          x402Version: result.x402Version,
          status: result.status,
          paidAmountBaseUnits: result.paidAmountBaseUnits,
          settlement: settlement?.transaction
            ? {
                ...settlement,
                explorerUrl: explorerTxUrl(settlement.transaction, settlement.network)
              }
            : settlement,
          data: result.data
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const code = resolveErrorCode(err, message);
        return textResult(
          {
            success: false,
            url: input.url,
            code: code ?? 'UNKNOWN',
            error: message,
            hint: hintForErrorCode(code, message)
          },
          true
        );
      }
    }
  );

  server.registerTool(
    'get_pairing_link',
    {
      title: 'AgentPay: get WalletConnect pairing link',
      description:
        'Creates a new WalletConnect pairing proposal and returns two text blocks: (1) paste instructions for Unstoppable Wallet Android, (2) raw wc: URI only — do not wrap in link.reown.com. ' +
        'The user must pair/approve with their FUNDED account: the account that signs on the phone must match the paired session, or payments will be rejected by the facilitator.',
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true
      }
    },
    async () => {
      try {
        const pairingUri = await fetchPairingUri(config);
        return multiTextResult([PAIRING_INSTRUCTIONS, pairingUri]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return textResult(message, true);
      }
    }
  );

  server.registerTool(
    'get_spending_status',
    {
      title: 'AgentPay: get spending status',
      description: 'Wallet balance and recent payment activity from the backend.',
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false
      }
    },
    async () => {
      try {
        return textResult(await fetchSpendingStatus());
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return textResult({ success: false, error: message }, true);
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
