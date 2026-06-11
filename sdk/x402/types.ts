export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

export type WalletConnectStatus = {
  active: boolean;
  address?: string | null;
  topic?: string | null;
  chainId?: string | null;
};

/** Minimal AgentPay client surface (avoids circular imports). */
export type AgentPayClient = {
  payAndCall(serviceId: string, payload: unknown): Promise<unknown | null>;
  getWalletConnectStatus(): Promise<WalletConnectStatus>;
};

/** Optional pre-request wallet auth (separate from x402 V1/V2 payment on 402). */
export type X402Auth = { type: 'alchemy_siwe' };

export type X402Service = {
  label: string;
  /** When set, wallet signs provider login before HTTP (e.g. Alchemy gateway credits). */
  auth?: X402Auth;
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: (args: Record<string, unknown>) => unknown;
  validate?: (args: Record<string, unknown>) => string | null;
  argsHint: string;
};

export type X402ServiceJson = Omit<X402Service, 'body' | 'validate'> & {
  bodyFromArgs?: boolean;
  auth?: X402Auth;
};

export type BuiltX402Request = {
  url: string;
  init: RequestInit;
  label: string;
  serviceId: string;
  auth?: X402Auth;
};
