import { openDatabase } from './db/database.js';
import { loadSettings, validateSettings } from './settings.js';
import { getGmailClient, getProfile } from './gmail/auth.js';
import { getMessage, labelsByName, listLabels, searchMessages } from './gmail/client.js';
import { classifyEmail } from './ai/classifier.js';
import { buildActionPlan } from './modules/router.js';
import { executePlan } from './modules/actions.js';
import { isNewsletterEmail, unsubscribeHint } from './modules/newsletter.js';
import { saveRunReport } from './reports/reports.js';
import { nowIso } from './utils.js';

export async function runAgent(options = {}) {
  const startedAt = nowIso();
  const db = options.db || await openDatabase(options.databasePath);
  const settings = options.settings || await loadSettings(db);
  const validation = validateSettings(settings);
  const items = [];

  for (const warning of validation.warnings) db.log('warn', 'config', warning);
  if (!validation.ok) {
    for (const error of validation.errors) db.log('error', 'config', error);
    return { ok: false, validation, items, files: [] };
  }

  if (!settings.agent.enabled || settings.agent.paused) {
    db.log('info', 'agent', 'Agente pausado/desligado. Nenhuma ação executada.');
    const report = await saveRunReport({ startedAt, settings, validation, items });
    return { ok: true, skipped: true, reason: 'Agente pausado/desligado.', ...report };
  }

  if (!settings.modules.gmailRead || !settings.permissions.readEmails) {
    db.log('info', 'agent', 'Leitura de Gmail desligada.');
    const report = await saveRunReport({ startedAt, settings, validation, items });
    return { ok: true, skipped: true, reason: 'Leitura desligada.', ...report };
  }

  let gmail;
  try {
    gmail = await getGmailClient();
  } catch (error) {
    db.log('error', 'gmail', 'Não foi possível conectar ao Gmail.', { error: error.message });
    if (options.allowMissingGmail) return { ok: false, reason: error.message, items, files: [] };
    throw error;
  }

  const profile = await getProfile(gmail).catch(() => null);
  if (profile?.emailAddress) db.log('info', 'gmail', `Conta conectada: ${profile.emailAddress}`);

  const labels = labelsByName(await listLabels(gmail));
  const messages = await searchMessages(gmail, options.query || settings.agent.gmailQuery, settings.agent.maxEmailsPerRun);
  db.log('info', 'gmail', `Emails encontrados: ${messages.length}`, { query: options.query || settings.agent.gmailQuery });

  for (const message of messages) {
    const email = await getMessage(gmail, message.id);
    const decision = await classifyEmail(email, settings, db);

    if (isNewsletterEmail(email, settings)) {
      db.recordNewsletter({
        senderEmail: email.from.email,
        senderDomain: email.from.domain,
        subject: email.subject,
        estimatedBytes: email.sizeEstimate,
        unsubscribeHint: unsubscribeHint(email)
      });
    }

    const plan = buildActionPlan({ email, decision, settings, db });
    const actionResults = await executePlan({ gmail, email, plan, settings, db, labelCache: labels });

    items.push({
      id: email.id,
      subject: email.subject,
      from: email.headers.from,
      category: decision.categoria,
      priority: decision.prioridade,
      summary: decision.resumo,
      reason: decision.motivo,
      source: decision.source,
      actions: actionResults,
      blocked: plan.blocked,
      approvals: plan.approvals
    });
  }

  const report = await saveRunReport({ startedAt, settings, validation, items });
  return { ok: true, validation, items, ...report };
}

