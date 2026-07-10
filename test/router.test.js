import test from 'node:test';
import assert from 'node:assert/strict';
import { actionsFromDecision } from '../src/modules/router.js';
import { normalizeSettings } from '../src/settings.js';

const baseEmail = {
  id: '1',
  subject: 'Promoção',
  snippet: 'Resumo',
  labelIds: ['INBOX', 'UNREAD'],
  from: { email: 'news@loja.com', domain: 'loja.com' },
  headers: {}
};

const baseDecision = {
  categoria: 'promocao',
  prioridade: 'baixa',
  acao_recomendada: 'label',
  precisa_resposta: false,
  criar_lembrete: false,
  criar_evento: false,
  resposta_sugerida: {},
  dados_extraidos: {}
};

test('organização aplica etiqueta de categoria, processado e marca lido quando permitido', () => {
  const settings = normalizeSettings({
    agent: {
      processedLabel: 'AI Processado'
    },
    permissions: {
      markRead: true
    }
  });
  const actions = actionsFromDecision(baseEmail, baseDecision, settings);

  assert.ok(actions.some((action) => action.name === 'applyLabel' && action.labelName === settings.labels.promotions));
  assert.ok(actions.some((action) => action.name === 'applyLabel' && action.labelName === 'AI Processado'));
  assert.ok(actions.some((action) => action.name === 'markRead'));
});

test('não marca como lido email urgente ou que precisa de resposta', () => {
  const settings = normalizeSettings({
    permissions: {
      markRead: true
    }
  });
  const actions = actionsFromDecision(baseEmail, {
    ...baseDecision,
    categoria: 'resposta_pendente',
    prioridade: 'urgente',
    precisa_resposta: true
  }, settings);

  assert.equal(actions.some((action) => action.name === 'markRead'), false);
});
