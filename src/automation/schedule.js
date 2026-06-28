export function shouldRunBySchedule(settings, date = new Date()) {
  const automation = settings.automation || {};
  if (!automation.enabled) return { allowed: false, reason: 'Automação desligada.' };
  if (automation.manualOnly) return { allowed: false, reason: 'Configuração permite apenas execução manual.' };

  const parts = getTimeParts(date, settings.agent?.timezone || 'America/Sao_Paulo');
  const allowedHours = Array.isArray(automation.allowedHours) ? automation.allowedHours : [];
  if (allowedHours.length && !allowedHours.includes(parts.hour)) {
    return { allowed: false, reason: `Horário ${parts.hour}h fora da lista permitida.` };
  }

  if (automation.weekdaysOnly && (parts.weekday === 0 || parts.weekday === 6)) {
    return { allowed: false, reason: 'Configurado para rodar somente em dias úteis.' };
  }

  const interval = Math.max(1, Math.min(24, Number(automation.intervalHours || 1)));
  if (parts.hour % interval !== 0) {
    return { allowed: false, reason: `Intervalo de ${interval}h; esta hora não é ponto de execução.` };
  }

  return { allowed: true, reason: `Execução permitida às ${parts.hour}h.` };
}

function getTimeParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    weekday: 'short',
    hour12: false
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const weekdayText = parts.find((part) => part.type === 'weekday')?.value || 'Sun';
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    hour,
    weekday: weekdayMap[weekdayText] ?? 0
  };
}
