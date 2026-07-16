# Backend online do Inbox AI — guia bem simples

Pense no sistema como três ajudantes:

1. O **GitHub Pages** mostra a tela bonita.
2. A **Cloudflare** guarda configurações, histórico e pedidos.
3. O **GitHub Actions** abre o Gmail e executa as tarefas autorizadas.

O Google Colab não é indicado para hospedar este projeto: ele é um caderno temporário, pode encerrar a sessão e restringe servidores web contínuos. Para um projeto pequeno, Cloudflare Workers + D1 é a opção gratuita escolhida.

## Endereços deste projeto

Painel:

```text
https://attgiasi.github.io/AGENTES/pages/
```

Backend:

```text
https://inbox-ai-backend.att-giasi.workers.dev
```

## O que já foi criado

- Worker chamado `inbox-ai-backend`;
- banco D1 chamado `inbox-ai`;
- tabelas de configurações, execuções, ações, sugestões, regras, perfil, comandos e monitoramento;
- `ADMIN_TOKEN` guardado como Secret na Cloudflare;
- `INGEST_TOKEN` guardado como Secret na Cloudflare;
- Secrets `REMOTE_API_URL` e `REMOTE_INGEST_TOKEN` no GitHub;
- verificação do GitHub Actions a cada 15 minutos;
- execução automática real apenas no começo das horas permitidas;
- pedido do botão “Rodar agora” atendido em até 15 minutos quando não existe token opcional de disparo imediato.

## Onde ficam as chaves

As chaves da Cloudflare **não** ficam nos arquivos enviados ao GitHub.

No computador existe um arquivo local:

```text
backend/cloudflare/.cloudflare.local.json
```

Ele está protegido pelo `.gitignore`. Nunca envie esse arquivo ao GitHub e nunca cole seu conteúdo em conversa, README ou Issue.

## Como abrir a pasta certa

Abra o PowerShell e execute:

```powershell
cd "C:\Users\giasi\Documents\Codex\2026-06-23\que\outputs\gmail-apple-ia-agent\backend\cloudflare"
```

Use sempre `npm.cmd`, porque o Windows pode bloquear `npm.ps1`.

## Como confirmar que o backend está vivo

Execute:

```powershell
node -e "fetch('https://inbox-ai-backend.att-giasi.workers.dev/health').then(async r=>console.log(r.status,await r.text()))"
```

Se aparecer `200` e `"ok":true`, está funcionando.

## Como copiar o código administrativo sem mostrá-lo

No PowerShell, dentro de `backend/cloudflare`, execute:

```powershell
npm.cmd run secret:copy-admin
```

O código será colocado na área de transferência. Ele não aparecerá na tela.

Depois:

1. Abra o painel online.
2. Clique no cartão de status no canto inferior esquerdo.
3. Em **URL do backend**, coloque:

```text
https://inbox-ai-backend.att-giasi.workers.dev
```

4. Clique no campo **Código de acesso**.
5. Pressione `Ctrl + V`.
6. Clique em **Conectar**.

O código fica somente na sessão daquele navegador. Se fechar completamente o navegador e a conexão pedir o código novamente, repita estes passos.

## Como alterar configurações online

Depois de conectar:

1. Entre em **Configurações**.
2. Ative ou desative as chaves desejadas.
3. Escolha autonomia, caixas, horários e limite.
4. Espere aparecer **Salvo na nuvem** no topo.

Não é necessário copiar `AGENT_SETTINGS_JSON` toda vez. O agente consulta a configuração salva na Cloudflare antes de trabalhar. O botão de copiar continua disponível como cópia de segurança.

## Como funciona “Rodar agora”

1. Você clica em **Rodar agora**.
2. A Cloudflare cria um pedido seguro.
3. O GitHub Actions verifica pedidos a cada 15 minutos.
4. Ao encontrar o pedido, executa o agente mesmo que não seja o começo da hora.
5. O agente marca o pedido como concluído e atualiza o dashboard.

Sem o Secret opcional `GITHUB_DISPATCH_TOKEN`, o início pode levar até 15 minutos. Com esse Secret, a Cloudflare pode disparar o workflow imediatamente.

## Como sincronizar novamente a configuração local

Primeiro deixe o painel local aberto com:

```powershell
cd "C:\Users\giasi\Documents\Codex\2026-06-23\que\outputs\gmail-apple-ia-agent"
npm.cmd run server
```

Abra outro PowerShell e execute:

```powershell
cd "C:\Users\giasi\Documents\Codex\2026-06-23\que\outputs\gmail-apple-ia-agent\backend\cloudflare"
npm.cmd run seed:local
```

Esse comando envia a configuração e o perfil para o D1 sem mostrar os dados no terminal.

## Como publicar uma correção do backend

```powershell
cd "C:\Users\giasi\Documents\Codex\2026-06-23\que\outputs\gmail-apple-ia-agent\backend\cloudflare"
npm.cmd install
npm.cmd run db:remote
npm.cmd run deploy
```

O comando `db:remote` pode ser repetido; as tabelas usam `IF NOT EXISTS`.

## Como recriar os Secrets Cloudflare

Só faça isto se os Secrets forem perdidos ou revogados:

```powershell
npm.cmd run secrets:setup
```

Depois atualize também o Secret `REMOTE_INGEST_TOKEN` no GitHub usando o valor local copiado com:

```powershell
npm.cmd run secret:copy-ingest
```

## Como instalar o painel como aplicativo

No computador com Chrome ou Edge:

1. Abra o painel online.
2. Procure **Instalar aplicativo** no menu lateral.
3. Clique e confirme.

No iPhone:

1. Abra o painel no Safari.
2. Toque no botão **Compartilhar**.
3. Toque em **Adicionar à Tela de Início**.
4. Confirme o nome `Inbox AI`.

## Limites gratuitos importantes

Na modalidade gratuita, Cloudflare Workers oferece uma cota diária de requisições e o D1 oferece cotas de leituras, gravações e armazenamento. Para uma conta Gmail pessoal e um único usuário, este projeto tende a ficar muito abaixo desses limites. Consulte sempre os números atuais nas páginas oficiais:

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/

## Se aparecer erro

### `You are not authenticated`

```powershell
npx.cmd wrangler login
```

Autorize a página oficial da Cloudflare no navegador.

### `ADMIN_TOKEN não configurado`

```powershell
npm.cmd run secrets:setup
npm.cmd run deploy
```

### O painel abre, mas diz “Editor online”

Clique no cartão de status e conecte o backend usando `npm.cmd run secret:copy-admin`.

### O botão “Rodar agora” não começou imediatamente

Sem o token opcional de disparo, espere até 15 minutos. Consulte **Histórico** e **Relatórios** depois desse prazo.

### O Gmail não foi alterado

Confira:

1. autonomia maior que `Desligado`;
2. função desejada ligada;
3. `Modo simulação` desligado;
4. Gmail e IA configurados nos Secrets do GitHub;
5. horário permitido;
6. execução do GitHub Actions sem erro.
