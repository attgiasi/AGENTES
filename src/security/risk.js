export const RISK = {
  LOW: 'baixo',
  MEDIUM: 'medio',
  HIGH: 'alto'
};

export const ACTIONS = {
  readEmail: { risk: RISK.LOW, permission: 'readEmails', description: 'Ler email' },
  summarizeEmail: { risk: RISK.LOW, permission: 'summarizeEmails', description: 'Resumir email' },
  classifyEmail: { risk: RISK.LOW, permission: 'classifyEmails', description: 'Classificar email' },
  applyLabel: { risk: RISK.LOW, permission: 'applyLabels', description: 'Aplicar etiqueta' },
  createReminder: { risk: RISK.LOW, permission: 'createReminders', description: 'Criar lembrete Apple via Atalhos' },
  createReport: { risk: RISK.LOW, permission: 'createReports', description: 'Criar relatório' },
  identifyNewsletter: { risk: RISK.LOW, permission: 'classifyEmails', description: 'Identificar newsletter' },
  markRead: { risk: RISK.LOW, permission: 'markRead', description: 'Marcar como lido' },
  markUnread: { risk: RISK.LOW, permission: 'markUnread', description: 'Marcar como não lido' },

  archiveEmail: { risk: RISK.MEDIUM, permission: 'archiveEmails', description: 'Arquivar email' },
  moveEmail: { risk: RISK.MEDIUM, permission: 'moveEmails', description: 'Mover email' },
  createDraft: { risk: RISK.MEDIUM, permission: 'createDrafts', description: 'Criar rascunho' },
  createCalendarEvent: { risk: RISK.MEDIUM, permission: 'createCalendarEvents', description: 'Criar evento Apple via Atalhos' },
  downloadAttachment: { risk: RISK.MEDIUM, permission: 'downloadAttachments', description: 'Baixar anexo' },
  unsubscribeNewsletter: { risk: RISK.MEDIUM, permission: 'unsubscribeNewsletter', confirmation: 'unsubscribe', description: 'Descadastrar newsletter' },

  sendEmail: { risk: RISK.HIGH, permission: 'sendEmails', confirmation: 'sendEmail', description: 'Enviar email' },
  deleteEmail: { risk: RISK.HIGH, permission: 'deleteEmails', confirmation: 'deleteEmail', description: 'Apagar email' },
  emptyTrash: { risk: RISK.HIGH, permission: 'emptyTrash', confirmation: 'emptyTrash', description: 'Esvaziar lixeira' },
  forwardEmail: { risk: RISK.HIGH, permission: 'forwardEmails', confirmation: 'forwardEmail', description: 'Encaminhar email' },
  alterEvent: { risk: RISK.HIGH, permission: 'alterExistingEvents', confirmation: 'alterEvent', description: 'Alterar evento existente' },
  deleteEvent: { risk: RISK.HIGH, permission: 'deleteEvents', confirmation: 'alterEvent', description: 'Excluir evento' },
  bulkActions: { risk: RISK.HIGH, permission: 'bulkActions', confirmation: 'bulkActions', description: 'Executar ações em lote' }
};

export function evaluateAction(actionName, settings) {
  const meta = ACTIONS[actionName];
  if (!meta) {
    return {
      allowed: false,
      requiresConfirmation: true,
      risk: RISK.HIGH,
      reason: `Ação desconhecida: ${actionName}`
    };
  }

  const permissionOk = Boolean(settings.permissions?.[meta.permission]);
  if (!permissionOk) {
    return {
      allowed: false,
      requiresConfirmation: false,
      risk: meta.risk,
      reason: `Permissão desligada: ${meta.permission}`
    };
  }

  if (meta.risk === RISK.LOW) {
    return {
      allowed: Boolean(settings.permissions.lowRiskAutomatic),
      requiresConfirmation: !settings.permissions.lowRiskAutomatic,
      risk: meta.risk,
      reason: settings.permissions.lowRiskAutomatic ? 'Baixo risco permitido.' : 'Baixo risco configurado para confirmação.'
    };
  }

  if (meta.risk === RISK.MEDIUM) {
    return {
      allowed: !settings.permissions.mediumRiskRequiresConfirmation,
      requiresConfirmation: Boolean(settings.permissions.mediumRiskRequiresConfirmation),
      risk: meta.risk,
      reason: settings.permissions.mediumRiskRequiresConfirmation ? 'Risco médio exige confirmação.' : 'Risco médio automático permitido.'
    };
  }

  const confirmed = meta.confirmation
    ? settings.confirmations?.[meta.confirmation] === settings.confirmations?.required?.[meta.confirmation]
    : false;
  return {
    allowed: Boolean(!settings.permissions.highRiskRequiresExplicitConfirmation && confirmed),
    requiresConfirmation: true,
    risk: meta.risk,
    reason: confirmed ? 'Alto risco confirmado, mas ainda requer fluxo explícito.' : `Alto risco exige frase: ${settings.confirmations?.required?.[meta.confirmation] || 'confirmação explícita'}`
  };
}
