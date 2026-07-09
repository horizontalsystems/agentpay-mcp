import { randomBytes } from 'crypto';
import { X402_SIGNING_SERVICE_ID } from './constants';
import type { AgentPayClient } from './types';

/** Provider session: Alchemy gateway SIWE (wallet credits / identity). */
export type X402Session = {
  kind: 'alchemy_siwe';
  token: string;
};

function normalizeSignature(sig: unknown): string {
  if (typeof sig !== 'string') return '';
  let s = sig.trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    try {
      s = JSON.parse(s);
    } catch {
      s = s.slice(1, -1);
    }
  }
  return String(s).trim();
}

export function buildAlchemySiweMessage(address: string): {
  message: string;
  issuedAt: string;
  expirationTime: string;
} {
  const nonce = randomBytes(16).toString('hex');
  const issuedAt = new Date().toISOString();
  const expirationTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const message = [
    'x402.alchemy.com wants you to sign in with your Ethereum account:',
    address,
    '',
    'Sign in to Alchemy Gateway',
    '',
    'URI: https://x402.alchemy.com',
    'Version: 1',
    'Chain ID: 8453',
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Expiration Time: ${expirationTime}`
  ].join('\n');
  return { message, issuedAt, expirationTime };
}

export async function createAlchemySiweSession(
  agentPay: AgentPayClient,
  registryId: string
): Promise<X402Session> {
  const wc = await agentPay.getWalletConnectStatus();
  if (!wc.active || !wc.address) {
    throw new Error('WalletConnect: pair the wallet before Alchemy SIWE (get_x402_pairing_link).');
  }

  const { message } = buildAlchemySiweMessage(wc.address);
  const res = (await agentPay.payAndCall(X402_SIGNING_SERVICE_ID, {
    action: 'personal_sign',
    message,
    registryId
  })) as { signature?: string } | null;

  const sig = normalizeSignature(res?.signature);
  if (!sig) {
    throw new Error('Alchemy SIWE: approve personal_sign on the wallet.');
  }

  const encodedMessage = Buffer.from(message, 'utf8').toString('base64url');
  return { kind: 'alchemy_siwe', token: `${encodedMessage}.${sig}` };
}

export function applySessionToHeaders(headers: Headers, session: X402Session | undefined): void {
  if (session?.kind === 'alchemy_siwe') {
    headers.set('Authorization', `SIWE ${session.token}`);
  }
}
