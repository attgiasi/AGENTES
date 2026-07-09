const AUTONOMY_LEVELS = [
  { level: 0, title: '0. Desligado', segment: 'Pausa total', description: 'Não executa o agente.' },
  { level: 1, title: '1. Análise', segment: 'Só olhar', description: 'Lê, classifica e resume, mas não altera o Gmail.' },
  { level: 2, title: '2. Simulação', segment: 'Teste seguro', description: 'Mostra o que faria sem mexer nos e-mails.' },
  { level: 3, title: '3. Organização', segment: 'Baixo risco', description: 'Aplica etiquetas e relatórios se permitido.' },
  { level: 4, title: '4. Produtividade', segment: 'Confirma risco médio', description: 'Prepara arquivamento, rascunhos e eventos para aprovação.' },
  { level: 5, title: '5. Automático controlado', segment: 'Execução prática', description: 'Executa risco médio se a confirmação média estiver desligada.' },
  { level: 6, title: '6. Alto risco protegido', segment: 'Aprovação explícita', description: 'Prepara ações perigosas com confirmação forte.' },
  { level: 7, title: '7. Máximo configurado', segment: 'Faz tudo que liberar', description: 'Executa tudo que estiver ativado nas permissões.' }
];

const EXECUTION_PRESETS = [
  {
    id: 'safe',
    title: 'Seguro para testar',
    description: 'Simulação ligada. Nada é alterado.',
    apply: (next) => {
      next.agent.enabled = true;
      next.agent.dryRun = true;
      next.agent.autonomyLevel = 2;
      next.modules.autoArchive = false;
      next.permissions.archiveEmails = false;
      next.permissions.deleteEmails = false;
      next.permissions.sendEmails = false;
      next.permissions.unsubscribeNewsletter = false;
    }
  },
  {
    id: 'organize',
    title: 'Organizar caixa',
    description: 'Classifica, etiqueta e destaca urgentes.',
    apply: (next) => {
      next.agent.enabled = true;
      next.agent.dryRun = false;
      next.agent.autonomyLevel = 3;
      Object.assign(next.modules, { gmailRead: true, classification: true, importantDetection: true, summaries: true, reports: true, autoArchive: false });
      Object.assign(next.permissions, { readEmails: true, classifyEmails: true, summarizeEmails: true, applyLabels: true, createReports: true, archiveEmails: false });
    }
  },
  {
    id: 'productivity',
    title: 'Produtividade',
    description: 'Rascunhos, lembretes e eventos com aprovação.',
    apply: (next) => {
      next.agent.enabled = true;
      next.agent.dryRun = false;
      next.agent.autonomyLevel = 4;
      Object.assign(next.modules, { deadlines: true, pendingReplies: true, drafts: true, appleReminders: true, appleCalendar: true, reports: true });
      Object.assign(next.permissions, { createReminders: true, createDrafts: true, createCalendarEvents: true, mediumRiskRequiresConfirmation: true });
    }
  },
  {
    id: 'cleanup',
    title: 'Limpeza de newsletters',
    description: 'Arquiva newsletters antigas sem apagar.',
    apply: (next) => {
      next.agent.enabled = true;
      next.agent.dryRun = false;
      next.agent.autonomyLevel = 5;
      next.agent.maxEmailsPerRun = 1000;
      Object.assign(next.modules, { newsletter: true, autoArchive: true, reports: true, logs: true });
      Object.assign(next.permissions, {
        archiveEmails: true,
        applyLabels: true,
        mediumRiskRequiresConfirmation: false,
        deleteEmails: false,
        emptyTrash: false,
        unsubscribeNewsletter: false
      });
      next.newsletter.enabled = true;
      next.newsletter.deleteAfterDays = 0;
    }
  },
  {
    id: 'responses',
    title: 'Responder melhor',
    description: 'Cria rascunhos, nunca envia sozinho.',
    apply: (next) => {
      next.agent.enabled = true;
      next.agent.dryRun = false;
      next.agent.autonomyLevel = 4;
      Object.assign(next.modules, { pendingReplies: true, drafts: true, summaries: true });
      Object.assign(next.permissions, { createDrafts: true, sendEmails: false, mediumRiskRequiresConfirmation: true });
    }
  },
  {
    id: 'maximum',
    title: 'Máximo com travas',
    description: 'Liga módulos e permissões; alto risco pode ficar pendente se a chave de aprovação estiver ligada.',
    apply: (next) => {
      next.agent.enabled = true;
      next.agent.dryRun = false;
      next.agent.autonomyLevel = 7;
      next.agent.maxEmailsPerRun = 1000;
      for (const key of Object.keys(next.modules)) next.modules[key] = true;
      for (const key of Object.keys(next.permissions)) next.permissions[key] = true;
      next.permissions.highRiskRequiresExplicitConfirmation = true;
      next.permissions.mediumRiskRequiresConfirmation = false;
    }
  }
];

