import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AgentPay } from '@agentpay/sdk';
import { z } from 'zod';
import type { AgentPayConfig } from './config.js';
import { runConnect } from './connect.js';
import {
  buildAdHocX402Request,
  buildX402Request,
  fetchWithX402,
  listX402Services
} from '@agentpay/sdk';

function textResult(payload: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) }],
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
        'AgentPay is a payment firewall between autonomous agents and paid APIs or on-chain services.',
        'For any x402 paid API, use fetch_paid_service (402 → wallet EIP-712 sign → paid retry → real JSON).',
        'Call list_x402_services to see registered service ids, URLs, and args hints.',
        'Do not use pay_and_call_service for catalog x402 services — it returns demo mock data.',
        'Use get_spending_status for budget/balance; get_pairing_link to connect the user wallet.',
        'A paired mobile wallet (WalletConnect) must be active on the backend or paid tools will fail.'
      ].join(' ')
    }
  );

  server.registerTool(
    'list_x402_services',
    {
      title: 'AgentPay: list x402 services',
      description: [
        'List registered x402 services (built-in + config/x402-services.json).',
        'Use before fetch_paid_service to pick the correct serviceId and args shape.'
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
        return textResult({
          services: listX402Services(),
          note: 'Add more services via config/x402-services.json or AGENTPAY_X402_SERVICES_PATH. For ad-hoc URLs use fetch_paid_service with url + method + body/args.'
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
      title: 'AgentPay: fetch any x402-paid HTTP API',
      description: [
        'Generic x402 flow: HTTP 402 → WalletConnect EIP-712 sign → retry with PAYMENT-SIGNATURE → return API JSON.',
        'Mode A — registered service: provide serviceId + args (call list_x402_services first).',
        'Mode B — ad-hoc URL: provide url + method + optional headers/body (uses backend serviceId x402_custom).',
        'Do not use pay_and_call_service for x402 APIs — it only returns demo mock data.'
      ].join(' '),
      inputSchema: z
        .object({
          serviceId: z
            .string()
            .optional()
            .describe('Registered x402 service id from list_x402_services'),
          args: z
            .record(z.unknown())
            .optional()
            .describe('Arguments for the registered service (see argsHint from list_x402_services)'),
          url: z.string().url().optional().describe('Ad-hoc: full HTTP URL when not using serviceId'),
          method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']).optional(),
          headers: z.record(z.string()).optional(),
          body: z.unknown().optional().describe('Ad-hoc: JSON body (overrides args as body when set)')
        })
        .refine((v) => Boolean(v.serviceId) || Boolean(v.url), {
          message: 'Provide either serviceId (registry) or url (ad-hoc x402 endpoint)'
        }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true
      }
    },
    async (input) => {
      try {
        const built = input.url
          ? buildAdHocX402Request({
              url: input.url,
              method: input.method,
              headers: input.headers,
              body: input.body,
              args: input.args,
              serviceId: input.serviceId
            })
          : buildX402Request(input.serviceId!, input.args ?? {});

        const result = await fetchWithX402(built, agentPay);
        return textResult({
          success: true,
          serviceId: built.serviceId,
          url: built.url,
          paid: result.paid,
          status: result.status,
          data: result.data
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return textResult(
          { success: false, serviceId: input.serviceId, url: input.url, error: message },
          true
        );
      }
    }
  );

  server.registerTool(
    'pay_and_call_service',
    {
      title: 'AgentPay: sign a custom payment (advanced)',
      description: [
        'Low-level: ask the wallet to sign via the backend with a custom payload.',
        'Do not use for x402 catalog services — use fetch_paid_service instead.',
        'For manual x402 flows, the payload must include action "x402_pay_generic" plus recipient, amount, and asset from the provider 402 response.'
      ].join(' '),
      inputSchema: z.object({
        serviceId: z
          .string()
          .min(1)
          .describe('Backend catalog id (non-x402 demo only; prefer fetch_paid_service for x402 APIs)'),
        amountUsd: z.number().positive().describe('Payment amount in USD (used for x402 amount when applicable)'),
        description: z.string().min(1).describe('Short justification shown in logs and wallet approval context')
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true
      }
    },
    async ({ serviceId, amountUsd, description }) => {
      try {
        const amountBaseUnits = String(Math.round(amountUsd * 1_000_000));
        const result = await agentPay.payAndCall(serviceId, {
          description,
          amountUsd,
          amount: amountBaseUnits
        });

        if (result == null) {
          return textResult(
            {
              success: false,
              serviceId,
              amountUsd,
              message:
                'AgentPay returned no result. Verify backend URL, agent id, WalletConnect session, and service id.'
            },
            true
          );
        }

        const data = (result as { data?: { tokens?: string[] } })?.data;
        if (data?.tokens?.includes('$AI') && data?.tokens?.includes('$AGENT')) {
          return textResult(
            {
              success: false,
              serviceId,
              message:
                'Backend returned demo mock data, not a real API response. For Exa/Nansen use fetch_paid_service with args.query (or args.chains), not pay_and_call_service.',
              result
            },
            true
          );
        }

        return textResult({
          success: true,
          serviceId,
          amountUsd,
          description,
          result
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return textResult({ success: false, serviceId, amountUsd, error: message }, true);
      }
    }
  );

  server.registerTool(
    'get_pairing_link',
    {
      title: 'AgentPay: get WalletConnect pairing link',
      description: [
        'Use when the user asks to connect or pair their Android wallet.',
        'Returns a Reown deep link (https://link.reown.com/wc?uri=...) to open in Unstoppable Wallet or any WalletConnect v2 wallet.',
        'Do not use pay_and_call_service until pairing is complete.'
      ].join(' '),
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true
      }
    },
    async () => {
      try {
        const link = await runConnect(config, { urlOnly: true });
        return textResult(link);
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
      description: [
        'Read the agent wallet balance and recent payment activity from the AgentPay backend.',
        'Use when: the user asks how much was spent today, whether the agent can afford a payment, or to verify past approvals/blocks.',
        'Do not use for: initiating payments (use pay_and_call_service instead).',
        'Spending limits are enforced on the Android app; this tool reports backend logs and mock balance only.'
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
        const status = await fetchSpendingStatus();
        return textResult(status);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return textResult({ success: false, error: message }, true);
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
