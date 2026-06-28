import { daysBetweenNow, includesAny } from '../utils.js';

export function isNewsletterEmail(email, settings) {
  const text = `${email.headers?.from}\n${email.subject}\n${email.snippet}\n${email.bodyText}`;
  const headers = [
    email.headers?.listUnsubscribe,
    email.headers?.listUnsubscribePost,
    email.headers?.listId,
    email.headers?.precedence
  ].join('\n');

  if (email.labelIds?.includes('CATEGORY_PROMOTIONS')) return true;
  if (email.headers?.listUnsubscribe || email.headers?.listId) return true;
  if (includesAny(headers, ['bulk', 'list', 'one-click'])) return true;
  if (includesAny(text, ['newsletter', 'mailing', 'promoção', 'oferta', 'cupom', 'unsubscribe', 'descadastrar', 'cancelar inscrição'])) return true;
  if ((settings.newsletter.blockedSenders || []).includes(email.from?.email)) return true;
  return false;
}

export function newsletterPlan(email, settings) {
  const isNewsletter = isNewsletterEmail(email, settings);
  if (!isNewsletter) return { isNewsletter: false, actions: [] };

  const favorite = (settings.newsletter.favoriteSenders || []).includes(email.from.email);
  const trusted = (settings.newsletter.trustedSenders || []).includes(email.from.email);
  const ageDays = daysBetweenNow(email.internalDate);
  const actions = ['identifyNewsletter', 'applyLabel'];

  if (!favorite && settings.newsletter.suggestUnsubscribe && email.headers?.listUnsubscribe) {
    actions.push('unsubscribeNewsletter');
  }

  if (!favorite && (trusted || ageDays >= settings.newsletter.archiveAfterDays)) {
    actions.push('archiveEmail');
  }

  if (!favorite && settings.permissions.markRead) {
    actions.push('markRead');
  }

  if (!favorite && settings.newsletter.deleteAfterDays > 0 && ageDays >= settings.newsletter.deleteAfterDays) {
    actions.push('deleteEmail');
  }

  return {
    isNewsletter: true,
    favorite,
    trusted,
    ageDays,
    actions
  };
}

export function unsubscribeHint(email) {
  return email.headers?.listUnsubscribe || '';
}

