import dotenv from 'dotenv';
import { DEFAULT_SETTINGS } from './config/defaults.js';
import { mergeDeep, parseJsonEnv, readJsonFile } from './utils.js';

dotenv.config({ quiet: true });

export async function loadSettings(db = null, options = {}) {
  const fromDb = db?.getSetting('agentSettings', null) || {};
  const fromEnv = parseJsonEnv('AGENT_SETTINGS_JSON') || {};
  const fromFile = options.path
    ? await readJsonFile(options.path, {})
    : {};
  return normalizeSettings(mergeDeep(mergeDeep(fromDb, fromFile), fromEnv));
}

export function saveSettings(db, settings) {
  db.setSetting('agentSettings', normalizeSettings(settings));
}

export function normalizeSettings(raw) {
  const settings = mergeDeep(DEFAULT_SETTINGS, raw || {});
  const rawAgent = raw?.agent || {};
  if (settings.ai.compareMode !== undefined && settings.ai.compareProviders === undefined) {
    settings.ai.compareProviders = Boolean(settings.ai.compareMode);
  }
  if (settings.apple.integrationMode !== undefined && settings.apple.integrationType === undefined) {
    settings.apple.integrationType = settings.apple.integrationMode;
  }
  for (const key of ['mode']) delete settings.agent[key];
  delete settings.ai.compareMode;
  delete settings.ai.gemini.mode;
  delete settings.apple.integrationMode;
  if (rawAgent.autonomyLevel === undefined) {
    settings.agent.autonomyLevel = deriveAutonomyLevel(settings);
  }
  settings.agent.autonomyLevel = clampNumber(settings.agent.autonomyLevel, 0, 7, 2);
  settings.agent.maxEmailsPerRun = clampNumber(settings.agent.maxEmailsPerRun, 1, 100, 50);
  settings.automation.intervalHours = clampNumber(settings.automation.intervalHours, 1, 24, 1);
  settings.automation.allowedHours = normalizeHours(settings.automation.allowedHours);
  settings.newsletter.archiveAfterDays = clampNumber(settings.newsletter.archiveAfterDays, 1, 365, 5);
  settings.newsletter.deleteAfterDays = clampNumber(settings.newsletter.deleteAfterDays, 0, 3650, 0);
  settings.limits.maxArchivePerRun = clampNumber(settings.limits.maxArchivePerRun, 0, 500, 50);
  settings.limits.maxDraftsPerRun = clampNumber(settings.limits.maxDraftsPerRun, 0, 100, 10);
  settings.limits.maxRemindersPerRun = clampNumber(settings.limits.maxRemindersPerRun, 0, 100, 20);
  settings.limits.maxEventsPerRun = clampNumber(settings.limits.maxEventsPerRun, 0, 100, 10);
  settings.limits.maxUnsubscribesPerRun = clampNumber(settings.limits.maxUnsubscribesPerRun, 0, 50, 3);
  settings.limits.maxDeletesPerRun = clampNumber(settings.limits.maxDeletesPerRun, 0, 50, 0);
  if (!['openai', 'gemini', 'fallback'].includes(settings.ai.provider)) settings.ai.provider = 'openai';
  settings.agent.dryRun = Boolean(settings.agent.dryRun);
  if (settings.agent.autonomyLevel <= 2) settings.agent.dryRun = true;
  if (settings.agent.emergencyStop) {
    settings.agent.enabled = false;
    settings.agent.paused = true;
    settings.agent.dryRun = true;
  }
  return settings;
}

export function validateSettings(settings) {
  const errors = [];
  const warnings = [];
  if (!settings.agent.enabled) warnings.push('agent.enabled está desligado.');
  if (settings.agent.emergencyStop) warnings.push('Parada de emergência ligada; nenhuma automação será executada.');
  if (!settings.permissions.readEmails) warnings.push('permissions.readEmails está desligado; o agente não lerá Gmail.');
  if (settings.permissions.sendEmails && settings.agent.dryRun) warnings.push('sendEmails ligado, mas dryRun está ligado.');
  if (settings.permissions.deleteEmails) warnings.push('deleteEmails é alto risco. Mantenha desligado até confiar totalmente.');
  if (!process.env.OPENAI_API_KEY && settings.ai.provider === 'openai' && settings.ai.openai.enabled) {
    warnings.push('OpenAI está selecionado, mas OPENAI_API_KEY não foi configurada. O agente usará regras locais/fallback.');
  }
  if (!process.env.SHORTCUT_TOKEN && settings.siri.enabled && settings.siri.requireToken) {
    warnings.push('Siri/Atalhos exige SHORTCUT_TOKEN, mas ele não foi configurado.');
  }
  return { ok: errors.length === 0, errors, warnings };
}

function deriveAutonomyLevel(settings) {
  if (settings.agent?.emergencyStop || !settings.agent?.enabled) return 0;
  if (settings.agent?.dryRun) return 2;
  if (settings.permissions?.mediumRiskRequiresConfirmation) return 4;
  return 5;
}

function normalizeHours(value) {
  const raw = Array.isArray(value)
    ? value
    : String(value || '').split(',');
  const hours = raw
    .map((item) => Number(item))
    .filter((number) => Number.isInteger(number) && number >= 0 && number <= 23);
  const unique = [...new Set(hours)].sort((a, b) => a - b);
  return unique.length ? unique : Array.from({ length: 24 }, (_, hour) => hour);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
