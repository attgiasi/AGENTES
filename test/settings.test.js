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

test('arquivar imediatamente liga automaticamente arquivar e-mails', () => {
  const settings = normalizeSettings({
    actions: {
      archiveImmediately: true,
      archiveEmails: false
    }
  });
  assert.equal(settings.actions.archiveImmediately, true);
  assert.equal(settings.actions.archiveEmails, true);
  assert.equal(settings.execution.archiveImmediately, true);
});

test('marcar lido imediatamente liga automaticamente marcar lido', () => {
  const settings = normalizeSettings({
    actions: {
      markReadImmediately: true,
      markRead: false
    }
  });
  assert.equal(settings.actions.markReadImmediately, true);
  assert.equal(settings.actions.markRead, true);
  assert.equal(settings.execution.markReadImmediately, true);
});
