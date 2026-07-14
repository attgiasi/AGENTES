import {
  clampText,
  decodeBase64Url,
  encodeBase64Url,
  getHeader,
  normalizeText,
  parseEmailAddress,
  parseEmailAddresses,
  stripHtml,
  unique
} from '../utils.js';

const USER_ID = 'me';

export async function searchMessages(gmail, query, maxResults = 50) {
  const response = await gmail.users.messages.list({
    userId: USER_ID,
    q: query,
    maxResults
  });
  return response.data.messages || [];
}

export async function getMessage(gmail, id, format = 'full') {
  const response = await gmail.users.messages.get({
    userId: USER_ID,
    id,
    format
  });
  return normalizeGmailMessage(response.data);
}

export async function getThread(gmail, id) {
  const response = await gmail.users.threads.get({
    userId: USER_ID,
    id,
    format: 'full'
  });
  return {
    id: response.data.id,
    messages: (response.data.messages || []).map(normalizeGmailMessage)
  };
}

export async function listLabels(gmail) {
  const response = await gmail.users.labels.list({ userId: USER_ID });
  return response.data.labels || [];
}

export function labelsByName(labels = []) {
  return new Map(labels.map((label) => [label.name, label]));
}

export async function getOrCreateLabel(gmail, labelName, options = {}) {
  const labels = options.labels || await listLabels(gmail);
  const found = labels.find((label) => label.name === labelName);
  if (found) return found;
  if (options.dryRun) return { id: `dry-run:${labelName}`, name: labelName };
  const response = await gmail.users.labels.create({
    userId: USER_ID,
    requestBody: {
      name: labelName,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show'
    }
  });
  return response.data;
}

export async function applyLabel(gmail, messageId, labelId, options = {}) {
  if (options.dryRun) return { dryRun: true };
  return modifyLabels(gmail, messageId, { addLabelIds: [labelId] });
}

export async function markRead(gmail, messageId, options = {}) {
  if (options.dryRun) return { dryRun: true };
  return modifyLabels(gmail, messageId, { removeLabelIds: ['UNREAD'] });
}

export async function markUnread(gmail, messageId, options = {}) {
  if (options.dryRun) return { dryRun: true };
  return modifyLabels(gmail, messageId, { addLabelIds: ['UNREAD'] });
}

export async function markImportant(gmail, messageId, options = {}) {
  if (options.dryRun) return { dryRun: true };
  return modifyLabels(gmail, messageId, { addLabelIds: ['IMPORTANT'] });
}

export async function archiveMessage(gmail, messageId, options = {}) {
  if (options.dryRun) return { dryRun: true };
  return modifyLabels(gmail, messageId, { removeLabelIds: ['INBOX'] });
}

export async function trashMessage(gmail, messageId, options = {}) {
  if (options.dryRun) return { dryRun: true };
  return gmail.users.messages.trash({ userId: USER_ID, id: messageId });
}

export async function deleteMessage(gmail, messageId, options = {}) {
  if (options.dryRun) return { dryRun: true };
  return gmail.users.messages.delete({ userId: USER_ID, id: messageId });
}

export async function createDraft(gmail, email, draft, options = {}) {
  const raw = buildReplyMime(email, draft);
  if (options.dryRun) return { id: `dry-run-draft:${email.id}`, raw };
  const response = await gmail.users.drafts.create({
    userId: USER_ID,
    requestBody: {
      message: {
        raw,
        threadId: email.threadId
      }
    }
  });
  return response.data;
}

export async function sendReply(gmail, email, draft, options = {}) {
  const raw = buildReplyMime(email, draft);
  if (options.dryRun) return { id: `dry-run-send:${email.id}`, raw };
  const response = await gmail.users.messages.send({
    userId: USER_ID,
    requestBody: {
      raw,
      threadId: email.threadId
    }
  });
  return response.data;
}

async function modifyLabels(gmail, messageId, requestBody) {
  const response = await gmail.users.messages.modify({
    userId: USER_ID,
    id: messageId,
    requestBody
  });
  return response.data;
}

