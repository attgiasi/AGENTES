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

