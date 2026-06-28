import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAction } from '../src/security/risk.js';
import { normalizeSettings } from '../src/settings.js';

test('ação de baixo risco pode ser automática por padrão', () => {
  const settings = normalizeSettings({
    agent: {
      autonomyLevel: 3,
      dryRun: false
    }
  });
  const result = evaluateAction('applyLabel', settings);
  assert.equal(result.allowed, true);
  assert.equal(result.risk, 'baixo');
});

test('envio de email fica bloqueado sem confirmação explícita', () => {
  const settings = normalizeSettings({
    agent: {
      autonomyLevel: 6,
      dryRun: false
    },
    permissions: {
      sendEmails: true,
      highRiskRequiresExplicitConfirmation: true
    }
  });
  const result = evaluateAction('sendEmail', settings);
  assert.equal(result.allowed, false);
  assert.equal(result.requiresConfirmation, true);
  assert.equal(result.risk, 'alto');
});
