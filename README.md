# Gmail Apple IA Agent

Agente inteligente para gerenciar Gmail com IA, painel web e integração com Apple/Siri/Atalhos.

Este README está organizado na ordem certa de execução para Windows usando PowerShell.

## O que o agente mostra e controla

O painel local tem tudo em uma página:

- dashboard geral com arquivados, apagados, descadastros, sugestões, etiquetas, rascunhos, lembretes, eventos, newsletters e falhas;
- configurações em grids alinhados;
- cartões de autonomia, sem “tipo de execução” duplicado;
- seleção visual das 24 horas do dia;
- seleção das caixas Principal, Promoções, Social, Atualizações e Fórum;
- escopo próprio para “Marcar como lido”, por categoria;
- limite de até 1000 e-mails por execução;
- permissões por chave liga/desliga, sem frase de segurança obrigatória.

Use sempre `npm.cmd`, não `npm`, para evitar este erro:

```text
npm.ps1 não pode ser carregado porque a execução de scripts foi desabilitada neste sistema
```

## Ordem correta, em resumo

Faça exatamente nesta ordem:

1. Instalar Node.js.
2. Abrir a pasta do projeto no PowerShell.
3. Criar projeto no Google Cloud.
4. Ativar Gmail API.
5. Configurar tela de consentimento OAuth.
6. Criar credencial OAuth.
7. Baixar e renomear para `credentials.json`.
8. Colocar `credentials.json` na pasta do projeto.
9. Instalar o projeto com `npm.cmd install`.
10. Testar com `npm.cmd run check`.
11. Criar arquivo `.env`.
12. Gerar `token.json` com `npm.cmd run auth:gmail`.
13. Configurar OpenAI/Gemini no `.env`.
14. Abrir o painel com `npm.cmd run server`.
15. Rodar primeiro com `agent.dryRun=true`, ou seja, simulação ligada.
16. Só depois subir no GitHub e criar Secrets.

Não rode estes comandos antes de criar e colocar `credentials.json` na pasta:

```powershell
npm.cmd run auth:gmail
npm.cmd run server
npm.cmd run start
```

Se rodar antes, vai aparecer erro dizendo que faltam credenciais do Google.

## Onde está a pasta do projeto

No seu computador, a pasta é:

```text
C:\Users\giasi\Documents\Codex\2026-06-23\que\outputs\gmail-apple-ia-agent
```

Dentro dela precisam aparecer arquivos como:

```text
package.json
README.md
.env.example
src
public
test
```

## Arquivos que nunca devem ir para o GitHub

Nunca suba estes arquivos:

```text
.env
credentials.json
token.json
agent-settings.json
node_modules
data/*.sqlite
logs
reports
```

Motivo:

- `.env` guarda chaves secretas.
- `credentials.json` é a chave do app Google.
- `token.json` é a autorização do seu Gmail.
- `node_modules` é instalado automaticamente.
- `data/*.sqlite` guarda banco local e logs.

---

# Instalação passo a passo no PowerShell

## Passo 1 - Instalar o Node.js

1. Abra:

```text
https://nodejs.org/
```

2. Baixe a versão LTS.
3. Instale clicando em `Next`, `Next`, `Install`.
4. Feche o instalador.
5. Feche qualquer PowerShell aberto.
6. Abra o PowerShell de novo.

Confira se instalou:

```powershell
node -v
```

Depois confira o npm pelo caminho seguro:

```powershell
npm.cmd -v
```

Se aparecer um número nos dois comandos, está certo.

## Passo 2 - Abrir a pasta do projeto no PowerShell

1. Abra o Explorador de Arquivos.
2. Vá até:

```text
C:\Users\giasi\Documents\Codex\2026-06-23\que\outputs\gmail-apple-ia-agent
```

3. Clique na barra de endereço da pasta.
4. Digite:

```text
powershell
```

5. Aperte `Enter`.

Vai abrir o PowerShell já dentro da pasta certa.

Confira:

```powershell
dir
```

