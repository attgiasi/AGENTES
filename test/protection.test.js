import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldProtectAction } from '../src/security/protection.js';
import { normalizeSettings } from '../src/settings.js';

test('remetente protegido exige aprovação para arquivar', () => {
  const settings = normalizeSettings({
    protectedSenders: {
      domains: ['banco.com.br']
    }
  });
  const email = {
    from: { email: 'alerta@banco.com.br', domain: 'banco.com.br' },
    headers: { from: 'Banco <alerta@banco.com.br>' },
    subject: 'Aviso importante',
    snippet: 'Mensagem do banco'
  };
  assert.equal(shouldProtectAction('archiveEmail', email, settings), true);
  assert.equal(shouldProtectAction('applyLabel', email, settings), false);
});
