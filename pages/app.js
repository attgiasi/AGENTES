const AUTONOMY_LEVELS = [
  { level: 0, title: 'Desabilitado', segment: 'Pausa total', description: 'Não executa o agente.' },
  { level: 1, title: 'Baixo controle', segment: 'Pede tudo', description: 'Analisa e deixa toda ação pendente para você aprovar.' },
  { level: 2, title: 'Médio controle', segment: 'Pede médio e alto', description: 'Executa baixo risco. Médio e alto risco ficam pendentes.' },
  { level: 3, title: 'Alto controle', segment: 'Pede só alto', description: 'Executa baixo e médio risco. Alto risco fica pendente.' },
  { level: 4, title: 'Autonomia total', segment: 'Executa tudo ligado', description: 'Não pede autorização. Se a ação estiver ligada, o agente executa.' }
];

const MARK_READ_CATEGORIES = [
  ['newsletter', 'Newsletter', 'Boletins e mensagens recorrentes com link de descadastro.'],
  ['mailing', 'Mailing', 'Listas de divulgação, campanhas e comunicados em massa.'],
  ['promocao', 'Promoções', 'Ofertas, cupons, lojas e campanhas promocionais.'],
  ['outro', 'Geral baixo risco', 'E-mails gerais que a IA classificou como sem ação importante.'],
  ['financeiro', 'Financeiro', 'Use com cuidado: boletos, cobranças e pagamentos.'],
  ['trabalho', 'Trabalho', 'Use com cuidado: mensagens profissionais sem urgência.'],
  ['documento', 'Documentos', 'Use com cuidado: contratos, comprovantes e arquivos.']
];

