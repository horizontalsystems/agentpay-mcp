import { AgentPayError } from '../errors';
import { X402_SIGNING_SERVICE_ID } from './constants';
import type { AgentPayClient, X402Auth } from './types';
import { parsePaymentRequiredFrom402, readHttpBody, type PaymentRequired } from './paymentRequired';
import { networkToChainIdString, selectWalletUsdcAccept } from './selectAccept';
import { applySessionToHeaders, createAlchemySiweSession, type X402Session } from './session';
import type { BuiltX402Request } from './types';
import { getX402Service } from './registry';

export type X402Settlement = {
  success?: boolean;
  /** On-chain tx hash when facilitator settled (EIP-3009 USDC transfer). */
  transaction?: string;
  payer?: string;
  network?: string;
};

export type FetchX402Result = {
  status: number;
  data: unknown;
  paid: boolean;
  paymentSignaturePresent?: boolean;
  paidAmountBaseUnits?: string;
  /** Set when payment ran; detected from the 402 response. */
  x402Version?: 1 | 2;
  /** From PAYMENT-RESPONSE header after successful paid retry (facilitator settle). */
  settlement?: X402Settlement;
  /** Reuse for follow-up calls to the same provider (e.g. Alchemy SIWE). */
  session?: X402Session;
};

function previewBody(data: unknown, maxLen = 240): string {
  const raw =
    typeof data === 'string'
      ? data
      : (() => {
          try {
            return JSON.stringify(data);
          } catch {
            return String(data);
          }
        })();
  const oneLine = raw.replace(/\s+/g, ' ').trim();
  return oneLine.length <= maxLen ? oneLine : `${oneLine.slice(0, maxLen)}…`;
}

/** Node/undici often throws TypeError("fetch failed") with the real reason on `cause`. */
function describeFetchCause(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  let depth = 0;
  while (cur instanceof Error && depth < 6) {
    if (cur.message) parts.push(cur.message);
    cur = (cur as Error & { cause?: unknown }).cause;
    depth++;
  }
  if (cur != null && !(cur instanceof Error)) parts.push(String(cur));
  const chain = parts.filter(Boolean).join(' — ');
  return chain ? ` (${chain})` : '';
}

async function fetchForX402(
  phase: 'initial' | 'paid_retry',
  label: string,
  url: string,
  init: RequestInit
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    throw new Error(`x402: ${phase} HTTP request failed for ${label} ${url}${describeFetchCause(err)}`);
  }
}

function normalizeBase64(raw: string): string {
  // Accept both base64 and base64url (no padding).
  let s = raw.trim().replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (s.length % 4)) % 4;
  if (pad) s += '='.repeat(pad);
  return s;
}

function tryDecodeBase64Json(raw: string | null): unknown | null {
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(normalizeBase64(raw), 'base64').toString('utf8')) as unknown;
  } catch {
    return null;
  }
}

function headerAny(headers: Headers, names: string[]): string | null {
  for (const name of names) {
    const v = headers.get(name);
    if (v) return v;
  }
  return null;
}

/** Decode facilitator settlement from a successful paid HTTP response. */
export function parseSettlementFromResponse(res: Response): X402Settlement | undefined {
  const raw = headerAny(res.headers, [
    'PAYMENT-RESPONSE',
    'payment-response',
    'Payment-Response',
    'X-Payment-Response',
    'x-payment-response'
  ]);
  const decoded = tryDecodeBase64Json(raw);
  if (!decoded || typeof decoded !== 'object') return undefined;
  const o = decoded as Record<string, unknown>;
  const tx =
    typeof o.transaction === 'string'
      ? o.transaction
      : typeof o.txHash === 'string'
        ? o.txHash
        : typeof o.tx === 'string'
          ? o.tx
          : undefined;
  return {
    success: typeof o.success === 'boolean' ? o.success : undefined,
    transaction: tx,
    payer: typeof o.payer === 'string' ? o.payer : undefined,
    network: typeof o.network === 'string' ? o.network : undefined
  };
}

export function explorerTxUrl(txHash: string, network?: string): string {
  const n = (network ?? 'eip155:8453').toLowerCase();
  if (n.includes('84532')) return `https://sepolia.basescan.org/tx/${txHash}`;
  if (n.includes('8453')) return `https://basescan.org/tx/${txHash}`;
  return txHash;
}

