export function buildReminderPayload(email, decision, settings) {
  return {
    listName: settings.apple.reminders.listName,
    title: reminderTitle(email, decision),
    notes: [
      `Resumo: ${decision.resumo}`,
      `Remetente: ${email.headers.from}`,
      `Assunto: ${email.subject}`,
      `Gmail ID: ${email.id}`
    ].join('\n'),
    dueDate: decision.dados_extraidos?.data || null,
    priority: decision.prioridade === 'urgente' ? 'high' : settings.apple.reminders.defaultPriority,
    source: {
      emailId: email.id,
      threadId: email.threadId
    }
  };
}

export function buildCalendarPayload(email, decision, settings) {
  const date = decision.dados_extraidos?.data;
  const time = decision.dados_extraidos?.hora;
  return {
    calendarName: settings.apple.calendar.defaultCalendarName,
    title: eventTitle(email, decision),
    startDate: date,
    startTime: time,
    endDate: date,
    endTime: null,
    location: decision.dados_extraidos?.local || '',
    alertMinutes: settings.apple.calendar.defaultAlertMinutes,
    notes: [
      decision.resumo,
      `Remetente: ${email.headers.from}`,
      `Assunto: ${email.subject}`,
      `Gmail ID: ${email.id}`
    ].join('\n'),
    source: {
      emailId: email.id,
      threadId: email.threadId
    }
  };
}

export function shortcutResponse(spokenText, data = {}) {
  return {
    ok: true,
    spokenText,
    displayText: spokenText,
    data
  };
}

function reminderTitle(email, decision) {
  if (decision.prioridade === 'urgente') return `URGENTE: ${email.subject}`;
  if (decision.precisa_resposta) return `Responder: ${email.subject}`;
  return `Gmail: ${email.subject}`;
}

function eventTitle(email, decision) {
  if (decision.categoria === 'evento') return email.subject;
  return `Gmail: ${email.subject}`;
}

