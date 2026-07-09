import { includesAny, normalizeText } from '../utils.js';

const DATE_PATTERNS = [
  /\b(\d{4})-(\d{2})-(\d{2})\b/u,
  /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/u
];

const TIME_PATTERN = /\b([01]?\d|2[0-3])[:h]([0-5]\d)\b/iu;
const MONEY_PATTERN = /\b(?:R\$|BRL)\s?[\d.,]+|\b\d{1,3}(?:\.\d{3})*,\d{2}\b/u;

export function parseEmailSignals(email) {
  const text = normalizeText(`${email.subject}\n${email.snippet}\n${email.bodyText}`);
  return {
    dates: extractDates(text),
    time: extractTime(text),
    money: extractMoney(text),
    hasDeadline: includesAny(text, ['prazo', 'vence', 'vencimento', 'até', 'deadline', 'entregar']),
    needsReply: includesAny(text, ['responda', 'retorno', 'aguardo', 'você pode', 'poderia', 'confirma', 'confirmar']),
    isFinance: includesAny(text, ['boleto', 'fatura', 'pagamento', 'cobrança', 'nota fiscal', 'nf-e', 'recibo']),
    isDocument: includesAny(text, ['contrato', 'documento', 'comprovante', 'anexo', 'assinatura', 'proposta']),
    isEvent: includesAny(text, ['reunião', 'call', 'evento', 'convite', 'agenda', 'calendário', 'horário']),
    attachmentCount: email.attachments?.length || 0,
    attachmentNames: (email.attachments || []).map((item) => item.filename)
  };
}

export function buildEmailContext(email, settings) {
  const body = settings.ai.openai.includeBody
    ? email.bodyText
    : '[corpo não enviado para IA por privacidade; use snippet/metadados]';
  return {
    id: email.id,
    threadId: email.threadId,
    from: email.headers.from,
    to: email.headers.to,
    cc: email.headers.cc,
    subject: email.subject,
    snippet: email.snippet,
    gmailLabels: email.labelIds,
    listUnsubscribe: Boolean(email.headers.listUnsubscribe),
    listId: Boolean(email.headers.listId),
    precedence: email.headers.precedence,
    internalDate: email.internalDate,
    sizeEstimate: email.sizeEstimate,
    attachments: email.attachments,
    signals: parseEmailSignals(email),
    body
  };
}

function extractDates(text) {
  const dates = [];
  for (const pattern of DATE_PATTERNS) {
    for (const match of text.matchAll(new RegExp(pattern, 'gu'))) {
      dates.push(match[0]);
    }
  }
  return [...new Set(dates)].slice(0, 5);
}

function extractTime(text) {
  return text.match(TIME_PATTERN)?.[0] || null;
}

function extractMoney(text) {
  return text.match(MONEY_PATTERN)?.[0] || null;
}

