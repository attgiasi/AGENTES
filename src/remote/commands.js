import { executeRequestedAction, undoExecutedAction } from '../modules/actions.js';
import { completeRemoteCommand } from './client.js';

export async function processRemoteCommands({ commands = [], gmail, settings, db }) {
  const results = [];
  for (const command of commands) {
    if (!command?.id || command.status !== 'pending') continue;
    try {
      let result;
      if (command.type === 'undo_action') {
        result = await undoExecutedAction({ gmail, event: command.payload, settings, db });
      } else if (command.type === 'execute_action') {
        result = await executeRequestedAction({
          gmail,
          emailId: command.payload?.emailId,
          action: command.payload?.action,
          settings,
          db
        });
      } else if (command.type === 'run_agent') {
        result = { ok: true, detail: 'Execução iniciada pelo painel online.' };
      } else {
        result = { ok: false, detail: `Comando desconhecido: ${command.type}` };
      }
      await completeRemoteCommand(command.id, { ...result, eventId: command.payload?.eventId });
      results.push({ id: command.id, type: command.type, ...result });
    } catch (error) {
      const result = { ok: false, error: error.message, eventId: command.payload?.eventId };
      await completeRemoteCommand(command.id, result).catch(() => null);
      db?.log('error', 'remote', `Falha no comando remoto ${command.id}.`, result);
      results.push({ id: command.id, type: command.type, ...result });
    }
  }
  return results;
}

