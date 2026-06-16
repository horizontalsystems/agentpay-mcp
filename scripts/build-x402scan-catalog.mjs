#!/usr/bin/env node
/**
 * Regenerate config/x402scan-catalog.json (+ llm summary) from x402scan.com.
 * Top 30 unique hosts by tx_count; skips unavailable / blocklisted domains.
 *
 * Usage: node scripts/build-x402scan-catalog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(__dirname, '..', 'config', 'x402scan-catalog.json');
const llmFile = path.join(__dirname, '..', 'config', 'x402scan-catalog-llm.md');

const PAGES = ['https://www.x402scan.com/', 'https://www.x402scan.com/resources'];
const TOP_N = 30;
const MAX_APIS_PER_SERVICE = 15;
const MAX_TOTAL_APIS = 512;

/** Domains known down or duplicated as many subdomains on x402scan — excluded from catalog. */
const SKIP_DOMAIN_SUFFIXES = ['hugen.tokyo'];

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { Accept: 'text/html', 'User-Agent': 'AgentPay-catalog-builder/3.0' },
    signal: AbortSignal.timeout(25_000)
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return res.text();
}

function parseItems(html) {
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,"((?:\\.|[^"])*)"\]\)/g)].map((m) => m[1]);
  for (const chunk of chunks) {
    if (!chunk.includes('tx_count')) continue;
    const s = JSON.parse(`"${chunk}"`);
    const start = s.indexOf('{"json":{"items":[');
    if (start < 0) continue;
    const sub = s.slice(start);
    let depth = 0;
    for (let i = 0; i < sub.length; i++) {
      if (sub[i] === '{') depth++;
      else if (sub[i] === '}') {
        depth--;
        if (depth === 0) {
          const data = JSON.parse(sub.slice(0, i + 1));
          return data.json.items;
        }
      }
    }
  }
  return [];
}

