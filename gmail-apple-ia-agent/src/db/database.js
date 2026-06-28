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
        data TEXT NOT NULL
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
    `);
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
