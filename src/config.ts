import Conf from 'conf';
import os from 'os';
import path from 'path';
import { DEFAULT_BACKEND_URL } from './defaults.js';

export type AgentPayConfig = {
  backendUrl: string;
  agentId: string;
  apiKey?: string;
};

let store: Conf<AgentPayConfig> | null = null;

function getStore(): Conf<AgentPayConfig> {
  if (!store) {
    store = new Conf<AgentPayConfig>({
      cwd: path.join(os.homedir(), '.agentpay'),
      configName: 'config',
      schema: {
        backendUrl: { type: 'string' },
        agentId: { type: 'string' },
        apiKey: { type: 'string' }
      }
    });
  }
  return store;
}

export function getConfigPath(): string {
  return getStore().path;
}

function resolveBackendUrl(stored: unknown): string {
  const fromEnv =
    (process.env.AGENTPAY_BACKEND_URL || process.env.AGENTPAY_API_BASE_URL || '').trim() || undefined;
  const storedStr =
    typeof stored === 'string' && stored.trim() ? String(stored).trim().replace(/\/$/, '') : '';
  return (fromEnv ? fromEnv.replace(/\/$/, '') : storedStr || DEFAULT_BACKEND_URL).replace(/\/$/, '');
}

export function loadConfig(): AgentPayConfig | null {
  const s = getStore();
  const agentId = s.get('agentId');
  if (!agentId) {
    return null;
  }
  return {
    backendUrl: resolveBackendUrl(s.get('backendUrl')),
    agentId: String(agentId),
    apiKey: s.get('apiKey') ? String(s.get('apiKey')) : undefined
  };
}

export function saveConfig(config: AgentPayConfig): void {
  const s = getStore();
  s.set('backendUrl', config.backendUrl.replace(/\/$/, ''));
  s.set('agentId', config.agentId);
  if (config.apiKey) {
    s.set('apiKey', config.apiKey);
  } else {
    s.delete('apiKey');
  }
}

export function hasConfig(): boolean {
  const s = getStore();
  return Boolean(s.get('agentId'));
}