Você precisa ver:

```text
package.json
README.md
.env.example
src
public
```

Se não aparecer `package.json`, você está na pasta errada.

## Passo 3 - Criar projeto no Google Cloud

Este passo cria o lugar oficial onde o app vai pedir permissão para acessar o Gmail.

1. Abra:

```text
https://console.cloud.google.com/
```

2. Faça login com sua conta Google.
3. No topo da tela, clique no seletor de projeto.
4. Clique em `Novo projeto`.
5. Nomeie como:

```text
Gmail Apple IA Agent
```

6. Clique em `Criar`.

## Passo 4 - Ativar Gmail API

1. No Google Cloud, vá em `APIs e serviços`.
2. Clique em `Biblioteca`.
3. Pesquise:

```text
Gmail API
```

4. Clique em `Gmail API`.
5. Clique em `Ativar`.

## Passo 5 - Configurar tela de consentimento OAuth

Essa é a tela do Google dizendo que o app quer acessar sua conta.

1. No Google Cloud, vá em `APIs e serviços`.
2. Clique em `Tela de consentimento OAuth`.
3. Se pedir tipo de usuário, escolha `Externo`.
4. Preencha:
   - nome do app: `Gmail Apple IA Agent`;
   - email de suporte: seu email;
   - email do desenvolvedor: seu email.
5. Salve.
6. Vá em `Usuários de teste`.
7. Adicione o Gmail que você vai usar.
8. Salve.

Se aparecer aviso de app não verificado depois, é normal para app pessoal.

## Passo 6 - Criar credencial OAuth

Agora você vai criar o arquivo `credentials.json`.

1. No Google Cloud, vá em `APIs e serviços`.
2. Clique em `Credenciais`.
3. Clique em `Criar credenciais`.
4. Escolha `ID do cliente OAuth`.
5. Tipo de aplicativo:

```text
Aplicativo para computador
```

ou:

```text
Desktop app
```

6. Nome:

```text
Gmail Apple IA Local
```

7. Clique em `Criar`.
8. Baixe o arquivo JSON.
9. Renomeie o arquivo baixado para:

```text
credentials.json
```

## Passo 7 - Colocar `credentials.json` na pasta do projeto

Coloque `credentials.json` nesta pasta:

```text
C:\Users\giasi\Documents\Codex\2026-06-23\que\outputs\gmail-apple-ia-agent
```

Ele precisa ficar ao lado de `package.json`.

Exemplo:

```text
gmail-apple-ia-agent
├─ credentials.json
├─ package.json
├─ README.md
```

No PowerShell, confirme:

```powershell
dir credentials.json
```

Se mostrar o arquivo, pode continuar.

Se não mostrar, pare aqui e coloque o arquivo na pasta correta.

## Passo 8 - Instalar o projeto

Agora sim instale as dependências:

```powershell
npm.cmd install
```

Espere terminar.

Se aparecer muita coisa na tela, é normal.

## Passo 9 - Rodar teste do projeto

Rode:

```powershell
npm.cmd run check
```

Você quer ver algo parecido com:

```text
pass 8
fail 0
```

Se `fail` for `0`, está tudo certo.

## Passo 10 - Criar arquivo `.env`

O `.env` é onde ficam suas chaves locais.

No PowerShell:

```powershell
Copy-Item .env.example .env
```

Abra no Bloco de Notas:

```powershell
notepad .env
```

Por enquanto, deixe aberto. Você vai preencher algumas linhas.

## Passo 11 - Gerar autorização do Gmail, `token.json`

Este passo só funciona se `credentials.json` já estiver na pasta.

Rode:

```powershell
npm.cmd run auth:gmail
```

O terminal vai mostrar um link grande.

O terminal também deve mostrar algo assim:

```text
Aguardando retorno OAuth em http://localhost:3000/oauth2callback
```

Isso significa que o agente abriu uma “portinha” local no seu computador esperando o Google voltar com a autorização.

Faça assim:

