import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings, validateSettings } from '../src/settings.js';

test('configuração padrão inicia em simulação segura por configuração', () => {
  const settings = normalizeSettings({});
  assert.equal(settings.agent.dryRun, true);
  assert.equal('mode' in settings.agent, false);
  assert.equal(settings.permissions.sendEmails, false);
  assert.equal(settings.permissions.deleteEmails, false);
  assert.equal(settings.modules.siriShortcuts, true);
  assert.equal(settings.apple.reminders.listName, 'Pendências do Gmail');
  assert.equal(validateSettings(settings).ok, true);
});
