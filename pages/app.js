const moduleButtons = [
  ['gmailRead', 'Leitura de emails'],
  ['classification', 'Classificação'],
  ['importantDetection', 'Importantes'],
  ['newsletter', 'Newsletter/mailing'],
  ['autoArchive', 'Arquivamento automático'],
  ['drafts', 'Rascunhos'],
  ['summaries', 'Resumos'],
  ['threads', 'Conversas'],
  ['pendingReplies', 'Pendências'],
  ['deadlines', 'Prazos'],
  ['appleReminders', 'Lembretes Apple'],
  ['appleCalendar', 'Calendário Apple'],
  ['attachments', 'Anexos'],
  ['reports', 'Relatórios'],
  ['siriShortcuts', 'Siri/Atalhos'],
  ['logs', 'Logs']
];

const permissionButtons = [
  ['lowRiskAutomatic', 'Baixo risco automático'],
  ['mediumRiskRequiresConfirmation', 'Médio risco confirma'],
  ['highRiskRequiresExplicitConfirmation', 'Alto risco explícito'],
  ['readEmails', 'Ler emails'],
  ['classifyEmails', 'Classificar emails'],
  ['summarizeEmails', 'Resumir emails'],
  ['applyLabels', 'Aplicar etiquetas'],
  ['markRead', 'Marcar lido'],
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

let settings = safePreset();

document.addEventListener('DOMContentLoaded', () => {
  renderButtonGroups();
  bindEvents();
  updateForm();
});

function safePreset() {
  return {
    agent: {
      enabled: true,
      paused: false,
      emergencyStop: false,
      autonomyLevel: 2,
      dryRun: true,
      timezone: 'America/Sao_Paulo',
      maxEmailsPerRun: 50,
      gmailQuery: 'newer_than:30d -in:sent -in:drafts -in:spam -in:trash'
    },
    automation: {
      enabled: true,
      manualOnly: false,
      intervalHours: 1,
      allowedHours: Array.from({ length: 24 }, (_, hour) => hour),
      weekdaysOnly: false
    },
    modules: {
      gmailRead: true,
      classification: true,
      importantDetection: true,
      newsletter: true,
      autoArchive: false,
      drafts: true,
      summaries: true,
      threads: true,
      pendingReplies: true,
      deadlines: true,
      appleReminders: true,
      appleCalendar: true,
      attachments: false,
      reports: true,
      siriShortcuts: true,
      logs: true
    },
    permissions: {
      lowRiskAutomatic: true,
      mediumRiskRequiresConfirmation: true,
      highRiskRequiresExplicitConfirmation: true,
      readEmails: true,
      classifyEmails: true,
      summarizeEmails: true,
      applyLabels: true,
      markRead: false,
      markUnread: false,
      createReminders: true,
      createReports: true,
      archiveEmails: false,
      moveEmails: false,
      createDrafts: true,
      createCalendarEvents: false,
      downloadAttachments: false,
      unsubscribeNewsletter: false,
      sendEmails: false,
      deleteEmails: false,
      emptyTrash: false,
      forwardEmails: false,
      bulkActions: false
    },
    newsletter: {
      enabled: true,
      archiveAfterDays: 5,
      deleteAfterDays: 0,
      keepFavoritesInInbox: true,
      suggestUnsubscribe: true,
      favoriteSenders: [],
      trustedSenders: [],
      blockedSenders: []
    },
    protectedSenders: {
      enabled: true,
      requireConfirmationForArchive: true,
      requireConfirmationForDelete: true,
      emails: [],
      domains: [],
      keywords: ['banco', 'gov.br', 'receita', 'justiça', 'juridico', 'saude', 'médico', 'medico']
    }
  };
}

function autoArchivePreset() {
  const next = safePreset();
  next.agent.autonomyLevel = 5;
  next.agent.dryRun = false;
  next.agent.maxEmailsPerRun = 100;
  next.modules.autoArchive = true;
  next.permissions.archiveEmails = true;
  next.permissions.mediumRiskRequiresConfirmation = false;
  next.permissions.deleteEmails = false;
  next.permissions.unsubscribeNewsletter = false;
  next.newsletter.archiveAfterDays = 1;
  next.newsletter.deleteAfterDays = 0;
  return next;
}

function renderButtonGroups() {
  document.querySelector('#moduleButtons').innerHTML = moduleButtons.map(([key, label]) => (
    `<button class="toggle" data-path="modules.${key}">${escapeHtml(label)}</button>`
  )).join('');
  document.querySelector('#permissionButtons').innerHTML = permissionButtons.map(([key, label]) => (
    `<button class="toggle" data-path="permissions.${key}">${escapeHtml(label)}</button>`
  )).join('');
}

function bindEvents() {
  document.body.addEventListener('click', (event) => {
    const toggle = event.target.closest('.toggle[data-path]');
    if (!toggle) return;
    const path = toggle.dataset.path;
    setPath(settings, path, !Boolean(getPath(settings, path)));
    updateForm();
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
    updateJson();
  });

  document.querySelector('#safePreset').addEventListener('click', () => {
    settings = safePreset();
    updateForm();
  });

  document.querySelector('#autoArchivePreset').addEventListener('click', () => {
    settings = autoArchivePreset();
    updateForm();
  });

  document.querySelector('#copyJson').addEventListener('click', async () => {
    await navigator.clipboard.writeText(exportJson());
    alert('Configuração copiada. Cole no Secret AGENT_SETTINGS_JSON.');
  });

  document.querySelector('#downloadJson').addEventListener('click', () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'agent-settings-github.json';
    link.click();
    URL.revokeObjectURL(url);
  });
}

function updateForm() {
  document.querySelectorAll('.toggle[data-path]').forEach((button) => {
    const value = Boolean(getPath(settings, button.dataset.path));
    button.classList.toggle('is-on', value);
    const base = button.textContent.replace(/: (Ligado|Desligado)$/u, '');
    button.textContent = `${base}: ${value ? 'Ligado' : 'Desligado'}`;
  });
  document.querySelectorAll('input[data-path], select[data-path]').forEach((input) => {
    const value = getPath(settings, input.dataset.path);
    input.value = Array.isArray(value) ? value.join(', ') : value ?? '';
  });
  updateJson();
}

function updateJson() {
  document.querySelector('#jsonOutput').value = exportJson();
}

function exportJson() {
  return `${JSON.stringify(settings, null, 2)}\n`;
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
  return String(value || '').split(',').map((item) => {
    const number = Number(item.trim());
    return Number.isInteger(number) && item.trim() === String(number) ? number : item.trim();
  }).filter((item) => item !== '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
