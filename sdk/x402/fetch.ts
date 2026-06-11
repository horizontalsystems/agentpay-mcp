import type { AgentPayClient } from './types';
import type { BuiltX402Request } from './types';
import { executeX402Request, fetchPaidService, fetchX402Service, type FetchX402Result } from './client';

export type { AgentPayClient };
export type FetchWithX402Result = FetchX402Result;

/**
 * Low-level x402 HTTP (V1 + V2). Prefer {@link fetchX402Service} for registry services.
 */
export async function fetchWithX402(
  request: BuiltX402Request,
  agentPay: AgentPayClient,
  options?: { session?: FetchX402Result['session'] }
): Promise<FetchX402Result> {
  return executeX402Request(request, agentPay, options);
}

export { fetchX402Service, fetchPaidService, executeX402Request };
export type { FetchX402Result, FetchPaidServiceInput, X402Settlement } from './client';
export { parseSettlementFromResponse, explorerTxUrl } from './client';
