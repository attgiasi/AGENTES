# Como subir os arquivos no GitHub

Use este guia para atualizar o repositório:

```text
https://github.com/attgiasi/AGENTES
```

## Antes de subir: apague os arquivos antigos do repositório

No site do GitHub não existe um botão perfeito para “substituir tudo” de uma vez. Faça assim:

1. Abra:

   ```text
   https://github.com/attgiasi/AGENTES
   ```

2. Entre em cada arquivo/pasta antiga que você não quer mais.
3. Clique nos três pontinhos `...` ou no ícone de lixeira, quando aparecer.
4. Escolha `Delete file`.
5. Clique em `Commit changes`.
6. Repita até ficar somente o que você quer manter.

Se você vir arquivos antigos misturados com os novos, apague os antigos primeiro. O pacote limpo deste projeto já está pronto para substituir tudo.

## Opção mais simples: upload pelo site do GitHub

1. Abra o ZIP mais novo:

   ```text
   gmail-apple-ia-agent.zip
   ```

2. Extraia o ZIP.
3. Entre dentro da pasta extraída ou use a pasta limpa já criada:

   ```text
   gmail-apple-ia-agent-upload-clean
   ```

4. Selecione estes arquivos e pastas:

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

5. No GitHub, abra o repositório `AGENTES`.
6. Clique em `Add file`.
7. Clique em `Upload files`.
8. Arraste os arquivos e pastas selecionados.
9. Escreva uma mensagem, por exemplo:

   ```text
   Atualiza agente Gmail e configurador Pages
   ```

10. Clique em `Commit changes`.

## O que mudou nesta versão

- O botão grande de autoarquivamento foi removido do topo.
- O nível de autonomia virou grade de cartões com descrição.
- A escolha de horários virou grade com as 24 horas do dia.
- O limite máximo de leitura agora aceita até 1000 e-mails por execução.
- A área `Gmail e execução` permite escolher Principal, Promoções, Social, Atualizações e Fórum.
- O configurador do GitHub Pages foi atualizado para gerar o novo `AGENT_SETTINGS_JSON`.

## Importante sobre pasta oculta `.github`

No Windows, pastas que começam com ponto podem parecer ocultas.

Para enxergar a pasta `.github`:

1. Abra o Explorador de Arquivos.
2. Clique em `Exibir`.
3. Ative `Itens ocultos`.

Sem a pasta `.github`, os workflows do GitHub Actions e do Pages não aparecem.

## Não suba estes arquivos

Nunca suba:

```text
.env
credentials.json
token.json
node_modules
data
logs
reports
```

Eles têm dados locais, tokens ou arquivos pesados.

## Depois de subir

No GitHub:

1. Vá em `Settings`.
2. Clique em `Pages`.
3. Em `Build and deployment`, selecione `GitHub Actions`.
4. Vá em `Actions`.
5. Rode `Publicar configurador no GitHub Pages`.

Depois abra:

```text
https://attgiasi.github.io/AGENTES/
```

## Secrets obrigatórios para o agente rodar

Em `Settings → Secrets and variables → Actions`, configure:

```text
GOOGLE_CREDENTIALS_JSON
GOOGLE_TOKEN_JSON
OPENAI_API_KEY
GEMINI_API_KEY
SHORTCUT_TOKEN
ENCRYPTION_KEY
AGENT_SETTINGS_JSON
```

O configurador online ajuda a gerar apenas o `AGENT_SETTINGS_JSON`.