function hostKey(origin) {
  try {
    return new URL(origin).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isSkippedHost(host) {
  return SKIP_DOMAIN_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
}

function slugId(origin) {
  return hostKey(origin).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function extractServerResources(html) {
  const apis = [];
  const re =
    /\{\\"id\\":\\"([^\\"]+)\\",\\"resource\\":\\"(https?:[^\\"]+)\\",\\"method\\":\\"([^\\"]*)\\"/g;
  let m;
  while ((m = re.exec(html))) {
    const method = (m[3] || 'POST').trim().toUpperCase() || 'POST';
    apis.push({
      x402scanResourceId: m[1],
      url: m[2],
      method,
      name: ''
    });
  }
  const seen = new Set();
  return apis.filter((a) => {
    const k = `${a.method} ${a.url}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function probeOrigin(origin) {
  const url = origin.replace(/\/$/, '');
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
      headers: { 'User-Agent': 'AgentPay-catalog-probe/1.0' }
    });
    return { ok: true, status: res.status };
  } catch {
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(12_000),
        headers: { 'User-Agent': 'AgentPay-catalog-probe/1.0' }
      });
      return { ok: true, status: res.status };
    } catch (err) {
      return { ok: false, status: 0, error: String(err?.message ?? err) };
    }
  }
}

function formatProbe(probe) {
  if (!probe.ok) return 'unreachable';
  if (probe.status === 402) return 'HTTP 402';
  return `HTTP ${probe.status}`;
}

function writeLlmDoc(catalog, skipped) {
  const lines = [
    `# AgentPay x402 Catalog (${catalog.version})`,
    `Source: ${catalog.source}`,
    `Services: ${catalog.services.length}`,
    skipped.length ? `Skipped domains: ${skipped.join(', ')}` : '',
    ''
  ].filter(Boolean);

  let apiBudget = MAX_TOTAL_APIS;
  for (let i = 0; i < catalog.services.length; i++) {
    const s = catalog.services[i];
    const apis = s.apis.slice(0, Math.min(MAX_APIS_PER_SERVICE, apiBudget));
    apiBudget -= apis.length;
    lines.push(`## ${i + 1}. ${s.name}`);
    lines.push(`- **Origin:** ${s.origin}`);
    lines.push(`- **x402scan:** ${s.x402scanUrl}`);
    lines.push(`- **Tx volume:** ${(s.txCount ?? 0).toLocaleString('en-US')}`);
    if (s.probe) lines.push(`- **Probe:** ${s.probe}`);
    if (s.description) lines.push(`- **Description:** ${s.description}`);
    lines.push(`- **APIs (${s.apis.length}${s.apis.length > apis.length ? `, showing ${apis.length}` : ''}):**`);
    for (const a of apis) {
      lines.push(`  - \`${a.method}\` ${a.url}`);
    }
    if (s.apis.length > apis.length) {
      lines.push(`  - ... +${s.apis.length - apis.length} more (see x402scanUrl)`);
    }
    lines.push('');
    if (apiBudget <= 0) break;
  }

  fs.writeFileSync(llmFile, lines.join('\n'));
}

const allItems = [];
for (const page of PAGES) {
  const html = await fetchText(page);
  const items = parseItems(html);
  allItems.push(...items);
  console.log(`[catalog] ${page} → ${items.length} items`);
}

/** host → best row (highest tx) + all x402scan server ids for that host */
const byHost = new Map();
for (const item of allItems) {
  const tx = Number(item.tx_count ?? 0);
  for (const o of item.origins ?? []) {
    const origin = o.origin ?? '';
    const hk = hostKey(origin);
    if (!hk || isSkippedHost(hk)) continue;
    const row = {
      x402scanId: o.id,
      title: o.title ?? origin,
      origin,
      description: String(o.description ?? '').replace(/&amp;/g, '&').slice(0, 300),
      tx_count: tx
    };
    const existing = byHost.get(hk);
    if (!existing) {
      byHost.set(hk, { row, serverIds: [o.id] });
    } else {
      existing.serverIds.push(o.id);
      if (tx > existing.row.tx_count) existing.row = row;
    }
  }
}

const ranked = [...byHost.values()]
  .map((v) => v.row)
  .sort((a, b) => b.tx_count - a.tx_count);

const top = [];
const skippedProbe = [];
for (const row of ranked) {
  if (top.length >= TOP_N) break;
  const probe = await probeOrigin(row.origin);
  if (!probe.ok || probe.status >= 500) {
    const reason = !probe.ok ? (probe.error ?? 'network') : `HTTP ${probe.status}`;
    console.log(`[catalog] skip ${hostKey(row.origin)} — ${reason}`);
    skippedProbe.push(hostKey(row.origin));
    continue;
  }
  top.push({ ...row, probe: formatProbe(probe) });
}

let totalApis = 0;
const catalog = {
  version: new Date().toISOString().slice(0, 10),
  source: 'https://www.x402scan.com/resources',
  skippedDomains: [...SKIP_DOMAIN_SUFFIXES],
  services: []
};

for (const row of top) {
  const hk = hostKey(row.origin);
  const serverIds = [...new Set(byHost.get(hk)?.serverIds ?? [row.x402scanId])];
  const apis = [];
  const seenApi = new Set();
  for (const sid of serverIds) {
    const serverUrl = `https://www.x402scan.com/server/${sid}`;
    const html = await fetchText(serverUrl);
    for (const a of extractServerResources(html)) {
      const k = `${a.method} ${a.url}`;
      if (seenApi.has(k)) continue;
      seenApi.add(k);
      apis.push(a);
    }
  }

  const capped = apis.slice(0, MAX_APIS_PER_SERVICE);
  totalApis += capped.length;
  if (totalApis > MAX_TOTAL_APIS) {
    const over = totalApis - MAX_TOTAL_APIS;
    capped.splice(capped.length - over, over);
    totalApis = MAX_TOTAL_APIS;
  }

  catalog.services.push({
    id: slugId(row.origin),
    name: row.title,
    origin: row.origin,
    description: row.description,
    x402scanId: row.x402scanId,
    x402scanUrl: `https://www.x402scan.com/server/${row.x402scanId}`,
    txCount: row.tx_count,
    probe: row.probe,
    source: 'x402scan.com server page',
    discovery: 'x402scan/server/resources',
    apis: capped
  });
  console.log(`[catalog] ${slugId(row.origin)} tx=${row.tx_count} probe=${row.probe} apis=${capped.length}/${apis.length}`);
}

fs.writeFileSync(outFile, JSON.stringify(catalog, null, 2));
writeLlmDoc(catalog, SKIP_DOMAIN_SUFFIXES);
console.log(`Wrote ${outFile} (${catalog.services.length} services, ${totalApis} apis)`);
console.log(`Wrote ${llmFile}`);
