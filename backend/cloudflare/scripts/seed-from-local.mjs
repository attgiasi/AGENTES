import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const baseUrl = String(process.env.LOCAL_PANEL_URL || 'http://localhost:8787').replace(/\/+$/, '');
const [settingsResponse, profileResponse] = await Promise.all([
  fetch(`${baseUrl}/api/settings`),
  fetch(`${baseUrl}/api/profile`)
]);
if (!settingsResponse.ok || !profileResponse.ok) throw new Error('Abra o painel local antes de sincronizar a configuração.');

const settings = await settingsResponse.json();
delete settings.modules;
delete settings.permissions;
delete settings.confirmations;
removeNotes(settings);
const profilePayload = await profileResponse.json();
const profile = profilePayload.profile || {};
const stamp = new Date().toISOString();
const sql = [
  `INSERT INTO settings_state (id,data,updated_at) VALUES ('active','${escapeSql(JSON.stringify(settings))}','${stamp}') ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at;`,
  `INSERT INTO personal_profile (id,data,updated_at) VALUES ('default','${escapeSql(JSON.stringify(profile))}','${stamp}') ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at;`
].join('\n');

const directory = path.resolve('.wrangler');
const file = path.join(directory, 'seed-settings.sql');
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(file, `${sql}\n`, 'utf8');
const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', `npx.cmd wrangler d1 execute inbox-ai --remote --file="${file}"`]
  : ['wrangler', 'd1', 'execute', 'inbox-ai', '--remote', `--file=${file}`];
const result = spawnSync(command, args, { cwd: process.cwd(), encoding: 'utf8', shell: false });
fs.rmSync(file, { force: true });
if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'Falha ao sincronizar configuração.');
console.log('Configuração e perfil locais sincronizados com o D1 sem expor dados no terminal.');

function escapeSql(value) { return String(value).replaceAll("'", "''"); }
function removeNotes(value) {
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (key === 'note') delete value[key];
    else removeNotes(value[key]);
  }
}
