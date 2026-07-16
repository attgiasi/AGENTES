const VERSION = '1.0.0';
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  }
};

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  const cors = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  try {
    if (url.pathname === '/health') return json({ ok: true, service: 'Inbox AI Backend', version: VERSION, time: new Date().toISOString() }, 200, cors);

    if (url.pathname.startsWith('/api/agent/')) {
      requireIngestToken(request, env);
      return routeAgent(request, env, url, cors);
    }

    requireAdminToken(request, env);
    return routeAdmin(request, env, url, cors);
  } catch (error) {
    const status = Number(error.status || 500);
    return json({ ok: false, error: status >= 500 ? 'Falha interna do backend.' : error.message }, status, cors);
  }
}

async function routeAdmin(request, env, url, cors) {
  const { pathname } = url;

  if (request.method === 'GET' && pathname === '/api/status') {
    const lastRun = await env.DB.prepare('SELECT * FROM runs ORDER BY created_at DESC LIMIT 1').first();
    return json({ ok: true, connected: true, version: VERSION, lastRun: parseRun(lastRun), time: new Date().toISOString() }, 200, cors);
  }
  if (request.method === 'GET' && pathname === '/api/dashboard') return json(await dashboard(env), 200, cors);
  if (request.method === 'GET' && pathname === '/api/suggestions') return json(await listSuggestions(env, url), 200, cors);
  if (request.method === 'POST' && match(pathname, '/api/suggestions/:id/decision')) {
    const id = segment(pathname, 2);
    const body = await readJson(request);
    const decision = ['approved', 'rejected'].includes(body.decision) ? body.decision : 'rejected';
    const suggestion = await env.DB.prepare('SELECT * FROM suggestions WHERE id = ?').bind(id).first();
    if (!suggestion) throw httpError(404, 'Sugestão não encontrada.');
    await env.DB.prepare('UPDATE suggestions SET status = ?, decided_at = ? WHERE id = ?').bind(decision, now(), id).run();
    let command = null;
    if (decision === 'approved') {
      command = await createCommand(env, 'execute_action', parseJson(suggestion.payload));
      await dispatchWorkflow(env).catch(() => false);
    }
    return json({ ok: true, id, decision, command }, 200, cors);
  }

  if (request.method === 'GET' && pathname === '/api/history') return json(await listHistory(env, url), 200, cors);
  if (request.method === 'POST' && match(pathname, '/api/history/:id/undo')) {
    const id = segment(pathname, 2);
    const event = await env.DB.prepare('SELECT * FROM action_events WHERE id = ?').bind(id).first();
    if (!event) throw httpError(404, 'Ação não encontrada.');
    if (!event.reversible || event.reversed_at) throw httpError(409, 'Esta ação não pode ser desfeita.');
    const command = await createCommand(env, 'undo_action', {
      eventId: event.id,
      emailId: event.email_id,
      action: event.action,
      metadata: parseJson(event.metadata)
    });
    await dispatchWorkflow(env).catch(() => false);
    return json({ ok: true, queued: true, command }, 202, cors);
  }

  if (request.method === 'GET' && pathname === '/api/rules') return json(await listRules(env), 200, cors);
  if (request.method === 'POST' && pathname === '/api/rules') {
    const rule = normalizeRule(await readJson(request));
    await env.DB.prepare(`INSERT INTO custom_rules (id, name, enabled, priority, conditions, actions, matches_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`).bind(rule.id, rule.name, rule.enabled ? 1 : 0, rule.priority, stringify(rule.conditions), stringify(rule.actions), rule.createdAt, rule.updatedAt).run();
    return json({ ok: true, rule }, 201, cors);
  }
  if (match(pathname, '/api/rules/:id') && ['PUT', 'DELETE'].includes(request.method)) {
    const id = segment(pathname, 2);
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM custom_rules WHERE id = ?').bind(id).run();
      return json({ ok: true, id }, 200, cors);
    }
    const current = await env.DB.prepare('SELECT * FROM custom_rules WHERE id = ?').bind(id).first();
    if (!current) throw httpError(404, 'Regra não encontrada.');
    const rule = normalizeRule({ ...parseRule(current), ...(await readJson(request)), id, createdAt: current.created_at });
    await env.DB.prepare('UPDATE custom_rules SET name = ?, enabled = ?, priority = ?, conditions = ?, actions = ?, updated_at = ? WHERE id = ?')
      .bind(rule.name, rule.enabled ? 1 : 0, rule.priority, stringify(rule.conditions), stringify(rule.actions), rule.updatedAt, id).run();
    return json({ ok: true, rule }, 200, cors);
  }

  if (request.method === 'GET' && pathname === '/api/profile') return json(await getProfile(env), 200, cors);
  if (request.method === 'PUT' && pathname === '/api/profile') {
    const profile = normalizeProfile(await readJson(request));
    await env.DB.prepare(`INSERT INTO personal_profile (id, data, updated_at) VALUES ('default', ?, ?)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`).bind(stringify(profile), now()).run();
    return json({ ok: true, profile }, 200, cors);
  }

  if (request.method === 'GET' && pathname === '/api/settings') return json({ ok: true, settings: await getRemoteSettings(env) }, 200, cors);
  if (request.method === 'PUT' && pathname === '/api/settings') {
    const settings = await readJson(request);
    await env.DB.prepare(`INSERT INTO settings_state (id, data, updated_at) VALUES ('active', ?, ?)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`).bind(stringify(settings), now()).run();
    return json({ ok: true, settings, updatedAt: now() }, 200, cors);
  }

  if (request.method === 'GET' && pathname === '/api/monitoring') return json(await monitoring(env), 200, cors);
  if (request.method === 'POST' && pathname === '/api/run') {
    const command = await createCommand(env, 'run_agent', { requestedAt: now(), source: 'dashboard' });
    const dispatched = await dispatchWorkflow(env);
    return json({ ok: true, queued: true, dispatched, command }, 202, cors);
  }

  throw httpError(404, 'Endpoint não encontrado.');
}

