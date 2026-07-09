import { ANDROID_APK_URL, DEFAULT_BACKEND_URL } from './defaults.js';
import { getConfigPath, saveConfig, type AgentPayConfig } from './config.js';
import { loadRootDotenv } from './env.js';
import { probeBackend, resolveBackendUrlForSetup } from './backend.js';

export type InitOptions = {
  backendUrl?: string;
  agentId?: string;
  apiKey?: string;
};

/** Non-interactive config write for Docker / OpenClaw first-run. */
export async function runInit(options?: InitOptions): Promise<AgentPayConfig> {
  loadRootDotenv();
  const detected = await resolveBackendUrlForSetup(options?.backendUrl);

  const backendUrl = (
    options?.backendUrl ??
    process.env.AGENTPAY_BACKEND_URL ??
    process.env.AGENTPAY_API_BASE_URL ??
    detected.url
  )
    .trim()
    .replace(/\/$/, '');

  const agentId = (options?.agentId ?? process.env.AGENTPAY_AGENT_ID ?? 'agent_123').trim();
  if (!agentId) {
    throw new Error('agentId is required (pass --agent-id or set AGENTPAY_AGENT_ID)');
  }

  const apiKey = (options?.apiKey ?? process.env.AGENTPAY_API_KEY ?? '').trim() || undefined;

  const config: AgentPayConfig = { backendUrl, agentId, apiKey };
  saveConfig(config);
  return config;
}

export async function printInitResult(config: AgentPayConfig): Promise<void> {
  const ok = await probeBackend(config.backendUrl);
  console.log(`AgentPay config written to ${getConfigPath()}`);
  console.log(`  backendUrl: ${config.backendUrl}${ok ? ' ✓' : ' (not reachable — is backend running?)'}`);
  console.log(`  agentId: ${config.agentId}`);
  console.log('');
  console.log('Install the AgentPay Android app (required for pairing and payments):');
  console.log(`  ${ANDROID_APK_URL}`);
  console.log('');
  console.log(`Default local backend: ${DEFAULT_BACKEND_URL}`);
}
