# Segurança do agente

O agente foi desenhado para ter poder, mas obedecer às permissões.

## Travas principais

- `agent.dryRun`: simula sem alterar Gmail.
- `agent.autonomyLevel`: controla o grau de autonomia de 0 a 7.
- `agent.maxEmailsPerRun`: limita a leitura a no máximo 1000 e-mails por execução.
- `gmail`: controla quais caixas/categorias entram na busca.
- `agent.emergencyStop`: pausa tudo e desliga ações sensíveis.
- `permissions`: controla cada ação.
- `protectedSenders`: protege remetentes importantes.
- `limits`: limita ações por execução.
- `permissions.highRiskRequiresExplicitConfirmation`: quando ligado, ações de alto risco ficam pendentes para aprovação no painel.

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

No nível 7, o agente só executa o que estiver ligado em `permissions`.
Ações de alto risco, como enviar, apagar e descadastrar, ficam pendentes no painel quando `highRiskRequiresExplicitConfirmation` estiver ligado.
Não existe mais campo de frase obrigatória: a autorização é feita pelas chaves de configuração.

## Recomendações

Para começar, use nível 2.

Depois teste nível 3.

Use nível 5 apenas quando tiver certeza das regras de arquivamento.

Não ligue exclusão automática no começo.

Para arquivar automaticamente, confira se estes itens estão corretos:

- `agent.dryRun` desligado;
- `agent.autonomyLevel` em 5 ou maior;
- `modules.autoArchive` ligado;
- `permissions.archiveEmails` ligado;
- `permissions.mediumRiskRequiresConfirmation` desligado;
- remetente não está protegido.

## Botão de emergência

O botão `Parada de emergência`:

- desliga o agente;
- pausa execuções;
- liga simulação;
- coloca autonomia em nível 0;
- desliga envio, exclusão, arquivamento e ações em lote.
