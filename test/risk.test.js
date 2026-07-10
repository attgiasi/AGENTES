import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAction } from '../src/security/risk.js';
import { normalizeSettings } from '../src/settings.js';

test('ação de baixo risco executa quando autonomia média está ativa', () => {
  const settings = normalizeSettings({
    agent: {
      autonomyLevel: 2,
      dryRun: false
    }
  });
  const result = evaluateAction('applyLabel', settings);
  assert.equal(result.allowed, true);
  assert.equal(result.risk, 'baixo');
});

test('alto risco fica pendente na autonomia alta', () => {
  const settings = normalizeSettings({
    agent: {
      autonomyLevel: 3,
      dryRun: false
    },
    actions: {
      sendEmails: true
    }
  });
  const result = evaluateAction('sendEmail', settings);
  assert.equal(result.allowed, false);
  assert.equal(result.requiresConfirmation, true);
  assert.equal(result.risk, 'alto');
});

test('alto risco executa direto em autonomia total quando ação está ligada', () => {
  const settings = normalizeSettings({
    agent: {
      autonomyLevel: 4,
      dryRun: false
    },
    actions: {
      sendEmails: true
    }
  });
  const result = evaluateAction('sendEmail', settings);
  assert.equal(result.allowed, true);
  assert.equal(result.requiresConfirmation, false);
  assert.equal(result.risk, 'alto');
});
