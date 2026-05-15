import qrcode from 'qrcode-terminal';
import type { AgentPayConfig } from './config.js';

function reownDeepLink(wcUri: string): string {
  return `https://link.reown.com/wc?uri=${encodeURIComponent(wcUri)}`;
}

export async function runConnect(config: AgentPayConfig): Promise<void> {
  const base = config.backendUrl.replace(/\/$/, '');
  const headers: HeadersInit = config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {};

  const res = await fetch(`${base}/v1/wc/connect`, { headers });
  const data = (await res.json()) as { uri?: string; error?: string };
  if (!res.ok || !data.uri) {
    throw new Error(data.error ?? `Failed to get pairing URI (HTTP ${res.status})`);
  }

  const link = reownDeepLink(data.uri);

  console.log('\nAgentPay — pair your Android wallet\n');
  console.log('Open this link on your phone (Unstoppable Wallet or any WalletConnect v2 wallet):\n');
  console.log(link);
  console.log('\nOr scan the QR code below:\n');

  qrcode.generate(data.uri, { small: true }, (code) => {
    console.log(code);
    console.log('\nWaiting for approval on your device. Check wallet app notifications.');
    console.log('When paired, run `agentpay start` for the MCP server.\n');
  });
}
