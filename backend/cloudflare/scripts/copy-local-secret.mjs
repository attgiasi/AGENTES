import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const allowed = { admin: 'ADMIN_TOKEN', ingest: 'INGEST_TOKEN' };
const key = allowed[process.argv[2]];
if (!key) throw new Error('Use admin ou ingest.');
const values = JSON.parse(fs.readFileSync('.cloudflare.local.json', 'utf8'));
if (!values[key]) throw new Error(`${key} ainda não foi criado.`);

if (process.platform !== 'win32') throw new Error('Este atalho de cópia foi preparado para Windows.');
const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', '$value=[Console]::In.ReadToEnd(); Set-Clipboard -Value $value'], {
  input: values[key], encoding: 'utf8', shell: false
});
if (result.status !== 0) throw new Error('Não foi possível copiar para a área de transferência.');
console.log(`${key} copiado para a área de transferência sem ser exibido.`);
