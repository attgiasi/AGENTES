export const RISK = {
  LOW: 'baixo',
  MEDIUM: 'medio',
  HIGH: 'alto'
};

export const ACTIONS = {
  readEmail: { risk: RISK.LOW, action: 'readEmails', description: 'Ler email' },
  summarizeEmail: { risk: RISK.LOW, action: 'summarizeEmails', description: 'Resumir email' },
  classifyEmail: { risk: RISK.LOW, action: 'classifyEmails', description: 'Classificar email' },
  applyLabel: { risk: RISK.LOW, action: 'applyLabels', description: 'Aplicar etiqueta' },
  createReminder: { risk: RISK.LOW, action: 'createReminders', description: 'Criar lembrete Apple via Atalhos' },
  createReport: { risk: RISK.LOW, action: 'createReports', description: 'Criar relatório' },
  identifyNewsletter: { risk: RISK.LOW, action: 'identifyNewsletter', description: 'Identificar newsletter' },
  markImportant: { risk: RISK.LOW, action: 'markImportant', description: 'Marcar como importante' },
  markRead: { risk: RISK.LOW, action: 'markRead', description: 'Marcar como lido' },
  markUnread: { risk: RISK.LOW, action: 'markUnread', description: 'Marcar como não lido' },

  archiveEmail: { risk: RISK.MEDIUM, action: 'archiveEmails', description: 'Arquivar email' },
  moveEmail: { risk: RISK.MEDIUM, action: 'moveEmails', description: 'Mover email' },
  createDraft: { risk: RISK.MEDIUM, action: 'createDrafts', description: 'Criar rascunho' },
  createCalendarEvent: { risk: RISK.MEDIUM, action: 'createCalendarEvents', description: 'Criar evento Apple via Atalhos' },
  downloadAttachment: { risk: RISK.MEDIUM, action: 'downloadAttachments', description: 'Baixar anexo' },
  unsubscribeNewsletter: { risk: RISK.HIGH, action: 'unsubscribeNewsletter', description: 'Descadastrar newsletter' },

  sendEmail: { risk: RISK.HIGH, action: 'sendEmails', description: 'Enviar email' },
  deleteEmail: { risk: RISK.HIGH, action: 'deleteEmails', description: 'Apagar email' },
  emptyTrash: { risk: RISK.HIGH, action: 'emptyTrash', description: 'Esvaziar lixeira' },
  forwardEmail: { risk: RISK.HIGH, action: 'forwardEmails', description: 'Encaminhar email' },
  alterEvent: { risk: RISK.HIGH, action: 'alterExistingEvents', description: 'Alterar evento existente' },
  deleteEvent: { risk: RISK.HIGH, action: 'deleteEvents', description: 'Excluir evento' },
  bulkActions: { risk: RISK.HIGH, action: 'bulkActions', description: 'Executar ações em lote' }
};

export function evaluateAction(actionName, settings) {
  const meta = ACTIONS[actionName];
  const autonomyLevel = Number(settings.agent?.autonomyLevel ?? 2);

  if (!meta) {
    return {
      allowed: false,
      requiresConfirmation: true,
      risk: RISK.HIGH,
      reason: `Ação desconhecida: ${actionName}`
    };
  }

  const actionKey = meta.action || meta.permission;
  const actionOk = Boolean(settings.actions?.[actionKey] ?? settings.permissions?.[actionKey]);
  if (!actionOk) {
    return {
      allowed: false,
      requiresConfirmation: false,
      risk: meta.risk,
      reason: `Ação desligada: ${actionKey}`
    };
  }

  if (settings.agent?.emergencyStop) {
    return {
      allowed: false,
      requiresConfirmation: false,
      risk: meta.risk,
      reason: 'Parada de emergência ligada.'
    };
  }

  if (autonomyLevel <= 0) {
    return {
      allowed: false,
      requiresConfirmation: false,
      risk: meta.risk,
      reason: 'Autonomia nível 0: agente desligado.'
    };
  }

  if (settings.execution?.runSelectedActionsNow === false) {
    return {
      allowed: false,
      requiresConfirmation: true,
      risk: meta.risk,
      reason: 'Executar tudo na hora está desligado: ação ficou pendente.'
    };
  }

  if (autonomyLevel === 1) {
    return {
      allowed: false,
      requiresConfirmation: true,
      risk: meta.risk,
      reason: 'Autonomia baixa: toda ação fica pendente para aprovação.'
    };
  }

  if (autonomyLevel === 2 && [RISK.MEDIUM, RISK.HIGH].includes(meta.risk)) {
    return {
      allowed: false,
      requiresConfirmation: true,
      risk: meta.risk,
      reason: 'Autonomia média: risco médio e alto ficam pendentes para aprovação.'
    };
  }

  if (autonomyLevel === 3 && meta.risk === RISK.HIGH) {
    return {
      allowed: false,
      requiresConfirmation: true,
      risk: meta.risk,
      reason: 'Autonomia alta: risco alto fica pendente para aprovação.'
    };
  }

  return {
    allowed: true,
    requiresConfirmation: false,
    risk: meta.risk,
    reason: autonomyLevel >= 4
      ? 'Autonomia total: ação ligada executa sem aprovação.'
      : 'Ação permitida pelo nível de autonomia.'
  };
}
