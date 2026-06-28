import { openDatabase } from '../src/db/database.js';
import { loadSettings, validateSettings } from '../src/settings.js';

const db = await openDatabase(':memory:');
const settings = await loadSettings(db);
const validation = validateSettings(settings);

for (const warning of validation.warnings) console.warn(`Aviso: ${warning}`);
for (const error of validation.errors) console.error(`Erro: ${error}`);

if (!validation.ok) process.exit(1);
console.log('Configuração válida.');

