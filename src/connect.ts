import qrcode from 'qrcode-terminal';
import type { AgentPayConfig } from './config.js';

function reownDeepLink(wcUri: string): string {
  return `https://link.reown.com/wc?uri=${encodeURIComponent(wcUri)}`;
}

export type ConnectOptions = {
  /** Print only the Reown deep link on stdout and exit (for agents; no QR, no wait messaging). */
  urlOnly?: boolean;
};

export async function runConnect(config: AgentPayConfig, options?: ConnectOptions): Promise<string> {
  const base = config.backendUrl.replace(/\/$/, '');
  const headers: HeadersInit = config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {};

  const res = await fetch(`${base}/v1/wc/connect`, { headers });
  const data = (await res.json()) as { uri?: string; error?: string };
  if (!res.ok || !data.uri) {
    throw new Error(data.error ?? `Failed to get pairing URI (HTTP ${res.status})`);
  }

  const link = reownDeepLink(data.uri);

  if (options?.urlOnly) {
    console.log(link);
    return link;
  }

  console.log('\nAgentPay — pair your Android wallet\n');
  console.log('Open this link on your phone (Unstoppable Wallet or any WalletConnect v2 wallet):\n');
  console.log(link);
  console.log('\nOr scan the QR code below:\n');

  await new Promise<void>((resolve) => {
    qrcode.generate(data.uri!, { small: true }, (code) => {
      console.log(code);
      console.log('\nPairing link printed above. Approve on your phone when ready.');
      console.log('This command does not wait for approval — re-run status checks via the backend or app.\n');
      resolve();
    });
  });

  return link;
}
