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
  unsubscribeNewsletter: { risk: RISK.HIGH, permission: 'unsubscribeNewsletter', confirmation: 'unsubscribe', description: 'Descadastrar newsletter' },

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
  const autonomyLevel = Number(settings.agent?.autonomyLevel ?? 2);

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

  if (autonomyLevel <= 2) {
    return {
      allowed: false,
      requiresConfirmation: false,
      risk: meta.risk,
      reason: autonomyLevel === 1 ? 'Autonomia nível 1: apenas análise.' : 'Autonomia nível 2: apenas simulação.'
    };
  }

  if (meta.risk === RISK.LOW) {
    return {
      allowed: autonomyLevel >= 3 && Boolean(settings.permissions.lowRiskAutomatic),
      requiresConfirmation: !settings.permissions.lowRiskAutomatic,
      risk: meta.risk,
      reason: settings.permissions.lowRiskAutomatic ? 'Baixo risco permitido pelo nível de autonomia.' : 'Baixo risco configurado para confirmação.'
    };
  }

  if (meta.risk === RISK.MEDIUM) {
    if (autonomyLevel < 4) {
      return {
        allowed: false,
        requiresConfirmation: false,
        risk: meta.risk,
        reason: 'Autonomia abaixo do nível 4: risco médio bloqueado.'
      };
    }
    if (autonomyLevel === 4) {
      return {
        allowed: false,
        requiresConfirmation: true,
        risk: meta.risk,
        reason: 'Autonomia nível 4: risco médio exige confirmação.'
      };
    }
    return {
      allowed: autonomyLevel >= 5 && !settings.permissions.mediumRiskRequiresConfirmation,
      requiresConfirmation: Boolean(settings.permissions.mediumRiskRequiresConfirmation),
      risk: meta.risk,
      reason: settings.permissions.mediumRiskRequiresConfirmation ? 'Risco médio exige confirmação.' : 'Risco médio automático permitido.'
    };
  }

  if (autonomyLevel < 6) {
    return {
      allowed: false,
      requiresConfirmation: autonomyLevel >= 4,
      risk: meta.risk,
      reason: 'Risco alto exige autonomia nível 6 ou 7 e confirmação explícita.'
    };
  }

  const confirmed = meta.confirmation
    ? settings.confirmations?.[meta.confirmation] === settings.confirmations?.required?.[meta.confirmation]
    : false;
  return {
    allowed: Boolean(autonomyLevel >= 7 && !settings.permissions.highRiskRequiresExplicitConfirmation && confirmed),
    requiresConfirmation: true,
    risk: meta.risk,
    reason: confirmed ? 'Alto risco confirmado; execução depende do nível 7 e da trava alto risco.' : `Alto risco exige frase: ${settings.confirmations?.required?.[meta.confirmation] || 'confirmação explícita'}`
  };
}
