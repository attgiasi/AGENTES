let settings = null;

const modules = [
  ['gmailRead', 'Leitura de emails'],
  ['classification', 'Classificação'],
  ['importantDetection', 'Importantes'],
  ['newsletter', 'Newsletter/mailing'],
  ['autoArchive', 'Arquivamento automático'],
  ['drafts', 'Respostas e rascunhos'],
  ['summaries', 'Resumos'],
  ['threads', 'Threads/conversas'],
  ['pendingReplies', 'Pendências de resposta'],
  ['deadlines', 'Prazos/datas'],
  ['appleReminders', 'Lembretes Apple'],
  ['appleCalendar', 'Calendário Apple'],
  ['attachments', 'Anexos'],
  ['reports', 'Relatórios'],
  ['siriShortcuts', 'Siri/Atalhos'],
  ['logs', 'Logs']
];

const permissions = [
  ['lowRiskAutomatic', 'Baixo risco automático'],
  ['mediumRiskRequiresConfirmation', 'Médio risco confirma'],
  ['highRiskRequiresExplicitConfirmation', 'Alto risco explícito'],
  ['readEmails', 'Ler emails'],
  ['classifyEmails', 'Classificar emails'],
  ['summarizeEmails', 'Resumir emails'],
  ['applyLabels', 'Aplicar etiquetas'],
  ['markRead', 'Marcar lido'],
  ['markUnread', 'Marcar não lido'],
  ['createReminders', 'Criar lembretes'],
  ['createReports', 'Criar relatórios'],
  ['archiveEmails', 'Arquivar emails'],
  ['moveEmails', 'Mover emails'],
  ['createDrafts', 'Criar rascunhos'],
  ['createCalendarEvents', 'Criar eventos'],
  ['downloadAttachments', 'Baixar anexos'],
  ['unsubscribeNewsletter', 'Descadastrar newsletter'],
  ['sendEmails', 'Enviar emails'],
  ['deleteEmails', 'Apagar emails'],
  ['emptyTrash', 'Esvaziar lixeira'],
  ['forwardEmails', 'Encaminhar emails'],
  ['bulkActions', 'Ações em lote']
];

document.addEventListener('DOMContentLoaded', async () => {
  renderButtons();
  await loadSettings();
  await loadStatus();
  bind();
});

function renderButtons() {
  document.querySelector('#moduleButtons').innerHTML = modules.map(([key, label]) => (
    `<button class="toggle" data-path="modules.${key}">${label}</button>`
  )).join('');
  document.querySelector('#permissionButtons').innerHTML = permissions.map(([key, label]) => (
    `<button class="toggle" data-path="permissions.${key}">${label}</button>`
  )).join('');
}

async function loadSettings() {
  settings = await api('/api/settings');
  updateForm();
}

