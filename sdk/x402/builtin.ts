import type { X402Service } from './types';

/** Built-in x402 service definitions (extend via config/x402-services.json or AGENTPAY_X402_SERVICES_PATH). */
export const BUILTIN_X402_SERVICES: Record<string, X402Service> = {
  exa_search: {
    label: 'Exa',
    url: 'https://api.exa.ai/search',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: (args) => ({
      query: String(args.query ?? ''),
      numResults: Number(args.numResults ?? 2) || 2
    }),
    validate: (args) =>
      String(args.query ?? '').trim() ? null : 'exa_search requires args.query (e.g. "stablecoin USDC")',
    argsHint: '{ "query": "stablecoin USDC", "numResults": 2 }'
  },
  nansen_smart_money_holdings: {
    label: 'Nansen',
    url: 'https://api.nansen.ai/api/v1/smart-money/holdings',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: (args) => ({
      chains: Array.isArray(args.chains) && args.chains.length ? args.chains : ['ethereum']
    }),
    argsHint: '{ "chains": ["ethereum"] }'
  },
  /** https://twit.sh — X/Twitter data via x402 on Base (USDC). */
  twit_user_by_username: {
    label: 'twit.sh user lookup',
    url: 'https://x402.twit.sh/users/by/username?username=${username}',
    method: 'GET',
    validate: (args) =>
      String(args.username ?? '').trim() ? null : 'twit_user_by_username requires args.username (no @)',
    argsHint: '{ "username": "vitalik" }'
  },
  twit_tweet_by_id: {
    label: 'twit.sh tweet lookup',
    url: 'https://x402.twit.sh/tweets/by/id?id=${id}',
    method: 'GET',
    validate: (args) =>
      String(args.id ?? '').trim() ? null : 'twit_tweet_by_id requires args.id (tweet id string)',
    argsHint: '{ "id": "1234567890123456789" }'
  },
  /** X Lists v2-style JSON: name, description, mode, counts, owner, banner. Query `id` = numeric list id. */
  twit_list_by_id: {
    label: 'twit.sh list by id',
    url: 'https://x402.twit.sh/lists/by/id?id=${id}',
    method: 'GET',
    headers: { accept: 'application/json' },
    validate: (args) =>
      String(args.id ?? '').trim() ? null : 'twit_list_by_id requires args.id (numeric list id as string)',
    argsHint: '{ "id": "84839422" }'
  },
  /**
   * Alchemy agentic gateway — JSON-RPC with SIWE + x402 USDC.
   * URL shape from https://github.com/alchemyplatform/skills (rules/x402/reference.md): /:chainNetwork/v2
   */
  /**
   * Messari x402 — https://docs.messari.io/api-reference/x402-payments
   * Gateway discovery: GET https://api.messari.io/.well-known/x402
   * (Landing page https://messari.io/x402 — API host is api.messari.io)
   */
  messari_signal_assets: {
    label: 'Messari Signal — assets (x402)',
    url: 'https://api.messari.io/signal/v1/assets?limit=${limit}',
    method: 'GET',
    headers: { accept: 'application/json' },
    validate: (args) => {
      const n = Number(args.limit ?? 2);
      if (!Number.isFinite(n) || n < 1 || n > 100) {
        return 'messari_signal_assets: limit must be 1–100';
      }
      return null;
    },
    argsHint: '{ "limit": 2 }'
  },
  messari_metrics_assets_details: {
    label: 'Messari Metrics — asset details snapshot (x402)',
    url: 'https://api.messari.io/metrics/v2/assets/details?limit=${limit}',
    method: 'GET',
    headers: { accept: 'application/json' },
    validate: (args) => {
      const n = Number(args.limit ?? 2);
      if (!Number.isFinite(n) || n < 1 || n > 50) {
        return 'messari_metrics_assets_details: limit must be 1–50';
      }
      return null;
    },
    argsHint: '{ "limit": 2 }'
  },
  alchemy_x402_eth_blockNumber: {
    label: 'Alchemy x402 eth_blockNumber (eth-mainnet)',
    auth: { type: 'alchemy_siwe' },
    url: 'https://x402.alchemy.com/eth-mainnet/v2',
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: () => ({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_blockNumber',
      params: []
    }),
    argsHint: '{}'
  }
};
