import { includesAny } from '../utils.js';
import { isNewsletterEmail } from './newsletter.js';
import { parseEmailSignals } from '../email/parser.js';

export function classifyWithRules(email, settings) {
  const text = `${email.headers?.from}\n${email.subject}\n${email.snippet}\n${email.bodyText}`;
  const signals = parseEmailSignals(email);

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

