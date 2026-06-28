import { runAgent } from '../agent.js';
import { shortcutResponse } from '../apple/bridge.js';
import { loadSettings, saveSettings } from '../settings.js';

export async function handleSiriCommand(command, { db, body = {} }) {
  const settings = await loadSettings(db);

  if (command === 'pausar-agente') {
    settings.agent.paused = true;
    saveSettings(db, settings);
    db.log('info', 'siri', 'Agente pausado via Siri/Atalhos.');
    return shortcutResponse('Agente do Gmail pausado.');
  }

  if (command === 'ativar-agente') {
    settings.agent.paused = false;
    settings.agent.enabled = true;
    saveSettings(db, settings);
    db.log('info', 'siri', 'Agente ativado via Siri/Atalhos.');
    return shortcutResponse('Agente do Gmail ativado.');
  }

  if (command === 'foco-trabalho') {
    settings.modules.importantDetection = true;
    settings.modules.pendingReplies = true;
    settings.modules.deadlines = true;
    settings.modules.drafts = true;
    settings.modules.appleReminders = true;
    settings.modules.appleCalendar = true;
    settings.permissions.createDrafts = true;
    settings.permissions.createReminders = true;
    saveSettings(db, settings);
    return shortcutResponse('Configuração de trabalho aplicada. Vou priorizar respostas, prazos, rascunhos, lembretes e eventos conforme suas permissões.');
  }

  if (command === 'limpar-newsletters' || command === 'arquivar-newsletters-antigas') {
    const result = await runAgent({ db, settings, query: 'newer_than:30d (list: OR category:promotions OR unsubscribe)' });
    const archived = countActions(result.items, 'archiveEmail');
    return shortcutResponse(`Limpeza analisada. ${archived} newsletters foram marcadas para arquivar ou arquivadas conforme permissões.`, {
      emails: result.items.length,
      archived
    });
  }

  if (command === 'criar-lembretes') {
    const result = await runAgent({ db, settings, query: 'newer_than:14d (prazo OR vencimento OR responder OR cobrança OR boleto)' });
    const reminders = countActions(result.items, 'createReminder');
    return shortcutResponse(`${reminders} lembretes foram preparados para o app Lembretes.`, { reminders });
  }

  if (command === 'criar-eventos') {
    const result = await runAgent({ db, settings, query: 'newer_than:30d (reunião OR evento OR call OR convite OR agenda)' });
    const events = countActions(result.items, 'createCalendarEvent');
    return shortcutResponse(`${events} eventos foram preparados para o Calendário Apple.`, { events });
  }

  if (command === 'preparar-respostas' || command === 'responder-hoje') {
    const result = await runAgent({ db, settings, query: 'newer_than:7d (responder OR retorno OR aguardo OR confirmar)' });
    const drafts = countActions(result.items, 'createDraft');
    return shortcutResponse(`${drafts} respostas pendentes foram preparadas como rascunho ou aguardam confirmação.`, { drafts });
  }

  if (command === 'resumir-importantes' || command === 'listar-urgentes') {
    const result = await runAgent({ db, settings, query: 'newer_than:7d (urgente OR importante OR prazo)' });
    const urgent = result.items.filter((item) => ['urgente', 'alta'].includes(item.priority));
    const text = urgent.length
      ? urgent.slice(0, 5).map((item) => `${item.subject}: ${item.summary}`).join(' ')
      : 'Não encontrei emails urgentes nos critérios atuais.';
    return shortcutResponse(text, { urgent });
  }

  if (command === 'relatorio-dia') {
    const logs = db.listLogs(20);
    const newsletters = db.listNewsletters(10);
    return shortcutResponse(`Relatório do dia: ${logs.length} registros recentes e ${newsletters.length} newsletters acompanhadas.`, {
      logs,
      newsletters
    });
  }

  if (command === 'pendencias-semana') {
    const approvals = db.listApprovals('pending', 20);
    const reminders = db.listAppleItems('reminder', 'pending_shortcut', 20);
    return shortcutResponse(`Você tem ${approvals.length} aprovações pendentes e ${reminders.length} lembretes preparados.`, {
      approvals,
      reminders
    });
  }

  return shortcutResponse(`Comando não reconhecido: ${command}`, { received: command, body });
}

function countActions(items = [], actionName) {
  return items.reduce((total, item) => total + (item.actions || []).filter((action) => action.action === actionName).length, 0);
}
