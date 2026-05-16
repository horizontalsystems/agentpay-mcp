import inquirer from 'inquirer';
import { getConfigPath, hasConfig, loadConfig, saveConfig, type AgentPayConfig } from './config.js';
import { DEFAULT_BACKEND_URL } from './defaults.js';

export async function runSetup(): Promise<void> {
  const existing = loadConfig();

  const answers = await inquirer.prompt<{
    backendUrl: string;
    agentId: string;
    apiKey: string;
  }>([
    {
      type: 'input',
      name: 'backendUrl',
      message: 'AgentPay Backend URL',
      default: existing?.backendUrl ?? DEFAULT_BACKEND_URL,
      validate: (value: string) => {
        try {
          const u = new URL(value.trim());
          if (!['http:', 'https:'].includes(u.protocol)) return 'Use http:// or https://';
          return true;
        } catch {
          return 'Enter a valid URL (e.g. http://206.189.229.113:3000)';
        }
      }
    },
    {
      type: 'input',
      name: 'agentId',
      message: 'Agent ID',
      default: existing?.agentId ?? 'agent_123',
      validate: (value: string) => (value.trim().length > 0 ? true : 'Agent ID is required')
    },
    {
      type: 'password',
      name: 'apiKey',
      message: 'API Key (optional, press Enter to skip)',
      mask: '*'
    }
  ]);

  const config: AgentPayConfig = {
    backendUrl: answers.backendUrl.trim().replace(/\/$/, ''),
    agentId: answers.agentId.trim(),
    apiKey: answers.apiKey?.trim() ? answers.apiKey.trim() : undefined
  };

  saveConfig(config);

  console.log(`\nSaved AgentPay config to ${getConfigPath()}`);
  if (hasConfig()) {
    console.log('Run `agentpay start` to launch the MCP server (stdio).');
  }
}
