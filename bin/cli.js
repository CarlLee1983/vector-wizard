#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('\nVector Agile Roadmap Wizard');
console.log('---------------------------');
console.log(`Project Root: ${projectRoot}`);
console.log('Launching server...\n');

// Use npm by default to avoid bun directory issues in some environments
const runner = 'npm';

const child = spawn(runner, ['run', 'dev'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true
});

child.on('error', (err) => {
  console.error(`Failed to start server using ${runner}:`, err.message);
  console.log('Retrying with npm...');
  spawn('npm', ['run', 'dev'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true
  });
});
