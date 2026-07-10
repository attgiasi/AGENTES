import { evaluateAction } from '../security/risk.js';
import { shouldProtectAction } from '../security/protection.js';
import { newsletterPlan } from './newsletter.js';
import { buildCalendarPayload, buildReminderPayload } from '../apple/bridge.js';

export function buildActionPlan({ email, decision, settings, db }) {
  const requested = actionsFromDecision(email, decision, settings);
  const planned = [];
  const blocked = [];
  const approvals = [];

  for (const item of requested) {
    const evaluation = evaluateAction(item.name, settings);
    const enriched = {
      ...item,
      risk: evaluation.risk,
      dryRun: settings.agent.dryRun,
      reason: evaluation.reason
    };
    const protectedAction = Number(settings.agent?.autonomyLevel || 0) < 4 && shouldProtectAction(item.name, email, settings);
    const guarded = protectedAction
      ? { ...enriched, reason: 'Remetente protegido: exige aprovação manual.' }
      : enriched;

    if (settings.agent.dryRun) {
      planned.push({ ...guarded, status: 'dry-run' });
      continue;
    }

    if (evaluation.allowed && !protectedAction) {
      planned.push({ ...guarded, status: 'ready' });
      continue;
    }

    if (evaluation.requiresConfirmation || protectedAction) {
      const approval = db?.createApproval({
        action: item.name,
        risk: evaluation.risk,
        payload: { emailId: email.id, decision, action: item, protectedSender: protectedAction }
      });
      approvals.push(approval);
      planned.push({ ...guarded, status: 'pending_confirmation', approvalId: approval?.id });
      continue;
    }

    blocked.push({ action: item.name, risk: evaluation.risk, reason: evaluation.reason });
  }

  return {
    emailId: email.id,
    category: decision.categoria,
    priority: decision.prioridade,
    decision,
    actions: planned,
    blocked,
    approvals
  };
}

export function actionsFromDecision(email, decision, settings) {
  const actions = [];
  if (settings.actions?.applyLabels) {
    actions.push({ name: 'applyLabel', labelName: labelForDecision(decision, settings) });
    actions.push({ name: 'applyLabel', labelName: settings.agent?.processedLabel || settings.labels.processed });
  }

  const newsletter = newsletterPlan(email, settings);
  if (newsletter.isNewsletter) {
    for (const actionName of newsletter.actions) {
      if (actionName === 'applyLabel') continue;
      actions.push({ name: actionName, labelName: settings.labels.newsletter, newsletter });
    }
  }

  if (settings.actions?.archiveEmails && settings.actions?.archiveImmediately) actions.push({ name: 'archiveEmail', reason: 'Arquivamento imediato ligado.' });
  if (settings.actions?.archiveEmails && !settings.actions?.archiveImmediately && decision.acao_recomendada === 'arquivar') actions.push({ name: 'archiveEmail' });
  if (decision.acao_recomendada === 'marcar_lido') actions.push({ name: 'markRead' });
  if (settings.actions?.markRead && settings.actions?.markReadImmediately && email.labelIds?.includes('UNREAD')) actions.push({ name: 'markRead', reason: 'Marcar lido imediatamente ligado.' });
  if (shouldAutoMarkRead(email, decision, settings)) actions.push({ name: 'markRead' });
  if (decision.acao_recomendada === 'rascunho' || decision.precisa_resposta) {
    actions.push({
      name: 'createDraft',
      draft: {
        subject: decision.resposta_sugerida?.assunto || `Re: ${email.subject}`,
        body: decision.resposta_sugerida?.corpo || buildDefaultDraft(email, decision)
      }
    });
  }
  if (decision.criar_lembrete) {
    actions.push({ name: 'createReminder', payload: buildReminderPayload(email, decision, settings) });
  }
  if (decision.criar_evento) {
    actions.push({ name: 'createCalendarEvent', payload: buildCalendarPayload(email, decision, settings) });
  }
  if (decision.acao_recomendada === 'descadastro') actions.push({ name: 'unsubscribeNewsletter' });
  if (decision.acao_recomendada === 'excluir_com_confirmacao') actions.push({ name: 'deleteEmail' });

  const safeActions = !settings.actions?.markReadImmediately && (isUnsafeToMarkRead(decision) || !isCategoryAllowedToMarkRead(decision, settings, newsletter))
    ? actions.filter((action) => action.name !== 'markRead')
    : actions;
  return dedupeActions(safeActions);
}

function shouldAutoMarkRead(email, decision, settings) {
  if (!settings.permissions?.markRead) return false;
  if (!email.labelIds?.includes('UNREAD')) return false;
  if (!isCategoryAllowedToMarkRead(decision, settings)) return false;
  if (decision.precisa_resposta) return false;
  if (decision.criar_lembrete || decision.criar_evento) return false;
  if (['alta', 'urgente'].includes(decision.prioridade)) return false;
  if (['pessoal', 'prazo', 'resposta_pendente'].includes(decision.categoria)) return false;
  return true;
}

function isCategoryAllowedToMarkRead(decision, settings, newsletter = null) {
  const categories = Array.isArray(settings.organizing?.markReadCategories)
    ? settings.organizing.markReadCategories
    : ['newsletter', 'mailing', 'promocao'];
  if (newsletter?.isNewsletter && categories.includes('newsletter')) return true;
  return categories.includes(decision.categoria);
}

function isUnsafeToMarkRead(decision) {
  if (decision.precisa_resposta) return true;
  if (decision.criar_lembrete || decision.criar_evento) return true;
  if (['alta', 'urgente'].includes(decision.prioridade)) return true;
  if (['pessoal', 'prazo', 'resposta_pendente'].includes(decision.categoria)) return true;
  return false;
}

function labelForDecision(decision, settings) {
  const map = {
    newsletter: settings.labels.newsletter,
    mailing: settings.labels.mailing,
    promocao: settings.labels.promotions,
    trabalho: settings.labels.work,
    financeiro: settings.labels.finance,
    pessoal: settings.labels.personal,
    cobranca: settings.labels.bills,
    prazo: settings.labels.urgent,
    evento: 'AI Agent/Eventos',
    documento: settings.labels.documents,
    contrato: settings.labels.contracts,
    comprovante: settings.labels.receipts,
    resposta_pendente: settings.labels.pendingReply,
    spam_suspeito: 'AI Agent/Spam suspeito',
    outro: 'AI Agent/Geral'
  };
  return map[decision.categoria] || 'AI Agent/Geral';
}

function buildDefaultDraft(email, decision) {
  return [
    'Olá.',
    '',
    'Obrigado pela mensagem. Recebi seu email e vou analisar com atenção.',
    decision.dados_extraidos?.prazo ? `Vi o prazo informado: ${decision.dados_extraidos.prazo}.` : '',
    '',
    'Atenciosamente,'
  ].filter(Boolean).join('\n');
}

function dedupeActions(actions) {
  const seen = new Set();
  return actions.filter((action) => {
    const key = `${action.name}:${action.labelName || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