async function routeAgent(request, env, url, cors) {
  const { pathname } = url;
  if (request.method === 'GET' && pathname === '/api/agent/bootstrap') {
    const [rules, profile, settings, commands] = await Promise.all([
      listRules(env, true),
      getProfile(env),
      getRemoteSettings(env),
      listPendingCommands(env, 30)
    ]);
    return json({ ok: true, rules, profile: profile.profile, settings, commands }, 200, cors);
  }
  if (request.method === 'POST' && pathname === '/api/agent/runs') {
    const payload = await readJson(request);
    await ingestRun(env, payload);
    return json({ ok: true, runId: payload.run?.id }, 201, cors);
  }
  if (request.method === 'POST' && match(pathname, '/api/agent/commands/:id/complete')) {
    const id = segment(pathname, 3);
    const body = await readJson(request);
    await env.DB.prepare('UPDATE commands SET status = ?, result = ?, completed_at = ? WHERE id = ?')
      .bind(body.ok === false ? 'failed' : 'completed', stringify(body), now(), id).run();
    if (body.eventId && body.ok !== false) await env.DB.prepare('UPDATE action_events SET reversed_at = ? WHERE id = ?').bind(now(), body.eventId).run();
    return json({ ok: true, id }, 200, cors);
  }
  throw httpError(404, 'Endpoint do agente não encontrado.');
}

