import Conf from 'conf';
import os from 'os';
import path from 'path';

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

export function loadConfig(): AgentPayConfig | null {
  const s = getStore();
  if (!s.get('backendUrl') || !s.get('agentId')) {
    return null;
  }
  return {
    backendUrl: String(s.get('backendUrl')).replace(/\/$/, ''),
    agentId: String(s.get('agentId')),
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
  return Boolean(s.get('backendUrl') && s.get('agentId'));
}
