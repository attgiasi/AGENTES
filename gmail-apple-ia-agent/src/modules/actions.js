import {
  applyLabel,
  archiveMessage,
  createDraft,
  deleteMessage,
  getMessage,
  getOrCreateLabel,
  labelsByName,
  listLabels,
  markRead,
  markUnread,
  trashMessage
} from '../gmail/client.js';
import { unsubscribeHint } from './newsletter.js';
import { ACTIONS, RISK } from '../security/risk.js';

export function createActionLimiter(settings) {
  const limits = settings.limits || {};
  const remaining = new Map([
    ['archiveEmail', Number(limits.maxArchivePerRun ?? 50)],
    ['createDraft', Number(limits.maxDraftsPerRun ?? 10)],
    ['createReminder', Number(limits.maxRemindersPerRun ?? 20)],
    ['createCalendarEvent', Number(limits.maxEventsPerRun ?? 10)],
    ['unsubscribeNewsletter', Number(limits.maxUnsubscribesPerRun ?? 3)],
    ['deleteEmail', Number(limits.maxDeletesPerRun ?? 0)]
  ]);

  return {
    check(actionName) {
      if (!remaining.has(actionName)) return { allowed: true };
      const count = remaining.get(actionName);
      if (count <= 0) return { allowed: false, reason: `Limite por execução atingido para ${actionName}.` };
      remaining.set(actionName, count - 1);
      return { allowed: true, remaining: count - 1 };
    }
  };
}

export async function executePlan({ gmail, email, plan, settings, db, labelCache = null, limiter = createActionLimiter(settings) }) {
  const results = [];
  const labels = labelCache || labelsByName(await listLabels(gmail));

  for (const action of plan.actions) {
    if (!['ready', 'dry-run'].includes(action.status)) {
      results.push({ action: action.name, status: action.status, detail: action.reason, approvalId: action.approvalId });
      continue;
    }
    const dryRun = settings.agent.dryRun || action.status === 'dry-run';
    const limit = dryRun ? { allowed: true } : limiter.check(action.name);
    if (!limit.allowed) {
      db?.recordAction({ emailId: email.id, action: action.name, risk: action.risk, status: 'blocked', data: { reason: limit.reason } });
      results.push({ action: action.name, status: 'blocked', detail: limit.reason });
      continue;
    }
    try {
      const result = await executeSingle({ gmail, email, action, settings, db, labels, dryRun });
      db?.recordAction({ emailId: email.id, action: action.name, risk: action.risk, status: dryRun ? 'dry-run' : 'executed', data: result });
      results.push({ action: action.name, status: dryRun ? 'dry-run' : 'executed', detail: result.detail, data: result });
    } catch (error) {
      db?.recordAction({ emailId: email.id, action: action.name, risk: action.risk, status: 'failed', data: { error: error.message } });
      results.push({ action: action.name, status: 'failed', detail: error.message });
    }
  }

  for (const blocked of plan.blocked) {
    db?.recordAction({ emailId: email.id, action: blocked.action, risk: blocked.risk, status: 'blocked', data: blocked });
  }

  return results;
}

export async function executeApprovedAction({ gmail, approval, settings, db }) {
  if (!approval) throw new Error('Aprovação não encontrada.');
  if (approval.status !== 'pending') throw new Error(`Aprovação não está pendente: ${approval.status}.`);

  const emailId = approval.payload?.emailId;
  const originalAction = approval.payload?.action;
  if (!emailId || !originalAction?.name) throw new Error('Aprovação sem email ou ação válida.');

  const email = await getMessage(gmail, emailId);
  const labels = labelsByName(await listLabels(gmail));
  const action = {
    ...originalAction,
    risk: approval.risk,
    status: 'ready',
    reason: 'Aprovado manualmente pelo painel.'
  };
  const meta = ACTIONS[action.name];
  if (meta?.risk === RISK.HIGH) {
    const confirmationKey = meta.confirmation;
    const confirmed = confirmationKey
      ? settings.confirmations?.[confirmationKey] === settings.confirmations?.required?.[confirmationKey]
      : false;
    if (!confirmed) {
      throw new Error(`Ação de alto risco exige frase de confirmação: ${settings.confirmations?.required?.[confirmationKey] || 'confirmação explícita'}`);
    }
  }
  const dryRun = Boolean(settings.agent.dryRun);
  const result = await executeSingle({ gmail, email, action, settings, db, labels, dryRun });
  db?.recordAction({
    emailId,
    action: action.name,
    risk: action.risk,
    status: dryRun ? 'dry-run' : 'executed',
    requiresConfirmation: true,
    data: { ...result, approvalId: approval.id }
  });
  return {
    approvalId: approval.id,
    emailId,
    action: action.name,
    status: dryRun ? 'dry-run' : 'executed',
    detail: result.detail,
    data: result
  };
}

async function executeSingle({ gmail, email, action, db, labels, dryRun }) {
  if (action.name === 'applyLabel' || action.name === 'identifyNewsletter') {
    const labelName = action.labelName || 'AI Agent/Geral';
    const label = await resolveLabel(gmail, labelName, labels, dryRun);
    await applyLabel(gmail, email.id, label.id, { dryRun });
    return { detail: `Etiqueta aplicada: ${label.name}` };
  }
  if (action.name === 'markRead') {
    await markRead(gmail, email.id, { dryRun });
    return { detail: 'Marcado como lido' };
  }
  if (action.name === 'markUnread') {
    await markUnread(gmail, email.id, { dryRun });
    return { detail: 'Marcado como não lido' };
  }
  if (action.name === 'archiveEmail') {
    await archiveMessage(gmail, email.id, { dryRun });
    return { detail: 'Arquivado/removido da caixa de entrada' };
  }
  if (action.name === 'createDraft') {
    await createDraft(gmail, email, action.draft, { dryRun });
    return { detail: 'Rascunho criado' };
  }
  if (action.name === 'createReminder') {
    const item = db?.createAppleItem({ type: 'reminder', sourceEmailId: email.id, payload: action.payload });
    return { detail: 'Lembrete preparado para Apple Shortcuts', appleItemId: item?.id, payload: action.payload };
  }
  if (action.name === 'createCalendarEvent') {
    const item = db?.createAppleItem({ type: 'calendar_event', sourceEmailId: email.id, payload: action.payload });
    return { detail: 'Evento preparado para Apple Shortcuts', appleItemId: item?.id, payload: action.payload };
  }
  if (action.name === 'unsubscribeNewsletter') {
    return { detail: 'Descadastro pendente de confirmação', hint: unsubscribeHint(email) };
  }
  if (action.name === 'deleteEmail') {
    await trashMessage(gmail, email.id, { dryRun });
    return { detail: 'Movido para lixeira, não apagado definitivamente' };
  }
  if (action.name === 'emptyTrash') {
    return { detail: 'Esvaziar lixeira não é executado automaticamente por este agente' };
  }
  if (action.name === 'hardDeleteEmail') {
    await deleteMessage(gmail, email.id, { dryRun });
    return { detail: 'Apagado definitivamente' };
  }
  return { detail: `Ação desconhecida ignorada: ${action.name}` };
}

async function resolveLabel(gmail, labelName, labels, dryRun) {
  if (labels.has(labelName)) return labels.get(labelName);
  const label = await getOrCreateLabel(gmail, labelName, { labels: [...labels.values()], dryRun });
  labels.set(labelName, label);
  return label;
}
