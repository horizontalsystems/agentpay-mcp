/** Machine-readable codes returned by the backend and MCP — agents must use `code`, not timing guesses. */
export type AgentPayErrorCode =
  | 'PAYMENT_REJECTED'
  | 'NO_ACTIVE_SESSION'
  | 'WC_SESSION_DEAD'
  | 'WC_REQUEST_TIMEOUT'
  | 'NO_PAYMENT_SIGNATURE'
  | 'CATALOG_MISMATCH'
  | 'SIGNING_FAILED'
  | 'UNKNOWN';

export class AgentPayError extends Error {
  readonly code: AgentPayErrorCode;

  constructor(message: string, code: AgentPayErrorCode) {
    super(message);
    this.name = 'AgentPayError';
    this.code = code;
  }
}

export const PAYMENT_REJECTED_MESSAGE =
  'Payment rejected on phone. The user declined the USDC approval in Unstoppable Wallet. Session is still paired — retry fetch_paid_service and tap Approve.';

export const WC_SESSION_DEAD_MESSAGE =
  'WalletConnect session dead on relay (no response from phone). Call get_pairing_link, reconnect Unstoppable Wallet, then retry fetch_paid_service.';

export const NO_ACTIVE_SESSION_MESSAGE =
  'WalletConnect session not active on backend. Call get_pairing_link, send the raw wc: URI, user taps Connect, then retry fetch_paid_service.';
