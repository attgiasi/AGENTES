export const DEFAULT_SETTINGS = {
  version: 1,
  agent: {
    enabled: true,
    paused: false,
    emergencyStop: false,
    autonomyLevel: 2,
    locale: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    maxEmailsPerRun: 50,
    gmailQuery: 'newer_than:30d -in:sent -in:drafts -in:spam -in:trash',
    processedLabel: 'AI Agent/Processado',
    dryRun: true
  },
  automation: {
    enabled: true,
    manualOnly: false,
    intervalHours: 1,
    allowedHours: Array.from({ length: 24 }, (_, hour) => hour),
    weekdaysOnly: false,
    note: 'GitHub Actions roda de hora em hora; estas regras decidem se o agente executa ou pula.'
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
  confirmations: {
    sendEmail: '',
    deleteEmail: '',
    emptyTrash: '',
    unsubscribe: '',
    bulkActions: '',
    forwardEmail: '',
    alterEvent: '',
    required: {
      sendEmail: 'EU CONFIRMO QUE O AGENTE PODE ENVIAR EMAILS',
      deleteEmail: 'EU CONFIRMO QUE O AGENTE PODE APAGAR EMAILS',
      emptyTrash: 'EU CONFIRMO QUE O AGENTE PODE ESVAZIAR A LIXEIRA',
      unsubscribe: 'EU CONFIRMO QUE O AGENTE PODE CANCELAR NEWSLETTERS',
      bulkActions: 'EU CONFIRMO QUE O AGENTE PODE EXECUTAR AÇÕES EM LOTE',
      forwardEmail: 'EU CONFIRMO QUE O AGENTE PODE ENCAMINHAR EMAILS',
      alterEvent: 'EU CONFIRMO QUE O AGENTE PODE ALTERAR EVENTOS'
    }
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
    maxArchivePerRun: 50,
    maxDraftsPerRun: 10,
    maxRemindersPerRun: 20,
    maxEventsPerRun: 10,
    maxUnsubscribesPerRun: 3,
    maxDeletesPerRun: 0,
    bulkActionLimit: 25
  }
};
