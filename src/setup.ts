import inquirer from 'inquirer';
import { getConfigPath, hasConfig, loadConfig, saveConfig, type AgentPayConfig } from './config.js';
import { ANDROID_APK_URL, DEFAULT_BACKEND_URL } from './defaults.js';
import { loadRootDotenv } from './env.js';
import { probeBackend, resolveBackendUrlForSetup } from './backend.js';

export type SetupOptions = {
  askBackend?: boolean;
  backendUrl?: string;
};

export async function runSetup(options?: SetupOptions): Promise<void> {
  loadRootDotenv();
  const existing = loadConfig();

  const detected = await resolveBackendUrlForSetup(options?.backendUrl ?? existing?.backendUrl);

  let backendUrl = options?.backendUrl?.trim() || detected.url;

  if (detected.reachable) {
    console.log(`\n✓ AgentPay backend detected at ${backendUrl}`);
    console.log(`  (${detected.source})\n`);
  } else {
    console.warn(
      `\n⚠ Backend not reachable at ${backendUrl}. Start it with: npm run start:backend\n`
    );
  }

  const shouldAskBackend =
    Boolean(options?.askBackend) || (!detected.reachable && !options?.backendUrl);

  const prompts: inquirer.DistinctQuestion<{
    backendUrl?: string;
    agentId: string;
    apiKey: string;
  }>[] = [];

  if (shouldAskBackend) {
    prompts.push({
      type: 'input',
      name: 'backendUrl',
      message: 'AgentPay Backend URL',
      default: backendUrl,
      validate: (value: string) => {
        try {
          const u = new URL(value.trim());
          if (!['http:', 'https:'].includes(u.protocol)) return 'Use http:// or https://';
          return true;
        } catch {
          return `Enter a valid URL (e.g. ${DEFAULT_BACKEND_URL})`;
        }
      }
    });
  }

  prompts.push(
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
  );

  const answers = await inquirer.prompt<{
    backendUrl?: string;
    agentId: string;
    apiKey: string;
  }>(prompts);

  if (answers.backendUrl?.trim()) {
    backendUrl = answers.backendUrl.trim().replace(/\/$/, '');
  }

  const config: AgentPayConfig = {
    backendUrl,
    agentId: answers.agentId.trim(),
    apiKey: answers.apiKey?.trim() ? answers.apiKey.trim() : undefined
  };

  saveConfig(config);

  const ok = await probeBackend(config.backendUrl);
  console.log(`\nSaved AgentPay config to ${getConfigPath()}`);
  console.log(`  backendUrl: ${config.backendUrl}${ok ? ' ✓' : ' (not reachable)'}`);
  console.log(`\nInstall the AgentPay Android app (required for pairing and payments):`);
  console.log(`  ${ANDROID_APK_URL}`);
  if (hasConfig()) {
    console.log('\nRun `agentpay start` to launch the MCP server (stdio).');
  }
}