function paymentFailureDebug(res: Response): string {
  const requiredRaw = headerAny(res.headers, [
    'PAYMENT-REQUIRED',
    'payment-required',
    'X-Payment-Required',
    'x-payment-required',
    'X-PAYMENT-REQUIRED'
  ]);
  const responseRaw = headerAny(res.headers, ['PAYMENT-RESPONSE', 'payment-response', 'Payment-Response']);

  const requiredDecoded = tryDecodeBase64Json(requiredRaw) as { error?: unknown } | null;
  const responseDecoded = tryDecodeBase64Json(responseRaw);

  const parts: string[] = [];
  if (requiredDecoded?.error) {
    const errStr = previewBody(requiredDecoded.error, 180);
    parts.push(`paymentRequiredError=${errStr}`);
    if (
      typeof requiredDecoded.error === 'string' &&
      requiredDecoded.error.includes('invalid_exact_evm_transaction_simulation_failed')
    ) {
      parts.push(
        'hint=Facilitator EIP-3009 simulation failed: ensure authorization.from has enough Base USDC for the quoted amount; if the wallet is funded, retry after a few seconds.'
      );
    }
  }
  if (responseDecoded) parts.push(`paymentResponse=${previewBody(responseDecoded, 240)}`);
  return parts.length ? ` (${parts.join(' ')})` : '';
}

