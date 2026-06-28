# Segurança do agente

O agente foi desenhado para ter poder, mas obedecer às permissões.

## Travas principais

- `agent.dryRun`: simula sem alterar Gmail.
- `agent.autonomyLevel`: controla o grau de autonomia de 0 a 7.
- `agent.emergencyStop`: pausa tudo e desliga ações sensíveis.
- `permissions`: controla cada ação.
- `protectedSenders`: protege remetentes importantes.
- `limits`: limita ações por execução.
- `confirmations`: frases exigidas para risco alto.

## Níveis de autonomia

| Nível | Significado |
|---|---|
| 0 | desligado |
| 1 | apenas análise |
| 2 | simulação |
| 3 | baixo risco automático |
| 4 | médio risco com confirmação |
| 5 | automático controlado |
| 6 | alto risco só com aprovação |
| 7 | autonomia máxima configurada |

## Recomendações

Para começar, use nível 2.

Depois teste nível 3.

Use nível 5 apenas quando tiver certeza das regras de arquivamento.

Não ligue exclusão automática no começo.

## Botão de emergência

O botão `Parada de emergência`:

- desliga o agente;
- pausa execuções;
- liga simulação;
- coloca autonomia em nível 0;
- desliga envio, exclusão, arquivamento e ações em lote.
