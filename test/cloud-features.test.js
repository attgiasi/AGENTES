import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/database.js';
import { classifyWithRules } from '../src/modules/rules.js';
import { buildRemoteRunPayload } from '../src/remote/client.js';

const email = {
  id: 'email-1',
  subject: 'Relatório mensal',
  snippet: 'Seu relatório está pronto.',
  bodyText: 'Acesse o relatório da empresa.',
  headers: { from: 'Equipe <relatorio@empresa.com>' },
  from: { name: 'Equipe', email: 'relatorio@empresa.com', domain: 'empresa.com' },
  attachments: []
};

test('regra personalizada tem prioridade e define ação e etiqueta', () => {
  const result = classifyWithRules(email, {
    customRules: [{
      id: 'rule-1', name: 'Relatórios da empresa', enabled: true, priority: 1,
      conditions: { domain: 'empresa.com', subjectIncludes: 'relatório' },
      actions: { category: 'trabalho', priority: 'alta', recommendedAction: 'arquivar', labelName: 'AI Agent/Relatórios' }
    }]
  });
  assert.equal(result.customRuleId, 'rule-1');
  assert.equal(result.acao_recomendada, 'arquivar');
  assert.equal(result.customLabel, 'AI Agent/Relatórios');
});

test('perfil inteligente prioriza remetente VIP', () => {
  const result = classifyWithRules(email, { customRules: [], personalProfile: { vipSenders: ['relatorio@empresa.com'] } });
  assert.equal(result.categoria, 'pessoal');
  assert.equal(result.prioridade, 'urgente');
});

test('payload remoto não envia corpo do email e cria sugestão estruturada', () => {
  const payload = buildRemoteRunPayload({
    ok: true,
    items: [{
      id: 'email-1', from: 'Equipe <relatorio@empresa.com>', subject: 'Relatório mensal', category: 'trabalho', priority: 'alta', summary: 'Relatório pronto.',
      bodyText: 'conteúdo que não deve sair',
      actions: [{ action: 'archiveEmail', status: 'dry-run', detail: 'Simulação de arquivamento.', data: {} }], blocked: []
    }]
  });
  assert.equal(payload.suggestions.length, 1);
  assert.equal(payload.suggestions[0].payload.action.name, 'archiveEmail');
  assert.equal(JSON.stringify(payload).includes('conteúdo que não deve sair'), false);
});

test('banco salva perfil, regras, execuções e reversão', async () => {
  const db = await openDatabase(':memory:');
  db.savePersonalProfile({ vipSenders: ['vip@empresa.com'], preferredTone: 'direto' });
  assert.deepEqual(db.getPersonalProfile().vipSenders, ['vip@empresa.com']);
  const rule = db.upsertRule({ name: 'VIP', conditions: { senderIncludes: 'vip@' }, actions: { recommendedAction: 'label' } });
  assert.equal(db.getRule(rule.id).name, 'VIP');
  const action = db.recordAction({ emailId: 'email-1', action: 'archiveEmail', risk: 'medio', status: 'executed' });
  db.markActionReversed(action.id);
  assert.ok(db.getAction(action.id).reversed_at);
  db.recordRun({ startedAt: new Date(Date.now() - 1000).toISOString(), result: { ok: true, items: [] } });
  assert.equal(db.listRuns(5).length, 1);
});