async function saveSettings() {
  settings = await api('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  });
  updateForm();
}

async function loadStatus() {
  const status = await api('/api/status');
  document.querySelector('#status').innerHTML = [
    ['Gmail', status.gmail.connected ? `Conectado: ${status.gmail.emailAddress}` : `Não conectado: ${status.gmail.error}`],
    ['OpenAI', status.ai.openaiConfigured ? 'Configurado' : 'Sem chave'],
    ['Gemini', status.ai.geminiConfigured ? 'Configurado' : 'Opcional/desligado'],
    ['Apple', status.apple.enabled ? 'Ativo via Atalhos' : 'Desligado'],
    ['Siri', status.siri.enabled ? 'Ativo' : 'Desligado'],
    ['Autonomia', `Nível ${status.agent.autonomyLevel}`],
    ['Emergência', status.agent.emergencyStop ? 'Travada' : 'Normal'],
    ['Simulação', status.agent.dryRun ? 'Ligada' : 'Desligada']
  ].map(([label, value]) => `<div class="status-pill"><strong>${label}</strong><span>${escapeHtml(value)}</span></div>`).join('');
}

function bind() {
  document.body.addEventListener('click', async (event) => {
    const toggle = event.target.closest('.toggle[data-path]');
    const approvalAction = event.target.closest('[data-approval-id][data-approval-status]');

    if (approvalAction) {
      const id = approvalAction.dataset.approvalId;
      const status = approvalAction.dataset.approvalStatus;
      approvalAction.disabled = true;
      const result = await api(`/api/approvals/${encodeURIComponent(id)}/${status}`, { method: 'POST' });
      show(result);
      await loadApprovals();
      return;
    }

    if (toggle) {
      const path = toggle.dataset.path;
      setPath(settings, path, !Boolean(getPath(settings, path)));
      await saveSettings();
    }
  });

  document.body.addEventListener('input', (event) => {
    const input = event.target.closest('input[data-path], select[data-path]');
    if (!input) return;
    const current = getPath(settings, input.dataset.path);
    const value = input.dataset.kind === 'csv'
      ? splitCsv(input.value)
      : typeof current === 'number'
        ? Number(input.value)
        : input.value;
    setPath(settings, input.dataset.path, value);
  });

  document.body.addEventListener('change', async (event) => {
    if (event.target.matches('input[data-path], select[data-path]')) await saveSettings();
  });

  document.querySelector('#refresh').addEventListener('click', loadStatus);
  document.querySelector('#emergencyStop').addEventListener('click', async () => {
    if (!confirm('Tem certeza? Isso vai pausar o agente, ligar simulação e desligar ações sensíveis.')) return;
    settings = await api('/api/emergency-stop', { method: 'POST' });
    updateForm();
    await loadStatus();
  });
  document.querySelector('#resumeSafe').addEventListener('click', async () => {
    settings = await api('/api/resume-after-emergency', { method: 'POST' });
    updateForm();
    await loadStatus();
  });
  document.querySelector('#runNow').addEventListener('click', async () => {
    const result = await api('/api/run', { method: 'POST', body: '{}' });
    show(result);
    await loadStatus();
  });
  document.querySelector('#loadLogs').addEventListener('click', async () => show(await api('/api/logs')));
  document.querySelector('#loadApprovals').addEventListener('click', loadApprovals);
  document.querySelector('#loadNewsletters').addEventListener('click', async () => show(await api('/api/newsletters')));
  document.querySelector('#loadShortcuts').addEventListener('click', async () => {
    document.querySelector('#shortcuts').textContent = JSON.stringify(await api('/api/shortcuts'), null, 2);
  });
}

function updateForm() {
  document.querySelectorAll('.toggle[data-path]').forEach((button) => {
    const value = Boolean(getPath(settings, button.dataset.path));
    button.classList.toggle('is-on', value);
    button.textContent = `${button.textContent.replace(/: (Ligado|Desligado)$/u, '')}: ${value ? 'Ligado' : 'Desligado'}`;
  });
  document.querySelectorAll('input[data-path], select[data-path]').forEach((input) => {
    const value = getPath(settings, input.dataset.path);
    if (document.activeElement !== input) input.value = Array.isArray(value) ? value.join(', ') : value ?? '';
  });
  document.querySelector('#requiredConfirmations').textContent = JSON.stringify(settings.confirmations.required, null, 2);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.spokenText || 'Falha na API');
  return data;
}

function show(value) {
  document.querySelector('#output').textContent = JSON.stringify(value, null, 2);
}

async function loadApprovals() {
  const approvals = await api('/api/approvals');
  const output = document.querySelector('#output');
  if (!approvals.length) {
    output.innerHTML = '<p>Nenhuma aprovação pendente.</p>';
    return;
  }
  output.innerHTML = approvals.map((approval) => {
    const subject = approval.payload?.decision?.resumo || approval.payload?.action?.name || approval.action;
    return `
      <div class="approval-card">
        <p><strong>${escapeHtml(approval.action)}</strong> · risco ${escapeHtml(approval.risk)} · ${escapeHtml(approval.created_at)}</p>
        <p>${escapeHtml(subject)}</p>
        <div class="hero-actions">
          <button class="primary" data-approval-id="${escapeHtml(approval.id)}" data-approval-status="approved">Aprovar e executar</button>
          <button data-approval-id="${escapeHtml(approval.id)}" data-approval-status="rejected">Rejeitar</button>
        </div>
      </div>
    `;
  }).join('');
}

function getPath(target, path) {
  return path.split('.').reduce((current, key) => current?.[key], target);
}

function setPath(target, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const parent = keys.reduce((current, key) => current[key], target);
  parent[last] = value;
}

function splitCsv(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
