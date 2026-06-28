import path from 'node:path';
import { ensureDir, nowIso, writeJsonFile } from '../utils.js';

export async function saveRunReport({ startedAt, finishedAt = nowIso(), settings, items, validation }) {
  const dir = 'reports';
  await ensureDir(dir);
  const id = startedAt.replace(/[:.]/g, '-');
  const jsonPath = path.join(dir, `run-${id}.json`);
  const mdPath = path.join(dir, `run-${id}.md`);
  const payload = {
    startedAt,
    finishedAt,
    dryRun: settings.agent.dryRun,
    validation,
    totals: {
      emails: items.length,
      actions: items.reduce((sum, item) => sum + (item.actions?.length || 0), 0),
      blocked: items.reduce((sum, item) => sum + (item.blocked?.length || 0), 0)
    },
    items
  };
  await writeJsonFile(jsonPath, payload);
  await writeMarkdown(mdPath, payload);
  return { files: [jsonPath, mdPath], payload };
}

async function writeMarkdown(filePath, report) {
  const lines = [
    '# Relatório do Gmail Apple IA Agent',
    '',
    `- Início: ${report.startedAt}`,
    `- Fim: ${report.finishedAt}`,
    `- Simulação/dryRun: ${report.dryRun ? 'sim' : 'não'}`,
    `- Emails: ${report.totals.emails}`,
    `- Ações: ${report.totals.actions}`,
    `- Bloqueios: ${report.totals.blocked}`,
    ''
  ];
  for (const item of report.items) {
    lines.push(`## ${item.subject}`);
    lines.push('');
    lines.push(`- De: ${item.from}`);
    lines.push(`- Categoria: ${item.category}`);
    lines.push(`- Prioridade: ${item.priority}`);
    lines.push(`- Resumo: ${item.summary}`);
    lines.push(`- Motivo: ${item.reason}`);
    if (item.actions?.length) {
      lines.push('- Ações:');
      for (const action of item.actions) lines.push(`  - ${action.action}: ${action.status} - ${action.detail}`);
    }
    if (item.blocked?.length) {
      lines.push('- Bloqueios:');
      for (const blocked of item.blocked) lines.push(`  - ${blocked.action}: ${blocked.reason}`);
    }
    lines.push('');
  }
  await import('node:fs/promises').then((fs) => fs.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8'));
}
