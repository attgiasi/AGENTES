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
  assert.equal(settings.agent.maxEmailsPerRun, 100);
  assert.equal(settings.gmail.categories.primary, true);
  assert.equal(validateSettings(settings).ok, true);
});

test('limite de e-mails por execução aceita até 1000', () => {
  const settings = normalizeSettings({
    agent: {
      maxEmailsPerRun: 5000
    }
  });
  assert.equal(settings.agent.maxEmailsPerRun, 1000);
});
