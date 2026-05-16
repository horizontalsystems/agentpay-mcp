import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AgentPay } from '@agentpay/sdk';
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
        'AgentPay is a payment firewall between autonomous agents and paid APIs or on-chain services.',
        'Use pay_and_call_service when the user or agent needs to spend money, call a paid API (x402), or execute a catalog service that requires WalletConnect approval.',
        'Use get_spending_status before large spends, when the user asks about budget or balance, or to audit recent agent payments.',
        'Use get_pairing_link when the user asks to connect or pair their Android wallet; send the returned Reown URL to the user.',
        'Known service ids include exa_search and nansen_smart_money_holdings (see backend catalog).',
        'A paired mobile wallet (WalletConnect) must be active on the backend or pay_and_call_service will fail.'
      ].join(' ')
    }
  );

  server.registerTool(
    'pay_and_call_service',
    {
      title: 'AgentPay: pay and call a paid service',
      description: [
        'Route a paid agent action through the AgentPay backend so the owner wallet can approve via WalletConnect.',
        'Use when: calling paid APIs (x402), executing billable agent tools, or any flow that must charge USDC under user control.',
        'Do not use for: free HTTP calls, reading public data, or tasks that do not require payment.',
        'Requires prior WalletConnect pairing on the AgentPay backend.'
      ].join(' '),
      inputSchema: z.object({
        serviceId: z
          .string()
          .min(1)
          .describe('Backend catalog id, e.g. exa_search or nansen_smart_money_holdings'),
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
