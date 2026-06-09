import qrcode from 'qrcode-terminal';
import type { AgentPayConfig } from './config.js';

export const PAIRING_INSTRUCTIONS = [
  'Pair your Android wallet (Unstoppable Wallet):',
  '1. Open Unstoppable Wallet on your phone.',
  '2. Go to WalletConnect → Connect (or paste from clipboard).',
  '3. Copy the connection URL from the next message and paste it into the app.',
  '4. Tap Connect and approve the AgentPay session.',
  '',
  'Send the next message to the user as a separate block so they can copy only the URL.'
].join('\n');

export async function fetchPairingUri(config: AgentPayConfig): Promise<string> {
  const base = config.backendUrl.replace(/\/$/, '');
  const headers: HeadersInit = config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {};

  const res = await fetch(`${base}/v1/wc/connect`, { headers });
  const data = (await res.json()) as { uri?: string; error?: string };
  if (!res.ok || !data.uri) {
    throw new Error(data.error ?? `Failed to get pairing URI (HTTP ${res.status})`);
  }

  return data.uri;
}

export type ConnectOptions = {
  /** Return after fetching URI (no QR). Does not write to stdout — safe for MCP stdio. */
  urlOnly?: boolean;
};

export async function runConnect(config: AgentPayConfig, options?: ConnectOptions): Promise<string> {
  const pairingUri = await fetchPairingUri(config);

  if (options?.urlOnly) {
    return pairingUri;
  }

  console.log('\nAgentPay — pair your Android wallet\n');
  console.log('Open this WalletConnect URI on your phone (Unstoppable Wallet or any WC v2 wallet):\n');
  console.log(pairingUri);
  console.log('\nOr scan the QR code below:\n');

  await new Promise<void>((resolve) => {
    qrcode.generate(pairingUri, { small: true }, (code) => {
      console.log(code);
      console.log('\nPairing link printed above. Approve on your phone when ready.');
      console.log('This command does not wait for approval — re-run status checks via the backend or app.\n');
      resolve();
    });
  });

  return pairingUri;
}
