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
    ['agent.dryRun', 'Simulação', 'Mostra o que faria sem alterar o Gmail.']
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
    ['permissions.markRead', 'Marcar lido', 'Pode remover não lido, apenas no escopo escolhido.'],
    ['permissions.markUnread', 'Marcar não lido', 'Pode marcar mensagens como não lidas.'],
    ['permissions.archiveEmails', 'Arquivar e-mails', 'Remove da entrada sem apagar.'],
    ['permissions.moveEmails', 'Mover e-mails', 'Permite mover entre etiquetas/pastas.'],
    ['permissions.createDrafts', 'Criar rascunhos', 'Cria respostas sem enviar.'],
    ['permissions.createReminders', 'Criar lembretes', 'Prepara tarefas.'],
    ['permissions.createCalendarEvents', 'Criar eventos', 'Prepara eventos.'],
    ['permissions.downloadAttachments', 'Baixar anexos', 'Permite baixar anexos autorizados.'],
    ['permissions.unsubscribeNewsletter', 'Descadastrar', 'Alto risco: cancelar inscrições.'],
    ['permissions.sendEmails', 'Enviar e-mails', 'Alto risco: envia mensagens.'],
    ['permissions.deleteEmails', 'Apagar e-mails', 'Alto risco: move para lixeira.'],
    ['permissions.emptyTrash', 'Esvaziar lixeira', 'Altíssimo risco.'],
    ['permissions.forwardEmails', 'Encaminhar', 'Alto risco: envia conteúdo a terceiros.'],
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
      autonomyLevel: 2,
      dryRun: true,
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
