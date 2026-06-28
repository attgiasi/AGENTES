import express from 'express';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db/database.js';
import { loadSettings, saveSettings, validateSettings } from './settings.js';
import { runAgent } from './agent.js';
import { handleSiriCommand } from './siri/commands.js';
import { getGmailClient, getProfile } from './gmail/auth.js';
import { executeApprovedAction } from './modules/actions.js';

dotenv.config({ quiet: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const db = await openDatabase();
const port = Number(process.env.PORT || 8787);

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.resolve(__dirname, '..', 'public')));

app.get('/api/status', async (req, res) => {
  const settings = await loadSettings(db);
  const validation = validateSettings(settings);
  const gmail = await gmailStatus();
  res.json({
    ok: true,
    agent: settings.agent,
    ai: {
      provider: settings.ai.provider,
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
    },
    apple: settings.apple,
    siri: {
      enabled: settings.siri.enabled,
      tokenConfigured: Boolean(process.env.SHORTCUT_TOKEN)
    },
    gmail,
    validation
  });
});

app.get('/api/settings', async (req, res) => {
  res.json(await loadSettings(db));
});

app.put('/api/settings', async (req, res) => {
  const settings = await loadSettings(db);
  const next = { ...settings, ...req.body };
  saveSettings(db, next);
  db.log('info', 'panel', 'Configurações atualizadas pelo painel.');
  res.json(await loadSettings(db));
});

app.post('/api/run', async (req, res) => {
  try {
    const result = await runAgent({ db, allowMissingGmail: true, query: req.body?.query });
    res.json(result);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/logs', (req, res) => {
  res.json(db.listLogs(Number(req.query.limit || 100)));
});

app.get('/api/newsletters', (req, res) => {
  res.json(db.listNewsletters(Number(req.query.limit || 100)));
});

app.get('/api/approvals', (req, res) => {
  res.json(db.listApprovals(req.query.status || 'pending', Number(req.query.limit || 100)));
});

app.post('/api/approvals/:id/:status', async (req, res) => {
  try {
    const status = ['approved', 'rejected'].includes(req.params.status) ? req.params.status : 'pending';
    const approval = db.getApproval(req.params.id);
    if (!approval) return res.status(404).json({ ok: false, error: 'Aprovação não encontrada.' });

    if (status === 'rejected') {
      db.updateApproval(req.params.id, 'rejected');
      db.log('info', 'approval', `Aprovação ${req.params.id} rejeitada.`);
      return res.json({ ok: true, id: req.params.id, status: 'rejected' });
    }

    const settings = await loadSettings(db);
    const gmail = await getGmailClient();
    const result = await executeApprovedAction({ gmail, approval, settings, db });
    db.updateApproval(req.params.id, result.status === 'executed' ? 'executed' : 'dry-run');
    db.log('info', 'approval', `Aprovação ${req.params.id} executada.`, result);
    return res.json({ ok: true, id: req.params.id, status: result.status, result });
  } catch (error) {
    db.updateApproval(req.params.id, 'failed');
    db.log('error', 'approval', `Falha ao executar aprovação ${req.params.id}.`, { error: error.message });
    return res.status(500).json({ ok: false, id: req.params.id, error: error.message });
  }
});

app.get('/api/apple/reminders', (req, res) => {
  res.json(db.listAppleItems('reminder', req.query.status || 'pending_shortcut', Number(req.query.limit || 20)));
});

app.get('/api/apple/calendar-events', (req, res) => {
  res.json(db.listAppleItems('calendar_event', req.query.status || 'pending_shortcut', Number(req.query.limit || 20)));
});

app.post('/api/siri/:command', requireShortcutToken, async (req, res) => {
  try {
    res.json(await handleSiriCommand(req.params.command, { db, body: req.body }));
  } catch (error) {
    db.log('error', 'siri', 'Falha no comando Siri.', { command: req.params.command, error: error.message });
    res.status(500).json({ ok: false, spokenText: `Falha no comando: ${error.message}` });
  }
});

app.get('/api/siri/:command', requireShortcutToken, async (req, res) => {
  try {
    res.json(await handleSiriCommand(req.params.command, { db, body: req.query }));
  } catch (error) {
    res.status(500).json({ ok: false, spokenText: `Falha no comando: ${error.message}` });
  }
});

app.get('/api/shortcuts', (req, res) => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
  res.json({
    instructions: 'No app Atalhos, use Obter Conteúdo de URL, método POST, header x-shortcut-token e leia spokenText.',
    commands: [
      ['Resumir meus e-mails importantes', `${baseUrl}/api/siri/resumir-importantes`],
      ['O que preciso responder hoje?', `${baseUrl}/api/siri/responder-hoje`],
      ['Criar lembretes dos e-mails pendentes', `${baseUrl}/api/siri/criar-lembretes`],
      ['Limpar newsletters', `${baseUrl}/api/siri/limpar-newsletters`],
      ['Pausar agente do Gmail', `${baseUrl}/api/siri/pausar-agente`],
      ['Ativar agente do Gmail', `${baseUrl}/api/siri/ativar-agente`],
      ['Aplicar configuração de trabalho', `${baseUrl}/api/siri/foco-trabalho`],
      ['Mostrar relatório do dia', `${baseUrl}/api/siri/relatorio-dia`],
      ['Criar eventos dos e-mails com data', `${baseUrl}/api/siri/criar-eventos`],
      ['Listar e-mails urgentes', `${baseUrl}/api/siri/listar-urgentes`],
      ['Preparar respostas pendentes', `${baseUrl}/api/siri/preparar-respostas`],
      ['Arquivar newsletters antigas', `${baseUrl}/api/siri/arquivar-newsletters-antigas`],
      ['Mostrar pendências da semana', `${baseUrl}/api/siri/pendencias-semana`]
    ]
  });
});

app.listen(port, () => {
  console.log(`Painel rodando em http://localhost:${port}`);
});

function requireShortcutToken(req, res, next) {
  const settings = db.getSetting('agentSettings', null);
  const tokenRequired = settings?.siri?.requireToken ?? true;
  if (!tokenRequired) return next();
  const expected = process.env.SHORTCUT_TOKEN;
  if (!expected) return res.status(500).json({ ok: false, spokenText: 'SHORTCUT_TOKEN não configurado no servidor.' });
  const received = req.headers['x-shortcut-token'] || req.query.token || req.body?.token;
  if (received !== expected) return res.status(401).json({ ok: false, spokenText: 'Token do Atalho inválido.' });
  return next();
}

async function gmailStatus() {
  try {
    const gmail = await getGmailClient();
    const profile = await getProfile(gmail);
    return { connected: true, emailAddress: profile.emailAddress, messagesTotal: profile.messagesTotal };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}
