import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const file = path.resolve('.cloudflare.local.json');
let values = {};
try { values = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* primeira configuração */ }
values.ADMIN_TOKEN ||= crypto.randomBytes(36).toString('base64url');
values.INGEST_TOKEN ||= crypto.randomBytes(36).toString('base64url');
fs.writeFileSync(file, `${JSON.stringify(values, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });

for (const name of ['ADMIN_TOKEN', 'INGEST_TOKEN']) {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npx.cmd wrangler secret put ${name}`]
    : ['wrangler', 'secret', 'put', name];
  const result = spawnSync(command, args, { cwd: process.cwd(), input: `${values[name]}\n`, encoding: 'utf8', shell: false });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || `Falha ao configurar ${name}.`);
    process.exit(result.status || 1);
  }
  console.log(`${name} criado e enviado com segurança.`);
}
console.log('Cópia local protegida por .gitignore: backend/cloudflare/.cloudflare.local.json');
