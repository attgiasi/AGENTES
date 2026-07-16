const STORAGE_KEY = 'inbox-ai-settings-v2';

const AUTONOMY_LEVELS = [
  { level: 0, title: 'Desligado', description: 'O agente fica pausado.' },
  { level: 1, title: 'Assistido', description: 'Toda ação aguarda sua aprovação.' },
  { level: 2, title: 'Equilibrado', description: 'Executa tarefas simples automaticamente.' },
  { level: 3, title: 'Independente', description: 'Só pede aprovação para ações avançadas.' },
  { level: 4, title: 'Autonomia total', description: 'Executa tudo o que estiver ativado.' }
];

const FEATURE_GROUPS = {
  essentialActions: [
    feature('readEmails', 'Ler e-mails', 'Analisa as mensagens selecionadas.', 'mail', 'actions.readEmails'),
    feature('classifyEmails', 'Classificar', 'Identifica assunto, prioridade e categoria.', 'sparkles', 'actions.classifyEmails'),
    feature('summarizeEmails', 'Criar resumos', 'Resume mensagens e conversas longas.', 'text', 'actions.summarizeEmails'),
    feature('applyLabels', 'Organizar com etiquetas', 'Aplica etiquetas automaticamente.', 'tag', 'actions.applyLabels'),
    feature('markRead', 'Marcar como lido', 'Marca todos os e-mails processados como lidos.', 'check', null, 'markRead'),
    feature('archive', 'Arquivar e-mails', 'Arquiva todos os e-mails processados.', 'archive', null, 'archive'),
    feature('markUnread', 'Marcar como não lido', 'Pode devolver uma mensagem para não lida.', 'eye', 'actions.markUnread')
  ],
  productivityActions: [
    feature('drafts', 'Preparar respostas', 'Cria rascunhos de resposta no Gmail.', 'edit', 'actions.createDrafts'),
    feature('reminders', 'Criar lembretes', 'Transforma pendências em lembretes Apple.', 'bell', null, 'reminders'),
    feature('calendar', 'Criar eventos', 'Transforma datas em eventos de calendário.', 'calendar', null, 'calendar'),
    feature('reports', 'Gerar relatórios', 'Cria resumos diários e semanais.', 'chart', 'actions.createReports'),
    feature('attachments', 'Baixar anexos', 'Baixa os anexos identificados pelo agente.', 'paperclip', 'actions.downloadAttachments')
  ],
  advancedActions: [
    feature('move', 'Mover e-mails', 'Move mensagens entre etiquetas e pastas.', 'move', 'actions.moveEmails'),
    feature('unsubscribe', 'Fazer descadastro', 'Executa o cancelamento de newsletters.', 'unlink', 'actions.unsubscribeNewsletter'),
    feature('send', 'Enviar respostas', 'Permite o envio de mensagens preparadas.', 'send', 'actions.sendEmails'),
    feature('delete', 'Mover para lixeira', 'Envia mensagens selecionadas para a lixeira.', 'trash', 'actions.deleteEmails'),
    feature('forward', 'Encaminhar e-mails', 'Permite encaminhar mensagens.', 'forward', 'actions.forwardEmails'),
    feature('bulk', 'Executar em lote', 'Permite processar ações em grande volume.', 'layers', 'actions.bulkActions'),
    feature('emptyTrash', 'Esvaziar lixeira', 'Executa o esvaziamento da lixeira.', 'trash', 'actions.emptyTrash')
  ],
  gmailFilters: [
    feature('inboxOnly', 'Somente caixa de entrada', 'Ignora mensagens já arquivadas.', 'inbox', 'gmail.includeInboxOnly'),
    feature('unreadOnly', 'Somente não lidos', 'Processa apenas mensagens não lidas.', 'eye', 'gmail.unreadOnly')
  ],
  importantOptions: [
    feature('keepUnread', 'Manter não lido', 'Deixa o e-mail em destaque até você abrir.', 'eye', 'important.keepUnread')
  ],
  automationOptions: [
    feature('weekdays', 'Somente dias úteis', 'Executa de segunda a sexta-feira.', 'calendar', 'automation.weekdaysOnly')
  ],
  newsletterOptions: [
    feature('keepFavorites', 'Manter favoritos', 'Mantém newsletters favoritas na entrada.', 'star', 'newsletter.keepFavoritesInInbox'),
    feature('suggestUnsubscribe', 'Sugerir descadastro', 'Identifica assinaturas que podem ser canceladas.', 'sparkles', 'newsletter.suggestUnsubscribe')
  ],
  aiOptions: [
    feature('includeBody', 'Analisar conteúdo completo', 'Inclui o corpo da mensagem na análise.', 'text', 'ai.openai.includeBody'),
    feature('compareAI', 'Comparar provedores', 'Compara OpenAI e Gemini na mesma análise.', 'split', 'ai.compareProviders')
  ],
  integrationOptions: [
    feature('siri', 'Siri e Atalhos', 'Ativa comandos de voz e automações no iPhone.', 'mic', 'siri.enabled'),
    feature('cloudkit', 'Sincronização CloudKit', 'Prepara a sincronização com o ecossistema Apple.', 'cloud', 'apple.cloudKit.enabled')
  ]
};

