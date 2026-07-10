let settings = null;

const AUTONOMY_LEVELS = [
  { level: 0, title: '0. Desligado', segment: 'Pausa total', description: 'Não executa o agente. Use quando quiser parar tudo.' },
  { level: 1, title: '1. Análise', segment: 'Só olhar', description: 'Lê, classifica e resume, mas não altera o Gmail.' },
  { level: 2, title: '2. Simulação', segment: 'Teste seguro', description: 'Monta planos e relatórios mostrando o que faria, sem mexer nos e-mails.' },
  { level: 3, title: '3. Organização', segment: 'Baixo risco', description: 'Pode aplicar etiquetas, marcar e gerar relatórios se as permissões estiverem ligadas.' },
  { level: 4, title: '4. Produtividade', segment: 'Confirma risco médio', description: 'Prepara rascunhos, eventos e arquivamentos como aprovação, sem executar direto.' },
  { level: 5, title: '5. Automático controlado', segment: 'Execução prática', description: 'Executa ações de risco médio quando a confirmação de risco médio estiver desligada.' },
  { level: 6, title: '6. Alto risco protegido', segment: 'Aprovação explícita', description: 'Permite preparar ações perigosas, mas mantém confirmação forte para enviar/apagar/descadastrar.' },
  { level: 7, title: '7. Máximo configurado', segment: 'Faz tudo que você liberar', description: 'Executa tudo que estiver ativado nas permissões. Use a chave de aprovação para deixar alto risco pendente no painel.' }
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
  moduleButtons: [
    ['modules.gmailRead', 'Leitura', 'Permite buscar e ler e-mails.'],
    ['modules.classification', 'Classificação', 'Classifica e-mails por categoria.'],
    ['modules.importantDetection', 'Importantes', 'Detecta urgentes, pessoais e importantes.'],
    ['modules.newsletter', 'Newsletter', 'Detecta mailing, promoções e newsletters.'],
    ['modules.autoArchive', 'Arquivamento', 'Permite arquivar conforme regras.'],
    ['modules.drafts', 'Rascunhos', 'Prepara respostas sem enviar.'],
    ['modules.summaries', 'Resumos', 'Gera resumos de e-mails e conversas.'],
    ['modules.threads', 'Conversas', 'Analisa threads completas.'],
    ['modules.pendingReplies', 'Pendências', 'Detecta mensagens que pedem resposta.'],
    ['modules.deadlines', 'Prazos', 'Detecta datas, vencimentos e compromissos.'],
    ['modules.appleReminders', 'Lembretes Apple', 'Prepara tarefas para Atalhos.'],
    ['modules.appleCalendar', 'Calendário Apple', 'Prepara eventos para Atalhos.'],
    ['modules.attachments', 'Anexos', 'Identifica anexos importantes.'],
    ['modules.reports', 'Relatórios', 'Gera relatórios de execução.'],
    ['modules.siriShortcuts', 'Siri/Atalhos', 'Permite comandos externos.'],
    ['modules.logs', 'Logs', 'Registra ações e erros.']
  ],
  permissionButtons: [
    ['permissions.lowRiskAutomatic', 'Baixo risco automático', 'Permite ações seguras, como etiqueta.'],
    ['permissions.mediumRiskRequiresConfirmation', 'Confirmar risco médio', 'Arquivar e rascunhos pedem aprovação. Desligue para arquivar automaticamente.'],
    ['permissions.highRiskRequiresExplicitConfirmation', 'Aprovar alto risco', 'Envio, exclusão e descadastro ficam pendentes no painel quando ligado.'],
    ['permissions.readEmails', 'Ler e-mails', 'Permite consultar Gmail.'],
    ['permissions.classifyEmails', 'Classificar', 'Permite classificar mensagens.'],
    ['permissions.summarizeEmails', 'Resumir', 'Permite gerar resumos.'],
    ['permissions.applyLabels', 'Aplicar etiquetas', 'Organiza e-mails com labels.'],
    ['permissions.markRead', 'Marcar lido', 'Pode remover não lido.'],
    ['permissions.markUnread', 'Marcar não lido', 'Pode marcar como não lido.'],
    ['permissions.createReminders', 'Criar lembretes', 'Prepara tarefas para Apple.'],
    ['permissions.createReports', 'Criar relatórios', 'Salva relatórios da execução.'],
    ['permissions.archiveEmails', 'Arquivar e-mails', 'Remove da caixa de entrada, sem apagar.'],
    ['permissions.moveEmails', 'Mover e-mails', 'Permite mover entre labels/pastas.'],
    ['permissions.createDrafts', 'Criar rascunhos', 'Cria respostas como rascunho.'],
    ['permissions.createCalendarEvents', 'Criar eventos', 'Prepara eventos de calendário.'],
    ['permissions.downloadAttachments', 'Baixar anexos', 'Permite baixar anexos autorizados.'],
    ['permissions.unsubscribeNewsletter', 'Descadastrar', 'Alto risco: cancelar inscrições.'],
    ['permissions.sendEmails', 'Enviar e-mails', 'Alto risco: envia mensagens.'],
    ['permissions.deleteEmails', 'Apagar e-mails', 'Alto risco: move para lixeira.'],
    ['permissions.emptyTrash', 'Esvaziar lixeira', 'Altíssimo risco: remoção irreversível.'],
    ['permissions.forwardEmails', 'Encaminhar', 'Alto risco: envia conteúdo a terceiros.'],
    ['permissions.bulkActions', 'Ações em lote', 'Executa muitas ações de uma vez.']
  ],
  gmailCategorySwitches: [
    ['gmail.categories.primary', 'Principal', 'E-mails normais e importantes da caixa principal.'],
    ['gmail.categories.promotions', 'Promoções', 'Ofertas, lojas, cupons e campanhas.'],
    ['gmail.categories.social', 'Social', 'Redes sociais e notificações sociais.'],
    ['gmail.categories.updates', 'Atualizações', 'Avisos, contas, entregas, bancos e sistemas.'],
    ['gmail.categories.forums', 'Fórum', 'Listas, grupos e comunidades.']
  ],
  gmailSwitches: [
    ['gmail.useSmartQuery', 'Busca inteligente', 'Monta a busca usando os filtros e categorias abaixo.'],
    ['gmail.includeInboxOnly', 'Só caixa de entrada', 'Ignora e-mails arquivados.'],
    ['gmail.unreadOnly', 'Só não lidos', 'Processa apenas mensagens ainda não lidas.'],
    ['gmail.excludeSent', 'Ignorar enviados', 'Não analisa mensagens enviadas por você.'],
    ['gmail.excludeDrafts', 'Ignorar rascunhos', 'Não mexe em rascunhos do Gmail.'],
    ['gmail.excludeSpamTrash', 'Ignorar spam/lixeira', 'Mantém spam e lixeira fora da execução.']
  ],
  automationSwitches: [
    ['automation.enabled', 'Automação agendada', 'Permite rodar sozinho no GitHub Actions.'],
    ['automation.manualOnly', 'Somente manual', 'Bloqueia execuções automáticas.'],
    ['automation.weekdaysOnly', 'Só dias úteis', 'Pula sábado e domingo.']
  ],
  newsletterSwitches: [
    ['newsletter.enabled', 'Newsletter ligado', 'Ativa regras de mailing e promoções.'],
    ['newsletter.keepFavoritesInInbox', 'Manter favoritos', 'Não arquiva remetentes favoritos.'],
    ['newsletter.autoArchiveTrustedSenders', 'Arquivar confiáveis', 'Arquiva newsletters de remetentes confiáveis mesmo antes do prazo.'],
    ['newsletter.suggestUnsubscribe', 'Sugerir descadastro', 'Mostra descadastro como sugestão.'],
    ['newsletter.requireConfirmationForUnsubscribe', 'Confirmar descadastro', 'Nunca cancela inscrição sem aprovação.'],
    ['newsletter.neverClickSuspiciousLinks', 'Bloquear links suspeitos', 'Não clica em encurtadores e links suspeitos.']
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
  ],
  protectedSwitches: [
    ['protectedSenders.enabled', 'Proteção ligada', 'Protege remetentes importantes.'],
    ['protectedSenders.requireConfirmationForArchive', 'Confirmar arquivar', 'Exige aprovação para arquivar protegidos.'],
    ['protectedSenders.requireConfirmationForDelete', 'Confirmar apagar', 'Exige aprovação para apagar protegidos.']
  ]
};

