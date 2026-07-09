const CATEGORY_QUERY = {
  primary: 'category:primary',
  promotions: 'category:promotions',
  social: 'category:social',
  updates: 'category:updates',
  forums: 'category:forums'
};

export function buildGmailSearchQuery(settings, overrideQuery = '') {
  const manualQuery = String(overrideQuery || '').trim();
  if (manualQuery) return manualQuery;

  const gmail = settings.gmail || {};
  const extraQuery = String(settings.agent?.gmailQuery || '').trim();

  if (!gmail.useSmartQuery) return extraQuery || 'newer_than:30d -in:sent -in:drafts -in:spam -in:trash';

  const parts = [];
  const newerThanDays = Number(gmail.newerThanDays || 30);
  if (Number.isFinite(newerThanDays) && newerThanDays > 0) parts.push(`newer_than:${Math.round(newerThanDays)}d`);
  if (gmail.includeInboxOnly) parts.push('in:inbox');
  if (gmail.unreadOnly) parts.push('is:unread');
  if (gmail.excludeSent !== false) parts.push('-in:sent');
  if (gmail.excludeDrafts !== false) parts.push('-in:drafts');
  if (gmail.excludeSpamTrash !== false) parts.push('-in:spam', '-in:trash');

  const selectedCategories = Object.entries(gmail.categories || {})
    .filter(([, enabled]) => Boolean(enabled))
    .map(([category]) => CATEGORY_QUERY[category])
    .filter(Boolean);
  if (selectedCategories.length > 0 && selectedCategories.length < Object.keys(CATEGORY_QUERY).length) {
    parts.push(`{${selectedCategories.join(' ')}}`);
  }

  if (extraQuery) parts.push(extraQuery);
  return parts.join(' ').trim() || 'newer_than:30d -in:sent -in:drafts -in:spam -in:trash';
}