const GMAIL_CATEGORIES = [
  ['gmail.categories.primary', 'Principal'],
  ['gmail.categories.promotions', 'Promoções'],
  ['gmail.categories.social', 'Social'],
  ['gmail.categories.updates', 'Atualizações'],
  ['gmail.categories.forums', 'Fóruns']
];

const IMPORTANT_PRIORITIES = [
  ['alta', 'Alta'], ['urgente', 'Urgente'], ['media', 'Média'], ['baixa', 'Baixa']
];

const IMPORTANT_CATEGORIES = [
  ['pessoal', 'Pessoal'], ['prazo', 'Prazo'], ['resposta_pendente', 'Precisa resposta'],
  ['trabalho', 'Trabalho'], ['financeiro', 'Financeiro'], ['documento', 'Documentos'],
  ['contrato', 'Contratos'], ['cobranca', 'Cobranças'], ['evento', 'Eventos']
];

let settings = createDefaultSettings();
let backendConnected = false;
let statusData = null;
let dashboardData = emptyDashboard();
let saveTimer = null;
let toastTimer = null;

document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
  renderStaticControls();
  bindEvents();
  populateIntervalOptions();
  await loadInitialSettings();
  renderAll();
  await Promise.all([loadStatus(), loadDashboard()]);
  renderDashboard();
  setView(location.hash === '#configuracoes' ? 'settings' : 'overview', false);
}

function renderStaticControls() {
  for (const [containerId, items] of Object.entries(FEATURE_GROUPS)) {
    const container = document.querySelector(`#${containerId}`);
    if (container) container.innerHTML = items.map(renderFeatureCard).join('');
  }

  document.querySelector('#simulationOption').innerHTML = renderFeatureCard(
    feature('dryRun', 'Modo simulação', 'Mostra o que faria sem alterar o Gmail.', 'play', 'agent.dryRun')
  );
  document.querySelector('#importantMainSwitch').innerHTML = renderFeatureCard(
    feature('important', 'Destacar e-mails importantes', 'Marca no Gmail e aplica a etiqueta de importante.', 'star', null, 'important')
  );
  document.querySelector('#automationMainSwitch').innerHTML = renderFeatureCard(
    feature('automation', 'Execução automática', 'Permite que o agente rode nos horários escolhidos.', 'clock', null, 'automation')
  );
  document.querySelector('#newsletterMainSwitch').innerHTML = renderFeatureCard(
    feature('newsletter', 'Organizar newsletters', 'Identifica mailing, promoções e assinaturas.', 'newsletter', null, 'newsletter')
  );

  document.querySelector('#autonomyGrid').innerHTML = AUTONOMY_LEVELS.map((item) => `
    <button class="autonomy-card" data-autonomy-level="${item.level}" aria-pressed="false">
      <span class="level-dot">${item.level}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <small>${escapeHtml(item.description)}</small>
    </button>
  `).join('');

  document.querySelector('#gmailCategories').innerHTML = GMAIL_CATEGORIES.map(([path, label]) => `
    <button class="choice-chip" data-toggle-path="${escapeHtml(path)}" aria-pressed="false">${escapeHtml(label)}</button>
  `).join('');
  renderArrayChips('#importantPriorityGrid', IMPORTANT_PRIORITIES, 'important.priorities');
  renderArrayChips('#importantCategoryGrid', IMPORTANT_CATEGORIES, 'important.categories');
  document.querySelector('#hourGrid').innerHTML = Array.from({ length: 24 }, (_, hour) => `
    <button class="hour-button" data-hour="${hour}" aria-pressed="false">${String(hour).padStart(2, '0')}</button>
  `).join('');
}

