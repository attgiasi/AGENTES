import dotenv from 'dotenv';
import { DEFAULT_SETTINGS } from './config/defaults.js';
import { mergeDeep, parseJsonEnv, readJsonFile } from './utils.js';

dotenv.config({ quiet: true });

const LEGACY_DEFAULT_GMAIL_QUERY = 'newer_than:30d -in:sent -in:drafts -in:spam -in:trash';

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
  if (settings.agent.gmailQuery === LEGACY_DEFAULT_GMAIL_QUERY) {
    settings.agent.gmailQuery = '';
  }
  if (rawAgent.autonomyLevel === undefined && hasLegacyAutonomySignals(raw || {})) settings.agent.autonomyLevel = deriveAutonomyLevel(settings);
  settings.agent.autonomyLevel = normalizeAutonomyLevel(settings.agent.autonomyLevel);
  settings.actions = normalizeActions(settings, raw || {});
  syncLegacySettings(settings);
  settings.agent.maxEmailsPerRun = clampNumber(settings.agent.maxEmailsPerRun, 1, 1000, 100);
  settings.gmail.newerThanDays = clampNumber(settings.gmail.newerThanDays, 1, 3650, 30);
  settings.automation.intervalHours = clampNumber(settings.automation.intervalHours, 1, 24, 1);
  settings.automation.allowedHours = normalizeHours(settings.automation.allowedHours);
  settings.organizing.markReadCategories = normalizeMarkReadCategories(settings.organizing.markReadCategories);
  settings.newsletter.archiveAfterDays = clampNumber(settings.newsletter.archiveAfterDays, 1, 365, 5);
  settings.newsletter.deleteAfterDays = clampNumber(settings.newsletter.deleteAfterDays, 0, 3650, 0);
  settings.limits.maxArchivePerRun = clampNumber(settings.limits.maxArchivePerRun, 0, 1000, 1000);
  settings.limits.maxDraftsPerRun = clampNumber(settings.limits.maxDraftsPerRun, 0, 1000, 1000);
  settings.limits.maxRemindersPerRun = clampNumber(settings.limits.maxRemindersPerRun, 0, 1000, 1000);
  settings.limits.maxEventsPerRun = clampNumber(settings.limits.maxEventsPerRun, 0, 1000, 1000);
  settings.limits.maxUnsubscribesPerRun = clampNumber(settings.limits.maxUnsubscribesPerRun, 0, 1000, 1000);
  settings.limits.maxDeletesPerRun = clampNumber(settings.limits.maxDeletesPerRun, 0, 1000, 1000);
  if (!['openai', 'gemini', 'fallback'].includes(settings.ai.provider)) settings.ai.provider = 'openai';
  settings.agent.dryRun = Boolean(settings.agent.dryRun);
  if (settings.agent.emergencyStop) {
    settings.agent.enabled = false;
    settings.agent.paused = true;
    settings.agent.dryRun = true;
    settings.agent.autonomyLevel = 0;
  }
  return settings;
}

export function validateSettings(settings) {
  const errors = [];
  const warnings = [];
  if (!settings.agent.enabled) warnings.push('agent.enabled está desligado.');
  if (settings.agent.emergencyStop) warnings.push('Parada de emergência ligada; nenhuma automação será executada.');
  if (!settings.actions.readEmails) warnings.push('Ação "Ler e-mails" está desligada; o agente não lerá Gmail.');
  if (settings.actions.sendEmails && settings.agent.dryRun) warnings.push('Enviar e-mails está ligado, mas a simulação está ligada.');
  if (settings.actions.deleteEmails) warnings.push('Apagar e-mails está ligado. O agente vai mover para a lixeira quando essa ação for planejada.');
  if (settings.actions.archiveImmediately && !settings.actions.archiveEmails) warnings.push('Arquivamento imediato está ligado, mas "Arquivar e-mails" está desligado.');
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
  if (settings.agent?.dryRun) return 1;
  if (settings.permissions?.highRiskRequiresExplicitConfirmation) return 3;
  if (settings.permissions?.mediumRiskRequiresConfirmation) return 2;
  return 4;
}

function hasLegacyAutonomySignals(raw) {
  return raw?.permissions?.mediumRiskRequiresConfirmation !== undefined
    || raw?.permissions?.highRiskRequiresExplicitConfirmation !== undefined
    || raw?.permissions?.lowRiskAutomatic !== undefined;
}

function normalizeAutonomyLevel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  if (number <= 0) return 0;
  if (number <= 4) return Math.floor(number);
  if (number <= 5) return 2;
  if (number <= 6) return 3;
  return 4;
}