1. Copie o link inteiro.
2. Cole no navegador.
3. Escolha sua conta Gmail.
4. Autorize.
5. Se aparecer aviso de app não verificado, clique para continuar.
6. Ao terminar, volte ao PowerShell.

O final correto é o navegador mostrar uma página simples dizendo:

```text
Autorização concluída
```

E o PowerShell mostrar:

```text
Token salvo com sucesso.
```

Agora deve existir o arquivo:

```text
token.json
```

Confirme:

```powershell
dir token.json
```

Se aparecer o arquivo, está certo.

### Se depois de autorizar a página do navegador der erro ou não carregar

Isso normalmente acontece por um destes motivos:

1. a porta `3000` já está ocupada;
2. o navegador tentou voltar para `localhost` sem a porta correta;
3. o PowerShell não estava mais rodando o comando `auth:gmail`;
4. você copiou só metade do link.

Faça assim:

1. Feche a aba de erro do navegador.
2. Volte no PowerShell.
3. Aperte `Ctrl + C` para parar o comando, se ele ainda estiver preso.
4. Rode de novo usando outra porta:

```powershell
npm.cmd run auth:gmail -- --port 3001
```

5. Copie o link inteiro que aparecer.
6. Cole no navegador.
7. Depois de autorizar, o navegador deve voltar para:

```text
http://localhost:3001/oauth2callback
```

Se a porta `3001` também der erro, tente:

```powershell
npm.cmd run auth:gmail -- --port 3002
```

O que importa é: o PowerShell precisa ficar aberto esperando, e o navegador precisa voltar para o mesmo endereço que o terminal mostrou.

Se ainda assim a página não carregar, confira se no PowerShell apareceu algum erro. Se aparecer, copie exatamente a mensagem e veja a seção “Se algo der errado” no fim deste README.

## Passo 12 - Configurar OpenAI no `.env`

No arquivo `.env`, encontre:

```text
OPENAI_API_KEY=
```

Coloque sua chave depois do `=`.

Exemplo:

```text
OPENAI_API_KEY=sua_chave_aqui
```

Deixe o modelo como está ou ajuste para o modelo disponível na sua conta:

```text
OPENAI_MODEL=gpt-5.4-mini
```

Se a OpenAI reclamar do modelo no futuro, troque pelo modelo que sua conta tiver disponível.

## Passo 13 - Gemini opcional

Se quiser usar Gemini, faça assim:

1. Entre no Google AI Studio:

   https://aistudio.google.com/app/apikey

2. Clique para criar uma chave de API.
3. Copie a chave.
4. Volte no arquivo `.env`.
5. Cole a chave depois de `GEMINI_API_KEY=`.

Fica parecido com isto:

```text
GEMINI_API_KEY=sua_chave_gemini
GEMINI_MODEL=gemini-3.5-flash
```

Importante:

- não coloque aspas;
- não coloque espaço antes ou depois da chave;
- não mande essa chave para ninguém;
- não suba o arquivo `.env` no GitHub.

Se quiser usar o Gemini como IA principal, altere também:

```text
AI_PROVIDER=gemini
```

Se quiser deixar a OpenAI como IA principal e o Gemini apenas como opção/fallback, mantenha:

```text
AI_PROVIDER=openai
```

Depois, no painel do agente, você também pode ligar/desligar o Gemini nas configurações.

Se não quiser Gemini, pode deixar `GEMINI_API_KEY=` vazio.

## Passo 14 - Criar token dos Atalhos/Siri

No `.env`, encontre:

```text
SHORTCUT_TOKEN=troque-por-uma-frase-secreta-grande
```

Troque por uma frase sua.

Exemplo:

```text
SHORTCUT_TOKEN=meu-token-secreto-gmail-2026
```

Salve o `.env`.

## Passo 15 - Abrir o painel

No PowerShell:

```powershell
npm.cmd run server
```

Se aparecer:

```text
Painel rodando em http://localhost:8787
```

abra no navegador:

```text
http://localhost:8787
```

