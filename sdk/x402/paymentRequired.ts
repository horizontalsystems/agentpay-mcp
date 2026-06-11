export type PaymentRequirements = {
  scheme?: string;
  network?: string;
  amount?: string;
  asset?: string;
  payTo?: string;
  maxAmountRequired?: string;
  maxTimeoutSeconds?: number;
  extra?: { name?: string; version?: string; verifyingContract?: string; [key: string]: unknown };
};

export type PaymentRequired = {
  x402Version: 1 | 2;
  error?: string;
  resource?: { url?: string; mimeType?: string; description?: string };
  accepts?: PaymentRequirements[];
  extensions?: Record<string, unknown>;
};

function tryDecodeBase64Json(raw: string): PaymentRequired | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as PaymentRequired;
    return normalizePaymentRequired(parsed);
  } catch {
    return null;
  }
}

function parseSemicolonHeader(raw: string): PaymentRequired | null {
  const parts = raw.split(';').map((p) => p.trim()).filter(Boolean);
  const network = parts[0] || '';
  const kv: Record<string, string> = {};
  for (const part of parts.slice(1)) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    kv[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  const payTo = kv.recipient || kv.to || '';
  const amount = kv.amount || kv.maxAmountRequired || '';
  if (!network || !payTo || !amount) return null;
  return {
    x402Version: 2,
    accepts: [{ scheme: 'exact', network, amount, payTo, asset: kv.asset }]
  };
}

function normalizePaymentRequired(raw: Partial<PaymentRequired> | null): PaymentRequired | null {
  if (!raw) return null;
  const version = Number(raw.x402Version ?? 2) === 1 ? 1 : 2;
  const accepts = (raw.accepts ?? []).map((a) => ({
    ...a,
    amount: a.amount ?? a.maxAmountRequired
  }));
  return {
    x402Version: version,
    error: raw.error,
    resource:
      typeof raw.resource === 'string'
        ? { url: raw.resource, mimeType: 'application/json' }
        : raw.resource,
    accepts,
    extensions: raw.extensions
  };
}

export function getPaymentRequiredHeader(headers: Headers): string | null {
  return (
    headers.get('PAYMENT-REQUIRED') ||
    headers.get('payment-required') ||
    headers.get('X-Payment-Required') ||
    headers.get('x-payment-required') ||
    headers.get('X-PAYMENT-REQUIRED') ||
    headers.get('x-payment-required')
  );
}

/** Parse x402 V1/V2 payment requirements from a 402 response (header and/or JSON body). */
export async function parsePaymentRequiredFrom402(response: Response): Promise<PaymentRequired> {
  const header = getPaymentRequiredHeader(response.headers);
  const body = await readJsonOrText(response);

  const fromBody =
    body && typeof body === 'object' && Array.isArray((body as PaymentRequired).accepts)
      ? normalizePaymentRequired(body as PaymentRequired)
      : null;

  const decoded =
    fromBody ??
    (header ? tryDecodeBase64Json(header) : null) ??
    (header ? parseSemicolonHeader(header) : null);

  if (!decoded?.accepts?.length) {
    throw new Error('x402: 402 response missing payment requirements (PAYMENT-REQUIRED header or accepts[] body)');
  }
  return decoded;
}

async function readJsonOrText(res: Response): Promise<unknown> {
  const ct = res.headers.get('content-type') || '';
  const text = await res.text();
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      // fall through
    }
  }
  const trimmed = text.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      // ignore
    }
  }
  return text;
}

export async function readHttpBody(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
