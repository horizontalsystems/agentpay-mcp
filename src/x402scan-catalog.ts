import catalogData from '../config/x402scan-catalog.json';

export const X402SCAN_SOURCE = 'https://www.x402scan.com/resources';

export type X402CatalogApi = {
  name: string;
  url: string;
  method: string;
  description?: string;
  x402scanResourceId?: string;
};

export type X402CatalogService = {
  id: string;
  name: string;
  origin: string;
  description: string;
  source: string;
  discovery?: string;
  x402scanId?: string;
  x402scanUrl?: string;
  txCount?: number;
  apis: X402CatalogApi[];
};

export type X402ScanCatalog = {
  version: string;
  source: string;
  services: X402CatalogService[];
};

const catalog = catalogData as X402ScanCatalog;

export function loadX402ScanCatalog(): X402ScanCatalog {
  return catalog;
}

export function listX402ScanServices(options?: { query?: string; limit?: number }): {
  version: string;
  source: string;
  x402scan: string;
  count: number;
  services: Array<{
    id: string;
    name: string;
    origin: string;
    description: string;
    apiCount: number;
    apis: X402CatalogApi[];
  }>;
} {
  const q = options?.query?.trim().toLowerCase();
  const limit = Math.min(Math.max(options?.limit ?? 30, 1), 30);

  let services = catalog.services;
  if (q) {
    services = services.filter(
      (s) =>
        s.id.includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.origin.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.apis.some((a) => a.name.toLowerCase().includes(q) || a.url.toLowerCase().includes(q))
    );
  }

  return {
    version: catalog.version,
    source: catalog.source,
    x402scan: X402SCAN_SOURCE,
    count: Math.min(services.length, limit),
    services: services.slice(0, limit).map((s) => ({
      id: s.id,
      name: s.name,
      origin: s.origin,
      description: s.description,
      x402scanId: s.x402scanId,
      x402scanUrl: s.x402scanUrl,
      txCount: s.txCount,
      apiCount: s.apis.length,
      apis: s.apis
    }))
  };
}
