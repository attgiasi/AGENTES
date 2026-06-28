import { runAgent } from './agent.js';

try {
  const result = await runAgent();
  console.log(result.ok ? 'Agente concluído.' : 'Agente terminou com erro de validação.');
  if (result.reason) console.log(result.reason);
  for (const file of result.files || []) console.log(`Relatório: ${file}`);
} catch (error) {
  console.error(`Erro fatal: ${error.message}`);
  process.exit(1);
}

