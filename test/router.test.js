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
    actions: {
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
    actions: {
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

test('arquivamento imediato adiciona archiveEmail para todo email processado', () => {
  const settings = normalizeSettings({
    actions: {
      archiveEmails: true,
      archiveImmediately: true
    }
  });
  const actions = actionsFromDecision(baseEmail, baseDecision, settings);
  assert.ok(actions.some((action) => action.name === 'archiveEmail'));
});

test('email importante recebe marcador e etiqueta e fica na entrada por padrão', () => {
  const settings = normalizeSettings({
    actions: {
      archiveEmails: true,
      archiveImmediately: true,
      markRead: true,
      markReadImmediately: true
    },
    important: {
      afterMarkAction: 'keep'
    }
  });
  const actions = actionsFromDecision(baseEmail, {
    ...baseDecision,
    categoria: 'pessoal',
    prioridade: 'urgente',
    precisa_resposta: true
  }, settings);

  assert.ok(actions.some((action) => action.name === 'markImportant'));
  assert.ok(actions.some((action) => action.name === 'applyLabel' && action.labelName === settings.important.labelName));
  assert.equal(actions.some((action) => action.name === 'archiveEmail'), false);
  assert.equal(actions.some((action) => action.name === 'markRead'), false);
});

test('email importante pode ser arquivado depois de marcado', () => {
  const settings = normalizeSettings({
    important: {
      afterMarkAction: 'archive'
    }
  });
  const actions = actionsFromDecision(baseEmail, {
    ...baseDecision,
    categoria: 'financeiro',
    prioridade: 'alta'
  }, settings);

  assert.ok(actions.some((action) => action.name === 'markImportant'));
  assert.ok(actions.some((action) => action.name === 'archiveEmail'));
});

test('email importante pode ir para lixeira depois de marcado', () => {
  const settings = normalizeSettings({
    important: {
      afterMarkAction: 'delete'
    }
  });
  const actions = actionsFromDecision(baseEmail, {
    ...baseDecision,
    categoria: 'financeiro',
    prioridade: 'alta'
  }, settings);

  assert.ok(actions.some((action) => action.name === 'markImportant'));
  assert.ok(actions.some((action) => action.name === 'deleteEmail'));
  assert.equal(actions.some((action) => action.name === 'archiveEmail'), false);
});