async function dashboard(env) {
  const results = await env.DB.batch([
    env.DB.prepare(`SELECT
      COUNT(*) AS actions,
      SUM(CASE WHEN status = 'executed' THEN 1 ELSE 0 END) AS executed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
      SUM(CASE WHEN action = 'archiveEmail' AND status = 'executed' THEN 1 ELSE 0 END) AS archived,
      SUM(CASE WHEN action IN ('deleteEmail','hardDeleteEmail') AND status = 'executed' THEN 1 ELSE 0 END) AS deleted,
      SUM(CASE WHEN action = 'unsubscribeNewsletter' AND status = 'executed' THEN 1 ELSE 0 END) AS unsubscribed,
      SUM(CASE WHEN action IN ('applyLabel','identifyNewsletter') AND status = 'executed' THEN 1 ELSE 0 END) AS labeled,
      SUM(CASE WHEN action = 'markImportant' AND status = 'executed' THEN 1 ELSE 0 END) AS markedImportant,
      SUM(CASE WHEN action = 'markRead' AND status = 'executed' THEN 1 ELSE 0 END) AS markedRead,
      SUM(CASE WHEN action = 'createDraft' AND status = 'executed' THEN 1 ELSE 0 END) AS drafts,
      SUM(CASE WHEN action = 'createReminder' AND status = 'executed' THEN 1 ELSE 0 END) AS reminders,
      SUM(CASE WHEN action = 'createCalendarEvent' AND status = 'executed' THEN 1 ELSE 0 END) AS calendarEvents
      FROM action_events`),
    env.DB.prepare("SELECT date(created_at) AS day, COUNT(*) AS total FROM action_events WHERE created_at >= datetime('now','-13 days') GROUP BY date(created_at) ORDER BY day"),
    env.DB.prepare('SELECT action, COUNT(*) AS total FROM action_events GROUP BY action ORDER BY total DESC LIMIT 8'),
    env.DB.prepare('SELECT * FROM runs ORDER BY created_at DESC LIMIT 1'),
    env.DB.prepare("SELECT COUNT(*) AS total FROM suggestions WHERE status = 'pending'"),
    env.DB.prepare('SELECT COUNT(*) AS total FROM custom_rules WHERE enabled = 1')
  ]);
  const totals = results[0].results?.[0] || {};
  return {
    updatedAt: now(),
    totals: {
      actions: number(totals.actions),
      executed: number(totals.executed),
      failed: number(totals.failed),
      suggestions: number(results[4].results?.[0]?.total),
      rules: number(results[5].results?.[0]?.total)
    },
    emailActions: {
      archived: number(totals.archived), deleted: number(totals.deleted), hardDeleted: 0,
      unsubscribed: number(totals.unsubscribed), labeled: number(totals.labeled),
      markedImportant: number(totals.markedImportant), markedRead: number(totals.markedRead),
      drafts: number(totals.drafts), reminders: number(totals.reminders), calendarEvents: number(totals.calendarEvents)
    },
    trends: results[1].results || [],
    topActions: results[2].results || [],
    lastRun: parseRun(results[3].results?.[0] || null)
  };
}

async function monitoring(env) {
  const results = await env.DB.batch([
    env.DB.prepare('SELECT * FROM runs ORDER BY created_at DESC LIMIT 1'),
    env.DB.prepare("SELECT COUNT(*) AS total FROM action_events WHERE status = 'failed' AND created_at >= datetime('now','-1 day')"),
    env.DB.prepare("SELECT COUNT(*) AS total FROM commands WHERE status = 'pending'"),
    env.DB.prepare("SELECT COUNT(*) AS total FROM monitor_events WHERE status = 'open'"),
    env.DB.prepare('SELECT * FROM monitor_events WHERE status = ? ORDER BY created_at DESC LIMIT 20').bind('open')
  ]);
  const lastRun = parseRun(results[0].results?.[0] || null);
  const ageHours = lastRun ? (Date.now() - Date.parse(lastRun.completedAt)) / 3600000 : null;
  const checks = [
    check('backend', 'Backend online', 'ok', 'Cloudflare Worker respondendo.'),
    check('agent', 'Última execução', !lastRun ? 'warning' : ageHours > 3 ? 'warning' : 'ok', !lastRun ? 'Nenhuma execução recebida.' : `${ageHours.toFixed(1)} hora(s) atrás.`),
    check('failures', 'Falhas nas últimas 24h', number(results[1].results?.[0]?.total) > 0 ? 'warning' : 'ok', `${number(results[1].results?.[0]?.total)} falha(s).`),
    check('commands', 'Comandos pendentes', number(results[2].results?.[0]?.total) > 0 ? 'working' : 'ok', `${number(results[2].results?.[0]?.total)} pendente(s).`)
  ];
  return { ok: true, updatedAt: now(), lastRun, checks, openEvents: results[4].results || [] };
}

async function listSuggestions(env, url) {
  const status = url.searchParams.get('status') || 'pending';
  const limit = clamp(url.searchParams.get('limit'), 1, 200, 100);
  const rows = await env.DB.prepare('SELECT * FROM suggestions WHERE status = ? ORDER BY created_at DESC LIMIT ?').bind(status, limit).all();
  return { ok: true, items: (rows.results || []).map(parseSuggestion), status };
}

async function listHistory(env, url) {
  const limit = clamp(url.searchParams.get('limit'), 1, 500, 100);
  const rows = await env.DB.prepare('SELECT * FROM action_events ORDER BY created_at DESC LIMIT ?').bind(limit).all();
  return { ok: true, items: (rows.results || []).map(parseActionEvent) };
}

