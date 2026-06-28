# Siri e Atalhos

O agente expõe endpoints para o app Atalhos do iPhone.

## Como funciona

O Atalho chama uma URL do painel/backend e recebe uma resposta curta em JSON.

Exemplo local:

```text
http://SEU-IP:8787/api/siri/resumir-importantes
```

Header:

```text
x-shortcut-token: SEU_SHORTCUT_TOKEN
```

## Comandos disponíveis

- `/api/siri/resumir-importantes`
- `/api/siri/responder-hoje`
- `/api/siri/criar-lembretes`
- `/api/siri/limpar-newsletters`
- `/api/siri/pausar-agente`
- `/api/siri/ativar-agente`
- `/api/siri/foco-trabalho`
- `/api/siri/relatorio-dia`
- `/api/siri/criar-eventos`
- `/api/siri/listar-urgentes`
- `/api/siri/preparar-respostas`
- `/api/siri/arquivar-newsletters-antigas`
- `/api/siri/pendencias-semana`

Execuções via Siri são tratadas como execução manual, então não dependem da agenda automática.
