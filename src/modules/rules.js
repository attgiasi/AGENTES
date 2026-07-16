import { includesAny } from '../utils.js';
import { isNewsletterEmail } from './newsletter.js';
import { parseEmailSignals } from '../email/parser.js';

export function classifyWithRules(email, settings) {
  const text = `${email.headers?.from}\n${email.subject}\n${email.snippet}\n${email.bodyText}`;
  const signals = parseEmailSignals(email);

  const customRule = matchCustomRule(email, settings.customRules || []);
  if (customRule) {
    const actions = customRule.actions || {};
    return {
      ...decision(
        email,
        actions.category || 'outro',
        actions.priority || 'media',
        actions.recommendedAction || 'label',
        actions.risk || 'baixo',
        `Regra personalizada aplicada: ${customRule.name}.`
      ),
      customRuleId: customRule.id,
      customRuleName: customRule.name,
      customLabel: actions.labelName || null
    };
  }

  const personal = personalProfileDecision(email, settings.personalProfile || {});
  if (personal) return personal;

  if (isNewsletterEmail(email, settings)) {
    return decision(email, 'newsletter', 'baixa', 'arquivar', 'baixo', 'Regras locais detectaram newsletter/mailing.');
  }

  if (includesAny(text, ['urgente', 'imediato', 'prazo hoje', 'asap', 'prioridade máxima'])) {
    return decision(email, 'prazo', 'urgente', signals.needsReply ? 'rascunho' : 'label', 'baixo', 'Regras locais detectaram urgência.');
  }

  if (signals.isFinance) {
    return decision(email, 'financeiro', signals.hasDeadline ? 'alta' : 'media', signals.hasDeadline ? 'lembrete' : 'label', 'baixo', 'Regras locais detectaram cobrança/financeiro.');
  }

  if (signals.isEvent && signals.dates.length) {
    return decision(email, 'evento', 'media', 'evento', 'medio', 'Regras locais detectaram possível compromisso.');
  }

  if (signals.needsReply) {
    return decision(email, 'resposta_pendente', 'alta', 'rascunho', 'medio', 'Regras locais detectaram necessidade de resposta.');
  }

  if (signals.isDocument) {
    return decision(email, 'documento', 'media', 'label', 'baixo', 'Regras locais detectaram documento/anexo relevante.');
  }

  return decision(email, 'outro', 'baixa', 'label', 'baixo', 'Nenhum sinal específico encontrado.');
}

export function matchCustomRule(email, rules = []) {
  const ordered = [...rules].filter((rule) => rule?.enabled !== false).sort((a, b) => Number(a.priority || 100) - Number(b.priority || 100));
  return ordered.find((rule) => matchesConditions(email, rule.conditions || {})) || null;
}

function matchesConditions(email, conditions) {
  const entries = Object.entries(conditions).filter(([, value]) => String(value || '').trim());
  if (!entries.length) return false;
  const sender = `${email.from?.name || ''} ${email.from?.email || ''}`.toLowerCase();
  const domain = String(email.from?.domain || '').toLowerCase();
  const subject = String(email.subject || '').toLowerCase();
  const body = `${email.snippet || ''} ${email.bodyText || ''}`.toLowerCase();
  return entries.every(([key, value]) => {
    const needle = String(value).toLowerCase().trim();
    if (key === 'senderIncludes') return sender.includes(needle);
    if (key === 'domain') return domain === needle || domain.endsWith(`.${needle}`);
    if (key === 'subjectIncludes') return subject.includes(needle);
    if (key === 'bodyIncludes') return body.includes(needle);
    if (key === 'hasAttachment') return Boolean(email.attachments?.length) === ['true', '1', 'sim'].includes(needle);
    return true;
  });
}

function personalProfileDecision(email, profile) {
  const sender = String(email.from?.email || '').toLowerCase();
  const domain = String(email.from?.domain || '').toLowerCase();
  const text = `${email.subject || ''} ${email.snippet || ''} ${email.bodyText || ''}`;
  const vip = (profile.vipSenders || []).some((value) => sender === String(value).toLowerCase());
  const work = (profile.workDomains || []).some((value) => domain === String(value).toLowerCase());
  const keyword = includesAny(text, profile.importantKeywords || []);
  if (!vip && !work && !keyword) return null;
  const reason = vip ? 'Remetente VIP do perfil pessoal.' : work ? 'Domínio profissional do perfil pessoal.' : 'Palavra importante do perfil pessoal.';
  return decision(email, vip ? 'pessoal' : 'trabalho', vip || keyword ? 'urgente' : 'alta', 'label', 'baixo', reason);
}

function decision(email, categoria, prioridade, acao, risco, motivo) {
  return {
    source: 'rules',
    email_id: email.id,
    categoria,
    prioridade,
    acao_recomendada: acao,
    precisa_resposta: acao === 'rascunho',
    criar_lembrete: acao === 'lembrete',
    criar_evento: acao === 'evento',
    risco,
    requer_confirmacao: risco !== 'baixo',
    resumo: email.snippet || email.subject || '',
    motivo,
    dados_extraidos: {
      data: null,
      hora: null,
      valor: null,
      local: null,
      prazo: null,
      anexos_importantes: (email.attachments || []).map((item) => item.filename)
    },
    resposta_sugerida: {
      assunto: /^re:/i.test(email.subject) ? email.subject : `Re: ${email.subject}`,
      corpo: ''
    }
  };
}