## Passo 16 - Primeiro teste seguro

No painel:

1. deixe `Simulação / dryRun` ligado;
2. deixe envio desligado;
3. deixe exclusão desligada;
4. clique em `Rodar agora`.

Também pode rodar pelo PowerShell:

```powershell
npm.cmd run start
```

No começo, ele só deve simular e gerar relatórios.

## Passo 17 - Ordem segura para liberar funções

Primeiro use:

- leitura;
- resumo;
- classificação;
- aplicar etiquetas;
- criar rascunhos;
- criar lembretes.

Depois, com calma:

- arquivar emails;
- criar eventos;
- sugerir descadastro.

Para arquivar automaticamente de verdade, confirme três coisas no painel:

1. `Simulação / não alterar Gmail` precisa ficar `Desligado`.
2. `Arquivamento automático` precisa ficar `Ligado`.
3. `Arquivar emails` precisa ficar `Ligado`.

Se `Médio risco confirma` estiver `Ligado`, o agente não arquiva sozinho. Ele cria uma aprovação pendente.

Nesse caso, vá em `Logs e aprovações`, clique em `Carregar aprovações` e depois clique em `Aprovar e executar`.

Se você quiser que newsletters e promoções sejam arquivadas sem perguntar, deixe `Médio risco confirma` como `Desligado`.

Evite no começo:

- enviar email automático;
- apagar email;
- ações em lote;
- esvaziar lixeira.

---

# GitHub: subir depois que local funcionar

Só suba para GitHub depois que estes arquivos existirem localmente:

```text
credentials.json
token.json
.env
```

Mas atenção: esses três não vão para o GitHub. Eles servem para você copiar o conteúdo para Secrets.

## O que subir no GitHub

Suba:

```text
.github
docs
pages
public
scripts
src
test
.env.example
.gitignore
agent-settings.example.json
agent-settings.github.autoarchive.example.json
package.json
package-lock.json
README.md
```

Não suba:

```text
.env
credentials.json
token.json
node_modules
data
logs
reports
```

## Criar Secrets no GitHub

No GitHub:

1. abra o repositório;
2. clique em `Settings`;
3. clique em `Secrets and variables`;
4. clique em `Actions`;
5. clique em `New repository secret`.

Crie:

| Secret | O que colocar |
|---|---|
| `GOOGLE_CREDENTIALS_JSON` | conteúdo inteiro do `credentials.json` |
| `GOOGLE_TOKEN_JSON` | conteúdo inteiro do `token.json` |
| `OPENAI_API_KEY` | chave OpenAI |
| `OPENAI_MODEL` | modelo OpenAI |
| `GEMINI_API_KEY` | opcional |
| `GEMINI_MODEL` | opcional |
| `SHORTCUT_TOKEN` | token dos Atalhos |
| `ENCRYPTION_KEY` | frase longa qualquer |
| `AGENT_SETTINGS_JSON` | conteúdo do `agent-settings.example.json` ou configuração exportada |

Para copiar `credentials.json`:

```powershell
Get-Content -Raw credentials.json | Set-Clipboard
```

Para copiar `token.json`:

```powershell
Get-Content -Raw token.json | Set-Clipboard
```

Importante sobre `AGENT_SETTINGS_JSON`:

O painel local salva configurações no seu computador. O GitHub Actions não enxerga esse painel local.

Então, se você quer que o agente rode no GitHub e arquive automaticamente, o Secret `AGENT_SETTINGS_JSON` também precisa permitir isso.

Exemplo para arquivar newsletters/promoções sem pedir confirmação de risco médio:

