import test from 'node:test';
import assert from 'node:assert/strict';
import { fallbackDecision, validateDecision } from '../src/ai/schema.js';

test('decisão fallback segue schema mínimo', () => {
  const decision = fallbackDecision({ id: '1', subject: 'Teste', snippet: 'Resumo' });
  assert.equal(validateDecision(decision).ok, true);
});

