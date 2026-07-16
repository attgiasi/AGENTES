import {
  applyLabel,
  archiveMessage,
  createDraft,
  deleteDraft,
  deleteMessage,
  getMessage,
  getOrCreateLabel,
  labelsByName,
  listLabels,
  markImportant,
  markNotImportant,
  markRead,
  markUnread,
  removeLabel,
  restoreToInbox,
  trashMessage,
  untrashMessage
} from '../gmail/client.js';
import { unsubscribeHint } from './newsletter.js';

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

export async function executeRequestedAction({ gmail, emailId, action, settings, db }) {
  if (!emailId || !action?.name) throw new Error('Comando sem email ou ação válida.');
  const email = await getMessage(gmail, emailId);
  const labels = labelsByName(await listLabels(gmail));
  const normalizedAction = { ...action, status: 'ready', risk: action.risk || 'baixo', reason: action.reason || 'Comando aprovado no painel online.' };
  const result = await executeSingle({ gmail, email, action: normalizedAction, settings, db, labels, dryRun: Boolean(settings.agent.dryRun) });
  db?.recordAction({ emailId, action: action.name, risk: normalizedAction.risk, status: settings.agent.dryRun ? 'dry-run' : 'executed', data: result });
  return { emailId, action: action.name, status: settings.agent.dryRun ? 'dry-run' : 'executed', ...result };
}

export async function undoExecutedAction({ gmail, event, settings, db }) {
  if (!event?.emailId || !event?.action) throw new Error('Histórico sem dados suficientes para desfazer.');
  const dryRun = Boolean(settings.agent.dryRun);
  const metadata = event.metadata || {};
  let detail;
  if (event.action === 'archiveEmail') {
    await restoreToInbox(gmail, event.emailId, { dryRun });
    detail = 'E-mail devolvido para a caixa de entrada.';
  } else if (event.action === 'deleteEmail') {
    await untrashMessage(gmail, event.emailId, { dryRun });
    detail = 'E-mail restaurado da lixeira.';
  } else if (event.action === 'markRead') {
    await markUnread(gmail, event.emailId, { dryRun });
    detail = 'E-mail devolvido para não lido.';
  } else if (event.action === 'markUnread') {
    await markRead(gmail, event.emailId, { dryRun });
    detail = 'E-mail marcado novamente como lido.';
  } else if (event.action === 'markImportant') {
    await markNotImportant(gmail, event.emailId, { dryRun });
    detail = 'Marcador importante removido.';
  } else if (['applyLabel', 'identifyNewsletter'].includes(event.action) && metadata.labelId) {
    await removeLabel(gmail, event.emailId, metadata.labelId, { dryRun });
    detail = `Etiqueta removida: ${metadata.labelName || metadata.labelId}.`;
  } else if (event.action === 'createDraft' && metadata.draftId) {
    await deleteDraft(gmail, metadata.draftId, { dryRun });
    detail = 'Rascunho removido.';
  } else {
    throw new Error('Esta ação não possui uma reversão disponível.');
  }
  db?.recordAction({ emailId: event.emailId, action: `undo:${event.action}`, risk: 'baixo', status: dryRun ? 'dry-run' : 'executed', data: { detail, originalEventId: event.eventId || event.id } });
  return { ok: true, eventId: event.eventId || event.id, emailId: event.emailId, action: event.action, detail, dryRun };
}

async function executeSingle({ gmail, email, action, db, labels, dryRun }) {
  if (action.name === 'applyLabel' || action.name === 'identifyNewsletter') {
    const labelName = action.labelName || 'AI Agent/Geral';
    const label = await resolveLabel(gmail, labelName, labels, dryRun);
    await applyLabel(gmail, email.id, label.id, { dryRun });
    return { detail: `Etiqueta aplicada: ${label.name}`, labelId: label.id, labelName: label.name };
  }
  if (action.name === 'markRead') {
    await markRead(gmail, email.id, { dryRun });
    return { detail: 'Marcado como lido' };
  }
  if (action.name === 'markImportant') {
    await markImportant(gmail, email.id, { dryRun });
    return { detail: 'Marcado como importante no Gmail' };
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
    const draft = await createDraft(gmail, email, action.draft, { dryRun });
    return { detail: 'Rascunho criado', draftId: draft?.id, draft: action.draft };
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
