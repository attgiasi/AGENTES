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
  db.recordAction({ emailId: '1', action: 'markImportant', risk: 'baixo', status: 'executed' });
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
  assert.equal(summary.emailActions.markedImportant, 1);
  assert.equal(summary.totals.suggestions, 2);
  assert.equal(summary.newsletters.senders, 1);
  assert.equal(summary.pendingApprovals.length, 1);
});

test('sugestões são agrupadas por tipo de ação', async () => {
  const db = await openDatabase(':memory:');
  db.recordAction({ emailId: '1', action: 'archiveEmail', risk: 'medio', status: 'dry-run', data: { detail: 'Arquivar newsletter antiga' } });
  db.recordAction({ emailId: '2', action: 'deleteEmail', risk: 'alto', status: 'blocked', data: { reason: 'Exclusão desligada' } });
  db.createApproval({ action: 'sendEmail', risk: 'alto', payload: { emailId: '3', action: { name: 'sendEmail' }, decision: { resumo: 'Responder cliente' } } });

  const suggestions = db.suggestionsSummary();
  assert.equal(suggestions.groups.archive.count, 1);
  assert.equal(suggestions.groups.delete.count, 1);
  assert.equal(suggestions.groups.send.count, 1);
  assert.equal(suggestions.totals.suggestions, 3);
});
