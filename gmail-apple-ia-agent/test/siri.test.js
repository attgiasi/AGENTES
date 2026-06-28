import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/database.js';
import { handleSiriCommand } from '../src/siri/commands.js';

test('Siri pausa e ativa agente alterando configuração', async () => {
  const db = await openDatabase(':memory:');
  const paused = await handleSiriCommand('pausar-agente', { db });
  assert.equal(paused.spokenText, 'Agente do Gmail pausado.');
  assert.equal(db.getSetting('agentSettings').agent.paused, true);

  const active = await handleSiriCommand('ativar-agente', { db });
  assert.equal(active.spokenText, 'Agente do Gmail ativado.');
  assert.equal(db.getSetting('agentSettings').agent.paused, false);
});

