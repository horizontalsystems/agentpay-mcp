import { getX402Service, getX402Services } from './registry';
import type { BuiltX402Request, HttpMethod } from './types';

function interpolateUrl(template: string, args: Record<string, unknown>): string {
  return template.replace(/\$\{(\w+)\}/g, (_, key: string) => encodeURIComponent(String(args[key] ?? '')));
}

const METHODS_WITH_BODY = new Set<HttpMethod>(['POST', 'PUT', 'PATCH']);

/**
 * Build an HTTP request for a registered x402 service.
 */
export function buildX402Request(
  serviceId: string,
  args: Record<string, unknown> = {}
): BuiltX402Request {
  const svc = getX402Service(serviceId);
  if (!svc) {
    const known = Object.keys(getX402Services()).join(', ') || '(none)';
    throw new Error(
      `Unknown x402 service "${serviceId}". Use list_x402_services or add config/x402-services.json. Known: ${known}`
    );
  }

  const validationError = svc.validate?.(args) ?? null;
  if (validationError) {
    throw new Error(validationError);
  }

  const url = interpolateUrl(svc.url, args);
  const method = svc.method;
  const headers = new Headers(svc.headers ?? {});

  const init: RequestInit = { method, headers };

  if (METHODS_WITH_BODY.has(method)) {
    const payload = svc.body ? svc.body(args) : args;
    if (payload !== undefined && payload !== null) {
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
      init.body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    }
  }

  return { url, init, label: svc.label, serviceId, auth: svc.auth };
}

/**
 * Build a request for an arbitrary x402 HTTP endpoint (not in the registry).
 * `serviceId` in the result is the registry/audit key (defaults to the URL).
 * Backend signing always uses {@link X402_SIGNING_SERVICE_ID} via fetchWithX402.
 */
export function buildAdHocX402Request(input: {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  args?: Record<string, unknown>;
  serviceId?: string;
  label?: string;
  auth?: BuiltX402Request['auth'];
}): BuiltX402Request {
  const method = input.method ?? 'POST';
  const headers = new Headers(input.headers ?? {});
  const init: RequestInit = { method, headers };

  if (METHODS_WITH_BODY.has(method)) {
    const payload = input.body !== undefined ? input.body : input.args;
    if (payload !== undefined && payload !== null) {
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
      init.body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    }
  }

  return {
    url: input.url,
    init,
    label: input.label ?? 'x402 API',
    serviceId: input.serviceId ?? input.url,
    auth: input.auth
  };
}
