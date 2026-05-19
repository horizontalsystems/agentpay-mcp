import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AgentPay, fetchPaidService, listX402Services } from '@agentpay/sdk';
import { z } from 'zod';
import type { AgentPayConfig } from './config.js';
import { runConnect } from './connect.js';

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
        'AgentPay is a payment firewall between agents and paid HTTP APIs (x402 protocol).',
        'For ANY x402-paid API: call list_x402_services, then fetch_paid_service with serviceId + args.',
        'If the API is not in the registry, use fetch_paid_service with url + method + body (ad-hoc mode).',
        'Payment flow is automatic: HTTP 402 → wallet signs USDC (x402 V1 or V2 detected from the response) → retry.',
        'Some services need provider login first (auth in registry, e.g. alchemy_siwe); that is handled automatically.',
        'Do not use pay_and_call_service for real x402 APIs — it returns demo mock data only.',
        'Use get_spending_status for budget/activity; get_pairing_link to connect the mobile wallet.',
        'If fetch_paid_service fails with no payment signature or no active session: call get_pairing_link once, send URL to user, retry — do not ask many clarifying questions.',
        'On install/setup: use defaults AGENTPAY_BACKEND_URL=http://206.189.229.113:3000 and agent_123, run init+mcporter without interviewing the user; end with "say pair my wallet when ready".'
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
          extend: 'Add entries to config/x402-services.json or set AGENTPAY_X402_SERVICES_PATH'
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
        'Universal x402 client: works with any provider that returns HTTP 402 + payment requirements.',
        'Detects x402 protocol V1 (X-PAYMENT) or V2 (PAYMENT-SIGNATURE) from the 402 response.',
        'Registry mode: serviceId + args (from list_x402_services).',
        'Ad-hoc mode: url + method + optional headers/body for APIs not in the registry.',
        'WalletConnect on the backend signs EIP-3009 USDC on Base when payment is required.'
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

        return textResult({
          success: true,
          serviceId: input.serviceId ?? input.registryId ?? input.url,
          paid: result.paid,
          x402Version: result.x402Version,
          status: result.status,
          paidAmountBaseUnits: result.paidAmountBaseUnits,
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
              'If error mentions session expired or no active session: call get_pairing_link, user reconnects Unstoppable Wallet, retry fetch_paid_service. Else: list_x402_services, check args, approve sign on phone.'
          },
          true
        );
      }
    }
  );

  server.registerTool(
    'pay_and_call_service',
    {
      title: 'AgentPay: demo signing only (not x402 APIs)',
      description: [
        'Demo path only — returns mock data, not a real paid API response.',
        'For any x402 HTTP API use fetch_paid_service instead (registry or ad-hoc url).'
      ].join(' '),
      inputSchema: z.object({
        serviceId: z.string().optional().describe('Ignored for demo; use fetch_paid_service for real APIs'),
        amountUsd: z.number().positive(),
        description: z.string().min(1)
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
        const result = await agentPay.payAndCall('demo', {
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
              message: 'No result from backend. Check pairing and AGENTPAY_BACKEND_URL.'
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
                'Demo mock response — not a real API. Use fetch_paid_service with serviceId or url for x402 APIs.',
              result
            },
            true
          );
        }

        return textResult({ success: true, serviceId, amountUsd, description, result });
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
      description: 'Returns a WalletConnect deep link for the user to pair their mobile wallet.',
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
