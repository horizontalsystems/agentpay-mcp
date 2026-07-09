import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AgentPay, AgentPayError, explorerTxUrl, fetchPaidService } from '@agentpay/sdk';
import type { AgentPayErrorCode } from '@agentpay/sdk';
import { z } from 'zod';
import type { AgentPayConfig } from './config.js';
import { getConfigPath } from './config.js';
import { ANDROID_APK_MESSAGE, fetchPairingUri, PAIRING_INSTRUCTIONS } from './connect.js';
import { ANDROID_APK_URL } from './defaults.js';
import { listX402ScanServices } from './x402scan-catalog.js';

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
        `code=${code}: WalletConnect session is dead or not paired. Call get_x402_pairing_link, send raw wc: URI, user taps Connect, retry.`
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
    return 'On-chain payment failed after signing — wrong account, insufficient USDC, or facilitator timeout. Re-pair with funded account via get_x402_pairing_link.';
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
      version: '2.0.0'
    },
    {
      instructions: [
        'AgentPay IS the x402 payment client. list_x402_services returns top x402scan.com paid APIs (url + method). fetch_paid_service({ url, method?, body? }) pays and calls any listed endpoint.',
        'Browse list_x402_services first when user asks what paid APIs exist. Then fetch_paid_service with the exact url from the catalog.',
        'Examples: Exa POST https://api.exa.ai/search body { query, numResults }. Nansen from catalog smart-money endpoints.',
        'NEVER ask for AGENT_PRIVATE_KEY or use x402_session_* tools from npm agentpay-mcp v4.',
        'Payment flow: HTTP 402 → WalletConnect USDC sign on user phone → paid retry. SPENDS REAL MONEY — tell user cost, report paidAmountBaseUnits + settlement tx.',
        'get_android_app_link for APK download URL. get_x402_pairing_link to pair wallet. CRITICAL: paste https://rafaelekol.github.io/agentpay/agentPay.apk and the raw wc: URI in your user-visible reply — user cannot see tool output. get_spending_status for budget/activity.',
        'fetch_paid_service errors have "code": PAYMENT_REJECTED = user declined (retry, no re-pair); WC_SESSION_DEAD / NO_ACTIVE_SESSION = get_x402_pairing_link.',
        'Backend: AGENTPAY_BACKEND_URL / AGENTPAY_AGENT_ID. OpenClaw: binary MUST be GitHub horizontalsystems/agentpay-mcp build/index.js — NEVER npm install -g agentpay-mcp (registry v4.x has x402_session_* only). Register MCP ONCE via openclaw-register-mcp.sh — NEVER re-run mcp add during normal operation.'
      ].join(' ')
    }
  );

  server.registerTool(
    'list_x402_services',
    {
      title: 'AgentPay: browse x402scan paid API catalog',
      description:
        'Top 30 x402-paid services from x402scan.com — apis match each server page (e.g. x402scan.com/server/{id} Resources list). ' +
        'Returns x402scanUrl, origin, and apis[].url + method. Read-only — use fetch_paid_service with a catalog url. Optional query filter.',
      inputSchema: z.object({
        query: z.string().optional().describe('Filter by service name, origin host, or API path'),
        limit: z.number().int().min(1).max(30).optional().describe('Max services to return (default 30)')
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false
      }
    },
    async (input) => textResult(listX402ScanServices({ query: input.query, limit: input.limit }))
  );

  server.registerTool(
    'fetch_paid_service',
    {
      title: 'AgentPay: call any x402-paid HTTP API',
      description: [
        'Universal x402 client — call ANY HTTP endpoint that returns 402 Payment Required.',
        'Provide url (required), method (default POST), optional headers and JSON body. Get urls from list_x402_services or provider docs.',
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
                'Call get_x402_pairing_link, forward BOTH messages to the user (instructions + raw wc: URI only). Never use link.reown.com. Then retry fetch_paid_service.',
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
    'get_android_app_link',
    {
      title: 'AgentPay: Android app download link',
      description:
        'Returns the AgentPay Android APK download URL and install instructions. Call after MCP install or when the user has no app yet. You MUST paste https://rafaelekol.github.io/agentpay/agentPay.apk in your user-visible reply — the user cannot see this tool output.',
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false
      }
    },
    async () => textResult({ url: ANDROID_APK_URL, message: ANDROID_APK_MESSAGE })
  );

  server.registerTool(
    'get_x402_pairing_link',
    {
      title: 'AgentPay: get WalletConnect pairing link (x402 profile)',
      description:
        'Creates a new WalletConnect pairing proposal and returns three text blocks: (1) Android APK download link, (2) paste instructions for AgentPay app, (3) raw wc: URI only — do not wrap in link.reown.com. ' +
        'You MUST include the APK link and the raw wc: URI in your reply to the user — paste both verbatim; the user cannot see tool output. ' +
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
        return multiTextResult([ANDROID_APK_MESSAGE, PAIRING_INSTRUCTIONS, pairingUri]);
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
