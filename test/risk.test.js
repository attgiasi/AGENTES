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

test('envio de email fica pendente quando aprovação de alto risco está ligada', () => {
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

test('alto risco pode executar sem frase quando usuário liga a configuração', () => {
  const settings = normalizeSettings({
    agent: {
      autonomyLevel: 7,
      dryRun: false
    },
    permissions: {
      sendEmails: true,
      highRiskRequiresExplicitConfirmation: false
    }
  });
  const result = evaluateAction('sendEmail', settings);
  assert.equal(result.allowed, true);
  assert.equal(result.requiresConfirmation, false);
  assert.equal(result.risk, 'alto');
});
