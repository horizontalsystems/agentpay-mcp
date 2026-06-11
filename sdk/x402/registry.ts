import fs from 'fs';
import path from 'path';
import { BUILTIN_X402_SERVICES } from './builtin';
import type { X402Service, X402ServiceJson } from './types';

let cache: Record<string, X402Service> | null = null;

function jsonEntryToService(entry: X402ServiceJson): X402Service {
  const svc: X402Service = {
    label: entry.label,
    url: entry.url,
    method: entry.method,
    headers: entry.headers,
    argsHint: entry.argsHint,
    auth: entry.auth
  };
  if (entry.bodyFromArgs) {
    svc.body = (args) => args;
  }
  return svc;
}

function loadJsonFile(filePath: string): Record<string, X402Service> {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, X402ServiceJson>;
  const out: Record<string, X402Service> = {};
  for (const [id, entry] of Object.entries(raw)) {
    if (!entry?.url || !entry?.method) continue;
    out[id] = jsonEntryToService(entry);
  }
  return out;
}

function resolveJsonPaths(): string[] {
  const paths: string[] = [];
  const envPath = process.env.AGENTPAY_X402_SERVICES_PATH?.trim();
  if (envPath) paths.push(envPath);

  const cwd = process.cwd();
  paths.push(
    path.join(cwd, 'config', 'x402-services.json'),
    path.join(cwd, 'x402-services.json')
  );
  return paths;
}

/** Merged registry: builtins + optional JSON overlays (later files override). */
export function getX402Services(): Record<string, X402Service> {
  if (cache) return cache;

  const merged: Record<string, X402Service> = { ...BUILTIN_X402_SERVICES };

  for (const filePath of resolveJsonPaths()) {
    try {
      if (fs.existsSync(filePath)) {
        Object.assign(merged, loadJsonFile(filePath));
      }
    } catch {
      // skip invalid paths
    }
  }

  cache = merged;
  return merged;
}

const SERVICE_ALIASES: Record<string, string> = {
  exasearch: 'exa_search',
  exa: 'exa_search',
  nansen: 'nansen_smart_money_holdings',
  nansen_smart_money: 'nansen_smart_money_holdings'
};

export function resolveX402ServiceId(serviceId: string): string {
  const trimmed = serviceId.trim();
  return SERVICE_ALIASES[trimmed] ?? trimmed;
}

export function getX402Service(serviceId: string): X402Service | undefined {
  return getX402Services()[resolveX402ServiceId(serviceId)];
}

export function listX402Services(): Array<{
  serviceId: string;
  label: string;
  method: string;
  url: string;
  argsHint: string;
  auth?: { type: string };
}> {
  return Object.entries(getX402Services()).map(([serviceId, svc]) => ({
    serviceId,
    label: svc.label,
    method: svc.method,
    url: svc.url,
    argsHint: svc.argsHint,
    auth: svc.auth ? { type: svc.auth.type } : undefined
  }));
}

export function isKnownX402Service(serviceId: string): boolean {
  return Boolean(getX402Service(serviceId));
}

/** Clear cached registry (tests or hot-reload of JSON config). */
export function resetX402ServiceCache(): void {
  cache = null;
}
