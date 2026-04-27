#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('\nVector Agile Roadmap Wizard');
console.log('---------------------------');

// Check if production build exists
const isProd = existsSync(join(projectRoot, '.next'));
const script = isProd ? 'start' : 'dev';

console.log(`Mode: ${isProd ? 'Production' : 'Development'}`);
console.log(`Project Root: ${projectRoot}`);
console.log(`Launching server via ${script}...\n`);

const child = spawn('npm', ['run', script], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true
});

child.on('error', (err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});