const switchGroups = {
  coreSwitches: [
    ['agent.enabled', 'Agente ativo', 'Liga ou desliga o agente inteiro.'],
    ['agent.dryRun', 'Simulação', 'Mostra o que faria sem alterar o Gmail.'],
    ['execution.runSelectedActionsNow', 'Executar tudo na hora', 'Executa as ações ativadas na própria execução quando a autonomia permitir.']
  ],
  aiSwitches: [
    ['ai.openai.enabled', 'OpenAI', 'Usa OpenAI para classificar, resumir e decidir.'],
    ['ai.gemini.enabled', 'Gemini', 'Ativa Gemini como opção ou fallback.'],
    ['ai.compareProviders', 'Comparar IAs', 'Compara OpenAI e Gemini em testes.'],
    ['ai.openai.includeBody', 'Enviar corpo', 'Envia o texto do e-mail para a IA analisar.']
  ],
  automationSwitches: [
    ['automation.enabled', 'Automação agendada', 'Permite rodar sozinho pelo GitHub Actions.'],
    ['automation.manualOnly', 'Somente manual', 'Bloqueia execuções automáticas.'],
    ['automation.weekdaysOnly', 'Só dias úteis', 'Pula sábado e domingo.']
  ],
  gmailCategorySwitches: [
    ['gmail.categories.primary', 'Principal', 'E-mails normais e importantes.'],
    ['gmail.categories.promotions', 'Promoções', 'Ofertas, lojas e campanhas.'],
    ['gmail.categories.social', 'Social', 'Redes sociais.'],
    ['gmail.categories.updates', 'Atualizações', 'Avisos, bancos, contas e sistemas.'],
    ['gmail.categories.forums', 'Fórum', 'Listas, grupos e comunidades.']
  ],
  gmailSwitches: [
    ['gmail.useSmartQuery', 'Busca inteligente', 'Usa os filtros desta tela.'],
    ['gmail.includeInboxOnly', 'Só caixa de entrada', 'Ignora e-mails arquivados.'],
    ['gmail.unreadOnly', 'Só não lidos', 'Processa apenas mensagens não lidas.'],
    ['gmail.excludeSent', 'Ignorar enviados', 'Não analisa enviados.'],
    ['gmail.excludeDrafts', 'Ignorar rascunhos', 'Não mexe em rascunhos.'],
    ['gmail.excludeSpamTrash', 'Ignorar spam/lixeira', 'Mantém spam e lixeira fora.']
  ],
  actionLowSwitches: [
    ['actions.readEmails', 'Ler e-mails', 'Permite consultar Gmail.'],
    ['actions.classifyEmails', 'Classificar', 'Classifica por categoria.'],
    ['actions.summarizeEmails', 'Resumir', 'Gera resumos curtos.'],
    ['actions.applyLabels', 'Aplicar etiquetas', 'Organiza com labels.'],
    ['actions.identifyNewsletter', 'Identificar newsletter', 'Detecta mailing e promoções.'],
    ['actions.markRead', 'Marcar lido quando fizer sentido', 'Remove não lido conforme decisão da IA ou newsletter.'],
    ['actions.markReadImmediately', 'Marcar lido imediatamente', 'Marca todo e-mail processado como lido.'],
    ['actions.markUnread', 'Marcar não lido', 'Pode marcar mensagens como não lidas.'],
    ['actions.createReminders', 'Criar lembretes', 'Prepara tarefas para Apple.'],
    ['actions.createReports', 'Criar relatórios', 'Salva relatórios da execução.']
  ],
  actionMediumSwitches: [
    ['actions.archiveEmails', 'Arquivar e-mails', 'Remove da caixa de entrada sem apagar.'],
    ['actions.archiveImmediately', 'Arquivar tudo imediatamente', 'Arquiva todo e-mail processado, sem depender da IA recomendar arquivar.'],
    ['actions.moveEmails', 'Mover e-mails', 'Permite mover entre etiquetas/pastas.'],
    ['actions.createDrafts', 'Criar rascunhos', 'Cria respostas como rascunho.'],
    ['actions.createCalendarEvents', 'Criar eventos', 'Prepara eventos de calendário.'],
    ['actions.downloadAttachments', 'Baixar anexos', 'Permite baixar anexos autorizados.']
  ],
  actionHighSwitches: [
    ['actions.unsubscribeNewsletter', 'Descadastrar newsletter', 'Cancela inscrições quando houver link válido.'],
    ['actions.sendEmails', 'Enviar e-mails', 'Envia mensagens se uma ação de envio existir.'],
    ['actions.deleteEmails', 'Apagar e-mails', 'Move para lixeira.'],
    ['actions.emptyTrash', 'Esvaziar lixeira', 'Remove itens da lixeira quando implementado.'],
    ['actions.forwardEmails', 'Encaminhar', 'Envia conteúdo a terceiros.'],
    ['actions.bulkActions', 'Ações em lote', 'Permite ações massivas.']
  ],
  newsletterSwitches: [
    ['newsletter.enabled', 'Newsletter ligado', 'Ativa regras de mailing.'],
    ['newsletter.keepFavoritesInInbox', 'Manter favoritos', 'Não arquiva favoritos.'],
    ['newsletter.autoArchiveTrustedSenders', 'Arquivar confiáveis', 'Arquiva remetentes confiáveis.'],
    ['newsletter.suggestUnsubscribe', 'Sugerir descadastro', 'Mostra descadastro como sugestão.'],
    ['newsletter.requireConfirmationForUnsubscribe', 'Confirmar descadastro', 'Nunca cancela inscrição sem aprovação.'],
    ['newsletter.neverClickSuspiciousLinks', 'Bloquear links suspeitos', 'Não clica em links encurtados.']
  ],
  protectedSwitches: [
    ['protectedSenders.enabled', 'Proteção ligada', 'Protege remetentes importantes.'],
    ['protectedSenders.requireConfirmationForArchive', 'Confirmar arquivar', 'Exige aprovação para arquivar protegidos.'],
    ['protectedSenders.requireConfirmationForDelete', 'Confirmar apagar', 'Exige aprovação para apagar protegidos.']
  ],
  appleSwitches: [
    ['apple.enabled', 'Apple', 'Habilita integração via Atalhos.'],
    ['apple.reminders.enabled', 'Lembretes', 'Prepara tarefas para Reminders.'],
    ['apple.calendar.enabled', 'Calendário', 'Prepara eventos para Calendar.'],
    ['apple.calendar.requireConfirmation', 'Confirmar eventos', 'Pede aprovação antes de criar eventos.']
  ],
  siriSwitches: [
    ['siri.enabled', 'Siri/Atalhos', 'Ativa comandos externos pelo iPhone.'],
    ['siri.requireToken', 'Exigir token', 'Protege endpoints dos Atalhos.']
  ]
};

