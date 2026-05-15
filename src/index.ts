import { Command } from 'commander';
import { loadConfig } from './config.js';
import { startMcpServer } from './mcp.js';
import { runSetup } from './setup.js';

const program = new Command();

program
  .name('agentpay')
  .description('AgentPay MCP firewall — paid agent tools with WalletConnect approval')
  .version('1.0.0');

program
  .command('setup')
  .description('Configure backend URL, agent id, and optional API key (~/.agentpay/config.json)')
  .action(async () => {
    await runSetup();
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
