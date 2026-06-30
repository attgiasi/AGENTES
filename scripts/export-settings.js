import { openDatabase } from '../src/db/database.js';
import { loadSettings } from '../src/settings.js';

const db = await openDatabase();
const settings = await loadSettings(db);

const exportable = structuredClone(settings);

// O Secret AGENT_SETTINGS_JSON deve conter apenas configuração do agente.
// Credenciais ficam em outros Secrets: GOOGLE_CREDENTIALS_JSON, GOOGLE_TOKEN_JSON,
// OPENAI_API_KEY, GEMINI_API_KEY etc.
delete exportable.confirmations?.required;

console.log(JSON.stringify(exportable, null, 2));