function shouldLogPaymentPayload(): boolean {
  const v = (process.env.AGENTPAY_X402_DEBUG || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function sanitizePaymentPayloadForLog(payload: unknown): unknown {
  // Avoid printing full EIP-712 signature bytes; keep enough to correlate.
  if (!payload || typeof payload !== 'object') return payload;
  const clone = JSON.parse(JSON.stringify(payload)) as any;
  const sig =
    clone?.payload?.signature ??
    clone?.payload?.payload?.signature ??
    clone?.payload?.signature ??
    null;
  if (typeof sig === 'string' && sig.startsWith('0x') && sig.length > 18) {
    const head = sig.slice(0, 10);
    const tail = sig.slice(-6);
    if (clone?.payload?.signature) clone.payload.signature = `${head}…${tail}`;
    if (clone?.payload?.payload?.signature) clone.payload.payload.signature = `${head}…${tail}`;
  }
  return clone;
}

function logSignedPaymentPayload(label: string, paymentSignatureHeader: string): void {
  if (!shouldLogPaymentPayload()) return;
  const decoded = tryDecodeBase64Json(paymentSignatureHeader);
  if (!decoded) {
    // If it's not JSON (unexpected), don't spam logs.
    return;
  }
  const safe = sanitizePaymentPayloadForLog(decoded);
  // eslint-disable-next-line no-console
  console.log(`[x402 debug] ${label} payment header payload:\n${JSON.stringify(safe, null, 2)}`);
}

function summarizeHeaderValue(raw: string, max = 120): string {
  const s = raw.trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…(len=${s.length})`;
}

function logPaidRetryRequest(
  label: string,
  url: string,
  init: RequestInit,
  retryHeaders: Headers,
  x402Version: 1 | 2,
  paymentSignature: string
): void {
  if (!shouldLogPaymentPayload()) return;
  const method = String(init.method ?? 'GET');
  const headerName = x402Version === 1 ? 'X-PAYMENT' : 'PAYMENT-SIGNATURE';

  // eslint-disable-next-line no-console
  console.log(`[x402 debug] ${label} paid retry request: ${method} ${url}`);
  // eslint-disable-next-line no-console
  console.log(`[x402 debug] ${label} using header ${headerName}=${summarizeHeaderValue(paymentSignature)}`);
  // eslint-disable-next-line no-console
  console.log(
    `[x402 debug] ${label} request headers:\n${JSON.stringify(Object.fromEntries(retryHeaders.entries()), null, 2)}`
  );
}

async function logPaidRetryResponse(label: string, res: Response, body: unknown): Promise<void> {
  if (!shouldLogPaymentPayload()) return;
  const picked: Record<string, string> = {};
  const names = [
    'content-type',
    'payment-required',
    'payment-response',
    'x-payment-required',
    'x-payment',
    'payment-signature',
    'payment-settlement'
  ];
  for (const n of names) {
    const v = res.headers.get(n);
    if (v) picked[n] = summarizeHeaderValue(v, 160);
  }
  // eslint-disable-next-line no-console
  console.log(`[x402 debug] ${label} paid retry response: HTTP ${res.status}`);
  // eslint-disable-next-line no-console
  console.log(`[x402 debug] ${label} response headers (selected):\n${JSON.stringify(picked, null, 2)}`);
  // eslint-disable-next-line no-console
  console.log(`[x402 debug] ${label} response body preview:\n${previewBody(body, 800)}`);
}

function resolveAuth(built: BuiltX402Request): X402Auth | undefined {
  if (built.auth) return built.auth;
  if (built.url.includes('x402.alchemy.com')) return { type: 'alchemy_siwe' };
  return undefined;
}

async function ensureSession(
  auth: X402Auth | undefined,
  agentPay: AgentPayClient,
  registryId: string,
  existing?: X402Session
): Promise<X402Session | undefined> {
  if (existing) return existing;
  if (auth?.type === 'alchemy_siwe') {
    return createAlchemySiweSession(agentPay, registryId);
  }
  return undefined;
}

function applyPaymentHeaders(headers: Headers, signature: string, x402Version: 1 | 2): void {
  if (x402Version === 1) {
    headers.set('X-PAYMENT', signature);
    headers.set('x-payment', signature);
  } else {
    // x402 V2 (CDP / @x402): retry with PAYMENT-SIGNATURE only; legacy X-PAYMENT can break V2 sellers.
    headers.set('PAYMENT-SIGNATURE', signature);
    headers.set('Payment-Signature', signature);
    headers.set('payment-signature', signature);
  }
}

/** Wallet EIP-3009 sign + retry; version and headers come from the 402 response. */
async function payFrom402(
  url: string,
  init: RequestInit,
  label: string,
  registryId: string,
  agentPay: AgentPayClient,
  decoded: PaymentRequired,
  session: X402Session | undefined
): Promise<FetchX402Result> {
  const accept = selectWalletUsdcAccept(decoded.accepts, label);
  const amount = accept.amount ?? accept.maxAmountRequired;
  const payTo = accept.payTo;
  const asset = accept.asset;
  const x402Version = decoded.x402Version;

  if (!amount || !payTo || !asset) {
    throw new Error(`x402: Invalid accept for ${label}: ${previewBody(accept)}`);
  }

  const omitExtensions = ['1', 'true', 'yes'].includes(
    (process.env.AGENTPAY_X402_OMIT_EXTENSIONS || '').trim().toLowerCase()
  );
  const extensions =
    omitExtensions && x402Version === 2
      ? {}
      : (decoded.extensions ?? {});

  let paymentResult: { signature?: string };
  try {
    paymentResult = (await agentPay.payAndCall(X402_SIGNING_SERVICE_ID, {
      action: 'x402_pay_generic',
      registryId,
      x402Version,
      accepted: accept,
      recipient: payTo,
      amount,
      asset,
      chainId: networkToChainIdString(accept.network),
      assetName: accept.extra?.name ?? null,
      assetVersion: accept.extra?.version ?? null,
      resource: decoded.resource ?? { url, mimeType: 'application/json' },
      extensions
    })) as { signature?: string };
  } catch (err) {
    if (err instanceof AgentPayError) throw err;
    throw err;
  }

  const paymentSignature = String(paymentResult.signature ?? '').trim();
  if (!paymentSignature) {
    throw new AgentPayError(
      `x402: No payment signature from backend for ${label}`,
      'NO_PAYMENT_SIGNATURE'
    );
  }
  logSignedPaymentPayload(label, paymentSignature);

  const retryHeaders = new Headers(init.headers);
  applyPaymentHeaders(retryHeaders, paymentSignature, x402Version);
  applySessionToHeaders(retryHeaders, session);
  if (!retryHeaders.has('Accept')) retryHeaders.set('Accept', 'application/json');
  if (
    !retryHeaders.has('Content-Type') &&
    (init.method === 'POST' || init.method === 'PUT' || init.method === 'PATCH')
  ) {
    retryHeaders.set('Content-Type', 'application/json');
  }

  logPaidRetryRequest(label, url, init, retryHeaders, x402Version, paymentSignature);

  const second = await fetchForX402('paid_retry', label, url, { ...init, headers: retryHeaders });
  const data2 = await readHttpBody(second);
  await logPaidRetryResponse(label, second, data2);
  if (!second.ok) {
    throw new Error(
      `x402: Paid retry failed for ${label}: ${second.status} ${previewBody(data2)}` + paymentFailureDebug(second)
    );
  }

  const settlement = parseSettlementFromResponse(second);
  if (settlement?.transaction) {
    // eslint-disable-next-line no-console
    console.log(
      `[x402] settlement tx=${settlement.transaction} explorer=${explorerTxUrl(settlement.transaction, settlement.network ?? accept.network)}`
    );
  } else if (shouldLogPaymentPayload()) {
    // eslint-disable-next-line no-console
    console.log(`[x402 debug] ${label} paid retry OK but no PAYMENT-RESPONSE tx (seller may not have settled on-chain yet)`);
  }

  return {
    status: second.status,
    data: data2,
    paid: true,
    paymentSignaturePresent: true,
    paidAmountBaseUnits: String(amount),
    x402Version,
    settlement,
    session
  };
}

/**
 * One pipeline for all x402 HTTP APIs:
 * 1. Optional provider auth (registry `auth`, e.g. Alchemy SIWE)
 * 2. HTTP request
 * 3. On 402: detect x402 V1/V2 → sign USDC → retry with correct payment headers
 */
export async function executeX402Request(
  built: BuiltX402Request,
  agentPay: AgentPayClient,
  options?: { session?: X402Session }
): Promise<FetchX402Result> {
  const { url, init, label, serviceId: registryId } = built;
  const auth = resolveAuth(built);
  const session = await ensureSession(auth, agentPay, registryId, options?.session);

  const headers = new Headers(init.headers);
  applySessionToHeaders(headers, session);
  const authedInit = { ...init, headers };

  const first = await fetchForX402('initial', label, url, authedInit);
  if (first.status !== 402) {
    const data = await readHttpBody(first);
    if (!first.ok) {
      throw new Error(`${label} failed: ${first.status} ${first.statusText} body=${previewBody(data)}`);
    }
    return { status: first.status, data, paid: false, session };
  }

  const decoded = await parsePaymentRequiredFrom402(first);
  return payFrom402(url, authedInit, label, registryId, agentPay, decoded, session);
}

/** Call any registered x402 service by id (from listX402Services / config). */
export async function fetchX402Service(
  serviceId: string,
  args: Record<string, unknown>,
  agentPay: AgentPayClient,
  options?: { session?: X402Session }
): Promise<FetchX402Result> {
  const { buildX402Request } = await import('./buildRequest');
  const { isKnownX402Service } = await import('./registry');
  const { resolveX402ServiceId } = await import('./registry');
  const resolvedId = resolveX402ServiceId(serviceId);
  if (!isKnownX402Service(resolvedId)) {
    const known = (await import('./registry')).listX402Services().map((s) => s.serviceId);
    throw new Error(
      `Unknown x402 service "${serviceId}". Known: ${known.join(', ') || '(none)'}. ` +
        'Add config/x402-services.json or call listX402Services().'
    );
  }
  const built = buildX402Request(resolvedId, args);
  return executeX402Request(built, agentPay, options);
}

export type FetchPaidServiceInput = {
  /** Registry id from listX402Services (preferred). */
  serviceId?: string;
  args?: Record<string, unknown>;
  /** Ad-hoc x402 HTTP endpoint when not in the registry. */
  url?: string;
  method?: import('./types').HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  /** Audit key for backend logs when using url (defaults to url). */
  registryId?: string;
  auth?: import('./types').X402Auth;
};

/**
 * Single entry for agents/MCP: registry service **or** ad-hoc URL.
 * Handles optional provider auth, x402 V1/V2 on 402, and WalletConnect signing.
 */
export async function fetchPaidService(
  input: FetchPaidServiceInput,
  agentPay: AgentPayClient,
  options?: { session?: X402Session }
): Promise<FetchX402Result> {
  const { buildX402Request, buildAdHocX402Request } = await import('./buildRequest');

  if (input.serviceId?.trim()) {
    return fetchX402Service(input.serviceId.trim(), input.args ?? {}, agentPay, options);
  }

  if (!input.url?.trim()) {
    throw new Error('fetchPaidService: provide url (full x402 HTTP endpoint). No service catalog.');
  }

  const built = buildAdHocX402Request({
    url: input.url.trim(),
    method: input.method,
    headers: input.headers,
    body: input.body,
    args: input.args,
    serviceId: input.registryId ?? input.url,
    auth: input.auth
  });
  return executeX402Request(built, agentPay, options);
}
