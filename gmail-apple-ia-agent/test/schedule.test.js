import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRunBySchedule } from '../src/automation/schedule.js';
import { normalizeSettings } from '../src/settings.js';

test('agenda bloqueia hora fora da lista permitida', () => {
  const settings = normalizeSettings({
    agent: { timezone: 'UTC' },
    automation: {
      enabled: true,
      manualOnly: false,
      intervalHours: 1,
      allowedHours: [8]
    }
  });
  const result = shouldRunBySchedule(settings, new Date('2026-01-01T09:00:00Z'));
  assert.equal(result.allowed, false);
});

test('agenda permite hora configurada', () => {
  const settings = normalizeSettings({
    agent: { timezone: 'UTC' },
    automation: {
      enabled: true,
      manualOnly: false,
      intervalHours: 4,
      allowedHours: [8, 12, 16]
    }
  });
  const result = shouldRunBySchedule(settings, new Date('2026-01-01T12:00:00Z'));
  assert.equal(result.allowed, true);
});
