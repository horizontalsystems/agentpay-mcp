import fs from 'fs';
import path from 'path';

/** Load repo root `.env` so AGENTPAY_BACKEND_URL applies without exporting manually. */
export function loadRootDotenv(): void {
  const roots = [process.cwd(), path.resolve(process.cwd(), '..'), path.resolve(process.cwd(), '../..')];
  for (const root of roots) {
    const envPath = path.join(root, '.env');
    if (!fs.existsSync(envPath)) continue;
    try {
      const raw = fs.readFileSync(envPath, 'utf8');
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
      return;
    } catch {
      // try next candidate
    }
  }
}
