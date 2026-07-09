import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/database.js';

test('banco grava configurações, logs e itens Apple', async () => {
  const db = await openDatabase(':memory:');
  db.setSetting('x', { ok: true });
  assert.deepEqual(db.getSetting('x'), { ok: true });
  db.log('info', 'test', 'mensagem');
  assert.equal(db.listLogs(1)[0].message, 'mensagem');
  const item = db.createAppleItem({ type: 'reminder', payload: { title: 'Teste' } });
  assert.equal(item.type, 'reminder');
  assert.equal(db.listAppleItems('reminder').length, 1);
});

test('dashboard resume ações e sugestões', async () => {
  const db = await openDatabase(':memory:');
  db.recordAction({ emailId: '1', action: 'archiveEmail', risk: 'medio', status: 'executed' });
  db.recordAction({ emailId: '2', action: 'deleteEmail', risk: 'alto', status: 'dry-run' });
  db.createApproval({ action: 'unsubscribeNewsletter', risk: 'alto', payload: { emailId: '3' } });
  db.recordNewsletter({
    senderEmail: 'news@loja.com',
    senderDomain: 'loja.com',
    subject: 'Oferta',
    estimatedBytes: 1234,
    unsubscribeHint: 'mailto:sair@loja.com'
  });

  const summary = db.dashboardSummary();
  assert.equal(summary.emailActions.archived, 1);
  assert.equal(summary.totals.suggestions, 2);
  assert.equal(summary.newsletters.senders, 1);
  assert.equal(summary.pendingApprovals.length, 1);
});