```json
{
  "agent": {
    "autonomyLevel": 5,
    "dryRun": false,
    "maxEmailsPerRun": 1000,
    "gmailQuery": ""
  },
  "gmail": {
    "useSmartQuery": true,
    "includeInboxOnly": false,
    "unreadOnly": false,
    "newerThanDays": 30,
    "excludeSent": true,
    "excludeDrafts": true,
    "excludeSpamTrash": true,
    "categories": {
      "primary": true,
      "promotions": true,
      "social": true,
      "updates": true,
      "forums": true
    }
  },
  "automation": {
    "enabled": true,
    "manualOnly": false,
    "intervalHours": 1,
    "allowedHours": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
    "weekdaysOnly": false
  },
  "organizing": {
    "markReadCategories": ["newsletter", "mailing", "promocao"]
  },
  "modules": {
    "newsletter": true,
    "autoArchive": true
  },
  "permissions": {
    "archiveEmails": true,
    "mediumRiskRequiresConfirmation": false,
    "deleteEmails": false
  },
  "newsletter": {
    "archiveAfterDays": 1,
    "deleteAfterDays": 0
  },
  "protectedSenders": {
    "enabled": true,
    "requireConfirmationForArchive": true,
    "requireConfirmationForDelete": true,
    "emails": [],
    "domains": [],
    "keywords": ["banco", "gov.br", "receita", "justiça", "juridico", "saude"]
  }
}
```

Eu deixei esse exemplo pronto no arquivo:

```text
agent-settings.github.autoarchive.example.json
```

Para copiar e colar no Secret `AGENT_SETTINGS_JSON`, rode:

```powershell
Get-Content -Raw agent-settings.github.autoarchive.example.json | Set-Clipboard
```

Se você quer copiar a configuração atual do painel local, rode:

```powershell
npm.cmd run --silent settings:export | Set-Clipboard
```

Depois cole no Secret `AGENT_SETTINGS_JSON`.

Essa exportação não inclui suas credenciais do Google nem chaves de IA. Ela copia apenas as configurações do agente.

## Rodar no GitHub

1. Vá em `Actions`.
2. Clique em `Gmail Apple IA Agent`.
3. Clique em `Run workflow`.
4. Aguarde.
5. Se der erro de Secret faltando, volte nos Secrets.

---

# Configurador online no GitHub Pages

Também existe uma página estática para montar/copiar o `AGENT_SETTINGS_JSON` sem rodar backend:

```text
https://attgiasi.github.io/AGENTES/
```

Essa página usa a mesma organização visual do painel local para configurar botões e copiar o JSON para o GitHub Secret.

Ela não conecta Gmail, não acessa OpenAI, não salva token e não executa o agente. Ela apenas ajuda a montar a configuração.

A diferença é simples:

- painel local: configura, mostra status real, roda o agente, mostra logs e dashboard real;
- página online: configura e copia o JSON para você colar no GitHub.

## Como configurar online, direto pelo GitHub

1. Abra:

```text
https://attgiasi.github.io/AGENTES/
```

2. Ajuste os cartões e chaves da página.
3. Em `Nível de autonomia`, escolha até onde o agente pode ir.
4. Em `Gmail e execução`, escolha as caixas que entram na leitura.
5. Em `Escopo para marcar como lido`, escolha quais categorias podem ser marcadas como lidas.
6. Clique em `Copiar JSON`.
7. No GitHub, abra o repositório `AGENTES`.
8. Vá em `Settings`.
9. Vá em `Secrets and variables`.
10. Clique em `Actions`.
11. Abra ou crie o Secret `AGENT_SETTINGS_JSON`.
12. Cole o JSON copiado e salve.

Pronto: na próxima execução do GitHub Actions, o agente vai usar essa configuração.

Observação importante: o GitHub Pages não pode alterar Secrets automaticamente sem uma autenticação especial. Por isso a página online monta e copia a configuração, e você cola no Secret.

## Como publicar o configurador no Pages

Depois de subir os arquivos atualizados no GitHub:

1. Abra o repositório `AGENTES`.
2. Vá em `Settings`.
3. Clique em `Pages`.
4. Em `Build and deployment`, escolha `GitHub Actions`.
5. Vá em `Actions`.
6. Rode o workflow `Publicar configurador no GitHub Pages`.
7. Ao terminar, abra:

```text
https://attgiasi.github.io/AGENTES/
```

