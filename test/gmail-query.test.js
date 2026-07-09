import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings } from '../src/settings.js';
import { buildGmailSearchQuery } from '../src/gmail/query.js';

test('busca inteligente monta categorias selecionadas do Gmail', () => {
  const settings = normalizeSettings({
    gmail: {
      categories: {
        primary: true,
        promotions: false,
        social: true,
        updates: false,
        forums: false
      }
    }
  });

  const query = buildGmailSearchQuery(settings);
  assert.match(query, /newer_than:30d/);
  assert.match(query, /\{category:primary category:social\}/);
  assert.match(query, /-in:sent/);
  assert.match(query, /-in:trash/);
});
