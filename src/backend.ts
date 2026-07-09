import { DEFAULT_BACKEND_URL, FALLBACK_BACKEND_URL } from './defaults.js';

export async function probeBackend(baseUrl: string): Promise<boolean> {
  const base = baseUrl.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/v1/wc/status`, {
      signal: AbortSignal.timeout(2500)
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function resolveBackendUrlForSetup(existingUrl?: string): Promise<{
  url: string;
  source: string;
  reachable: boolean;
}> {
  const candidates: { url: string; source: string }[] = [];

  if (existingUrl?.trim()) {
    candidates.push({ url: existingUrl.trim().replace(/\/$/, ''), source: 'saved config' });
  }

  const fromEnv = (
    process.env.AGENTPAY_BACKEND_URL ||
    process.env.AGENTPAY_API_BASE_URL ||
    ''
  ).trim();
  if (fromEnv) {
    candidates.push({ url: fromEnv.replace(/\/$/, ''), source: 'AGENTPAY_BACKEND_URL in .env' });
  }

  candidates.push({ url: DEFAULT_BACKEND_URL, source: 'local backend (npm run start:backend)' });
  candidates.push({ url: FALLBACK_BACKEND_URL, source: 'hosted MVP fallback' });

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    const reachable = await probeBackend(candidate.url);
    if (reachable) {
      return { ...candidate, reachable: true };
    }
  }

  const fallback = candidates[0] ?? { url: DEFAULT_BACKEND_URL, source: 'default' };
  return { ...fallback, reachable: false };
}