Se aparecer 404, aguarde 1 ou 2 minutos e atualize a página.

---

# Siri e Atalhos no iPhone

O iPhone precisa chamar o computador ou servidor onde o painel está rodando.

Se estiver usando seu computador local, descubra o IP:

```powershell
ipconfig
```

Procure `Endereço IPv4`, algo como:

```text
192.168.0.10
```

No Atalho do iPhone, use URL parecida com:

```text
http://192.168.0.10:8787/api/siri/resumir-importantes
```

Adicione o cabeçalho:

```text
x-shortcut-token: seu_SHORTCUT_TOKEN
```

Comandos disponíveis:

```text
/api/siri/resumir-importantes
/api/siri/responder-hoje
/api/siri/criar-lembretes
/api/siri/limpar-newsletters
/api/siri/pausar-agente
/api/siri/ativar-agente
/api/siri/foco-trabalho
/api/siri/relatorio-dia
/api/siri/criar-eventos
/api/siri/listar-urgentes
/api/siri/preparar-respostas
/api/siri/arquivar-newsletters-antigas
/api/siri/pendencias-semana
```

---

# O que o agente faz

- lê emails do Gmail;
- classifica emails;
- identifica importantes, urgentes, newsletters e promoções;
- aplica etiquetas;
- cria rascunhos;
- prepara lembretes Apple;
- prepara eventos Apple;
- gera logs;
- gera relatórios;
- mostra dashboard de ações executadas e sugestões;
- responde comandos via Siri/Atalhos;
- usa OpenAI como IA principal;
- permite Gemini como opcional.

## Níveis de risco

| Risco | Exemplos | Padrão |
|---|---|---|
| Baixo | ler, resumir, classificar, aplicar etiqueta, criar lembrete, relatório | pode ser automático |
| Médio | arquivar, criar rascunho, criar evento | pede confirmação |
| Alto | enviar, apagar, descadastrar newsletter, encaminhar, esvaziar lixeira, ações em lote | desligado |

## Como o agente decide o que fazer

O agente não tem “modo”.

Ele decide tudo usando apenas:

- `agent.autonomyLevel`: nível de autonomia de 0 a 7;
- `agent.dryRun`: se estiver ligado, ele só simula;
- `agent.emergencyStop`: trava geral de segurança;
- `agent.maxEmailsPerRun`: máximo de e-mails por execução, de 1 até 1000;
- `gmail`: caixas/categorias do Gmail, busca inteligente e filtros de leitura;
- `automation`: horários e frequência de execução;
- `modules`: quais módulos estão ativos;
- `permissions`: quais ações são permitidas;
- `newsletter`: regras de mailing e promoções;
- `protectedSenders`: remetentes/domínios que exigem cuidado extra;
- `apple`: regras de Lembretes e Calendário;
- `permissions.highRiskRequiresExplicitConfirmation`: quando ligado, ações perigosas ficam pendentes no painel;
- `limits`: limites de ações por execução.

Exemplo: se `archiveEmails` estiver desligado, ele não arquiva. Se `createDrafts` estiver ligado, ele pode criar rascunhos. Se `dryRun` estiver ligado, ele só mostra o que faria.

## Níveis de autonomia

| Nível | O que faz |
|---|---|
| 0 | Desligado |
| 1 | Apenas análise |
| 2 | Simulação |
| 3 | Executa baixo risco, como etiquetas |
| 4 | Risco médio pede aprovação |
| 5 | Risco médio pode ser automático se permitido |
| 6 | Alto risco só com aprovação |
| 7 | Autonomia máxima, ainda respeitando permissões e aprovações do painel |

Não há mais frase de segurança obrigatória. Se você ligar uma permissão, o agente entende que você autorizou aquela função. Para manter cuidado extra, deixe `Aprovar alto risco` ligado.

Para arquivar newsletters automaticamente, use normalmente:

- `Simulação / não alterar Gmail`: desligado;
- `Autonomia`: nível 5;
- `Módulo Arquivamento`: ligado;
- `Arquivar emails`: ligado;
- `Médio risco confirma`: desligado;
- `Apagar emails`: desligado.

