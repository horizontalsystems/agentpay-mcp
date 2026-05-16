import { DEFAULT_BACKEND_URL } from './defaults.js';
import { getConfigPath, saveConfig, type AgentPayConfig } from './config.js';

export type InitOptions = {
  backendUrl?: string;
  agentId?: string;
  apiKey?: string;
};

/** Non-interactive config write for Docker / OpenClaw first-run. */
export function runInit(options?: InitOptions): AgentPayConfig {
  const backendUrl = (
    options?.backendUrl ??
    process.env.AGENTPAY_BACKEND_URL ??
    process.env.AGENTPAY_API_BASE_URL ??
    DEFAULT_BACKEND_URL
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

export function printInitResult(config: AgentPayConfig): void {
  console.log(`AgentPay config written to ${getConfigPath()}`);
  console.log(`  backendUrl: ${config.backendUrl}`);
  console.log(`  agentId: ${config.agentId}`);
}
