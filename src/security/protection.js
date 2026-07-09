const SENSITIVE_ACTIONS = new Set([
  'archiveEmail',
  'deleteEmail',
  'unsubscribeNewsletter',
  'forwardEmail',
  'bulkActions'
]);

export function isProtectedSender(email, settings) {
  const config = settings.protectedSenders || {};
  if (!config.enabled) return false;

  const fromEmail = String(email.from?.email || '').toLowerCase();
  const fromDomain = String(email.from?.domain || fromEmail.split('@')[1] || '').toLowerCase();
  const haystack = [
    fromEmail,
    fromDomain,
    email.headers?.from,
    email.subject,
    email.snippet
  ].join(' ').toLowerCase();

  const emails = (config.emails || []).map((item) => String(item).toLowerCase());
  const domains = (config.domains || []).map((item) => String(item).toLowerCase());
  const keywords = (config.keywords || []).map((item) => String(item).toLowerCase());

  if (emails.includes(fromEmail)) return true;
  if (domains.some((domain) => fromDomain === domain || fromDomain.endsWith(`.${domain}`))) return true;
  if (keywords.some((keyword) => keyword && haystack.includes(keyword))) return true;
  return false;
}

export function shouldProtectAction(actionName, email, settings) {
  if (!SENSITIVE_ACTIONS.has(actionName)) return false;
  if (!isProtectedSender(email, settings)) return false;
  if (actionName === 'archiveEmail') return Boolean(settings.protectedSenders?.requireConfirmationForArchive);
  if (actionName === 'deleteEmail') return Boolean(settings.protectedSenders?.requireConfirmationForDelete);
  return true;
}