export function normalizeGmailMessage(message) {
  const headers = message.payload?.headers || [];
  const fromRaw = getHeader(headers, 'From');
  const toRaw = getHeader(headers, 'To');
  const ccRaw = getHeader(headers, 'Cc');
  const bccRaw = getHeader(headers, 'Bcc');
  const deliveredToRaw = getHeader(headers, 'Delivered-To');
  const subject = getHeader(headers, 'Subject') || '(sem assunto)';
  const listUnsubscribe = getHeader(headers, 'List-Unsubscribe');
  const listUnsubscribePost = getHeader(headers, 'List-Unsubscribe-Post');
  const listId = getHeader(headers, 'List-ID');
  const bodyText = normalizeText(extractBodyText(message.payload));
  const attachments = extractAttachmentInfo(message.payload);
  const recipientEmails = unique([
    ...parseEmailAddresses(toRaw),
    ...parseEmailAddresses(ccRaw),
    ...parseEmailAddresses(bccRaw),
    ...parseEmailAddresses(deliveredToRaw)
  ]);

  return {
    id: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds || [],
    sizeEstimate: message.sizeEstimate || 0,
    snippet: message.snippet || '',
    internalDate: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : null,
    headers: {
      from: fromRaw,
      to: toRaw,
      cc: ccRaw,
      bcc: bccRaw,
      deliveredTo: deliveredToRaw,
      subject,
      date: getHeader(headers, 'Date'),
      messageId: getHeader(headers, 'Message-ID'),
      references: getHeader(headers, 'References'),
      inReplyTo: getHeader(headers, 'In-Reply-To'),
      listUnsubscribe,
      listUnsubscribePost,
      listId,
      precedence: getHeader(headers, 'Precedence'),
      importance: getHeader(headers, 'Importance'),
      priority: getHeader(headers, 'X-Priority')
    },
    from: parseEmailAddress(fromRaw),
    recipientEmails,
    subject,
    bodyText: clampText(bodyText, 25000),
    attachments
  };
}

export function extractBodyText(payload) {
  if (!payload) return '';
  const mimeType = payload.mimeType || '';
  const bodyData = payload.body?.data;
  if (bodyData && mimeType.includes('text/plain')) return decodeBase64Url(bodyData);
  if (bodyData && mimeType.includes('text/html')) return stripHtml(decodeBase64Url(bodyData));

  const plain = [];
  const html = [];
  for (const part of payload.parts || []) {
    const text = extractBodyText(part);
    if (!text) continue;
    if ((part.mimeType || '').includes('text/html')) html.push(text);
    else plain.push(text);
  }
  return plain.join('\n\n') || html.join('\n\n');
}

export function extractAttachmentInfo(payload, output = []) {
  if (!payload) return output;
  const filename = payload.filename;
  const attachmentId = payload.body?.attachmentId;
  if (filename && attachmentId) {
    output.push({
      filename,
      mimeType: payload.mimeType,
      attachmentId,
      size: payload.body?.size || 0
    });
  }
  for (const part of payload.parts || []) extractAttachmentInfo(part, output);
  return output;
}

export function buildReplyMime(email, draft) {
  const to = draft.to || email.from.email;
  const subject = /^re:/i.test(draft.subject || email.subject) ? (draft.subject || email.subject) : `Re: ${draft.subject || email.subject}`;
  const body = draft.body || '';
  const headers = [
    `To: ${to}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit'
  ];
  if (email.headers?.messageId) {
    headers.push(`In-Reply-To: ${email.headers.messageId}`);
    headers.push(`References: ${[email.headers.references, email.headers.messageId].filter(Boolean).join(' ')}`);
  }
  return encodeBase64Url(`${headers.join('\r\n')}\r\n\r\n${body}`);
}

function encodeMimeHeader(value) {
  const text = String(value ?? '');
  if (/^[\x00-\x7F]*$/.test(text)) return text;
  return `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`;
}
