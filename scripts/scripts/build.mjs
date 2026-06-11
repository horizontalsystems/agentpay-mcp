import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outFile = path.join(root, 'build', 'index.js');

await esbuild.build({
  entryPoints: [path.join(root, 'src', 'index.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  outfile: outFile,
  banner: {
    js: '#!/usr/bin/env node'
  },
  sourcemap: true,
  minify: false,
  logLevel: 'info',
  mainFields: ['module', 'main']
});

fs.chmodSync(outFile, 0o755);
console.log(`Built ${outFile}`);
