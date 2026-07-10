import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings, validateSettings } from '../src/settings.js';

test('configuração padrão inicia em autonomia baixa e ações diretas claras', () => {
  const settings = normalizeSettings({});
  assert.equal(settings.agent.dryRun, false);
  assert.equal(settings.agent.autonomyLevel, 1);
  assert.equal('mode' in settings.agent, false);
  assert.equal(settings.actions.sendEmails, false);
  assert.equal(settings.actions.deleteEmails, false);
  assert.equal(settings.actions.readEmails, true);
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