let settings = safePreset();

document.addEventListener('DOMContentLoaded', () => {
  renderSwitches();
  renderAutonomyGrid();
  renderMarkReadCategoryGrid();
  renderHourGrid();
  bindEvents();
  updateForm();
});

function safePreset() {
  return {
    agent: {
      enabled: true,
      paused: false,
      emergencyStop: false,
      autonomyLevel: 1,
      dryRun: false,
      timezone: 'America/Sao_Paulo',
      maxEmailsPerRun: 100,
      processedLabel: 'AI Agent/Processado',
      gmailQuery: ''
    },
    gmail: {
      useSmartQuery: true,
      includeInboxOnly: false,
      unreadOnly: false,
      newerThanDays: 30,
      excludeSent: true,
      excludeDrafts: true,
      excludeSpamTrash: true,
      categories: {
        primary: true,
        promotions: true,
        social: true,
        updates: true,
        forums: true
      }
    },
    automation: {
      enabled: true,
      manualOnly: false,
      intervalHours: 1,
      allowedHours: Array.from({ length: 24 }, (_, hour) => hour),
      weekdaysOnly: false
    },
    organizing: {
      markReadCategories: ['newsletter', 'mailing', 'promocao']
    },
    execution: {
      archiveImmediately: false,
      markReadImmediately: false,
      runSelectedActionsNow: true
    },
    actions: {
      readEmails: true,
      classifyEmails: true,
      summarizeEmails: true,
      applyLabels: true,
      identifyNewsletter: true,
      markRead: false,
      markReadImmediately: false,
      markUnread: false,
      createReminders: true,
      createReports: true,
      archiveEmails: false,
      archiveImmediately: false,
      moveEmails: false,
      createDrafts: true,
      createCalendarEvents: false,
      downloadAttachments: false,
      unsubscribeNewsletter: false,
      sendEmails: false,
      deleteEmails: false,
      emptyTrash: false,
      forwardEmails: false,
      bulkActions: false,
      alterExistingEvents: false,
      deleteEvents: false
    },
    ai: {
      provider: 'openai',
      compareProviders: false,
      openai: {
        enabled: true,
        model: 'gpt-5.4-mini',
        includeBody: false
      },
      gemini: {
        enabled: false,
        model: 'gemini-3.5-flash'
      }
    },
    newsletter: {
      enabled: true,
      archiveAfterDays: 5,
      deleteAfterDays: 0,
      keepFavoritesInInbox: true,
      autoArchiveTrustedSenders: false,
      suggestUnsubscribe: true,
      requireConfirmationForUnsubscribe: true,
      neverClickSuspiciousLinks: true,
      favoriteSenders: [],
      trustedSenders: [],
      blockedSenders: []
    },
    apple: {
      enabled: true,
      integrationType: 'shortcuts',
      reminders: {
        enabled: true,
        listName: 'Pendências do Gmail',
        requireConfirmation: false
      },
      calendar: {
        enabled: true,
        defaultCalendarName: 'Calendário',
        defaultAlertMinutes: 30,
        requireConfirmation: true
      }
    },
    siri: {
      enabled: true,
      requireToken: true
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

function renderSwitches() {
  for (const [containerId, items] of Object.entries(switchGroups)) {
    const container = document.querySelector(`#${containerId}`);
    if (!container) continue;
    container.innerHTML = items.map(([path, title, description]) => switchCard(path, title, description)).join('');
  }
}

function renderAutonomyGrid() {
  document.querySelector('#autonomyGrid').innerHTML = AUTONOMY_LEVELS.map((item) => `
    <button class="choice-card" data-autonomy-level="${item.level}">
      <span class="badge">${escapeHtml(item.segment)}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <small>${escapeHtml(item.description)}</small>
    </button>
  `).join('');
}

function renderMarkReadCategoryGrid() {
  const container = document.querySelector('#markReadCategoryGrid');
  if (!container) return;
  container.innerHTML = MARK_READ_CATEGORIES.map(([value, title, description]) => `
    <button class="choice-card" data-array-path="organizing.markReadCategories" data-array-value="${escapeHtml(value)}">
      <span class="badge">Marcar lido</span>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(description)}</small>
    </button>
  `).join('');
}

function renderHourGrid() {
  document.querySelector('#hourGrid').innerHTML = Array.from({ length: 24 }, (_, hour) => `
    <button class="hour-button" data-hour-toggle="${hour}">${String(hour).padStart(2, '0')}h</button>
  `).join('');
}

function switchCard(path, title, description) {
  return `
    <button class="toggle toggle-card" data-path="${escapeHtml(path)}">
      <span class="toggle-text">
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(description)}</small>
      </span>
      <span class="switch-shell" aria-hidden="true"><span class="switch-knob"></span></span>
      <span class="switch-state"></span>
    </button>
  `;
}

function bindEvents() {
  document.body.addEventListener('click', (event) => {
    const toggle = event.target.closest('.toggle[data-path]');
    const autonomyCard = event.target.closest('[data-autonomy-level]');
    const arrayToggle = event.target.closest('[data-array-path][data-array-value]');
    const hourButton = event.target.closest('[data-hour-toggle]');
    const hourPreset = event.target.closest('[data-hours-preset]');

    if (autonomyCard) {
      setAutonomyLevel(Number(autonomyCard.dataset.autonomyLevel));
      updateForm();
      return;
    }
    if (arrayToggle) {
      toggleArrayValue(arrayToggle.dataset.arrayPath, arrayToggle.dataset.arrayValue);
      updateForm();
      return;
    }
    if (hourButton) {
      toggleAllowedHour(Number(hourButton.dataset.hourToggle));
      updateForm();
      return;
    }
    if (hourPreset) {
      applyHourPreset(hourPreset.dataset.hoursPreset);
      updateForm();
      return;
    }
    if (toggle) {
      setPath(settings, toggle.dataset.path, !Boolean(getPath(settings, toggle.dataset.path)));
      updateForm();
    }
  });

  document.body.addEventListener('input', (event) => {
    const input = event.target.closest('input[data-path], select[data-path]');
    if (!input) return;
    const current = getPath(settings, input.dataset.path);
    const value = input.dataset.kind === 'csv'
      ? splitCsv(input.value)
      : input.type === 'number' || typeof current === 'number'
        ? Number(input.value)
        : input.value;
    setPath(settings, input.dataset.path, value);
    updateJson();
  });

  document.body.addEventListener('change', (event) => {
    const input = event.target.closest('select[data-path]');
    if (!input) return;
    setPath(settings, input.dataset.path, input.value);
    updateForm();
  });

  document.querySelector('#safePreset').addEventListener('click', () => {
    settings = safePreset();
    updateForm();
  });

  document.querySelector('#autoArchivePreset').addEventListener('click', () => {
    applyAutoArchivePreset();
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

function setAutonomyLevel(level) {
  settings.agent.autonomyLevel = level;
  settings.agent.emergencyStop = false;
  settings.agent.paused = false;
  settings.agent.enabled = level > 0;
  settings.agent.dryRun = false;
}

function applyAutoArchivePreset() {
  settings.agent.enabled = true;
  settings.agent.paused = false;
  settings.agent.emergencyStop = false;
  settings.agent.dryRun = false;
  settings.agent.autonomyLevel = 4;
  settings.agent.maxEmailsPerRun = 1000;
  settings.execution.runSelectedActionsNow = true;
  settings.execution.archiveImmediately = true;
  settings.actions.readEmails = true;
  settings.actions.classifyEmails = true;
  settings.actions.summarizeEmails = true;
  settings.actions.applyLabels = true;
  settings.actions.identifyNewsletter = true;
  settings.actions.archiveEmails = true;
  settings.actions.archiveImmediately = true;
  settings.gmail.useSmartQuery = true;
  settings.gmail.includeInboxOnly = false;
  settings.gmail.unreadOnly = false;
  settings.gmail.excludeSent = true;
  settings.gmail.excludeDrafts = true;
  settings.gmail.excludeSpamTrash = true;
  settings.automation.enabled = true;
  settings.automation.manualOnly = false;
  settings.automation.intervalHours = 1;
  settings.automation.allowedHours = Array.from({ length: 24 }, (_, hour) => hour);
}

function toggleAllowedHour(hour) {
  const current = new Set(settings.automation.allowedHours || []);
  if (current.has(hour)) {
    if (current.size === 1) {
      alert('Deixe pelo menos uma hora ligada.');
      return;
    }
    current.delete(hour);
  } else {
    current.add(hour);
  }
  settings.automation.allowedHours = [...current].sort((a, b) => a - b);
}

function toggleArrayValue(path, value) {
  const currentValues = Array.isArray(getPath(settings, path)) ? getPath(settings, path) : [];
  const current = new Set(currentValues);
  if (current.has(value)) {
    if (current.size === 1) {
      alert('Deixe pelo menos uma categoria ligada para evitar configuração vazia.');
      return;
    }
    current.delete(value);
  } else {
    current.add(value);
  }
  setPath(settings, path, [...current]);
}

function applyHourPreset(id) {
  if (id === 'all') settings.automation.allowedHours = Array.from({ length: 24 }, (_, hour) => hour);
  if (id === 'business') settings.automation.allowedHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  if (id === 'quiet') settings.automation.allowedHours = [6, 7, 8, 18, 19, 20, 21];
}

function updateForm() {
  document.querySelectorAll('.toggle[data-path]').forEach((button) => {
    const value = Boolean(getPath(settings, button.dataset.path));
    button.classList.toggle('is-on', value);
    button.setAttribute('aria-pressed', String(value));
    button.querySelector('.switch-state').textContent = value ? 'Ligado' : 'Desligado';
  });
  document.querySelectorAll('input[data-path], select[data-path]').forEach((input) => {
    const value = getPath(settings, input.dataset.path);
    if (document.activeElement !== input) input.value = Array.isArray(value) ? value.join(', ') : value ?? '';
  });
  document.querySelectorAll('[data-autonomy-level]').forEach((button) => {
    const selected = Number(button.dataset.autonomyLevel) === Number(settings.agent.autonomyLevel);
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  document.querySelectorAll('[data-array-path][data-array-value]').forEach((button) => {
    const values = Array.isArray(getPath(settings, button.dataset.arrayPath))
      ? getPath(settings, button.dataset.arrayPath)
      : [];
    const selected = values.includes(button.dataset.arrayValue);
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  const allowed = new Set(settings.automation.allowedHours || []);
  document.querySelectorAll('[data-hour-toggle]').forEach((button) => {
    const selected = allowed.has(Number(button.dataset.hourToggle));
    button.classList.toggle('is-on', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  updateJson();
}

function updateJson() {
  document.querySelector('#jsonOutput').value = exportJson();
}

function exportJson() {
  return `${JSON.stringify(settingsForGitHub(), null, 2)}\n`;
}

function settingsForGitHub() {
  const clone = JSON.parse(JSON.stringify(settings));
  delete clone.modules;
  delete clone.permissions;
  delete clone.confirmations;
  return clone;
}

function getPath(target, path) {
  return path.split('.').reduce((current, key) => current?.[key], target);
}

function setPath(target, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const parent = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') current[key] = {};
    return current[key];
  }, target);
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