## Horários de execução

No painel existe a área `Gmail e execução`.

Você pode definir:

- quais caixas/categorias do Gmail serão lidas: Principal, Promoções, Social, Atualizações e Fórum;
- quantos e-mails o agente pode ler por execução, até 1000;
- se ele deve ler somente caixa de entrada ou também arquivados;
- se ele deve ler somente não lidos;
- de quantas em quantas horas roda;
- quais horas do dia são permitidas, clicando nos cartões de 00h até 23h;
- se roda somente em dias úteis;
- se roda somente manualmente.

No GitHub Actions, o workflow acorda de hora em hora. O código decide se deve executar ou pular conforme essas configurações.

## Documentação extra

Também deixei estes guias:

- `docs/ARCHITECTURE.md`
- `docs/SETUP_GMAIL_OAUTH.md`
- `docs/SECURITY.md`
- `docs/MODULES.md`
- `docs/SIRI_SHORTCUTS.md`
- `docs/USER_GUIDE.md`
- `docs/UPLOAD_GITHUB.md`

## Como subir os arquivos para o GitHub

O guia detalhado está em:

```text
docs/UPLOAD_GITHUB.md
```

Resumo:

1. Extraia o arquivo `gmail-apple-ia-agent.zip`.
2. Entre dentro da pasta `gmail-apple-ia-agent`.
3. Suba o conteúdo para o repositório `AGENTES`.
4. Inclua a pasta oculta `.github`.
5. Inclua a pasta `pages`.
6. Não suba `.env`, `credentials.json`, `token.json`, `node_modules`, `data`, `logs` ou `reports`.

## Comandos úteis

Use sempre PowerShell com `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run check
npm.cmd run auth:gmail
npm.cmd run gmail:check
npm.cmd run server
npm.cmd run start
npm.cmd run config:validate
```

## Se aparecer `invalid_grant`

Esse erro significa que o token do Gmail ficou inválido, expirou, foi revogado ou não combina mais com a credencial OAuth.

Para testar:

```powershell
npm.cmd run gmail:check
```

Se aparecer erro de token inválido, faça assim:

1. No PowerShell, dentro da pasta do projeto, rode:

   ```powershell
   npm.cmd run auth:gmail
   ```

2. Autorize novamente no navegador.
3. Quando aparecer que foi autorizado, copie o novo `token.json`:

   ```powershell
   Get-Content -Raw token.json | Set-Clipboard
   ```

4. No GitHub, vá em:

   `Settings` → `Secrets and variables` → `Actions`

5. Abra o Secret `GOOGLE_TOKEN_JSON`.
6. Cole o novo conteúdo.
7. Salve.
8. Rode o workflow de novo.

Esse passo é obrigatório quando o Google invalida o refresh token.

## Se algo der errado

### Erro: falta `credentials.json`

Você pulou os passos do Google Cloud.

Volte para:

- Passo 3;
- Passo 4;
- Passo 5;
- Passo 6;
- Passo 7.

### Erro: `npm.ps1 não pode ser carregado`

Use `npm.cmd`:

```powershell
npm.cmd install
```

### Erro: falta `token.json`

Rode:

```powershell
npm.cmd run auth:gmail
```

### Erro: autorizei no Google, mas a página não carrega

Rode de novo usando outra porta:

```powershell
npm.cmd run auth:gmail -- --port 3001
```

Se não funcionar:

```powershell
npm.cmd run auth:gmail -- --port 3002
```

Durante esse processo, o PowerShell precisa ficar aberto. Não feche a janela enquanto autoriza no navegador.

### Erro: OpenAI sem chave

Preencha `OPENAI_API_KEY` no `.env` ou no Secret do GitHub.

---

Esse agente foi desenhado para começar com coleira curta: primeiro simula, depois organiza, depois automatiza. Não ligue envio ou exclusão até confiar nos relatórios.
