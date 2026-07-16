import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ensureDir, nowIso, stableId } from '../utils.js';

export class AgentDatabase {
  constructor(filePath = process.env.DATABASE_PATH || 'data/agent.sqlite') {
    this.filePath = filePath;
    this.db = null;
  }

  async open() {
    await ensureDir(path.dirname(this.filePath));
    this.db = new DatabaseSync(this.filePath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.migrate();
    return this;
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        level TEXT NOT NULL,
        module TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS action_history (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        email_id TEXT,
        action TEXT NOT NULL,
        risk TEXT NOT NULL,
        status TEXT NOT NULL,
        requires_confirmation INTEGER NOT NULL DEFAULT 0,
        data TEXT NOT NULL,
        reversed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        action TEXT NOT NULL,
        risk TEXT NOT NULL,
        status TEXT NOT NULL,
        payload TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS senders (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        domain TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS newsletters (
        id TEXT PRIMARY KEY,
        sender_email TEXT NOT NULL,
        sender_domain TEXT NOT NULL,
        first_seen TEXT NOT NULL,
        last_seen TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        last_subject TEXT,
        total_estimated_bytes INTEGER NOT NULL DEFAULT 0,
        unsubscribe_hint TEXT
      );

      CREATE TABLE IF NOT EXISTS apple_items (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        source_email_id TEXT,
        payload TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS agent_runs (
        id TEXT PRIMARY KEY,
        started_at TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        status TEXT NOT NULL,
        processed INTEGER NOT NULL DEFAULT 0,
        executed INTEGER NOT NULL DEFAULT 0,
        failed INTEGER NOT NULL DEFAULT 0,
        skipped INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        summary TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS custom_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        priority INTEGER NOT NULL DEFAULT 100,
        conditions TEXT NOT NULL,
        actions TEXT NOT NULL,
        matches_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS personal_profile (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    const actionColumns = this.db.prepare('PRAGMA table_info(action_history)').all().map((column) => column.name);
    if (!actionColumns.includes('reversed_at')) this.db.exec('ALTER TABLE action_history ADD COLUMN reversed_at TEXT;');
  }

  getSetting(key, fallback = null) {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (!row) return fallback;
    return JSON.parse(row.value);
  }

  setSetting(key, value) {
    this.db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, JSON.stringify(value), nowIso());
  }

  log(level, moduleName, message, data = {}) {
    const row = {
      id: stableId('log'),
      created_at: nowIso(),
      level,
      module: moduleName,
      message,
      data: JSON.stringify(data)
    };
    this.db.prepare(`
      INSERT INTO logs (id, created_at, level, module, message, data)
      VALUES (@id, @created_at, @level, @module, @message, @data)
    `).run(row);
    return row;
  }

  listLogs(limit = 100) {
    const rows = this.db.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT ?').all(limit);
    return rows.map((row) => ({ ...row, data: JSON.parse(row.data || '{}') }));
  }

  recordAction({ emailId = null, action, risk, status, requiresConfirmation = false, data = {} }) {
    const row = {
      id: stableId('act'),
      created_at: nowIso(),
      email_id: emailId,
      action,
      risk,
      status,
      requires_confirmation: requiresConfirmation ? 1 : 0,
      data: JSON.stringify(data)
    };
    this.db.prepare(`
      INSERT INTO action_history (id, created_at, email_id, action, risk, status, requires_confirmation, data)
      VALUES (@id, @created_at, @email_id, @action, @risk, @status, @requires_confirmation, @data)
    `).run(row);
    return row;
  }

  listActions(limit = 100) {
    const rows = this.db.prepare('SELECT * FROM action_history ORDER BY created_at DESC LIMIT ?').all(limit);
    return rows.map((row) => ({ ...row, data: JSON.parse(row.data || '{}') }));
  }

  getAction(id) {
    const row = this.db.prepare('SELECT * FROM action_history WHERE id = ?').get(id);
    return row ? { ...row, data: JSON.parse(row.data || '{}') } : null;
  }

  markActionReversed(id) {
    this.db.prepare('UPDATE action_history SET reversed_at = ? WHERE id = ?').run(nowIso(), id);
  }

  recordRun({ startedAt, completedAt = nowIso(), result = {} }) {
    const items = result.items || result.payload?.items || [];
    const actions = items.flatMap((item) => item.actions || []);
    const row = {
      id: stableId('run'),
      started_at: startedAt,
      completed_at: completedAt,
      status: result.ok === false ? 'failed' : result.skipped ? 'skipped' : 'completed',
      processed: items.length,
      executed: actions.filter((action) => action.status === 'executed').length,
      failed: actions.filter((action) => action.status === 'failed').length,
      skipped: result.skipped ? 1 : 0,
      duration_ms: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
      summary: JSON.stringify({ reason: result.reason || null, actions: actions.length })
    };
    this.db.prepare(`INSERT INTO agent_runs
      (id, started_at, completed_at, status, processed, executed, failed, skipped, duration_ms, summary)
      VALUES (@id, @started_at, @completed_at, @status, @processed, @executed, @failed, @skipped, @duration_ms, @summary)`).run(row);
    return { ...row, summary: JSON.parse(row.summary) };
  }

  listRuns(limit = 50) {
    return this.db.prepare('SELECT * FROM agent_runs ORDER BY completed_at DESC LIMIT ?').all(limit)
      .map((row) => ({ ...row, summary: JSON.parse(row.summary || '{}') }));
  }

  listRules(enabledOnly = false) {
    const sql = enabledOnly
      ? 'SELECT * FROM custom_rules WHERE enabled = 1 ORDER BY priority, created_at'
      : 'SELECT * FROM custom_rules ORDER BY priority, created_at';
    return this.db.prepare(sql).all().map(parseRuleRow);
  }

  getRule(id) {
    const row = this.db.prepare('SELECT * FROM custom_rules WHERE id = ?').get(id);
    return row ? parseRuleRow(row) : null;
  }

  upsertRule(value = {}) {
    const existing = value.id ? this.getRule(value.id) : null;
    const stamp = nowIso();
    const rule = {
      id: value.id || stableId('rule'),
      name: String(value.name || 'Nova regra').trim().slice(0, 120),
      enabled: value.enabled === false ? 0 : 1,
      priority: Math.max(1, Math.min(9999, Number(value.priority || 100))),
      conditions: JSON.stringify(value.conditions || {}),
      actions: JSON.stringify(value.actions || {}),
      matches_count: Number(value.matchesCount || existing?.matchesCount || 0),
      created_at: existing?.createdAt || stamp,
      updated_at: stamp
    };
    this.db.prepare(`INSERT INTO custom_rules (id, name, enabled, priority, conditions, actions, matches_count, created_at, updated_at)
      VALUES (@id, @name, @enabled, @priority, @conditions, @actions, @matches_count, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, enabled = excluded.enabled, priority = excluded.priority,
      conditions = excluded.conditions, actions = excluded.actions, matches_count = excluded.matches_count, updated_at = excluded.updated_at`).run(rule);
    return this.getRule(rule.id);
  }

  deleteRule(id) {
    this.db.prepare('DELETE FROM custom_rules WHERE id = ?').run(id);
  }

  getPersonalProfile() {
    const row = this.db.prepare("SELECT data FROM personal_profile WHERE id = 'default'").get();
    return row ? JSON.parse(row.data || '{}') : {};
  }

  savePersonalProfile(profile = {}) {
    this.db.prepare(`INSERT INTO personal_profile (id, data, updated_at) VALUES ('default', ?, ?)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`).run(JSON.stringify(profile), nowIso());
    return profile;
  }

  monitoringSummary() {
    const lastRun = this.db.prepare('SELECT * FROM agent_runs ORDER BY completed_at DESC LIMIT 1').get() || null;
    const failed24h = this.db.prepare("SELECT COUNT(*) AS total FROM action_history WHERE status = 'failed' AND created_at >= datetime('now', '-1 day')").get();
    const pendingApprovals = this.db.prepare("SELECT COUNT(*) AS total FROM approvals WHERE status = 'pending'").get();
    const ageHours = lastRun ? (Date.now() - Date.parse(lastRun.completed_at)) / 3600000 : null;
    return {
      ok: true,
      updatedAt: nowIso(),
      lastRun: lastRun ? { ...lastRun, summary: JSON.parse(lastRun.summary || '{}') } : null,
      checks: [
        monitorCheck('server', 'Painel local', 'ok', 'Servidor respondendo.'),
        monitorCheck('agent', 'Última execução', !lastRun || ageHours > 3 ? 'warning' : 'ok', !lastRun ? 'Nenhuma execução registrada.' : `${ageHours.toFixed(1)} hora(s) atrás.`),
        monitorCheck('failures', 'Falhas nas últimas 24h', Number(failed24h.total) ? 'warning' : 'ok', `${Number(failed24h.total)} falha(s).`),
        monitorCheck('approvals', 'Decisões pendentes', Number(pendingApprovals.total) ? 'working' : 'ok', `${Number(pendingApprovals.total)} pendente(s).`)
      ],
      openEvents: []
    };
  }

  dashboardSummary() {
    const actionRows = this.db.prepare(`
      SELECT action, status, COUNT(*) AS total
      FROM action_history
      GROUP BY action, status
    `).all();
    const approvalRows = this.db.prepare(`
      SELECT action, status, COUNT(*) AS total
      FROM approvals
      GROUP BY action, status
    `).all();
    const newsletterStats = this.db.prepare(`
      SELECT
        COUNT(*) AS senders,
        COALESCE(SUM(count), 0) AS messages,
        COALESCE(SUM(total_estimated_bytes), 0) AS estimated_bytes
      FROM newsletters
    `).get();
    const trends = this.db.prepare(`
      SELECT date(created_at) AS day, COUNT(*) AS total
      FROM action_history
      WHERE created_at >= datetime('now', '-13 days')
      GROUP BY date(created_at)
      ORDER BY day
    `).all();
    const lastRun = this.db.prepare('SELECT * FROM agent_runs ORDER BY completed_at DESC LIMIT 1').get() || null;
    const rulesTotal = this.db.prepare('SELECT COUNT(*) AS total FROM custom_rules WHERE enabled = 1').get();
    const recentActions = this.listActions(12);
    const recentLogs = this.listLogs(10);
    const pendingApprovals = this.listApprovals('pending', 12);

    const countAction = (name, status = 'executed') => sumRows(actionRows, (row) => row.action === name && row.status === status);
    const countStatus = (status) => sumRows(actionRows, (row) => row.status === status);
    const countApproval = (status) => sumRows(approvalRows, (row) => row.status === status);

    return {
      updatedAt: nowIso(),
      totals: {
        actions: sumRows(actionRows, () => true),
        executed: countStatus('executed'),
        dryRun: countStatus('dry-run'),
        blocked: countStatus('blocked'),
        failed: countStatus('failed'),
        suggestions: countStatus('dry-run') + countStatus('blocked') + countApproval('pending'),
        pendingApprovals: countApproval('pending'),
        rules: Number(rulesTotal.total || 0)
      },
      emailActions: {
        archived: countAction('archiveEmail'),
        deleted: countAction('deleteEmail'),
        hardDeleted: countAction('hardDeleteEmail'),
        unsubscribed: countAction('unsubscribeNewsletter'),
        unsubscribeSuggestions: pendingApprovals.filter((approval) => approval.action === 'unsubscribeNewsletter').length,
        labeled: countAction('applyLabel') + countAction('identifyNewsletter'),
        markedImportant: countAction('markImportant'),
        drafts: countAction('createDraft'),
        markedRead: countAction('markRead'),
        reminders: countAction('createReminder'),
        calendarEvents: countAction('createCalendarEvent')
      },
      newsletters: {
        senders: Number(newsletterStats.senders || 0),
        messages: Number(newsletterStats.messages || 0),
        estimatedBytes: Number(newsletterStats.estimated_bytes || 0)
      },
      approvalsByStatus: rowsToObject(approvalRows, 'status'),
      actionsByStatus: rowsToObject(actionRows, 'status'),
      actionsByName: rowsToObject(actionRows, 'action'),
      trends,
      topActions: Object.entries(rowsToObject(actionRows, 'action')).map(([action, total]) => ({ action, total })).sort((a, b) => b.total - a.total).slice(0, 8),
      lastRun: lastRun ? { ...lastRun, summary: JSON.parse(lastRun.summary || '{}') } : null,
      recentActions,
      recentLogs,
      pendingApprovals
    };
  }

  suggestionsSummary() {
    const pendingApprovals = this.listApprovals('pending', 5000);
    const suggestedActions = this.listActions(5000)
      .filter((action) => ['dry-run', 'blocked'].includes(action.status));
    const groups = {
      delete: suggestionGroup('Apagar', 'E-mails que a IA sugeriu apagar ou mover para a lixeira.'),
      archive: suggestionGroup('Arquivar', 'E-mails que a IA sugeriu tirar da caixa de entrada sem apagar.'),
      send: suggestionGroup('Enviar mensagem', 'Mensagens que a IA sugeriu enviar ou preparar como resposta.'),
      unsubscribe: suggestionGroup('Descadastrar', 'Newsletters ou mailings que a IA sugeriu cancelar.'),
      organize: suggestionGroup('Organizar', 'Etiquetas, marcações, lembretes e outras organizações sugeridas.'),
      other: suggestionGroup('Outras sugestões', 'Sugestões que não entraram nos grupos principais.')
    };

    for (const approval of pendingApprovals) {
      addSuggestion(groups, approval.payload?.action?.name || approval.action, {
        id: approval.id,
        source: 'approval',
        status: approval.status,
        risk: approval.risk,
        action: approval.payload?.action?.name || approval.action,
        createdAt: approval.created_at,
        emailId: approval.payload?.emailId,
        title: actionTitle(approval.payload?.action?.name || approval.action),
        summary: approval.payload?.decision?.resumo || approval.payload?.decision?.motivo || 'Aguardando aprovação no painel.',
        reason: approval.payload?.protectedSender ? 'Remetente protegido exige sua decisão.' : 'A IA sugeriu esta ação e aguarda sua aprovação.'
      });
    }

    for (const action of suggestedActions) {
      addSuggestion(groups, action.action, {
        id: action.id,
        source: action.status === 'dry-run' ? 'simulation' : 'blocked',
        status: action.status,
        risk: action.risk,
        action: action.action,
        createdAt: action.created_at,
        emailId: action.email_id,
        title: actionTitle(action.action),
        summary: action.data?.detail || action.data?.reason || 'Sugestão registrada pelo agente.',
        reason: action.status === 'dry-run'
          ? 'Simulação: o agente mostrou o que faria, mas não executou.'
          : 'Bloqueado por configuração, limite ou proteção.'
      });
    }

    return {
      updatedAt: nowIso(),
      groups: Object.fromEntries(Object.entries(groups).map(([key, group]) => [
        key,
        { ...group, count: group.items.length }
      ])),
      totals: {
        suggestions: Object.values(groups).reduce((sum, group) => sum + group.items.length, 0),
        approvals: pendingApprovals.length,
        simulations: suggestedActions.filter((action) => action.status === 'dry-run').length,
        blocked: suggestedActions.filter((action) => action.status === 'blocked').length
      }
    };
  }

  createApproval({ action, risk, payload }) {
    const row = {
      id: stableId('approval'),
      created_at: nowIso(),
      action,
      risk,
      status: 'pending',
      payload: JSON.stringify(payload)
    };
    this.db.prepare(`
      INSERT INTO approvals (id, created_at, action, risk, status, payload)
      VALUES (@id, @created_at, @action, @risk, @status, @payload)
    `).run(row);
    return { ...row, payload };
  }

  listApprovals(status = 'pending', limit = 100) {
    const rows = this.db.prepare('SELECT * FROM approvals WHERE status = ? ORDER BY created_at DESC LIMIT ?').all(status, limit);
    return rows.map((row) => ({ ...row, payload: JSON.parse(row.payload || '{}') }));
  }

  getApproval(id) {
    const row = this.db.prepare('SELECT * FROM approvals WHERE id = ?').get(id);
    return row ? { ...row, payload: JSON.parse(row.payload || '{}') } : null;
  }

  updateApproval(id, status) {
    this.db.prepare('UPDATE approvals SET status = ? WHERE id = ?').run(status, id);
  }

  upsertSender(email, domain, status, notes = '') {
    this.db.prepare(`
      INSERT INTO senders (id, email, domain, status, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET status = excluded.status, notes = excluded.notes, updated_at = excluded.updated_at
    `).run(stableId('sender'), email, domain, status, notes, nowIso());
  }

  listSenders(status = null) {
    const sql = status
      ? 'SELECT * FROM senders WHERE status = ? ORDER BY email'
      : 'SELECT * FROM senders ORDER BY email';
    return status ? this.db.prepare(sql).all(status) : this.db.prepare(sql).all();
  }

  recordNewsletter({ senderEmail, senderDomain, subject = '', estimatedBytes = 0, unsubscribeHint = '' }) {
    const existing = this.db.prepare('SELECT * FROM newsletters WHERE sender_email = ?').get(senderEmail);
    if (existing) {
      this.db.prepare(`
        UPDATE newsletters
        SET last_seen = ?, count = count + 1, last_subject = ?, total_estimated_bytes = total_estimated_bytes + ?, unsubscribe_hint = COALESCE(NULLIF(?, ''), unsubscribe_hint)
        WHERE sender_email = ?
      `).run(nowIso(), subject, estimatedBytes, unsubscribeHint, senderEmail);
      return;
    }
    this.db.prepare(`
      INSERT INTO newsletters (id, sender_email, sender_domain, first_seen, last_seen, count, last_subject, total_estimated_bytes, unsubscribe_hint)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(stableId('newsletter'), senderEmail, senderDomain, nowIso(), nowIso(), subject, estimatedBytes, unsubscribeHint);
  }

  listNewsletters(limit = 100) {
    return this.db.prepare('SELECT * FROM newsletters ORDER BY count DESC, last_seen DESC LIMIT ?').all(limit);
  }

  createAppleItem({ type, sourceEmailId = null, payload, status = 'pending_shortcut' }) {
    const row = {
      id: stableId(type),
      created_at: nowIso(),
      type,
      status,
      source_email_id: sourceEmailId,
      payload: JSON.stringify(payload)
    };
    this.db.prepare(`
      INSERT INTO apple_items (id, created_at, type, status, source_email_id, payload)
      VALUES (@id, @created_at, @type, @status, @source_email_id, @payload)
    `).run(row);
    return { ...row, payload };
  }

  listAppleItems(type, status = 'pending_shortcut', limit = 100) {
    const rows = this.db.prepare(`
      SELECT * FROM apple_items
      WHERE type = ? AND status = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(type, status, limit);
    return rows.map((row) => ({ ...row, payload: JSON.parse(row.payload || '{}') }));
  }
}

export async function openDatabase(filePath) {
  return new AgentDatabase(filePath).open();
}

function sumRows(rows, predicate) {
  return rows.filter(predicate).reduce((sum, row) => sum + Number(row.total || 0), 0);
}

function rowsToObject(rows, field) {
  return rows.reduce((output, row) => {
    const key = row[field] || 'outro';
    output[key] = (output[key] || 0) + Number(row.total || 0);
    return output;
  }, {});
}

function suggestionGroup(title, description) {
  return { title, description, count: 0, items: [] };
}

function addSuggestion(groups, actionName, item) {
  groups[groupForAction(actionName)].items.push(item);
}

function groupForAction(actionName) {
  if (['deleteEmail', 'hardDeleteEmail', 'emptyTrash'].includes(actionName)) return 'delete';
  if (actionName === 'archiveEmail') return 'archive';
  if (['sendEmail', 'createDraft', 'forwardEmail'].includes(actionName)) return 'send';
  if (actionName === 'unsubscribeNewsletter') return 'unsubscribe';
  if ([
    'applyLabel',
    'identifyNewsletter',
    'markImportant',
    'markRead',
    'markUnread',
    'createReminder',
    'createCalendarEvent',
    'moveEmail'
  ].includes(actionName)) return 'organize';
  return 'other';
}

function actionTitle(actionName) {
  const labels = {
    archiveEmail: 'Arquivar e-mail',
    deleteEmail: 'Mover para lixeira',
    hardDeleteEmail: 'Apagar definitivamente',
    emptyTrash: 'Esvaziar lixeira',
    unsubscribeNewsletter: 'Cancelar newsletter',
    sendEmail: 'Enviar mensagem',
    createDraft: 'Criar rascunho',
    forwardEmail: 'Encaminhar e-mail',
    applyLabel: 'Aplicar etiqueta',
    identifyNewsletter: 'Identificar newsletter',
    markImportant: 'Marcar como importante',
    markRead: 'Marcar como lido',
    markUnread: 'Marcar como não lido',
    createReminder: 'Criar lembrete',
    createCalendarEvent: 'Criar evento',
    moveEmail: 'Mover e-mail'
  };
  return labels[actionName] || actionName || 'Sugestão';
}

function parseRuleRow(row) {
  return {
    id: row.id,
    name: row.name,
    enabled: Boolean(row.enabled),
    priority: Number(row.priority || 100),
    conditions: JSON.parse(row.conditions || '{}'),
    actions: JSON.parse(row.actions || '{}'),
    matchesCount: Number(row.matches_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function monitorCheck(id, title, status, detail) {
  return { id, title, status, detail };
}