document.addEventListener('DOMContentLoaded', async () => {
  renderSwitches();
  renderAutonomyGrid();
  renderMarkReadCategoryGrid();
  renderHourGrid();
  await loadSettings();
  await loadStatus();
  await loadDashboard();
  bind();
});

function renderSwitches() {
  for (const [containerId, items] of Object.entries(switchGroups)) {
    const container = document.querySelector(`#${containerId}`);
    if (!container) continue;
    container.innerHTML = items.map(([path, title, description]) => switchCard(path, title, description)).join('');
  }
}

function renderAutonomyGrid() {
  const container = document.querySelector('#autonomyGrid');
  if (!container) return;
  container.innerHTML = AUTONOMY_LEVELS.map((item) => `
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
  const container = document.querySelector('#hourGrid');
  if (!container) return;
  container.innerHTML = Array.from({ length: 24 }, (_, hour) => `
    <button class="hour-button" data-hour-toggle="${hour}">${String(hour).padStart(2, '0')}h</button>
  `).join('');
}

function switchCard(path, title, description) {
  return `
    <button class="toggle toggle-card" data-path="${escapeHtml(path)}" data-title="${escapeHtml(title)}" data-description="${escapeHtml(description)}">
      <span class="toggle-text">
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(description)}</small>
      </span>
      <span class="switch-shell" aria-hidden="true"><span class="switch-knob"></span></span>
      <span class="switch-state"></span>
    </button>
  `;
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

async function loadDashboard() {
  const dashboard = await api('/api/dashboard');
  const metrics = [
    { title: 'Arquivados', value: dashboard.emailActions.archived, description: 'E-mails removidos da entrada sem apagar.' },
    { title: 'Apagados', value: dashboard.emailActions.deleted + dashboard.emailActions.hardDeleted, description: 'Movidos para lixeira ou excluídos.' },
    { title: 'Descadastros', value: dashboard.emailActions.unsubscribed, description: 'Newsletters com descadastro executado.' },
    { title: 'Sugestões', value: dashboard.totals.suggestions, description: 'Clique para ver por blocos didáticos.', href: './suggestions.html' },
    { title: 'Etiquetas', value: dashboard.emailActions.labeled, description: 'Labels aplicadas pelo agente.' },
    { title: 'Rascunhos', value: dashboard.emailActions.drafts, description: 'Respostas preparadas sem enviar.' },
    { title: 'Lembretes', value: dashboard.emailActions.reminders, description: 'Pendências criadas para Apple Reminders.' },
    { title: 'Eventos', value: dashboard.emailActions.calendarEvents, description: 'Eventos preparados para calendário.' },
    { title: 'Newsletters', value: dashboard.newsletters.senders, description: `${dashboard.newsletters.messages} mensagens recorrentes.` },
    { title: 'Falhas', value: dashboard.totals.failed, description: 'Erros registrados em ações.' }
  ];

  document.querySelector('#dashboardMetrics').innerHTML = metrics.map((item) => {
    const content = `
      <strong>${escapeHtml(item.value)}</strong>
      <span>${escapeHtml(item.title)}</span>
      <small>${escapeHtml(item.description)}</small>
    `;
    return item.href
      ? `<a class="metric-card metric-link" href="${escapeHtml(item.href)}">${content}</a>`
      : `<article class="metric-card">${content}</article>`;
  }).join('');
}

function bind() {
  document.body.addEventListener('click', async (event) => {
    const toggle = event.target.closest('.toggle[data-path]');
    const autonomyCard = event.target.closest('[data-autonomy-level]');
    const arrayToggle = event.target.closest('[data-array-path][data-array-value]');
    const hourButton = event.target.closest('[data-hour-toggle]');
    const hourPreset = event.target.closest('[data-hours-preset]');
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

    if (autonomyCard) {
      setAutonomyLevel(Number(autonomyCard.dataset.autonomyLevel));
      await saveSettings();
      await loadStatus();
      return;
    }

    if (arrayToggle) {
      toggleArrayValue(arrayToggle.dataset.arrayPath, arrayToggle.dataset.arrayValue);
      await saveSettings();
      await loadStatus();
      return;
    }

    if (hourButton) {
      toggleAllowedHour(Number(hourButton.dataset.hourToggle));
      await saveSettings();
      await loadStatus();
      return;
    }

    if (hourPreset) {
      applyHourPreset(hourPreset.dataset.hoursPreset);
      await saveSettings();
      await loadStatus();
      return;
    }

    if (toggle) {
      const path = toggle.dataset.path;
      setPath(settings, path, !Boolean(getPath(settings, path)));
      await saveSettings();
      await loadStatus();
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
  });

  document.body.addEventListener('change', async (event) => {
    if (event.target.matches('input[data-path], select[data-path]')) {
      await saveSettings();
      await loadStatus();
    }
  });

  document.querySelector('#refresh').addEventListener('click', loadStatus);
  document.querySelector('#copyGithubSettings').addEventListener('click', copyGithubSettings);
  document.querySelector('#refreshDashboard').addEventListener('click', loadDashboard);
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
    await loadDashboard();
  });
  document.querySelector('#loadLogs').addEventListener('click', async () => show(await api('/api/logs')));
  document.querySelector('#loadApprovals').addEventListener('click', loadApprovals);
  document.querySelector('#loadNewsletters').addEventListener('click', async () => show(await api('/api/newsletters')));
  document.querySelector('#loadShortcuts').addEventListener('click', async () => {
    document.querySelector('#shortcuts').textContent = JSON.stringify(await api('/api/shortcuts'), null, 2);
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
  const current = new Set(Array.isArray(settings.automation.allowedHours) ? settings.automation.allowedHours : []);
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
  const current = new Set(Array.isArray(getPath(settings, path)) ? getPath(settings, path) : []);
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
    const state = button.querySelector('.switch-state');
    if (state) state.textContent = value ? 'Ligado' : 'Desligado';
  });
  document.querySelectorAll('input[data-path], select[data-path]').forEach((input) => {
    const value = getPath(settings, input.dataset.path);
    if (document.activeElement !== input) input.value = Array.isArray(value) ? value.join(', ') : value ?? '';
  });
  updateAutonomyGrid();
  updateArrayChoiceGrids();
  updateHourGrid();
  const requiredConfirmations = document.querySelector('#requiredConfirmations');
  if (requiredConfirmations) requiredConfirmations.textContent = JSON.stringify(settings.confirmations?.required || {}, null, 2);
}

function updateArrayChoiceGrids() {
  document.querySelectorAll('[data-array-path][data-array-value]').forEach((button) => {
    const values = Array.isArray(getPath(settings, button.dataset.arrayPath))
      ? getPath(settings, button.dataset.arrayPath)
      : [];
    const selected = values.includes(button.dataset.arrayValue);
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function updateAutonomyGrid() {
  document.querySelectorAll('[data-autonomy-level]').forEach((button) => {
    const selected = Number(button.dataset.autonomyLevel) === Number(settings.agent.autonomyLevel);
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function updateHourGrid() {
  const allowed = new Set(Array.isArray(settings.automation.allowedHours) ? settings.automation.allowedHours : []);
  document.querySelectorAll('[data-hour-toggle]').forEach((button) => {
    const selected = allowed.has(Number(button.dataset.hourToggle));
    button.classList.toggle('is-on', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
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

async function copyGithubSettings() {
  if (!settings) await loadSettings();
  const json = `${JSON.stringify(settings, null, 2)}\n`;
  await navigator.clipboard.writeText(json);
  show({
    ok: true,
    secret: 'AGENT_SETTINGS_JSON',
    message: 'Configuração copiada. Cole no GitHub em Settings → Secrets and variables → Actions → AGENT_SETTINGS_JSON.',
    nextSteps: [
      'Abra o repositório AGENTES no GitHub.',
      'Entre em Settings → Secrets and variables → Actions.',
      'Edite ou crie o secret AGENT_SETTINGS_JSON.',
      'Cole o conteúdo copiado e salve.'
    ]
  });
  alert('Configuração copiada. Cole no Secret AGENT_SETTINGS_JSON do GitHub.');
}

function renderMiniList(selector, items, template, emptyText) {
  const container = document.querySelector(selector);
  if (!container) return;
  if (!items?.length) {
    container.innerHTML = `<p class="empty">${escapeHtml(emptyText)}</p>`;
    return;
  }
  container.innerHTML = items.map((item) => `<article class="mini-item">${template(item)}</article>`).join('');
}

function actionLabel(action) {
  const labels = {
    archiveEmail: 'Arquivar',
    deleteEmail: 'Apagar',
    hardDeleteEmail: 'Apagar definitivo',
    unsubscribeNewsletter: 'Descadastrar',
    applyLabel: 'Aplicar etiqueta',
    identifyNewsletter: 'Identificar newsletter',
    createDraft: 'Criar rascunho',
    createReminder: 'Criar lembrete',
    createCalendarEvent: 'Criar evento',
    markRead: 'Marcar lido',
    markUnread: 'Marcar não lido'
  };
  return labels[action] || action || 'Ação';
}

function statusLabel(status) {
  const labels = {
    executed: 'Executado',
    'dry-run': 'Simulado',
    blocked: 'Bloqueado',
    failed: 'Falhou',
    pending_confirmation: 'Aguardando aprovação'
  };
  return labels[status] || status || 'Status';
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
