export const EMAIL_DECISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'email_id',
    'categoria',
    'prioridade',
    'acao_recomendada',
    'precisa_resposta',
    'criar_lembrete',
    'criar_evento',
    'risco',
    'requer_confirmacao',
    'resumo',
    'motivo',
    'dados_extraidos',
    'resposta_sugerida'
  ],
  properties: {
    email_id: { type: 'string' },
    categoria: {
      type: 'string',
      enum: [
        'newsletter',
        'mailing',
        'promocao',
        'trabalho',
        'financeiro',
        'pessoal',
        'cobranca',
        'prazo',
        'evento',
        'documento',
        'contrato',
        'comprovante',
        'resposta_pendente',
        'spam_suspeito',
        'outro'
      ]
    },
    prioridade: { type: 'string', enum: ['baixa', 'media', 'alta', 'urgente'] },
    acao_recomendada: {
      type: 'string',
      enum: [
        'nenhuma',
        'label',
        'arquivar',
        'marcar_lido',
        'rascunho',
        'lembrete',
        'evento',
        'descadastro',
        'excluir_com_confirmacao'
      ]
    },
    precisa_resposta: { type: 'boolean' },
    criar_lembrete: { type: 'boolean' },
    criar_evento: { type: 'boolean' },
    risco: { type: 'string', enum: ['baixo', 'medio', 'alto'] },
    requer_confirmacao: { type: 'boolean' },
    resumo: { type: 'string' },
    motivo: { type: 'string' },
    dados_extraidos: {
      type: 'object',
      additionalProperties: false,
      required: ['data', 'hora', 'valor', 'local', 'prazo', 'anexos_importantes'],
      properties: {
        data: { type: ['string', 'null'] },
        hora: { type: ['string', 'null'] },
        valor: { type: ['string', 'null'] },
        local: { type: ['string', 'null'] },
        prazo: { type: ['string', 'null'] },
        anexos_importantes: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    resposta_sugerida: {
      type: 'object',
      additionalProperties: false,
      required: ['assunto', 'corpo'],
      properties: {
        assunto: { type: 'string' },
        corpo: { type: 'string' }
      }
    }
  }
};

export function validateDecision(value = {}) {
  const errors = [];
  for (const key of EMAIL_DECISION_SCHEMA.required) {
    if (!(key in value)) errors.push(`Campo ausente: ${key}`);
  }
  if (value.categoria && !EMAIL_DECISION_SCHEMA.properties.categoria.enum.includes(value.categoria)) errors.push(`categoria inválida: ${value.categoria}`);
  if (value.prioridade && !EMAIL_DECISION_SCHEMA.properties.prioridade.enum.includes(value.prioridade)) errors.push(`prioridade inválida: ${value.prioridade}`);
  if (value.acao_recomendada && !EMAIL_DECISION_SCHEMA.properties.acao_recomendada.enum.includes(value.acao_recomendada)) errors.push(`acao_recomendada inválida: ${value.acao_recomendada}`);
  if (value.risco && !EMAIL_DECISION_SCHEMA.properties.risco.enum.includes(value.risco)) errors.push(`risco inválido: ${value.risco}`);
  return {
    ok: errors.length === 0,
    errors
  };
}

export function fallbackDecision(email, reason = 'Classificação local sem IA.') {
  return {
    source: 'rules',
    email_id: email.id,
    categoria: 'outro',
    prioridade: 'baixa',
    acao_recomendada: 'label',
    precisa_resposta: false,
    criar_lembrete: false,
    criar_evento: false,
    risco: 'baixo',
    requer_confirmacao: false,
    resumo: email.snippet || email.subject || 'Email sem resumo disponível.',
    motivo: reason,
    dados_extraidos: {
      data: null,
      hora: null,
      valor: null,
      local: null,
      prazo: null,
      anexos_importantes: []
    },
    resposta_sugerida: {
      assunto: '',
      corpo: ''
    }
  };
}

