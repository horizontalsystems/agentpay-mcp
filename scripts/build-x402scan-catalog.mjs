#!/usr/bin/env node
/**
 * Regenerate config/x402scan-catalog.json from x402scan.com.
 * Uses marketplace/home RSC data for top servers + per-server pages for API endpoints.
 *
 * Usage: node scripts/build-x402scan-catalog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(__dirname, '..', 'config', 'x402scan-catalog.json');

const PAGES = ['https://www.x402scan.com/', 'https://www.x402scan.com/resources'];

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { Accept: 'text/html', 'User-Agent': 'AgentPay-catalog-builder/2.0' },
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
    return origin;
  }
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

const allItems = [];
for (const page of PAGES) {
  const html = await fetchText(page);
  allItems.push(...parseItems(html));
  console.log(`[catalog] ${page} → ${parseItems(html).length} items`);
}

const rows = [];
for (const item of allItems) {
  const tx = Number(item.tx_count ?? 0);
  for (const o of item.origins ?? []) {
    rows.push({
      x402scanId: o.id,
      title: o.title ?? o.origin,
      origin: o.origin,
      description: String(o.description ?? '').replace(/&amp;/g, '&').slice(0, 300),
      tx_count: tx
    });
  }
}

rows.sort((a, b) => b.tx_count - a.tx_count);
const seenHosts = new Set();
const top = [];
for (const row of rows) {
  const hk = hostKey(row.origin);
  if (seenHosts.has(hk)) continue;
  seenHosts.add(hk);
  top.push(row);
  if (top.length >= 30) break;
}

const catalog = {
  version: new Date().toISOString().slice(0, 10),
  source: 'https://www.x402scan.com/resources',
  services: []
};

for (const row of top) {
  const serverUrl = `https://www.x402scan.com/server/${row.x402scanId}`;
  const html = await fetchText(serverUrl);
  const apis = extractServerResources(html);
  catalog.services.push({
    id: slugId(row.origin),
    name: row.title,
    origin: row.origin,
    description: row.description,
    x402scanId: row.x402scanId,
    x402scanUrl: serverUrl,
    txCount: row.tx_count,
    source: 'x402scan.com server page',
    discovery: 'x402scan/server/resources',
    apis
  });
  console.log(`[catalog] ${slugId(row.origin)} tx=${row.tx_count} apis=${apis.length}`);
}

fs.writeFileSync(outFile, JSON.stringify(catalog, null, 2));
console.log(`Wrote ${outFile} (${catalog.services.length} services)`);