function bindEvents() {
  document.body.addEventListener('click', async (event) => {
    const viewLink = event.target.closest('[data-view-link]');
    const featureButton = event.target.closest('[data-feature]');
    const autonomyButton = event.target.closest('[data-autonomy-level]');
    const togglePathButton = event.target.closest('[data-toggle-path]');
    const arrayButton = event.target.closest('[data-array-path][data-array-value]');
    const hourButton = event.target.closest('[data-hour]');
    const hourPreset = event.target.closest('[data-hours-preset]');

    if (viewLink) {
      event.preventDefault();
      setView(viewLink.dataset.viewLink);
      return;
    }
    if (featureButton) {
      setFeatureState(featureButton.dataset.feature, !getFeatureState(featureButton.dataset.feature));
      await persistAndRender();
      return;
    }
    if (autonomyButton) {
      setAutonomy(Number(autonomyButton.dataset.autonomyLevel));
      await persistAndRender();
      return;
    }
    if (togglePathButton) {
      const path = togglePathButton.dataset.togglePath;
      setPath(settings, path, !Boolean(getPath(settings, path)));
      await persistAndRender();
      return;
    }
    if (arrayButton) {
      toggleArrayValue(arrayButton.dataset.arrayPath, arrayButton.dataset.arrayValue);
      await persistAndRender();
      return;
    }
    if (hourButton) {
      toggleHour(Number(hourButton.dataset.hour));
      await persistAndRender();
      return;
    }
    if (hourPreset) {
      applyHourPreset(hourPreset.dataset.hoursPreset);
      await persistAndRender();
    }
  });

  document.body.addEventListener('input', (event) => {
    const input = event.target.closest('input[data-path], select[data-path]');
    if (!input) return;
    updateSettingFromInput(input);
    scheduleSave();
    renderConfigurationSummary();
  });

  document.body.addEventListener('change', async (event) => {
    const input = event.target.closest('input[data-path], select[data-path]');
    if (!input) return;
    updateSettingFromInput(input);
    await persistAndRender();
  });

  document.querySelector('#copySettings').addEventListener('click', copySettings);
  document.querySelector('#copySettingsBottom').addEventListener('click', copySettings);
  document.querySelector('#runNow').addEventListener('click', runAgentNow);
  document.querySelector('#mobileMenu').addEventListener('click', openSidebar);
  document.querySelector('#sidebarBackdrop').addEventListener('click', closeSidebar);
  window.addEventListener('hashchange', () => setView(location.hash === '#configuracoes' ? 'settings' : 'overview', false));
}

async function loadInitialSettings() {
  try {
    const remote = await api('/api/settings', {}, 2200);
    settings = normalizeUiSettings(deepMerge(createDefaultSettings(), remote));
    backendConnected = true;
  } catch {
    const local = readStoredSettings();
    settings = normalizeUiSettings(deepMerge(createDefaultSettings(), local || {}));
    backendConnected = false;
  }
  updateEnvironment();
}

async function loadStatus() {
  if (!backendConnected) {
    statusData = null;
    updateEnvironment();
    return;
  }
  try {
    statusData = await api('/api/status');
  } catch {
    statusData = null;
  }
  updateEnvironment();
}

async function loadDashboard() {
  if (!backendConnected) {
    dashboardData = emptyDashboard();
    return;
  }
  try {
    dashboardData = await api('/api/dashboard');
  } catch {
    dashboardData = emptyDashboard();
  }
}

async function persistAndRender() {
  clearTimeout(saveTimer);
  normalizeUiSettings(settings);
  renderAll();
  await persistSettings();
}

function scheduleSave() {
  clearTimeout(saveTimer);
  setSaveIndicator(true);
  saveTimer = setTimeout(async () => {
    normalizeUiSettings(settings);
    await persistSettings();
  }, 450);
}