async function listRules(env, enabledOnly = false) {
  const query = enabledOnly
    ? 'SELECT * FROM custom_rules WHERE enabled = 1 ORDER BY priority, created_at'
    : 'SELECT * FROM custom_rules ORDER BY priority, created_at';
  const rows = await env.DB.prepare(query).all();
  return (rows.results || []).map(parseRule);
}

async function getProfile(env) {
  const row = await env.DB.prepare("SELECT * FROM personal_profile WHERE id = 'default'").first();
  return { ok: true, profile: normalizeProfile(row ? parseJson(row.data) : {}) };
}

async function getRemoteSettings(env) {
  const row = await env.DB.prepare("SELECT data FROM settings_state WHERE id = 'active'").first();
  return row ? parseJson(row.data) : null;
}

async function listPendingCommands(env, limit) {
  const rows = await env.DB.prepare("SELECT * FROM commands WHERE status = 'pending' ORDER BY created_at LIMIT ?").bind(limit).all();
  return (rows.results || []).map((row) => ({ ...row, payload: parseJson(row.payload), result: parseJson(row.result) }));
}

async function createCommand(env, type, payload) {
  const command = { id: crypto.randomUUID(), type, status: 'pending', payload, createdAt: now() };
  await env.DB.prepare('INSERT INTO commands (id, type, status, payload, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(command.id, type, command.status, stringify(payload), command.createdAt).run();
  return command;
}

async function ingestRun(env, payload) {
  const run = payload.run || {};
  if (!run.id) throw httpError(400, 'Execução sem identificador.');
  await env.DB.prepare(`INSERT OR REPLACE INTO runs
    (id, started_at, completed_at, status, source, processed, executed, failed, skipped, duration_ms, summary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(run.id, run.startedAt || now(), run.completedAt || now(), run.status || 'completed', run.source || 'github-actions', number(run.processed), number(run.executed), number(run.failed), number(run.skipped), number(run.durationMs), stringify(run.summary || {}), run.createdAt || now()).run();

  const eventStatements = (payload.events || []).slice(0, 2500).map((event) => env.DB.prepare(`INSERT OR REPLACE INTO action_events
    (id, run_id, email_id, sender, subject, category, priority, action, status, detail, reversible, reversed_at, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(event.id || crypto.randomUUID(), run.id, event.emailId || null, clean(event.sender, 250), clean(event.subject, 500), clean(event.category, 80), clean(event.priority, 40), clean(event.action, 80), clean(event.status, 40), clean(event.detail, 1000), event.reversible ? 1 : 0, event.reversedAt || null, stringify(event.metadata || {}), event.createdAt || run.completedAt || now()));
  await runInBatches(env, eventStatements);

  const suggestionStatements = (payload.suggestions || []).slice(0, 1000).map((item) => env.DB.prepare(`INSERT OR IGNORE INTO suggestions
    (id, run_id, email_id, type, title, summary, reason, status, payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(item.id || crypto.randomUUID(), run.id, item.emailId || null, clean(item.type, 80), clean(item.title, 250), clean(item.summary, 1000), clean(item.reason, 1000), item.status || 'pending', stringify(item.payload || {}), item.createdAt || now()));
  await runInBatches(env, suggestionStatements);

  if (run.failed > 0) {
    await env.DB.prepare('INSERT INTO monitor_events (id, level, code, message, status, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), 'warning', 'run_failures', `A execução ${run.id} registrou ${run.failed} falha(s).`, 'open', stringify({ runId: run.id }), now()).run();
  }
}

async function runInBatches(env, statements, size = 75) {
  for (let index = 0; index < statements.length; index += size) await env.DB.batch(statements.slice(index, index + size));
}

async function dispatchWorkflow(env) {
  if (!env.GITHUB_DISPATCH_TOKEN || !env.GITHUB_REPO) return false;
  const workflow = env.GITHUB_WORKFLOW || 'gmail-apple-agent.yml';
  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Inbox-AI-Backend',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({ ref: 'main' })
  });
  if (!response.ok) throw httpError(502, 'GitHub não aceitou o comando de execução.');
  return true;
}

function normalizeRule(value = {}) {
  const stamp = now();
  return {
    id: value.id || crypto.randomUUID(),
    name: clean(value.name || 'Nova regra', 120),
    enabled: value.enabled !== false,
    priority: clamp(value.priority, 1, 9999, 100),
    conditions: value.conditions && typeof value.conditions === 'object' ? value.conditions : {},
    actions: value.actions && typeof value.actions === 'object' ? value.actions : {},
    matchesCount: number(value.matchesCount),
    createdAt: value.createdAt || stamp,
    updatedAt: stamp
  };
}

function normalizeProfile(value = {}) {
  return {
    vipSenders: stringList(value.vipSenders),
    importantKeywords: stringList(value.importantKeywords),
    workDomains: stringList(value.workDomains),
    favoriteNewsletters: stringList(value.favoriteNewsletters),
    preferredTone: ['direto', 'cordial', 'formal', 'amigavel'].includes(value.preferredTone) ? value.preferredTone : 'cordial',
    signature: clean(value.signature, 500),
    workHours: clean(value.workHours || '08:00-18:00', 40),
    reminderLeadMinutes: clamp(value.reminderLeadMinutes, 0, 10080, 60),
    notes: clean(value.notes, 2000)
  };
}

function parseRun(row) {
  if (!row) return null;
  return { id: row.id, startedAt: row.started_at, completedAt: row.completed_at, status: row.status, processed: number(row.processed), executed: number(row.executed), failed: number(row.failed), skipped: number(row.skipped), durationMs: number(row.duration_ms), summary: parseJson(row.summary) };
}

function parseActionEvent(row) {
  return { id: row.id, runId: row.run_id, emailId: row.email_id, sender: row.sender, subject: row.subject, category: row.category, priority: row.priority, action: row.action, status: row.status, detail: row.detail, reversible: Boolean(row.reversible), reversedAt: row.reversed_at, metadata: parseJson(row.metadata), createdAt: row.created_at };
}

function parseSuggestion(row) {
  return { id: row.id, runId: row.run_id, emailId: row.email_id, type: row.type, title: row.title, summary: row.summary, reason: row.reason, status: row.status, payload: parseJson(row.payload), createdAt: row.created_at, decidedAt: row.decided_at };
}

function parseRule(row) {
  return { id: row.id, name: row.name, enabled: Boolean(row.enabled), priority: number(row.priority), conditions: parseJson(row.conditions), actions: parseJson(row.actions), matchesCount: number(row.matches_count), createdAt: row.created_at, updatedAt: row.updated_at };
}

function requireAdminToken(request, env) {
  if (!env.ADMIN_TOKEN) throw httpError(503, 'ADMIN_TOKEN não configurado.');
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (token !== env.ADMIN_TOKEN) throw httpError(401, 'Acesso não autorizado.');
}

function requireIngestToken(request, env) {
  if (!env.INGEST_TOKEN) throw httpError(503, 'INGEST_TOKEN não configurado.');
  if (request.headers.get('x-ingest-token') !== env.INGEST_TOKEN) throw httpError(401, 'Token do agente inválido.');
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const configured = String(env.FRONTEND_ORIGIN || '*').replace(/\/$/, '');
  const allowed = configured === '*' || origin === configured || origin.startsWith(`${configured}/`) ? (configured === '*' ? '*' : origin) : configured;
  return { ...JSON_HEADERS, 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-ingest-token', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}

async function readJson(request) {
  if (!request.headers.get('content-type')?.includes('application/json')) return {};
  return request.json().catch(() => ({}));
}

function json(value, status = 200, headers = {}) { return new Response(JSON.stringify(value), { status, headers: { ...JSON_HEADERS, ...headers } }); }
function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
function match(pathname, template) { const actual = pathname.split('/').filter(Boolean); const expected = template.split('/').filter(Boolean); return actual.length === expected.length && expected.every((part, index) => part.startsWith(':') || part === actual[index]); }
function segment(pathname, index) { return decodeURIComponent(pathname.split('/').filter(Boolean)[index] || ''); }
function now() { return new Date().toISOString(); }
function number(value) { return Number(value || 0); }
function clamp(value, min, max, fallback) { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback; }
function clean(value, max = 500) { return String(value || '').trim().slice(0, max); }
function stringify(value) { return JSON.stringify(value ?? {}); }
function parseJson(value) { if (!value) return {}; try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return {}; } }
function stringList(value) { const source = Array.isArray(value) ? value : String(value || '').split(','); return [...new Set(source.map((item) => clean(item, 250)).filter(Boolean))]; }
function check(id, title, status, detail) { return { id, title, status, detail }; }
