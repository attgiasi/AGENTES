import dotenv from 'dotenv';
import { openDatabase } from '../src/db/database.js';
import { loadSettings, validateSettings } from '../src/settings.js';

dotenv.config({ quiet: true });

const useDb = process.argv.includes('--db');
const db = useDb ? await openDatabase() : null;
const settings = await loadSettings(db);
const validation = validateSettings(settings);

const summary = {
  origem: useDb ? 'banco local + env + defaults' : 'env + defaults',
  agente: {
    ativo: settings.agent.enabled,
    pausado: settings.agent.paused,
    simulacao: settings.agent.dryRun,
    autonomia: settings.agent.autonomyLevel,
    maxEmailsPorExecucao: settings.agent.maxEmailsPerRun
  },
  gmail: {
    somenteCaixaEntrada: settings.gmail.includeInboxOnly,
    somenteNaoLidos: settings.gmail.unreadOnly,
    diasBuscados: settings.gmail.newerThanDays,
    buscaExtra: settings.agent.gmailQuery || '(vazia)'
  },
  execucao: {
    executarTudoNaHora: settings.execution.runSelectedActionsNow,
    arquivarTudoImediatamente: settings.actions.archiveImmediately,
    marcarTudoComoLidoImediatamente: settings.actions.markReadImmediately
  },
  acoes: {
    lerEmails: settings.actions.readEmails,
    aplicarEtiquetas: settings.actions.applyLabels,
    arquivarEmails: settings.actions.archiveEmails,
    apagarEmails: settings.actions.deleteEmails,
    marcarComoLido: settings.actions.markRead,
    criarRascunhos: settings.actions.createDrafts,
    enviarEmails: settings.actions.sendEmails,
    descadastrarNewsletter: settings.actions.unsubscribeNewsletter
  },
  automacao: {
    ativa: settings.automation.enabled,
    somenteManual: settings.automation.manualOnly,
    intervaloHoras: settings.automation.intervalHours,
    horasPermitidas: settings.automation.allowedHours
  },
  avisos: validation.warnings
};

console.log(JSON.stringify(summary, null, 2));