const switchGroups = {
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
  moduleButtons: [
    ['modules.gmailRead', 'Leitura', 'Permite buscar e ler e-mails.'],
    ['modules.classification', 'Classificação', 'Classifica e-mails por categoria.'],
    ['modules.importantDetection', 'Importantes', 'Detecta urgentes e pessoais.'],
    ['modules.newsletter', 'Newsletter', 'Detecta mailing e promoções.'],
    ['modules.autoArchive', 'Arquivamento', 'Permite arquivar conforme regras.'],
    ['modules.drafts', 'Rascunhos', 'Prepara respostas sem enviar.'],
    ['modules.summaries', 'Resumos', 'Gera resumos de e-mails.'],
    ['modules.threads', 'Conversas', 'Analisa threads completas.'],
    ['modules.pendingReplies', 'Pendências', 'Detecta mensagens que pedem resposta.'],
    ['modules.deadlines', 'Prazos', 'Detecta vencimentos e datas.'],
    ['modules.appleReminders', 'Lembretes Apple', 'Prepara tarefas para Atalhos.'],
    ['modules.appleCalendar', 'Calendário Apple', 'Prepara eventos para Atalhos.'],
    ['modules.attachments', 'Anexos', 'Identifica anexos importantes.'],
    ['modules.reports', 'Relatórios', 'Gera relatórios.'],
    ['modules.siriShortcuts', 'Siri/Atalhos', 'Permite comandos externos.'],
    ['modules.logs', 'Logs', 'Registra ações e erros.']
  ],
  permissionButtons: [
    ['permissions.lowRiskAutomatic', 'Baixo risco automático', 'Permite ações seguras, como etiqueta.'],
    ['permissions.mediumRiskRequiresConfirmation', 'Confirmar risco médio', 'Desligue para arquivar automaticamente.'],
    ['permissions.highRiskRequiresExplicitConfirmation', 'Aprovar alto risco', 'Envio, exclusão e descadastro ficam pendentes no painel quando ligado.'],
    ['permissions.readEmails', 'Ler e-mails', 'Permite consultar Gmail.'],
    ['permissions.classifyEmails', 'Classificar', 'Permite classificar mensagens.'],
    ['permissions.summarizeEmails', 'Resumir', 'Permite gerar resumos.'],
    ['permissions.applyLabels', 'Aplicar etiquetas', 'Organiza e-mails com labels.'],
    ['permissions.archiveEmails', 'Arquivar e-mails', 'Remove da entrada sem apagar.'],
    ['permissions.createDrafts', 'Criar rascunhos', 'Cria respostas sem enviar.'],
    ['permissions.createReminders', 'Criar lembretes', 'Prepara tarefas.'],
    ['permissions.createCalendarEvents', 'Criar eventos', 'Prepara eventos.'],
    ['permissions.unsubscribeNewsletter', 'Descadastrar', 'Alto risco: cancelar inscrições.'],
    ['permissions.sendEmails', 'Enviar e-mails', 'Alto risco: envia mensagens.'],
    ['permissions.deleteEmails', 'Apagar e-mails', 'Alto risco: move para lixeira.'],
    ['permissions.emptyTrash', 'Esvaziar lixeira', 'Altíssimo risco.'],
    ['permissions.bulkActions', 'Ações em lote', 'Executa muitas ações de uma vez.']
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
  ]
};

let settings = safePreset();

document.addEventListener('DOMContentLoaded', () => {
  renderSwitches();
  renderAutonomyGrid();
  renderExecutionPresetGrid();
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
      autonomyLevel: 2,
      dryRun: true,
      timezone: 'America/Sao_Paulo',
      maxEmailsPerRun: 100,
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
      bulkActions: false,
      alterExistingEvents: false,
      deleteEvents: false
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

function renderExecutionPresetGrid() {
  document.querySelector('#executionPresetGrid').innerHTML = EXECUTION_PRESETS.map((item) => `
    <button class="choice-card" data-execution-preset="${escapeHtml(item.id)}">
      <span class="badge">Execução</span>
      <strong>${escapeHtml(item.title)}</strong>
      <small>${escapeHtml(item.description)}</small>
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
    const presetCard = event.target.closest('[data-execution-preset]');
    const hourButton = event.target.closest('[data-hour-toggle]');
    const hourPreset = event.target.closest('[data-hours-preset]');

    if (autonomyCard) {
      setAutonomyLevel(Number(autonomyCard.dataset.autonomyLevel));
      updateForm();
      return;
    }
    if (presetCard) {
      const preset = EXECUTION_PRESETS.find((item) => item.id === presetCard.dataset.executionPreset);
      if (preset) preset.apply(settings);
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
    const input = event.target.closest('input[data-path]');
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

  document.querySelector('#safePreset').addEventListener('click', () => {
    settings = safePreset();
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
  settings.agent.dryRun = level <= 2 ? true : false;
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
  document.querySelectorAll('input[data-path]').forEach((input) => {
    const value = getPath(settings, input.dataset.path);
    input.value = Array.isArray(value) ? value.join(', ') : value ?? '';
  });
  document.querySelectorAll('[data-autonomy-level]').forEach((button) => {
    const selected = Number(button.dataset.autonomyLevel) === Number(settings.agent.autonomyLevel);
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
  return `${JSON.stringify(settings, null, 2)}\n`;
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
