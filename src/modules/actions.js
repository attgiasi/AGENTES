import {
  applyLabel,
  archiveMessage,
  createDraft,
  deleteMessage,
  getOrCreateLabel,
  labelsByName,
  listLabels,
  markRead,
  markUnread,
  trashMessage
} from '../gmail/client.js';
import { unsubscribeHint } from './newsletter.js';

export async function executePlan({ gmail, email, plan, settings, db, labelCache = null }) {
  const results = [];
  const labels = labelCache || labelsByName(await listLabels(gmail));

  for (const action of plan.actions) {
    if (!['ready', 'dry-run'].includes(action.status)) {
      results.push({ action: action.name, status: action.status, detail: action.reason, approvalId: action.approvalId });
      continue;
    }
    const dryRun = settings.agent.dryRun || action.status === 'dry-run';
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

