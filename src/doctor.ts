import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** MCP tools exposed by horizontalsystems/agentpay-mcp (not npm agentpay-mcp@4.x). */
export const AGENTPAY_MCP_TOOLS = [
  'get_android_app_link',
  'fetch_paid_service',
  'get_pairing_link',
  'get_spending_status'
] as const;

export const AGENTPAY_MCP_PACKAGE = 'horizontalsystems/agentpay-mcp';
export const AGENTPAY_MCP_API = 'walletconnect-x402-v2';

export function bundlePath(): string {
  if (process.argv[1]) {
    return process.argv[1];
  }
  return join(process.cwd(), 'build', 'index.js');
}

export function inspectBundle(path = bundlePath()): {
  ok: boolean;
  path: string;
  hasNewTools: boolean;
  hasOldTools: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  if (!existsSync(path)) {
    return { ok: false, path, hasNewTools: false, hasOldTools: false, issues: ['bundle missing — run npm run build'] };
  }
  const src = readFileSync(path, 'utf8');
  const hasNewTools =
    src.includes('get_pairing_link') && src.includes('fetch_paid_service');
  const hasOldTools =
    /registerTool\(\s*['"]x402_session_start['"]/.test(src) ||
    /registerTool\(\s*['"]x402_pay['"]/.test(src);
  const hasApiMarker = src.includes(AGENTPAY_MCP_API);
  if (!hasApiMarker && hasNewTools) {
    issues.push('bundle may be stale — rebuild from horizontalsystems/agentpay-mcp v2+');
  }
  if (!hasNewTools) {
    issues.push('bundle missing fetch_paid_service / get_pairing_link');
  }
  if (hasOldTools) {
    issues.push(
      'bundle matches npm agentpay-mcp@4.x (x402_session_*) — wrong package; use GitHub horizontalsystems/agentpay-mcp'
    );
  }
  return {
    ok: hasNewTools && !hasOldTools && hasApiMarker,
    path,
    hasNewTools,
    hasOldTools,
    issues
  };
}

export function printToolsJson(): void {
  console.log(
    JSON.stringify(
      {
        package: AGENTPAY_MCP_PACKAGE,
        api: AGENTPAY_MCP_API,
        tools: AGENTPAY_MCP_TOOLS,
        npmWarning:
          'Do NOT npm install -g agentpay-mcp — registry v4.x is a different project (x402_session_* tools, dist/index.js).'
      },
      null,
      2
    )
  );
}

export function runDoctor(): number {
  const bundle = inspectBundle();
  const lines: string[] = [
    `package: ${AGENTPAY_MCP_PACKAGE}`,
    `api: ${AGENTPAY_MCP_API}`,
    `bundle: ${bundle.path}`,
    `tools: ${AGENTPAY_MCP_TOOLS.join(', ')}`
  ];
  if (bundle.issues.length) {
    lines.push('issues:');
    for (const i of bundle.issues) lines.push(`  - ${i}`);
  } else {
    lines.push('status: ok');
  }
  console.log(lines.join('\n'));
  return bundle.ok ? 0 : 1;
}
