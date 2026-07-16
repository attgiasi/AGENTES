import { nowIso, stableId } from '../utils.js';

export function remoteBackendConfigured() {
  return Boolean(process.env.REMOTE_API_URL && process.env.REMOTE_INGEST_TOKEN);
}

export async function loadRemoteBootstrap() {
  if (!remoteBackendConfigured()) return null;
  return agentRequest('/api/agent/bootstrap');
}

export async function publishRunToRemote(result) {
  if (!remoteBackendConfigured()) return { skipped: true };
  const payload = buildRemoteRunPayload(result);
  return agentRequest('/api/agent/runs', { method: 'POST', body: JSON.stringify(payload) });
}

export async function completeRemoteCommand(commandId, result) {
  if (!remoteBackendConfigured()) return { skipped: true };
  return agentRequest(`/api/agent/commands/${encodeURIComponent(commandId)}/complete`, {
    method: 'POST',
    body: JSON.stringify(result)
  });
}

export function buildRemoteRunPayload(result = {}) {
  const report = result.payload || {};
  const items = Array.isArray(result.items) ? result.items : Array.isArray(report.items) ? report.items : [];
  const startedAt = report.startedAt || result.startedAt || nowIso();
  const completedAt = report.finishedAt || result.completedAt || nowIso();
  const events = [];
  const suggestions = [];

  for (const item of items) {
    for (const action of item.actions || []) {
      const event = {
        id: stableId('remote_action'),
        emailId: item.id,
        sender: item.from,
        subject: item.subject,
        category: item.category,
        priority: item.priority,
        action: action.action,
        status: action.status,
        detail: action.detail,
        reversible: isReversible(action.action, action.status),
        metadata: sanitizeMetadata(action.data),
        createdAt: completedAt
      };
      events.push(event);
      if (['pending_confirmation', 'blocked', 'dry-run'].includes(action.status)) {
        suggestions.push(suggestionFrom(item, action, completedAt));
      }
    }
    for (const blocked of item.blocked || []) {
      suggestions.push(suggestionFrom(item, {
        action: blocked.action,
        status: 'blocked',
        detail: blocked.reason
      }, completedAt));
    }
  }

  const executed = events.filter((item) => item.status === 'executed').length;
  const failed = events.filter((item) => item.status === 'failed').length;
  return {
    run: {
      id: stableId('run'),
      startedAt,
      completedAt,
      status: result.ok === false ? 'failed' : result.skipped ? 'skipped' : 'completed',
      source: process.env.GITHUB_ACTIONS ? 'github-actions' : 'local',
      processed: items.length,
      executed,
      failed,
      skipped: result.skipped ? 1 : 0,
      durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
      summary: {
        reason: result.reason || null,
        dryRun: Boolean(report.dryRun),
        actions: events.length,
        suggestions: suggestions.length
      },
      createdAt: completedAt
    },
    events,
    suggestions
  };
}

async function agentRequest(pathname, options = {}) {
  const baseUrl = String(process.env.REMOTE_API_URL || '').replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-ingest-token': process.env.REMOTE_INGEST_TOKEN
    },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Backend remoto retornou ${response.status}.`);
  return data;
}

function suggestionFrom(item, action, createdAt) {
  return {
    id: stableId('suggestion'),
    emailId: item.id,
    type: groupForAction(action.action),
    title: actionTitle(action.action),
    summary: item.summary || item.subject,
    reason: action.detail || item.reason || 'A IA recomendou esta ação.',
    status: 'pending',
    payload: {
      emailId: item.id,
      action: {
        name: action.action,
        labelName: action.data?.labelName,
        draft: action.data?.draft,
        payload: action.data?.payload
      },
      context: {
        sender: item.from,
        subject: item.subject,
        category: item.category,
        priority: item.priority,
        summary: item.summary
      }
    },
    createdAt
  };
}

function isReversible(action, status) {
  return status === 'executed' && ['archiveEmail', 'deleteEmail', 'markRead', 'markUnread', 'markImportant', 'applyLabel', 'identifyNewsletter', 'createDraft'].includes(action);
}

function sanitizeMetadata(value) {
  if (!value || typeof value !== 'object') return {};
  return {
    labelId: value.labelId,
    labelName: value.labelName,
    draftId: value.draftId,
    detail: value.detail
  };
}

function groupForAction(action) {
  if (['deleteEmail', 'hardDeleteEmail', 'emptyTrash'].includes(action)) return 'delete';
  if (action === 'archiveEmail') return 'archive';
  if (['sendEmail', 'createDraft', 'forwardEmail'].includes(action)) return 'send';
  if (action === 'unsubscribeNewsletter') return 'unsubscribe';
  return 'organize';
}

function actionTitle(action) {
  const labels = {
    archiveEmail: 'Arquivar e-mail',
    deleteEmail: 'Mover para lixeira',
    hardDeleteEmail: 'Apagar definitivamente',
    unsubscribeNewsletter: 'Fazer descadastro',
    sendEmail: 'Enviar mensagem',
    createDraft: 'Preparar resposta',
    forwardEmail: 'Encaminhar e-mail',
    applyLabel: 'Aplicar etiqueta',
    identifyNewsletter: 'Organizar newsletter',
    markImportant: 'Marcar como importante',
    markRead: 'Marcar como lido',
    markUnread: 'Marcar como não lido',
    createReminder: 'Criar lembrete',
    createCalendarEvent: 'Criar evento'
  };
  return labels[action] || action || 'Ação sugerida';
}