async function persistSettings() {
  setSaveIndicator(true);
  writeStoredSettings(settings);
  if (backendConnected) {
    try {
      settings = normalizeUiSettings(deepMerge(createDefaultSettings(), await api('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      })));
    } catch {
      backendConnected = false;
      updateEnvironment();
    }
  }
  setSaveIndicator(false);
}

async function runAgentNow() {
  if (!backendConnected) return;
  const button = document.querySelector('#runNow');
  button.disabled = true;
  button.innerHTML = `${iconSvg('clock')} Processando...`;
  try {
    await api('/api/run', { method: 'POST', body: '{}' }, 120000);
    await Promise.all([loadStatus(), loadDashboard()]);
    renderDashboard();
    showToast('Execução concluída. Dashboard atualizado.');
  } catch (error) {
    showToast(error.message || 'Não foi possível concluir a execução.');
  } finally {
    button.disabled = false;
    button.innerHTML = `${iconSvg('play')} Rodar agora`;
  }
}

function renderAll() {
  updateFormFields();
  updateFeatureCards();
  updateAutonomyCards();
  updateChoiceButtons();
  updateHourButtons();
  renderConfigurationSummary();
}

function renderDashboard() {
  const email = dashboardData.emailActions || {};
  const metrics = [
    metric('Arquivados', email.archived || 0, 'archive', '#6758ee', '#eeecff'),
    metric('Marcados lidos', email.markedRead || 0, 'check', '#2e90fa', '#eaf4ff'),
    metric('Importantes', email.markedImportant || 0, 'star', '#f79009', '#fff6e8'),
    metric('Etiquetas', email.labeled || 0, 'tag', '#12b76a', '#eafbf3'),
    metric('Lixeira', (email.deleted || 0) + (email.hardDeleted || 0), 'trash', '#f04438', '#fff0ef'),
    metric('Descadastros', email.unsubscribed || 0, 'unlink', '#9b51e0', '#f5edff')
  ];
  document.querySelector('#dashboardMetrics').innerHTML = metrics.map((item) => `
    <article class="metric-card" style="--metric-color:${item.color};--metric-soft:${item.soft}">
      <span class="metric-icon">${iconSvg(item.icon)}</span>
      <div><div class="metric-value">${formatNumber(item.value)}</div><div class="metric-label">${escapeHtml(item.label)}</div></div>
    </article>
  `).join('');

  const activity = [
    ['Arquivados', email.archived || 0, '#6758ee'],
    ['Organizados', email.labeled || 0, '#34b6d1'],
    ['Importantes', email.markedImportant || 0, '#f79009'],
    ['Rascunhos', email.drafts || 0, '#12b76a'],
    ['Descadastros', email.unsubscribed || 0, '#9b51e0']
  ];
  const max = Math.max(1, ...activity.map((item) => item[1]));
  document.querySelector('#activityBars').innerHTML = activity.map(([label, value, color]) => `
    <div class="bar-row"><label>${escapeHtml(label)}</label><span class="bar-track"><span class="bar-fill" style="--bar-width:${Math.max(value ? 4 : 0, (value / max) * 100)}%;--bar-color:${color}"></span></span><strong>${formatNumber(value)}</strong></div>
  `).join('');
  document.querySelector('#totalActionsBadge').textContent = `${formatNumber(dashboardData.totals?.actions || 0)} ações`;
  document.querySelector('#dashboardUpdated').textContent = backendConnected && dashboardData.updatedAt
    ? `Atualizado ${formatDate(dashboardData.updatedAt)}`
    : 'Painel de configuração online';
  renderConfigurationSummary();
}

function renderConfigurationSummary() {
  const autonomy = AUTONOMY_LEVELS.find((item) => item.level === Number(settings.agent.autonomyLevel)) || AUTONOMY_LEVELS[0];
  const activeCount = countEnabledFeatures();
  const stateOn = Number(settings.agent.autonomyLevel) > 0 && settings.agent.enabled;
  document.querySelector('#enabledActionsCount').textContent = activeCount;
  const state = document.querySelector('#agentState');
  state.classList.toggle('is-off', !stateOn);
  state.innerHTML = `<i></i>${stateOn ? 'Ativo' : 'Desligado'}`;
  const rows = [
    ['Autonomia', autonomy.title],
    ['Funções ativas', String(activeCount)],
    ['Execução', settings.automation.enabled ? `A cada ${settings.automation.intervalHours}h` : 'Somente manual'],
    ['Limite', `${settings.agent.maxEmailsPerRun} e-mails`],
    ['Inteligência', providerLabel(settings.ai.provider)],
    ['Gmail', statusData?.gmail?.connected ? statusData.gmail.emailAddress : (backendConnected ? 'Conectando' : 'Configuração online')]
  ];
  document.querySelector('#configurationSummary').innerHTML = rows.map(([label, value]) => `<div class="summary-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
}

function updateFormFields() {
  document.querySelectorAll('input[data-path], select[data-path]').forEach((input) => {
    if (document.activeElement === input) return;
    const value = getPath(settings, input.dataset.path);
    input.value = Array.isArray(value) ? value.join(', ') : value ?? '';
  });
}

function updateFeatureCards() {
  document.querySelectorAll('[data-feature]').forEach((button) => {
    const active = getFeatureState(button.dataset.feature);
    button.classList.toggle('is-on', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function updateAutonomyCards() {
  document.querySelectorAll('[data-autonomy-level]').forEach((button) => {
    const selected = Number(button.dataset.autonomyLevel) === Number(settings.agent.autonomyLevel);
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function updateChoiceButtons() {
  document.querySelectorAll('[data-toggle-path]').forEach((button) => {
    const selected = Boolean(getPath(settings, button.dataset.togglePath));
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  document.querySelectorAll('[data-array-path][data-array-value]').forEach((button) => {
    const values = getPath(settings, button.dataset.arrayPath) || [];
    const selected = Array.isArray(values) && values.includes(button.dataset.arrayValue);
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function updateHourButtons() {
  const allowed = new Set(settings.automation.allowedHours || []);
  document.querySelectorAll('[data-hour]').forEach((button) => {
    const selected = allowed.has(Number(button.dataset.hour));
    button.classList.toggle('is-on', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function setView(view, updateHash = true) {
  const target = view === 'settings' ? 'settings' : 'overview';
  document.querySelectorAll('[data-view-panel]').forEach((panel) => {
    const active = panel.dataset.viewPanel === target;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  });
  document.querySelectorAll('.nav-link[data-view-link]').forEach((link) => link.classList.toggle('is-active', link.dataset.viewLink === target));
  document.querySelector('#pageTitle').textContent = target === 'settings' ? 'Configurações' : 'Visão geral';
  document.querySelector('#pageKicker').textContent = target === 'settings' ? 'COMPORTAMENTO DO AGENTE' : 'PAINEL DE CONTROLE';
  if (updateHash) history.replaceState(null, '', target === 'settings' ? '#configuracoes' : '#visao-geral');
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setAutonomy(level) {
  settings.agent.autonomyLevel = level;
  settings.agent.enabled = level > 0;
  settings.agent.paused = level === 0;
  settings.agent.emergencyStop = false;
}

function getFeatureState(id) {
  const definition = findFeature(id);
  if (definition?.path) return Boolean(getPath(settings, definition.path));
  if (id === 'archive') return Boolean(settings.actions.archiveEmails || settings.actions.archiveImmediately || settings.execution.archiveImmediately);
  if (id === 'markRead') return Boolean(settings.actions.markRead || settings.actions.markReadImmediately || settings.execution.markReadImmediately);
  if (id === 'important') return Boolean(settings.important.enabled && settings.actions.markImportant);
  if (id === 'newsletter') return Boolean(settings.newsletter.enabled && settings.actions.identifyNewsletter);
  if (id === 'reminders') return Boolean(settings.actions.createReminders && settings.apple.reminders.enabled);
  if (id === 'calendar') return Boolean(settings.actions.createCalendarEvents && settings.apple.calendar.enabled);
  if (id === 'automation') return Boolean(settings.automation.enabled && !settings.automation.manualOnly);
  return false;
}

function setFeatureState(id, enabled) {
  const definition = findFeature(id);
  if (definition?.path) {
    setPath(settings, definition.path, enabled);
    return;
  }
  if (id === 'archive') {
    settings.actions.archiveEmails = enabled;
    settings.actions.archiveImmediately = enabled;
    settings.execution.archiveImmediately = enabled;
  }
  if (id === 'markRead') {
    settings.actions.markRead = enabled;
    settings.actions.markReadImmediately = enabled;
    settings.execution.markReadImmediately = enabled;
  }
  if (id === 'important') {
    settings.important.enabled = enabled;
    settings.important.markAsImportant = enabled;
    settings.important.applyImportantLabel = enabled;
    settings.important.protectFromGlobalArchive = enabled;
    settings.actions.markImportant = enabled;
    if (enabled) settings.actions.applyLabels = true;
  }
  if (id === 'newsletter') {
    settings.newsletter.enabled = enabled;
    settings.actions.identifyNewsletter = enabled;
  }
  if (id === 'reminders') {
    settings.actions.createReminders = enabled;
    settings.apple.reminders.enabled = enabled;
    if (enabled) settings.apple.enabled = true;
  }
  if (id === 'calendar') {
    settings.actions.createCalendarEvents = enabled;
    settings.apple.calendar.enabled = enabled;
    if (enabled) settings.apple.enabled = true;
  }
  if (id === 'automation') {
    settings.automation.enabled = enabled;
    settings.automation.manualOnly = !enabled;
  }
}

function normalizeUiSettings(target) {
  const archive = Boolean(target.actions.archiveEmails || target.actions.archiveImmediately || target.execution.archiveImmediately);
  target.actions.archiveEmails = archive;
  target.actions.archiveImmediately = archive;
  target.execution.archiveImmediately = archive;

  const markRead = Boolean(target.actions.markRead || target.actions.markReadImmediately || target.execution.markReadImmediately);
  target.actions.markRead = markRead;
  target.actions.markReadImmediately = markRead;
  target.execution.markReadImmediately = markRead;

  const important = Boolean(target.important.enabled || target.actions.markImportant);
  target.important.enabled = important;
  target.important.markAsImportant = important;
  target.important.applyImportantLabel = important;
  target.important.protectFromGlobalArchive = important;
  target.actions.markImportant = important;

  const newsletter = Boolean(target.newsletter.enabled || target.actions.identifyNewsletter);
  target.newsletter.enabled = newsletter;
  target.actions.identifyNewsletter = newsletter;

  const reminders = Boolean(target.actions.createReminders || target.apple.reminders.enabled);
  target.actions.createReminders = reminders;
  target.apple.reminders.enabled = reminders;
  const calendar = Boolean(target.actions.createCalendarEvents || target.apple.calendar.enabled);
  target.actions.createCalendarEvents = calendar;
  target.apple.calendar.enabled = calendar;
  target.apple.enabled = Boolean(target.apple.enabled || reminders || calendar);

  target.agent.autonomyLevel = clamp(Number(target.agent.autonomyLevel) || 0, 0, 4);
  target.agent.enabled = target.agent.autonomyLevel > 0;
  target.agent.paused = target.agent.autonomyLevel === 0;
  target.agent.maxEmailsPerRun = clamp(Number(target.agent.maxEmailsPerRun) || 100, 1, 1000);
  target.gmail.newerThanDays = clamp(Number(target.gmail.newerThanDays) || 30, 1, 3650);
  target.automation.intervalHours = clamp(Number(target.automation.intervalHours) || 1, 1, 24);
  target.execution.runSelectedActionsNow = true;

  const provider = ['openai', 'gemini', 'fallback'].includes(target.ai.provider) ? target.ai.provider : 'openai';
  target.ai.provider = provider;
  target.ai.openai.enabled = provider !== 'gemini';
  target.ai.gemini.enabled = provider !== 'openai';
  return target;
}

function updateSettingFromInput(input) {
  const current = getPath(settings, input.dataset.path);
  let value = input.value;
  if (input.dataset.kind === 'csv') value = splitCsv(value);
  else if (input.type === 'number' || typeof current === 'number') value = Number(value);
  setPath(settings, input.dataset.path, value);
}

function toggleArrayValue(path, value) {
  const values = new Set(Array.isArray(getPath(settings, path)) ? getPath(settings, path) : []);
  values.has(value) ? values.delete(value) : values.add(value);
  setPath(settings, path, [...values]);
}

function toggleHour(hour) {
  const hours = new Set(settings.automation.allowedHours || []);
  hours.has(hour) ? hours.delete(hour) : hours.add(hour);
  settings.automation.allowedHours = [...hours].sort((a, b) => a - b);
}

function applyHourPreset(id) {
  if (id === 'all') settings.automation.allowedHours = Array.from({ length: 24 }, (_, hour) => hour);
  if (id === 'business') settings.automation.allowedHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  if (id === 'quiet') settings.automation.allowedHours = [6, 7, 8, 18, 19, 20, 21];
}

async function copySettings() {
  normalizeUiSettings(settings);
  const json = `${JSON.stringify(settingsForGitHub(), null, 2)}\n`;
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(json);
    else copyWithFallback(json);
    showToast('Configuração copiada para o GitHub.');
  } catch {
    copyWithFallback(json);
    showToast('Configuração copiada para o GitHub.');
  }
}

function settingsForGitHub() {
  const output = JSON.parse(JSON.stringify(settings));
  delete output.modules;
  delete output.permissions;
  delete output.confirmations;
  removeNotes(output);
  return output;
}

function renderFeatureCard(item) {
  return `
    <button class="feature-card" data-feature="${escapeHtml(item.id)}" aria-pressed="false">
      <span class="feature-icon">${iconSvg(item.icon)}</span>
      <span class="feature-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description)}</small></span>
      <span class="toggle-shell" aria-hidden="true"></span>
    </button>
  `;
}

function renderArrayChips(selector, items, path) {
  document.querySelector(selector).innerHTML = items.map(([value, label]) => `
    <button class="choice-chip" data-array-path="${escapeHtml(path)}" data-array-value="${escapeHtml(value)}" aria-pressed="false">${escapeHtml(label)}</button>
  `).join('');
}

function populateIntervalOptions() {
  document.querySelector('#intervalHours').innerHTML = Array.from({ length: 24 }, (_, index) => {
    const hours = index + 1;
    return `<option value="${hours}">${hours === 1 ? '1 hora' : `${hours} horas`}</option>`;
  }).join('');
}

function updateEnvironment() {
  const label = document.querySelector('#environmentLabel');
  const detail = document.querySelector('#environmentDetail');
  const runButton = document.querySelector('#runNow');
  if (backendConnected) {
    label.textContent = statusData?.gmail?.connected ? 'Gmail conectado' : 'Painel local';
    detail.textContent = 'Dados em tempo real';
    runButton.classList.remove('is-hidden');
  } else {
    label.textContent = 'Editor online';
    detail.textContent = 'GitHub Pages';
    runButton.classList.add('is-hidden');
  }
  setSaveIndicator(false);
}

function setSaveIndicator(saving) {
  const indicator = document.querySelector('#saveIndicator');
  indicator.classList.toggle('is-saving', saving);
  indicator.lastChild.textContent = saving
    ? ' Salvando...'
    : backendConnected ? ' Salvo no agente' : ' Salvo neste navegador';
}

function openSidebar() {
  document.querySelector('#sidebar').classList.add('is-open');
  document.querySelector('#sidebarBackdrop').classList.add('is-visible');
}

function closeSidebar() {
  document.querySelector('#sidebar').classList.remove('is-open');
  document.querySelector('#sidebarBackdrop').classList.remove('is-visible');
}

function showToast(message) {
  clearTimeout(toastTimer);
  document.querySelector('#toastMessage').textContent = message;
  document.querySelector('#toast').classList.add('is-visible');
  toastTimer = setTimeout(() => document.querySelector('#toast').classList.remove('is-visible'), 3200);
}

function feature(id, title, description, icon, path = null, virtual = null) {
  return { id, title, description, icon, path, virtual };
}

function findFeature(id) {
  return Object.values(FEATURE_GROUPS).flat().find((item) => item.id === id)
    || ({
      dryRun: feature('dryRun', '', '', '', 'agent.dryRun'),
      keepUnread: feature('keepUnread', '', '', '', 'important.keepUnread'),
      automation: feature('automation', '', '', '', null, 'automation'),
      important: feature('important', '', '', '', null, 'important'),
      newsletter: feature('newsletter', '', '', '', null, 'newsletter')
    })[id];
}

function countEnabledFeatures() {
  const ids = ['readEmails', 'classifyEmails', 'summarizeEmails', 'applyLabels', 'markRead', 'archive', 'markUnread', 'important', 'newsletter', 'drafts', 'reminders', 'calendar', 'reports', 'attachments', 'move', 'unsubscribe', 'send', 'delete', 'forward', 'bulk', 'emptyTrash'];
  return ids.filter(getFeatureState).length;
}

function metric(label, value, icon, color, soft) { return { label, value, icon, color, soft }; }

function providerLabel(provider) {
  if (provider === 'gemini') return 'Gemini';
  if (provider === 'fallback') return 'OpenAI + Gemini';
  return 'OpenAI';
}

function createDefaultSettings() {
  return {
    version: 1,
    agent: { enabled: true, paused: false, emergencyStop: false, autonomyLevel: 1, locale: 'pt-BR', timezone: 'America/Sao_Paulo', maxEmailsPerRun: 100, gmailQuery: '', processedLabel: 'AI Agent/Processado', dryRun: false },
    gmail: { useSmartQuery: true, includeInboxOnly: false, unreadOnly: false, newerThanDays: 30, excludeSent: true, excludeDrafts: true, excludeSpamTrash: true, categories: { primary: true, promotions: true, social: true, updates: true, forums: true } },
    automation: { enabled: true, manualOnly: false, intervalHours: 1, allowedHours: Array.from({ length: 24 }, (_, hour) => hour), weekdaysOnly: false },
    organizing: { markReadCategories: ['newsletter', 'mailing', 'promocao', 'outro'] },
    important: { enabled: true, markAsImportant: true, applyImportantLabel: true, keepUnread: true, protectFromGlobalArchive: true, afterMarkAction: 'keep', priorities: ['alta', 'urgente'], categories: ['pessoal', 'prazo', 'resposta_pendente', 'trabalho', 'financeiro', 'documento', 'contrato', 'cobranca'], labelName: 'AI Agent/Importante' },
    execution: { archiveImmediately: false, markReadImmediately: false, runSelectedActionsNow: true },
    actions: { readEmails: true, classifyEmails: true, summarizeEmails: true, applyLabels: true, identifyNewsletter: true, markImportant: true, markRead: false, markReadImmediately: false, markUnread: false, createReminders: true, createReports: true, archiveEmails: false, archiveImmediately: false, moveEmails: false, createDrafts: true, createCalendarEvents: false, downloadAttachments: false, unsubscribeNewsletter: false, sendEmails: false, deleteEmails: false, emptyTrash: false, forwardEmails: false, bulkActions: false, alterExistingEvents: false, deleteEvents: false },
    ai: { provider: 'openai', fallbackProvider: 'gemini', compareProviders: false, openai: { enabled: true, model: 'gpt-5.4-mini', baseUrl: 'https://api.openai.com/v1', temperature: .2, includeBody: false, maxBodyChars: 6000 }, gemini: { enabled: false, model: 'gemini-3.5-flash', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', temperature: .2 } },
    newsletter: { enabled: true, archiveAfterDays: 5, deleteAfterDays: 0, keepFavoritesInInbox: true, autoArchiveTrustedSenders: false, suggestUnsubscribe: true, neverClickSuspiciousLinks: true, trustedSenders: [], blockedSenders: [], favoriteSenders: [] },
    protectedSenders: { enabled: true, emails: [], domains: [], keywords: ['banco', 'gov.br', 'receita', 'justiça', 'juridico', 'saude', 'médico', 'medico'] },
    apple: { enabled: true, integrationType: 'shortcuts', reminders: { enabled: true, listName: 'Pendências do Gmail', defaultPriority: 'medium' }, calendar: { enabled: false, defaultCalendarName: 'Calendário', defaultAlertMinutes: 30 }, cloudKit: { enabled: false } },
    siri: { enabled: true, requireToken: true },
    reports: { daily: true, weekly: true, newsletters: true, urgent: true, pending: true, awaitingReply: true, attachmentsSpace: true, frequentSenders: true },
    limits: { maxArchivePerRun: 1000, maxDraftsPerRun: 1000, maxRemindersPerRun: 1000, maxEventsPerRun: 1000, maxUnsubscribesPerRun: 1000, maxDeletesPerRun: 1000, bulkActionLimit: 1000 }
  };
}

function emptyDashboard() {
  return { updatedAt: null, totals: { actions: 0 }, emailActions: { archived: 0, deleted: 0, hardDeleted: 0, unsubscribed: 0, labeled: 0, markedImportant: 0, drafts: 0, markedRead: 0, reminders: 0, calendarEvents: 0 }, newsletters: { senders: 0, messages: 0 } };
}

async function api(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, signal: controller.signal, ...options });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error('API indisponível');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.spokenText || 'Falha na API');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function readStoredSettings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}

function writeStoredSettings(value) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* armazenamento opcional */ }
}

function copyWithFallback(text) {
  const field = document.createElement('textarea');
  field.value = text;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  document.execCommand('copy');
  field.remove();
}

function removeNotes(value) {
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (key === 'note') delete value[key];
    else removeNotes(value[key]);
  }
}

function deepMerge(base, override) {
  if (!override || typeof override !== 'object' || Array.isArray(override)) return override === undefined ? base : override;
  const output = { ...base };
  for (const [key, value] of Object.entries(override)) {
    output[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(base?.[key] && typeof base[key] === 'object' ? base[key] : {}, value)
      : value;
  }
  return output;
}

function getPath(target, path) { return path.split('.').reduce((current, key) => current?.[key], target); }

function setPath(target, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const parent = parts.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') current[key] = {};
    return current[key];
  }, target);
  parent[last] = value;
}

function splitCsv(value) { return String(value || '').split(',').map((item) => item.trim()).filter(Boolean); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function formatNumber(value) { return new Intl.NumberFormat('pt-BR').format(Number(value) || 0); }
function formatDate(value) { try { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); } catch { return ''; } }
function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function iconSvg(name) {
  const icons = {
    mail: '<path d="M4.5 6.5 12 12l7.5-5.5M5 18h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2Z"/>',
    sparkles: '<path d="m12 3 1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2L12 3Zm6 9 .8 2.2L21 15l-2.2.8L18 18l-.8-2.2L15 15l2.2-.8L18 12ZM6 13l1 2.7 2.7 1L7 17.7 6 20.5l-1-2.8-2.7-1 2.7-1L6 13Z"/>',
    text: '<path d="M5 6h14M5 10h14M5 14h9M5 18h7"/>',
    tag: '<path d="m20 13-7 7L4 11V4h7l9 9Z"/><path d="M8.5 8.5h.01"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    archive: '<path d="M4 8h16v11H4V8Zm-1-4h18v4H3V4Zm6 8h6"/>',
    eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
    edit: '<path d="M13.5 6.5 17.5 10.5M4 20l4.2-1 10-10a2.8 2.8 0 0 0-4-4l-10 10L4 20Z"/>',
    bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7ZM10 20h4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
    chart: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
    paperclip: '<path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L14 3a3.5 3.5 0 0 1 5 5l-9.5 9.5a2 2 0 1 1-3-3L15 6"/>',
    move: '<path d="M5 9h10M12 6l3 3-3 3M19 15H9M12 12l-3 3 3 3"/>',
    unlink: '<path d="m9 15-2 2a3 3 0 0 1-4-4l3-3a3 3 0 0 1 4-.2M15 9l2-2a3 3 0 0 1 4 4l-3 3a3 3 0 0 1-4 .2M8 3l8 18"/>',
    send: '<path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
    forward: '<path d="m14 7 5 5-5 5M19 12H8a5 5 0 0 0-5 5"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
    inbox: '<path d="M4 4h16l2 10v6H2v-6L4 4Z"/><path d="M2 14h6l2 3h4l2-3h6"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    newsletter: '<path d="M4 5h16v14H4V5Z"/><path d="M7 9h6M7 12h10M7 15h8"/>',
    split: '<path d="M8 4H5v5M16 20h3v-5M5 9c0 6 14 6 14 11M19 15c0-6-14-6-14-11"/>',
    mic: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>',
    cloud: '<path d="M7 18h11a4 4 0 0 0 .7-7.9A7 7 0 0 0 5.2 9.2 4.5 4.5 0 0 0 7 18Z"/>',
    play: '<path d="m8 5 11 7-11 7V5Z"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.sparkles}</svg>`;
}
