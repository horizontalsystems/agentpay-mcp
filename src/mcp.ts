import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AgentPay, explorerTxUrl, fetchPaidService, listX402Services } from '@agentpay/sdk';
import { z } from 'zod';
import type { AgentPayConfig } from './config.js';
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

    return {
      agentId: config.agentId,
      backendUrl: config.backendUrl,
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
        'AgentPay IS the x402 payment client for this agent. All paid HTTP APIs (Exa, Nansen, twit.sh, etc.) go through fetch_paid_service.',
        'NEVER ask for AGENT_PRIVATE_KEY, hot wallet private key, or ETH signing keys — payments are signed on the user Android wallet via WalletConnect.',
        'NEVER use generic x402 tools (x402_session_start, x402_session_fetch, x402_pay, x402_pay_and_call) — they are not AgentPay. Use list_x402_services and fetch_paid_service only.',
        'Exa search: fetch_paid_service({ serviceId: "exa_search", args: { query: "...", numResults: 3 } }). Aliases: exasearch, exa.',
        'Nansen: fetch_paid_service({ serviceId: "nansen_smart_money_holdings", args: { chains: ["ethereum"] } }).',
        'Payment flow: HTTP 402 → backend asks phone to sign USDC → paid retry. No API keys or private keys on the agent.',
        'Use get_spending_status for budget/activity; get_pairing_link to pair the mobile wallet (raw wc: URI, two messages).',
        'If "Invalid agent or service": you called pay-and-call wrong — use fetch_paid_service, not direct backend calls with nansen/exa as serviceId.',
        'If no active session: get_pairing_link once, forward both messages, retry fetch_paid_service.',
        'Defaults: AGENTPAY_BACKEND_URL=http://206.189.229.113:3000, agentId agent_123.'
      ].join(' ')
    }
  );

  server.registerTool(
    'list_x402_services',
    {
      title: 'AgentPay: list x402 services',
      description: [
        'List all registered x402 HTTP services (built-in SDK registry + config/x402-services.json).',
        'Returns serviceId, url, method, argsHint, and optional auth (e.g. alchemy_siwe for gateway login).',
        'Always call this before fetch_paid_service when you do not already know the serviceId.'
      ].join(' '),
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false
      }
    },
    async () => {
      try {
        const services = listX402Services();
        return textResult({
          services,
          count: services.length,
          howToCall: 'fetch_paid_service({ serviceId, args })',
          adHoc: 'fetch_paid_service({ url, method, body? }) for APIs not listed here',
          extend: 'Add entries to config/x402-services.json or set AGENTPAY_X402_SERVICES_PATH',
          important:
            'AgentPay handles full x402 (402 → WalletConnect USDC sign → retry). Do NOT use AGENT_PRIVATE_KEY or x402_session_* tools.',
          exaExample: 'fetch_paid_service({ serviceId: "exa_search", args: { query: "smart money tokens Base", numResults: 5 } })'
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return textResult({ success: false, error: message }, true);
      }
    }
  );

  server.registerTool(
    'fetch_paid_service',
    {
      title: 'AgentPay: call any x402-paid HTTP API',
      description: [
        'THE x402 client for this agent — use this for ALL paid APIs (Exa, Nansen, etc.).',
        'Do NOT use AGENT_PRIVATE_KEY, hot wallet keys, or x402_session_start/x402_pay tools.',
        'Registry: serviceId + args (e.g. exa_search, nansen_smart_money_holdings). Aliases: exasearch, exa, nansen.',
        'Ad-hoc: url + method + body for APIs not in list_x402_services.',
        'Full flow: HTTP 402 → WalletConnect signs USDC on user phone → paid retry. No keys on agent machine.'
      ].join(' '),
      inputSchema: z
        .object({
          serviceId: z
            .string()
            .optional()
            .describe('Registered service id from list_x402_services'),
          args: z
            .record(z.unknown())
            .optional()
            .describe('Arguments for the registered service (see argsHint)'),
          url: z.string().url().optional().describe('Ad-hoc: full URL when serviceId is not registered'),
          method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']).optional(),
          headers: z.record(z.string()).optional(),
          body: z.unknown().optional().describe('Ad-hoc JSON body'),
          registryId: z
            .string()
            .optional()
            .describe('Optional audit label for ad-hoc calls (defaults to url)')
        })
        .refine((v) => Boolean(v.serviceId?.trim()) || Boolean(v.url), {
          message: 'Provide serviceId (registry) or url (ad-hoc x402 endpoint)'
        }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true
      }
    },
    async (input) => {
      try {
        const result = await fetchPaidService(
          {
            serviceId: input.serviceId?.trim() || undefined,
            args: input.args,
            url: input.url,
            method: input.method,
            headers: input.headers,
            body: input.body,
            registryId: input.registryId
          },
          agentPay
        );

        const settlement = result.settlement;
        return textResult({
          success: true,
          serviceId: input.serviceId ?? input.registryId ?? input.url,
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
        return textResult(
          {
            success: false,
            serviceId: input.serviceId,
            url: input.url,
            error: message,
            hint:
              'If "Invalid agent or service": use fetch_paid_service (not direct /v1/pay-and-call with nansen/exa as serviceId). ' +
              'If session expired: get_pairing_link, re-pair, retry. Never use AGENT_PRIVATE_KEY — AgentPay signs via WalletConnect on Android.'
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
        'Returns two text blocks: (1) paste instructions for Unstoppable Wallet Android, (2) raw wc: URI only — do not wrap in link.reown.com.',
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
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
