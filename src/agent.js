import { openDatabase } from './db/database.js';
import { loadSettings, normalizeSettings, validateSettings } from './settings.js';
import { getGmailClient, getProfile } from './gmail/auth.js';
import { getMessage, labelsByName, listLabels, searchMessages } from './gmail/client.js';
import { buildGmailSearchQuery } from './gmail/query.js';
import { classifyEmail } from './ai/classifier.js';
import { buildActionPlan } from './modules/router.js';
import { createActionLimiter, executePlan } from './modules/actions.js';
import { isNewsletterEmail, unsubscribeHint } from './modules/newsletter.js';
import { saveRunReport } from './reports/reports.js';
import { mergeDeep, nowIso } from './utils.js';
import { shouldRunBySchedule } from './automation/schedule.js';
import { loadRemoteBootstrap, publishRunToRemote } from './remote/client.js';
import { processRemoteCommands } from './remote/commands.js';

export async function runAgent(options = {}) {
  const startedAt = nowIso();
  const db = options.db || await openDatabase(options.databasePath);
  let settings = options.settings || await loadSettings(db);
  let remoteBootstrap = null;
  try {
    remoteBootstrap = await loadRemoteBootstrap();
    if (remoteBootstrap?.settings) settings = normalizeSettings(mergeDeep(settings, remoteBootstrap.settings));
  } catch (error) {
    db.log('warn', 'remote', 'Backend online indisponível; a execução continuará localmente.', { error: error.message });
  }
  settings.customRules = remoteBootstrap?.rules || db.listRules?.(true) || [];
  settings.personalProfile = remoteBootstrap?.profile || db.getPersonalProfile?.() || {};
  const remoteRunRequested = Boolean(remoteBootstrap?.commands?.some((command) => command.status === 'pending' && command.type === 'run_agent'));
  const validation = validateSettings(settings);
  const items = [];
  const finish = async (result) => {
    db.recordRun?.({ startedAt, completedAt: result.payload?.finishedAt || nowIso(), result });
    try {
      await publishRunToRemote(result);
    } catch (error) {
      db.log('warn', 'remote', 'Não foi possível atualizar o dashboard online.', { error: error.message });
    }
    return result;
  };

  for (const warning of validation.warnings) db.log('warn', 'config', warning);
  if (!validation.ok) {
    for (const error of validation.errors) db.log('error', 'config', error);
    return finish({ ok: false, validation, items, files: [] });
  }

  if (!settings.agent.enabled || settings.agent.paused) {
    db.log('info', 'agent', 'Agente pausado/desligado. Nenhuma ação executada.');
    const report = await saveRunReport({ startedAt, settings, validation, items });
    return finish({ ok: true, skipped: true, reason: 'Agente pausado/desligado.', items, ...report });
  }

  if (settings.agent.emergencyStop) {
    db.log('warn', 'agent', 'Parada de emergência ligada. Nenhuma ação executada.');
    const report = await saveRunReport({ startedAt, settings, validation, items });
    return finish({ ok: true, skipped: true, reason: 'Parada de emergência ligada.', items, ...report });
  }

  if (!options.manual && !remoteRunRequested) {
    const schedule = shouldRunBySchedule(settings);
    if (!schedule.allowed) {
      db.log('info', 'automation', `Execução agendada pulada: ${schedule.reason}`);
      const report = await saveRunReport({ startedAt, settings, validation, items });
      return finish({ ok: true, skipped: true, reason: schedule.reason, items, ...report });
    }
  }

  if (!settings.actions.readEmails) {
    db.log('info', 'agent', 'Leitura de Gmail desligada.');
    const report = await saveRunReport({ startedAt, settings, validation, items });
    return finish({ ok: true, skipped: true, reason: 'Leitura desligada.', items, ...report });
  }

  let gmail;
  try {
    gmail = await getGmailClient();
  } catch (error) {
    db.log('error', 'gmail', 'Não foi possível conectar ao Gmail.', { error: error.message });
    if (options.allowMissingGmail) return finish({ ok: false, reason: error.message, items, files: [] });
    throw error;
  }

  const profile = await getProfile(gmail).catch(() => null);
  if (profile?.emailAddress) db.log('info', 'gmail', `Conta conectada: ${profile.emailAddress}`);

  if (remoteBootstrap?.commands?.length) {
    const commandResults = await processRemoteCommands({ commands: remoteBootstrap.commands, gmail, settings, db });
    db.log('info', 'remote', `Comandos online processados: ${commandResults.length}`, { commandResults });
  }

  const labels = labelsByName(await listLabels(gmail));
  const searchQuery = buildGmailSearchQuery(settings, options.query);
  const messages = await searchMessages(gmail, searchQuery, settings.agent.maxEmailsPerRun);
  const limiter = createActionLimiter(settings);
  db.log('info', 'gmail', `Emails encontrados: ${messages.length}`, { query: searchQuery });

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
    const actionResults = await executePlan({ gmail, email, plan, settings, db, labelCache: labels, limiter });

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
  return finish({ ok: true, validation, items, ...report });
}
