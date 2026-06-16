import type { AgentPayConfig } from './config.js';
import { ANDROID_APK_URL } from './defaults.js';

export const ANDROID_APK_MESSAGE = [
  'Install the AgentPay Android app (required before pairing):',
  ANDROID_APK_URL,
  '',
  'On Android: open the link, download agentPay.apk, and allow install from this source if prompted.'
].join('\n');

export const PAIRING_INSTRUCTIONS = [
  'Pair your Android wallet with AgentPay:',
  '1. Open the AgentPay app on your phone (install from the APK link above if needed).',
  '2. Go to WalletConnect → Connect (or paste from clipboard).',
  '3. Copy the connection URL from the next message and paste it into the app.',
  '4. Tap Connect and approve the AgentPay session.',
  '',
  'IMPORTANT: send the next message exactly as-is (starts with wc:).',
  'NEVER wrap it in https://link.reown.com/wc?uri=... — the wallet app will fail.',
  '',
  'Send the wc: URI to the user as a separate message so they can copy only the URL.'
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
  /** Return URI only; no extra stdout (safe for MCP stdio). */
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
  console.log('\nPairing link printed above. Approve on your phone when ready.');
  console.log('This command does not wait for approval — re-run status checks via the backend or app.\n');

  return pairingUri;
}
