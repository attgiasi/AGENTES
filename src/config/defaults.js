export const DEFAULT_SETTINGS = {
  version: 1,
  agent: {
    enabled: true,
    paused: false,
    emergencyStop: false,
    autonomyLevel: 1,
    locale: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    maxEmailsPerRun: 100,
    gmailQuery: '',
    processedLabel: 'AI Agent/Processado',
    dryRun: false
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
    weekdaysOnly: false,
    note: 'GitHub Actions roda de hora em hora; estas regras decidem se o agente executa ou pula.'
  },
  organizing: {
    markReadCategories: ['newsletter', 'mailing', 'promocao'],
    note: 'Controla em quais categorias o botão Marcar lido pode agir automaticamente.'
  },
  important: {
    enabled: true,
    markAsImportant: true,
    applyImportantLabel: true,
    keepUnread: true,
    protectFromGlobalArchive: true,
    afterMarkAction: 'keep',
    priorities: ['alta', 'urgente'],
    categories: ['pessoal', 'prazo', 'resposta_pendente', 'trabalho', 'financeiro', 'documento', 'contrato', 'cobranca'],
    labelName: 'AI Agent/Importante',
    note: 'Detecta e-mails importantes, marca no Gmail e decide se mantém, arquiva ou move para lixeira depois.'
  },
  execution: {
    archiveImmediately: false,
    markReadImmediately: false,
    runSelectedActionsNow: true,
    note: 'Ações diretas executam na mesma rodada quando a autonomia permite.'
  },
  actions: {
    readEmails: true,
    classifyEmails: true,
    summarizeEmails: true,
    applyLabels: true,
    identifyNewsletter: true,
    markImportant: true,
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
    fallbackProvider: 'gemini',
    compareProviders: false,
    openai: {
      enabled: true,
      model: 'gpt-5.4-mini',
      baseUrl: 'https://api.openai.com/v1',
      temperature: 0.2,
      includeBody: false,
      maxBodyChars: 6000
    },
    gemini: {
      enabled: false,
      model: 'gemini-3.5-flash',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      temperature: 0.2
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
    readEmails: true,
    classifyEmails: true,
    summarizeEmails: true,
    applyLabels: true,
    markImportant: true,
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
  labels: {
    important: 'AI Agent/Importante',
    urgent: 'AI Agent/URGENTE',
    personal: 'AI Agent/PESSOAL',
    work: 'AI Agent/Trabalho',
    finance: 'AI Agent/Financeiro',
    documents: 'AI Agent/Documentos',
    contracts: 'AI Agent/Contratos',
    receipts: 'AI Agent/Comprovantes',
    bills: 'AI Agent/Boletos e cobranças',
    newsletter: 'AI Agent/Newsletter',
    mailing: 'AI Agent/Mailing',
    promotions: 'AI Agent/Promoções',
    readLater: 'AI Agent/Ler Depois',
    pendingReply: 'AI Agent/A responder',
    waiting: 'AI Agent/Aguardando',
    processed: 'AI Agent/Processado'
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
    trustedSenders: [],
    blockedSenders: [],
    favoriteSenders: [],
    blockedUrlPatterns: ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd'],
    labels: ['Newsletter', 'Mailing', 'Promoções', 'Ler Depois']
  },
  protectedSenders: {
    enabled: true,
    requireConfirmationForArchive: true,
    requireConfirmationForDelete: true,
    emails: [],
    domains: [],
    keywords: ['banco', 'gov.br', 'receita', 'justiça', 'juridico', 'saude', 'médico', 'medico']
  },
  apple: {
    enabled: true,
    integrationType: 'shortcuts',
    reminders: {
      enabled: true,
      listName: 'Pendências do Gmail',
      defaultPriority: 'medium',
      requireConfirmation: false
    },
    calendar: {
      enabled: true,
      defaultCalendarName: 'Calendário',
      defaultAlertMinutes: 30,
      requireConfirmation: true
    },
    cloudKit: {
      enabled: false,
      note: 'Preparado para app nativo futuro; MVP usa banco local e Atalhos.'
    }
  },
  siri: {
    enabled: true,
    requireToken: true,
    commands: [
      'resumir-importantes',
      'responder-hoje',
      'criar-lembretes',
      'limpar-newsletters',
      'pausar-agente',
      'ativar-agente',
      'foco-trabalho',
      'relatorio-dia',
      'criar-eventos',
      'listar-urgentes',
      'preparar-respostas',
      'arquivar-newsletters-antigas',
      'pendencias-semana'
    ]
  },
  reports: {
    daily: true,
    weekly: true,
    newsletters: true,
    urgent: true,
    pending: true,
    awaitingReply: true,
    attachmentsSpace: true,
    frequentSenders: true
  },
  limits: {
    maxArchivePerRun: 1000,
    maxDraftsPerRun: 1000,
    maxRemindersPerRun: 1000,
    maxEventsPerRun: 1000,
    maxUnsubscribesPerRun: 1000,
    maxDeletesPerRun: 1000,
    bulkActionLimit: 1000
  }
};
