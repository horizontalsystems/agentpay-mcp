import type { PaymentRequirements } from './paymentRequired';

const BASE_NATIVE_USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

const EVM_BASE_NETWORKS = new Set([
  'eip155:8453',
  'base',
  'base-mainnet',
  'base-main',
  '8453'
]);

function isBatchedOrUnsupportedScheme(a: PaymentRequirements): boolean {
  const name = String(a.extra?.name ?? '').trim();
  if (name === 'GatewayWalletBatched') return true;
  const vc = (a.extra as { verifyingContract?: string } | undefined)?.verifyingContract;
  return typeof vc === 'string' && vc.startsWith('0x') && name !== 'USD Coin' && name !== 'USDC';
}

function isEvmBaseUsdcAccept(a: PaymentRequirements): boolean {
  if (a.scheme !== 'exact') return false;
  const network = String(a.network ?? '').toLowerCase();
  if (!EVM_BASE_NETWORKS.has(network) && !network.includes('8453')) return false;
  if (typeof a.payTo !== 'string' || !a.payTo.startsWith('0x')) return false;
  if (typeof a.asset !== 'string' || !a.asset.startsWith('0x')) return false;
  return a.asset.toLowerCase() === BASE_NATIVE_USDC;
}

function acceptScore(a: PaymentRequirements): number {
  let score = 0;
  const name = String(a.extra?.name ?? '').trim();
  if (name === 'USD Coin') score += 4;
  if (String(a.extra?.version ?? '') === '2') score += 2;
  if (String(a.network ?? '').startsWith('eip155:')) score += 1;
  return score;
}

/** Pick Circle USDC EIP-3009 on Base for WalletConnect (skips Alchemy batch scheme, Solana, etc.). */
export function selectWalletUsdcAccept(
  accepts: PaymentRequirements[] | undefined,
  label: string
): PaymentRequirements {
  if (!accepts?.length) {
    throw new Error(`x402: No accepts[] for ${label}`);
  }

  const candidates = accepts.filter((a) => !isBatchedOrUnsupportedScheme(a) && isEvmBaseUsdcAccept(a));
  if (!candidates.length) {
    const nets = accepts
      .map((a) => `${a.scheme ?? '?'}/${a.network ?? '?'} asset=${a.asset?.slice(0, 10) ?? '?'}`)
      .join(', ');
    throw new Error(
      `x402: No Base USDC (EIP-3009) accept for ${label}. Need exact scheme + Base USDC ${BASE_NATIVE_USDC}. Saw: ${nets}`
    );
  }

  return candidates.sort((a, b) => acceptScore(b) - acceptScore(a))[0];
}

/** Map x402 network id to EIP-712 chainId for signing. */
export function networkToChainId(network: string | undefined): number {
  const n = String(network ?? 'eip155:8453').toLowerCase();
  if (n === 'base' || n === 'base-mainnet' || n === 'base-main') return 8453;
  if (n === 'base-sepolia' || n === 'eip155:84532') return 84532;
  const m = n.match(/^eip155:(\d+)$/);
  if (m) return Number(m[1]);
  if (n === '8453') return 8453;
  return 8453;
}

export function networkToChainIdString(network: string | undefined): string {
  const n = String(network ?? '').toLowerCase();
  if (n.startsWith('eip155:')) return n;
  if (n === 'base' || n === 'base-mainnet') return 'eip155:8453';
  if (n === 'base-sepolia') return 'eip155:84532';
  return `eip155:${networkToChainId(network)}`;
}
