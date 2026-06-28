import test from 'node:test';
import assert from 'node:assert/strict';
import { isNewsletterEmail, newsletterPlan } from '../src/modules/newsletter.js';
import { normalizeSettings } from '../src/settings.js';

const email = {
  labelIds: ['CATEGORY_PROMOTIONS'],
  internalDate: new Date(Date.now() - 6 * 86400000).toISOString(),
  from: { email: 'news@loja.com', domain: 'loja.com' },
  headers: {
    from: 'Loja <news@loja.com>',
    listUnsubscribe: '<mailto:sair@loja.com>',
    listId: 'news.loja.com',
    precedence: 'bulk'
  },
  subject: 'Newsletter semanal',
  snippet: 'Promoção',
  bodyText: 'Clique para descadastrar'
};

test('detecta newsletter por cabeçalho e categoria do Gmail', () => {
  assert.equal(isNewsletterEmail(email, normalizeSettings({})), true);
});

test('planeja arquivamento após idade configurada', () => {
  const settings = normalizeSettings({
    permissions: {
      archiveEmails: true,
      unsubscribeNewsletter: true
    },
    newsletter: {
      archiveAfterDays: 5
    }
  });
  const plan = newsletterPlan(email, settings);
  assert.equal(plan.isNewsletter, true);
  assert.ok(plan.actions.includes('archiveEmail'));
  assert.ok(plan.actions.includes('unsubscribeNewsletter'));
});

