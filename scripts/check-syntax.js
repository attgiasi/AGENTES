import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['src', 'scripts', 'test'];
const files = roots.flatMap((root) => listJs(root)).filter((file) => !file.includes('node_modules'));
let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--no-warnings', '--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    console.error(result.stderr || result.stdout);
  }
}

if (failed) process.exit(1);
console.log(`Sintaxe OK em ${files.length} arquivos JavaScript.`);

function listJs(dir) {
  if (!fs.existsSync(dir)) return [];
  const output = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...listJs(full));
    else if (entry.name.endsWith('.js')) output.push(full);
  }
  return output;
}