function normalizeActions(settings, raw = {}) {
  const actions = raw.actions ? settings.actions || {} : {};
  const permissions = settings.permissions || {};
  const modules = settings.modules || {};
  const execution = settings.execution || {};
  return {
    readEmails: pick(actions.readEmails, permissions.readEmails, modules.gmailRead, true),
    classifyEmails: pick(actions.classifyEmails, permissions.classifyEmails, modules.classification, true),
    summarizeEmails: pick(actions.summarizeEmails, permissions.summarizeEmails, modules.summaries, true),
    applyLabels: pick(actions.applyLabels, permissions.applyLabels, true),
    identifyNewsletter: pick(actions.identifyNewsletter, modules.newsletter, true),
    markRead: pick(actions.markRead, permissions.markRead, false),
    markReadImmediately: pick(actions.markReadImmediately, execution.markReadImmediately, false),
    markUnread: pick(actions.markUnread, permissions.markUnread, false),
    createReminders: pick(actions.createReminders, permissions.createReminders, modules.appleReminders, true),
    createReports: pick(actions.createReports, permissions.createReports, modules.reports, true),
    archiveEmails: pick(actions.archiveEmails, permissions.archiveEmails, false),
    archiveImmediately: pick(actions.archiveImmediately, execution.archiveImmediately, false),
    moveEmails: pick(actions.moveEmails, permissions.moveEmails, false),
    createDrafts: pick(actions.createDrafts, permissions.createDrafts, modules.drafts, true),
    createCalendarEvents: pick(actions.createCalendarEvents, permissions.createCalendarEvents, modules.appleCalendar, false),
    downloadAttachments: pick(actions.downloadAttachments, permissions.downloadAttachments, modules.attachments, false),
    unsubscribeNewsletter: pick(actions.unsubscribeNewsletter, permissions.unsubscribeNewsletter, false),
    sendEmails: pick(actions.sendEmails, permissions.sendEmails, false),
    deleteEmails: pick(actions.deleteEmails, permissions.deleteEmails, false),
    emptyTrash: pick(actions.emptyTrash, permissions.emptyTrash, false),
    forwardEmails: pick(actions.forwardEmails, permissions.forwardEmails, false),
    bulkActions: pick(actions.bulkActions, permissions.bulkActions, false),
    alterExistingEvents: pick(actions.alterExistingEvents, permissions.alterExistingEvents, false),
    deleteEvents: pick(actions.deleteEvents, permissions.deleteEvents, false)
  };
}

function syncLegacySettings(settings) {
  settings.execution.archiveImmediately = Boolean(settings.actions.archiveImmediately);
  settings.execution.markReadImmediately = Boolean(settings.actions.markReadImmediately);
  Object.assign(settings.permissions, {
    readEmails: settings.actions.readEmails,
    classifyEmails: settings.actions.classifyEmails,
    summarizeEmails: settings.actions.summarizeEmails,
    applyLabels: settings.actions.applyLabels,
    markRead: settings.actions.markRead,
    markUnread: settings.actions.markUnread,
    createReminders: settings.actions.createReminders,
    createReports: settings.actions.createReports,
    archiveEmails: settings.actions.archiveEmails,
    moveEmails: settings.actions.moveEmails,
    createDrafts: settings.actions.createDrafts,
    createCalendarEvents: settings.actions.createCalendarEvents,
    downloadAttachments: settings.actions.downloadAttachments,
    unsubscribeNewsletter: settings.actions.unsubscribeNewsletter,
    sendEmails: settings.actions.sendEmails,
    deleteEmails: settings.actions.deleteEmails,
    emptyTrash: settings.actions.emptyTrash,
    forwardEmails: settings.actions.forwardEmails,
    bulkActions: settings.actions.bulkActions,
    alterExistingEvents: settings.actions.alterExistingEvents,
    deleteEvents: settings.actions.deleteEvents
  });
  Object.assign(settings.modules, {
    gmailRead: settings.actions.readEmails,
    classification: settings.actions.classifyEmails,
    summaries: settings.actions.summarizeEmails,
    newsletter: settings.actions.identifyNewsletter,
    autoArchive: settings.actions.archiveEmails,
    drafts: settings.actions.createDrafts,
    appleReminders: settings.actions.createReminders,
    appleCalendar: settings.actions.createCalendarEvents,
    attachments: settings.actions.downloadAttachments,
    reports: settings.actions.createReports
  });
  delete settings.permissions.lowRiskAutomatic;
  delete settings.permissions.mediumRiskRequiresConfirmation;
  delete settings.permissions.highRiskRequiresExplicitConfirmation;
}

function pick(...values) {
  for (const value of values) {
    if (value !== undefined) return Boolean(value);
  }
  return false;
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

function normalizeMarkReadCategories(value) {
  const allowed = new Set(['newsletter', 'mailing', 'promocao', 'outro', 'financeiro', 'trabalho', 'documento']);
  const raw = Array.isArray(value)
    ? value
    : String(value || '').split(',');
  const selected = raw
    .map((item) => String(item).trim())
    .filter((item) => allowed.has(item));
  const unique = [...new Set(selected)];
  return unique.length ? unique : ['newsletter', 'mailing', 'promocao'];
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
