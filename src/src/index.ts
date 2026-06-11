import { Command } from 'commander';
import { loadConfig } from './config.js';
import { startMcpServer } from './mcp.js';
import { runSetup } from './setup.js';
import { runConnect } from './connect.js';
import { printInitResult, runInit } from './init.js';
import { printToolsJson, runDoctor } from './doctor.js';

const program = new Command();

program
  .name('agentpay')
  .description('AgentPay MCP firewall — paid agent tools with WalletConnect approval')
  .version('2.0.0');

program
  .command('setup')
  .description('Configure backend URL, agent id, and optional API key (~/.agentpay/config.json)')
  .action(async () => {
    await runSetup();
  });

program
  .command('init')
  .description('Write ~/.agentpay/config.json from env (non-interactive; OpenClaw/Docker)')
  .option('--backend-url <url>', 'AgentPay API base URL (no /v1 suffix)')
  .option('--agent-id <id>', 'Agent id (default: agent_123)')
  .option('--api-key <key>', 'Optional bearer token')
  .action((opts: { backendUrl?: string; agentId?: string; apiKey?: string }) => {
    try {
      const config = runInit({
        backendUrl: opts.backendUrl,
        agentId: opts.agentId,
        apiKey: opts.apiKey
      });
      printInitResult(config);
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('connect')
  .description('Pair your Android wallet via WalletConnect (QR code + deep link)')
  .option('--url-only', 'Print only the raw wc: pairing URI and exit (for agents; do not wait)')
  .action(async (opts: { urlOnly?: boolean }) => {
    const config = loadConfig();
    if (!config) {
      console.error('AgentPay is not configured. Run: agentpay setup or agentpay init');
      process.exit(1);
    }
    try {
      await runConnect(config, { urlOnly: Boolean(opts.urlOnly) });
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('tools')
  .description('Print MCP tool names (verify horizontalsystems build vs npm agentpay-mcp@4.x impostor)')
  .action(() => {
    printToolsJson();
  });

program
  .command('doctor')
  .description('Check bundle has fetch_paid_service / get_pairing_link (not npm v4.x x402_session_* API)')
  .action(() => {
    process.exit(runDoctor());
  });

program
  .command('start')
  .description('Start the MCP server on stdio (for OpenClaw, Claude Desktop, Cursor, etc.)')
  .action(async () => {
    const config = loadConfig();
    if (!config) {
      console.error('AgentPay is not configured. Run: agentpay setup');
      process.exit(1);
    }
    await startMcpServer(config);
  });

program.action(async () => {
  await runSetup();
});

async function main() {
  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error('[agentpay] fatal', err);
  process.exit(1);
});
